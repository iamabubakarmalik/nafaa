import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async myDashboard(user: AuthenticatedUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        referralCode: true,
        accountCredit: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const referrals = await this.prisma.referral.findMany({
      where: { referrerTenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        referee: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });

    const credits = await this.prisma.creditTransaction.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalEarned = referrals
      .filter((r) => r.status === 'CONVERTED' || r.status === 'PAID')
      .reduce((s, r) => s + r.rewardAmount, 0);

    const pendingCount = referrals.filter((r) => r.status === 'PENDING').length;
    const convertedCount = referrals.filter(
      (r) => r.status === 'CONVERTED' || r.status === 'PAID',
    ).length;

    return {
      tenant,
      stats: {
        totalReferrals: referrals.length,
        pendingCount,
        convertedCount,
        totalEarned,
        currentCredit: tenant.accountCredit,
        rewardAmount: this.configService.get<number>('REFERRAL_REWARD_AMOUNT'),
        rewardPercentage: this.configService.get<number>('REFERRAL_REWARD_PERCENTAGE'),
      },
      referrals,
      credits,
    };
  }

  async leaderboard() {
    const top = await this.prisma.tenant.findMany({
      where: {
        referralsGiven: { some: { status: { in: ['CONVERTED', 'PAID'] } } },
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        _count: {
          select: {
            referralsGiven: { where: { status: { in: ['CONVERTED', 'PAID'] } } },
          },
        },
      },
      take: 20,
    });

    return top
      .map((t) => ({
        id: t.id,
        name: t.name,
        referralCode: t.referralCode,
        successfulReferrals: t._count.referralsGiven,
      }))
      .sort((a, b) => b.successfulReferrals - a.successfulReferrals);
  }

  async convertReferral(refereeTenantId: string, paymentAmount: number) {
    const referral = await this.prisma.referral.findUnique({
      where: { refereeTenantId },
    });
    if (!referral || referral.status !== 'PENDING') return null;

    const fixedReward = this.configService.get<number>('REFERRAL_REWARD_AMOUNT') ?? 500;
    const pctReward = this.configService.get<number>('REFERRAL_REWARD_PERCENTAGE') ?? 10;
    const pctValue = (paymentAmount * pctReward) / 100;
    const rewardAmount = Math.max(fixedReward, Math.round(pctValue));

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id: referral.id },
        data: {
          status: 'CONVERTED',
          rewardAmount,
          convertedAt: new Date(),
        },
      });

      const referrer = await tx.tenant.findUnique({
        where: { id: referral.referrerTenantId },
      });
      if (!referrer) return updated;

      const newCredit = referrer.accountCredit + rewardAmount;
      await tx.tenant.update({
        where: { id: referrer.id },
        data: { accountCredit: newCredit },
      });

      await tx.creditTransaction.create({
        data: {
          tenantId: referrer.id,
          type: 'REFERRAL_BONUS',
          amount: rewardAmount,
          balanceAfter: newCredit,
          reference: referral.id,
          note: `Referral reward earned`,
        },
      });

      await tx.notification.create({
        data: {
          tenantId: referrer.id,
          type: 'REFERRAL_EARNED',
          title: 'Referral Reward Earned! 🎉',
          message: `Aap ne Rs ${rewardAmount} kamaye! Aap ka referral subscribed ho gaya.`,
          link: '/referrals',
        },
      });

      return updated;
    });
  }
}
