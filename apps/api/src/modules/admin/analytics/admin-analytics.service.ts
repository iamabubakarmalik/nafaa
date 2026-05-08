import { Injectable } from '@nestjs/common';
import { startOfMonth, subMonths, format } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async mrrArr() {
    const active = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
    });

    let mrr = 0;
    for (const s of active) {
      if (s.interval === 'MONTHLY') mrr += s.amount;
      else if (s.interval === 'QUARTERLY') mrr += s.amount / 3;
      else if (s.interval === 'YEARLY') mrr += s.amount / 12;
    }

    return {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      activeSubscriptions: active.length,
    };
  }

  async monthlyRevenue(months = 12) {
    const start = startOfMonth(subMonths(new Date(), months - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: { gte: start, not: null },
      },
      select: { approvedAt: true, amount: true },
    });

    const buckets: Record<string, { month: string; revenue: number }> = {};
    for (let i = 0; i < months; i++) {
      const m = format(subMonths(new Date(), months - 1 - i), 'yyyy-MM');
      buckets[m] = { month: m, revenue: 0 };
    }

    for (const p of payments) {
      if (!p.approvedAt) continue;
      const key = format(p.approvedAt, 'yyyy-MM');
      if (buckets[key]) buckets[key].revenue += p.amount;
    }

    return Object.values(buckets);
  }

  async churn(months = 6) {
    const start = startOfMonth(subMonths(new Date(), months - 1));

    const cancelled = await this.prisma.subscription.findMany({
      where: {
        status: 'CANCELLED',
        cancelledAt: { gte: start, not: null },
      },
      select: { cancelledAt: true },
    });

    const buckets: Record<string, { month: string; churned: number }> = {};
    for (let i = 0; i < months; i++) {
      const m = format(subMonths(new Date(), months - 1 - i), 'yyyy-MM');
      buckets[m] = { month: m, churned: 0 };
    }

    for (const c of cancelled) {
      if (!c.cancelledAt) continue;
      const key = format(c.cancelledAt, 'yyyy-MM');
      if (buckets[key]) buckets[key].churned += 1;
    }

    return Object.values(buckets);
  }

  async topRevenueTenants() {
    const payments = await this.prisma.payment.groupBy({
      by: ['tenantId'],
      where: { status: 'APPROVED' },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const tenantIds = payments.map((p) => p.tenantId);
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, status: true },
    });
    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    return payments.map((p) => ({
      tenantId: p.tenantId,
      tenant: tenantMap.get(p.tenantId),
      totalPaid: p._sum.amount ?? 0,
      paymentsCount: p._count._all,
    }));
  }
}
