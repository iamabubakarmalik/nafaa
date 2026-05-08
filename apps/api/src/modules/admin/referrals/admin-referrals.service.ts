import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [total, pending, converted, paid, totalRewardAgg] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: 'PENDING' } }),
      this.prisma.referral.count({ where: { status: 'CONVERTED' } }),
      this.prisma.referral.count({ where: { status: 'PAID' } }),
      this.prisma.referral.aggregate({
        where: { status: { in: ['CONVERTED', 'PAID'] } },
        _sum: { rewardAmount: true },
      }),
    ]);

    return {
      total,
      pending,
      converted,
      paid,
      totalRewardsPaid: totalRewardAgg._sum.rewardAmount ?? 0,
    };
  }

  list(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const skip = (page - 1) * limit;

    return this.prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        referrer: { select: { id: true, name: true, referralCode: true } },
        referee: { select: { id: true, name: true, status: true, createdAt: true } },
      },
    });
  }

  async leaderboard() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        referralsGiven: { some: { status: { in: ['CONVERTED', 'PAID'] } } },
      },
      include: {
        _count: {
          select: {
            referralsGiven: { where: { status: { in: ['CONVERTED', 'PAID'] } } },
          },
        },
        referralsGiven: {
          where: { status: { in: ['CONVERTED', 'PAID'] } },
          select: { rewardAmount: true },
        },
      },
      take: 50,
    });

    return tenants
      .map((t) => ({
        id: t.id,
        name: t.name,
        referralCode: t.referralCode,
        accountCredit: t.accountCredit,
        successfulReferrals: t._count.referralsGiven,
        totalEarned: t.referralsGiven.reduce((s, r) => s + r.rewardAmount, 0),
      }))
      .sort((a, b) => b.totalEarned - a.totalEarned);
  }
}
