/**
 * Dashboard insights over a period: daily trend, payment mix, sales by
 * category, by staff member, by weekday, best customers, and a 6 or 12
 * month comparison.
 *
 * Unlike the older /reports endpoints these use the tenant's timezone and
 * business-day start, and only read the selected period (1, 7, 30 or 90 days).
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  dateKeyTz, startOfBusinessDayTz, startOfBusinessMonthTz, subDaysTz, tzParts, weekdayInTz,
} from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';

const SOLD = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;
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
    const saleWhere = { tenantId, status: { in: [...SOLD] }, soldAt: { gte: from }, ...(shopId && { shopId }) };

    const [lines, sellerGroups, customerGroups, saleTimes] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: { sale: saleWhere, productId: { not: null } },
        select: { productId: true, quantity: true, returnedQty: true, total: true, costPrice: true },
      }),
      this.prisma.sale.groupBy({
        by: ['soldById', 'createdById'],
        where: saleWhere,
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { ...saleWhere, customerId: { not: null } },
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 20,
      }),
      this.prisma.sale.findMany({ where: saleWhere, select: { soldAt: true, total: true, costOfGoods: true, paymentMethod: true, paidAmount: true, creditAmount: true } }),
    ]);

    const productIds = [...new Set(lines.map((l) => l.productId!))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: { select: { id: true, name: true, color: true } } },
    });
    const catOf = new Map(products.map((p) => [p.id, p.category]));

    const cats = new Map<string, { id: string | null; name: string; color: string | null; revenue: number; qty: number; cost: number }>();
    for (const l of lines) {
      const c = catOf.get(l.productId!);
      const key = c?.id ?? 'none';
      const row = cats.get(key) ?? { id: c?.id ?? null, name: c?.name ?? 'Uncategorized', color: c?.color ?? null, revenue: 0, qty: 0, cost: 0 };
      const qty = l.quantity - l.returnedQty;
      row.revenue += l.total;
      row.qty += qty;
      row.cost += l.costPrice * qty;
      cats.set(key, row);
    }
    const categories = [...cats.values()]
      .map((c) => ({ ...c, profit: c.revenue - c.cost }))
      .sort((a, b) => b.revenue - a.revenue);

    // Staff: whoever made the sale, falling back to whoever rang it up.
    const sellers = new Map<string, { total: number; profit: number; bills: number }>();
    for (const s of sellerGroups) {
      const id = s.soldById ?? s.createdById;
      if (!id) continue;
      const cur = sellers.get(id) ?? { total: 0, profit: 0, bills: 0 };
      cur.total += n(s._sum.total);
      cur.profit += n(s._sum.total) - n(s._sum.costOfGoods);
      cur.bills += s._count._all;
      sellers.set(id, cur);
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
        return c ? { customerId: c.id, name: c.name, phone: c.phone, balance: n(c.balance), total: n(g._sum.total), bills: g._count._all } : null;
      })
      .filter(Boolean);

    // Weekday averages divide by how often each weekday occurred in the window.
    const weekday = Array.from({ length: 7 }, (_, day) => ({ day, total: 0, bills: 0, occurrences: 0, average: 0 }));
    for (let i = 0; i < days; i++) weekday[weekdayInTz(subDaysTz(todayStart, i, tz), tz)].occurrences += 1;
    for (const s of saleTimes) {
      // Shift by the business-day start so a 1 AM sale counts for the previous day.
      const w = weekday[weekdayInTz(new Date(s.soldAt.getTime() - dayStartHour * 3600_000), tz)];
      w.total += s.total;
      w.bills += 1;
    }
    weekday.forEach((w) => { w.average = w.occurrences ? w.total / w.occurrences : 0; });

    // Daily series for the trend chart, one bucket per business day.
    const trendMap = new Map<string, { date: string; sales: number; profit: number; bills: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const key = dateKeyTz(subDaysTz(todayStart, i, tz), tz);
      trendMap.set(key, { date: key, sales: 0, profit: 0, bills: 0 });
    }
    // Money in by payment method (credit kept apart as udhaar).
    const payMap = new Map<string, { method: string; collected: number; bills: number }>();
    let credit = 0;
    for (const s of saleTimes) {
      const key = dateKeyTz(new Date(s.soldAt.getTime() - dayStartHour * 3600_000), tz);
      const t = trendMap.get(key);
      if (t) { t.sales += s.total; t.profit += s.total - s.costOfGoods; t.bills += 1; }
      const p = payMap.get(s.paymentMethod) ?? { method: s.paymentMethod, collected: 0, bills: 0 };
      p.collected += s.paidAmount;
      p.bills += 1;
      payMap.set(s.paymentMethod, p);
      credit += s.creditAmount;
    }
    const payments = [...payMap.values()].sort((a, b) => b.collected - a.collected);

    return {
      days, from, categories, staff, topCustomers, weekday,
      trend: [...trendMap.values()],
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
    const shop = shopId ? { shopId } : {};
    return Promise.all(bounds.map(async (b) => {
      const [s, e] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { tenantId, status: { in: [...SOLD] }, soldAt: { gte: b.from, lt: b.to }, ...shop },
          _sum: { total: true, costOfGoods: true },
          _count: { _all: true },
        }),
        this.prisma.expense.aggregate({
          where: { tenantId, status: 'PAID', expenseDate: { gte: b.from, lt: b.to }, ...shop },
          _sum: { amount: true },
        }),
      ]);
      const sales = n(s._sum.total);
      const expenses = n(e._sum.amount);
      return {
        month: `${b.year}-${String(b.month).padStart(2, '0')}`,
        sales,
        bills: s._count._all,
        expenses,
        profit: sales - n(s._sum.costOfGoods) - expenses,
      };
    }));
  }
}
