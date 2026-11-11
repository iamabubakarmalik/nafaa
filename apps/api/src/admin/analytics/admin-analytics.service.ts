import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { dateKeyTz, startOfMonthTz, subMonthsTz } from '../../common/helpers/business-time.helper';

// Month keys (yyyy-MM) follow the business time zone, not the server's UTC clock.
const monthKey = (d: Date) => dateKeyTz(d).slice(0, 7);
const REAL = { tenant: { slug: { not: 'nafaa-system' } } };

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async mrrArr() {
    const active = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', ...REAL },
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
    const months_ = Math.min(36, Math.max(1, months));
    const start = startOfMonthTz(subMonthsTz(new Date(), months_ - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'APPROVED',
        ...REAL,
        approvedAt: { gte: start, not: null },
      },
      select: { approvedAt: true, amount: true },
    });

    const buckets: Record<string, { month: string; revenue: number }> = {};
    for (let i = 0; i < months_; i++) {
      const m = monthKey(subMonthsTz(new Date(), months_ - 1 - i));
      buckets[m] = { month: m, revenue: 0 };
    }

    for (const p of payments) {
      if (!p.approvedAt) continue;
      const key = monthKey(p.approvedAt);
      if (buckets[key]) buckets[key].revenue += p.amount;
    }

    return Object.values(buckets);
  }

  async churn(months = 6) {
    const months_ = Math.min(36, Math.max(1, months));
    const start = startOfMonthTz(subMonthsTz(new Date(), months_ - 1));

    const cancelled = await this.prisma.subscription.findMany({
      where: {
        status: 'CANCELLED',
        ...REAL,
        cancelledAt: { gte: start, not: null },
      },
      select: { cancelledAt: true },
    });

    const buckets: Record<string, { month: string; churned: number }> = {};
    for (let i = 0; i < months_; i++) {
      const m = monthKey(subMonthsTz(new Date(), months_ - 1 - i));
      buckets[m] = { month: m, churned: 0 };
    }

    for (const c of cancelled) {
      if (!c.cancelledAt) continue;
      const key = monthKey(c.cancelledAt);
      if (buckets[key]) buckets[key].churned += 1;
    }

    return Object.values(buckets);
  }

  async topRevenueTenants(limit = 10) {
    const payments = await this.prisma.payment.groupBy({
      by: ['tenantId'],
      where: { status: 'APPROVED', ...REAL },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: Math.min(50, Math.max(1, limit)),
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

  /** Active subscriptions and monthly recurring revenue per plan. */
  async planMix() {
    const active = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', ...REAL },
      select: { amount: true, interval: true, plan: { select: { id: true, name: true } } },
    });
    const months: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };
    const byPlan = new Map<string, { planId: string; name: string; subscriptions: number; mrr: number }>();
    for (const s of active) {
      const row = byPlan.get(s.plan.id) ?? { planId: s.plan.id, name: s.plan.name, subscriptions: 0, mrr: 0 };
      row.subscriptions += 1;
      row.mrr += s.amount / (months[s.interval] ?? 1);
      byPlan.set(s.plan.id, row);
    }
    return [...byPlan.values()].map((r) => ({ ...r, mrr: Math.round(r.mrr) })).sort((a, b) => b.mrr - a.mrr);
  }
}
