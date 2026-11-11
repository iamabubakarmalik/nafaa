import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_TZ, addDaysTz, dateKeyTz, startOfDayTz, subDaysTz } from '../../common/helpers/business-time.helper';

/** Internal tenant that holds platform-owned records; never counted. */
const SYSTEM_SLUG = 'nafaa-system';
const ALLOWED_DAYS = [7, 14, 30, 90];

export interface DashboardAlert {
  id: string;
  level: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  count: number;
  to: string;
}

/**
 * Platform dashboard: one call returns everything the admin home screen
 * shows for a period (7/14/30/90 days), compared with the period before it.
 * Days are Pakistan calendar days (the server runs in UTC).
 */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(daysInput?: number) {
    const days = ALLOWED_DAYS.includes(Number(daysInput)) ? Number(daysInput) : 30;
    const now = new Date();
    const from = startOfDayTz(subDaysTz(now, days - 1));
    const prevFrom = subDaysTz(from, days);
    const week = subDaysTz(now, 7);
    const tenantScope = { slug: { not: SYSTEM_SLUG } };
    const completed = { status: 'COMPLETED' as const, tenant: tenantScope };

    const [
      tenantsByStatus,
      newTenants,
      newTenantsPrev,
      salesNow,
      salesPrev,
      activeShops,
      activeShopsPrev,
      activeSubs,
      churned,
      revenueNow,
      revenuePrev,
      daily,
      funnel,
      industries,
      alerts,
    ] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ['status'], where: tenantScope, _count: { _all: true } }),
      this.prisma.tenant.count({ where: { ...tenantScope, createdAt: { gte: from } } }),
      this.prisma.tenant.count({ where: { ...tenantScope, createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.sale.aggregate({ where: { ...completed, soldAt: { gte: from } }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.aggregate({ where: { ...completed, soldAt: { gte: prevFrom, lt: from } }, _sum: { total: true }, _count: { _all: true } }),
      this.countSellingShops(week, now),
      this.countSellingShops(subDaysTz(week, 7), week),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE', amount: { gt: 0 }, tenant: tenantScope },
        select: { amount: true, interval: true },
      }),
      this.prisma.subscription.count({
        where: { status: { in: ['CANCELLED', 'EXPIRED'] }, updatedAt: { gte: from }, tenant: tenantScope },
      }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', approvedAt: { gte: from } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', approvedAt: { gte: prevFrom, lt: from } }, _sum: { amount: true } }),
      this.daily(from, days),
      this.funnel(from),
      this.industries(from),
      this.alerts(now),
    ]);

    const statusCount = (s: string) => tenantsByStatus.find((x) => x.status === s)?._count._all ?? 0;
    const totalTenants = tenantsByStatus.reduce((n, x) => n + x._count._all, 0);
    let mrr = 0;
    for (const s of activeSubs) {
      mrr += s.interval === 'YEARLY' ? s.amount / 12 : s.interval === 'QUARTERLY' ? s.amount / 3 : s.amount;
    }

    return {
      range: { days, from: dateKeyTz(from), to: dateKeyTz(now), timezone: DEFAULT_TZ },
      kpis: {
        tenants: {
          total: totalTenants,
          active: statusCount('ACTIVE'),
          trial: statusCount('TRIAL'),
          suspended: statusCount('SUSPENDED'),
          new: newTenants,
          newPrev: newTenantsPrev,
        },
        sellingShops: { last7: activeShops, prev7: activeShopsPrev },
        gmv: { value: Math.round(salesNow._sum.total ?? 0), prev: Math.round(salesPrev._sum.total ?? 0) },
        bills: { value: salesNow._count._all, prev: salesPrev._count._all },
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        payingShops: activeSubs.length,
        churned,
        revenue: { value: revenueNow._sum.amount ?? 0, prev: revenuePrev._sum.amount ?? 0 },
      },
      daily,
      funnel,
      industries,
      alerts,
    };
  }

  /** Shops with at least one completed sale between two instants. */
  private async countSellingShops(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.sale.groupBy({
      by: ['tenantId'],
      where: { status: 'COMPLETED', soldAt: { gte: from, lt: to }, tenant: { slug: { not: SYSTEM_SLUG } } },
    });
    return rows.length;
  }

  /** Per Pakistan day: signups, bills, sales value and approved payments. */
  private async daily(from: Date, days: number) {
    const tz = Prisma.raw(`'${DEFAULT_TZ.replace(/'/g, '')}'`);
    const [sales, signups, payments] = await Promise.all([
      this.prisma.$queryRaw<Array<{ day: string; bills: bigint; gmv: number | null }>>`
        SELECT to_char(s."soldAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS bills, SUM(s.total)::float8 AS gmv
        FROM "Sale" s JOIN "Tenant" t ON t.id = s."tenantId"
        WHERE s.status = 'COMPLETED' AND s."soldAt" >= ${from} AND t.slug <> ${SYSTEM_SLUG}
        GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ day: string; n: bigint }>>`
        SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS n
        FROM "Tenant" WHERE "createdAt" >= ${from} AND slug <> ${SYSTEM_SLUG}
        GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ day: string; amount: number | null }>>`
        SELECT to_char("approvedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day, SUM(amount)::float8 AS amount
        FROM "Payment" WHERE status = 'APPROVED' AND "approvedAt" >= ${from}
        GROUP BY 1`,
    ]);
    const salesBy = new Map(sales.map((r) => [r.day, r]));
    const signupsBy = new Map(signups.map((r) => [r.day, Number(r.n)]));
    const paymentsBy = new Map(payments.map((r) => [r.day, r.amount ?? 0]));
    return Array.from({ length: days }, (_, i) => {
      const date = dateKeyTz(addDaysTz(from, i));
      const s = salesBy.get(date);
      return {
        date,
        signups: signupsBy.get(date) ?? 0,
        bills: s ? Number(s.bills) : 0,
        gmv: Math.round(s?.gmv ?? 0),
        revenue: Math.round(paymentsBy.get(date) ?? 0),
      };
    });
  }

  /** What happened to the shops that signed up in the period. */
  private async funnel(from: Date) {
    const scope = { slug: { not: SYSTEM_SLUG }, createdAt: { gte: from } };
    const [signedUp, setupDone, firstProduct, firstSale, paying] = await Promise.all([
      this.prisma.tenant.count({ where: scope }),
      this.prisma.tenant.count({ where: { ...scope, onboardingProgress: { some: { OR: [{ isCompleted: true }, { isSkipped: true }] } } } }),
      this.prisma.tenant.count({ where: { ...scope, products: { some: {} } } }),
      this.prisma.tenant.count({ where: { ...scope, sales: { some: { status: 'COMPLETED' } } } }),
      this.prisma.tenant.count({ where: { ...scope, subscriptions: { some: { status: 'ACTIVE', amount: { gt: 0 } } } } }),
    ]);
    return [
      { key: 'signedUp', label: 'Signed up', count: signedUp },
      { key: 'setupDone', label: 'Finished setup', count: setupDone },
      { key: 'firstProduct', label: 'Added a product', count: firstProduct },
      { key: 'firstSale', label: 'Made a sale', count: firstSale },
      { key: 'paying', label: 'Paying', count: paying },
    ];
  }

  /** Industries by number of shops, with how many sold in the period and their sales value. */
  private async industries(from: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ type: string | null; shops: bigint; selling: bigint; gmv: number | null }>>`
      SELECT t."businessType" AS type,
             COUNT(DISTINCT t.id)::bigint AS shops,
             COUNT(DISTINCT s."tenantId")::bigint AS selling,
             COALESCE(SUM(s.total), 0)::float8 AS gmv
      FROM "Tenant" t
      LEFT JOIN "Sale" s ON s."tenantId" = t.id AND s.status = 'COMPLETED' AND s."soldAt" >= ${from}
      WHERE t.slug <> ${SYSTEM_SLUG}
      GROUP BY t."businessType"
      ORDER BY shops DESC
      LIMIT 10`;
    return rows.map((r) => ({ type: r.type ?? 'UNKNOWN', shops: Number(r.shops), selling: Number(r.selling), gmv: Math.round(r.gmv ?? 0) }));
  }

  /** Things that need an admin's attention now. */
  private async alerts(now: Date): Promise<DashboardAlert[]> {
    const soon = addDaysTz(now, 3);
    const [pendingPayments, trialsEnding, pastDue, suspended, stuckSetup] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.subscription.count({ where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: soon }, tenant: { slug: { not: SYSTEM_SLUG } } } }),
      this.prisma.subscription.count({ where: { status: { in: ['PAST_DUE', 'PENDING_PAYMENT'] }, tenant: { slug: { not: SYSTEM_SLUG } } } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED', slug: { not: SYSTEM_SLUG } } }),
      this.prisma.tenant.count({
        where: {
          slug: { not: SYSTEM_SLUG },
          createdAt: { gte: subDaysTz(now, 7), lte: subDaysTz(now, 1) },
          onboardingProgress: { some: { isCompleted: false, isSkipped: false } },
        },
      }),
    ]);
    const list: DashboardAlert[] = [];
    if (pendingPayments) list.push({ id: 'pending-payments', level: 'danger', title: 'Payments waiting for approval', detail: 'Shops paid and are waiting for their plan to start.', count: pendingPayments, to: '/billing' });
    if (pastDue) list.push({ id: 'past-due', level: 'warning', title: 'Subscriptions past due', detail: 'Renewal is due and no payment has been approved yet.', count: pastDue, to: '/subscriptions' });
    if (trialsEnding) list.push({ id: 'trials-ending', level: 'warning', title: 'Trials ending in 3 days', detail: 'Good moment to call and help them choose a plan.', count: trialsEnding, to: '/subscriptions' });
    if (stuckSetup) list.push({ id: 'stuck-setup', level: 'info', title: 'New shops stuck in setup', detail: 'Signed up this week and have not finished setup.', count: stuckSetup, to: '/tenants' });
    if (suspended) list.push({ id: 'suspended', level: 'info', title: 'Suspended shops', detail: 'Their staff cannot sign in until you reactivate them.', count: suspended, to: '/tenants?status=SUSPENDED' });
    return list;
  }
}
