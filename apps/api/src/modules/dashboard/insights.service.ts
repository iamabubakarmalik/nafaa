/**
 * Dashboard insights over a period: daily trend, payment mix, sales by
 * category, by staff member, by weekday, best customers, and a 6 or 12
 * month comparison.
 *
 * Unlike the older /reports endpoints these use the tenant's timezone and
 * business-day start, and only read the selected period (1, 7, 30 or 90 days).
 * Sales are net of returns on the bill's own day; cost, profit and cash
 * follow business-math.helper.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  dateKeyTz, startOfBusinessDayTz, startOfBusinessMonthTz, subDaysTz, tzParts, weekdayInTz,
} from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import {
  KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, LIVE_BILL, billMathCte, liveSaleSql, profitFigures, saleFiguresBy,
} from '../../common/helpers/business-math.helper';
const PERIODS = [1, 7, 30, 90] as const;
const n = (v: unknown) => Number(v ?? 0);

export type InsightPeriod = (typeof PERIODS)[number];
export const toPeriod = (v?: string): InsightPeriod => {
  const d = Number(v);
  return (PERIODS as readonly number[]).includes(d) ? (d as InsightPeriod) : 30;
};

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async insights(user: AuthenticatedUser, shopId: string | undefined, days: InsightPeriod, months: 6 | 12 = 6) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const todayStart = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    const from = subDaysTz(todayStart, days - 1, tz);
    const tenantId = user.tenantId;
    const saleWhere = { tenantId, status: LIVE_BILL, soldAt: { gte: from }, ...(shopId && { shopId }) };
    const live = liveSaleSql({ tenantId, shopId }, { gte: from });
    const businessDay = Prisma.sql`to_char(((s."soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) - make_interval(hours => ${dayStartHour}::int), 'YYYY-MM-DD')`;

    const [catRows, sellerFigures, dayFigures, customerGroups, saleTimes] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string | null; name: string | null; color: string | null; revenue: number; qty: number; cost: number }>>`
        WITH ${billMathCte(live)}
        SELECT c.id, c.name, c.color, COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue,
          COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty, COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
        ${LINE_COST_JOINS}
        LEFT JOIN "Category" c ON c.id = bm_p."categoryId"
        WHERE ${live} AND si."productId" IS NOT NULL
        GROUP BY 1, 2, 3`,
      // Staff: whoever made the sale, falling back to whoever rang it up.
      saleFiguresBy(this.prisma, live, Prisma.sql`COALESCE(s."soldById", s."createdById")`),
      saleFiguresBy(this.prisma, live, businessDay),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { ...saleWhere, customerId: { not: null } },
        _sum: { total: true, refundedAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 20,
      }),
      this.prisma.sale.findMany({
        where: saleWhere,
        select: { soldAt: true, total: true, refundedAmount: true, creditAmount: true, payments: { select: { method: true, amount: true } } },
      }),
    ]);

    const categories = catRows
      .map((c) => ({ id: c.id, name: c.name ?? 'Uncategorized', color: c.color, revenue: c.revenue, qty: c.qty, cost: c.cost, profit: c.revenue - c.cost }))
      .sort((a, b) => b.revenue - a.revenue);

    const sellers = new Map<string, { total: number; profit: number; bills: number }>();
    for (const [id, f] of sellerFigures) {
      if (id) sellers.set(id, { total: f.net, profit: f.grossProfit, bills: f.bills });
    }
    const customerIds = customerGroups.map((c) => c.customerId!).filter(Boolean);
    const [users, customers] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: [...sellers.keys()] } }, select: { id: true, fullName: true, role: true, avatarUrl: true } }),
      this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true, balance: true } }),
    ]);
    const staff = users
      .map((u) => {
        const s = sellers.get(u.id)!;
        return { userId: u.id, name: u.fullName, role: u.role, avatarUrl: u.avatarUrl, ...s, average: s.bills ? s.total / s.bills : 0 };
      })
      .sort((a, b) => b.total - a.total);

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const topCustomers = customerGroups
      .map((g) => {
        const c = customerMap.get(g.customerId!);
        return c ? { customerId: c.id, name: c.name, phone: c.phone, balance: n(c.balance), total: n(g._sum.total) - n(g._sum.refundedAmount), bills: g._count._all } : null;
      })
      .filter(Boolean);

    // Weekday averages divide by how often each weekday occurred in the window.
    const weekday = Array.from({ length: 7 }, (_, day) => ({ day, total: 0, bills: 0, occurrences: 0, average: 0 }));
    for (let i = 0; i < days; i++) weekday[weekdayInTz(subDaysTz(todayStart, i, tz), tz)].occurrences += 1;
    for (const s of saleTimes) {
      // Shift by the business-day start so a 1 AM sale counts for the previous day.
      const w = weekday[weekdayInTz(new Date(s.soldAt.getTime() - dayStartHour * 3600_000), tz)];
      w.total += s.total - s.refundedAmount;
      w.bills += 1;
    }
    weekday.forEach((w) => { w.average = w.occurrences ? w.total / w.occurrences : 0; });

    // Daily series for the trend chart, one bucket per business day.
    const trend = Array.from({ length: days }, (_, i) => {
      const date = dateKeyTz(subDaysTz(todayStart, days - 1 - i, tz), tz);
      const f = dayFigures.get(date);
      return { date, sales: f?.net ?? 0, profit: f?.grossProfit ?? 0, bills: f?.bills ?? 0 };
    });
    // Money in by payment method from each bill's payment rows (credit kept
    // apart as udhaar; trade-in is goods, not money).
    const payMap = new Map<string, { method: string; collected: number; bills: number }>();
    let credit = 0;
    for (const s of saleTimes) {
      for (const row of s.payments) {
        if (row.method === 'TRADE_IN') continue;
        const p = payMap.get(row.method) ?? { method: row.method, collected: 0, bills: 0 };
        p.collected += row.amount;
        p.bills += 1;
        payMap.set(row.method, p);
      }
      credit += s.creditAmount;
    }
    const payments = [...payMap.values()].sort((a, b) => b.collected - a.collected);

    return {
      days, from, categories, staff, topCustomers, weekday,
      trend,
      payments, credit,
      monthly: await this.monthly(tenantId, shopId, tz, dayStartHour, months),
    };
  }

  private async monthly(tenantId: string, shopId: string | undefined, tz: string, dayStartHour: number, count: number) {
    const now = tzParts(new Date(), tz);
    const months = Array.from({ length: count }, (_, i) => {
      const d = new Date(Date.UTC(now.year, now.month - 1 - (count - 1 - i), 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
    const bounds = months.map((m, i) => {
      const next = i + 1 < months.length ? months[i + 1] : { year: m.month === 12 ? m.year + 1 : m.year, month: (m.month % 12) + 1 };
      return {
        ...m,
        from: startOfBusinessMonthTz(m.year, m.month, tz, dayStartHour),
        to: startOfBusinessMonthTz(next.year, next.month, tz, dayStartHour),
      };
    });
    return Promise.all(bounds.map(async (b) => {
      const f = await profitFigures(this.prisma, { tenantId, shopId }, { gte: b.from, lt: b.to });
      return {
        month: `${b.year}-${String(b.month).padStart(2, '0')}`,
        sales: f.sales.net,
        bills: f.sales.bills,
        expenses: f.expenses,
        profit: f.netProfit,
      };
    }));
  }
}
