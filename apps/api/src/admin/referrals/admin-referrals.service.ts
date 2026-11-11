import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { dayRange } from '../common/date-range';

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
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
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

  /** Paged and filtered list with a total, for the Referrals page. */
  async listPaged(params: { status?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const where: any = {};
    if (params.status) where.status = params.status;
    const range = dayRange(params.from, params.to);
    if (range) where.createdAt = range;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { referrer: { name: { contains: params.search, mode: 'insensitive' } } },
        { referee: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          referrer: { select: { id: true, name: true, referralCode: true } },
          referee: { select: { id: true, name: true, status: true, createdAt: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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
