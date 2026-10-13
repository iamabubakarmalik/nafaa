import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfDay, subDays, format } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import {
  dateKeyTz, startOfBusinessDayTz, startOfBusinessMonthTz, subDaysTz, tzParts,
} from '../../../common/helpers/business-time.helper';
import {
  LIVE_BILL, emptySaleFigures, liveSaleSql, paidExpenseSql, profitFigures, saleFiguresBy,
} from '../../../common/helpers/business-math.helper';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** The last `days` business days in the shop's timezone, and a SQL key for the business day of a column. */
  private async days(tenantId: string, days: number) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    return {
      start: subDaysTz(today, days - 1, tz),
      keys: Array.from({ length: days }, (_, i) => dateKeyTz(subDaysTz(today, days - 1 - i, tz), tz)),
      dayOf: (col: Prisma.Sql) => Prisma.sql`to_char(((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) - make_interval(hours => ${dayStartHour}::int), 'YYYY-MM-DD')`,
    };
  }

  // ─── 1. Sales Trend (line/area chart) ──────────────────────
  async salesTrend(user: AuthenticatedUser, scope: ShopScope, days = 14) {
    const w = await this.days(user.tenantId, days);
    const byDay = await saleFiguresBy(
      this.prisma, liveSaleSql({ tenantId: user.tenantId, shopId: scope.shopId }, { gte: w.start }), w.dayOf(Prisma.sql`s."soldAt"`),
    );
    return w.keys.map((date) => {
      const f = byDay.get(date) ?? emptySaleFigures();
      return { date, sales: f.net, profit: f.grossProfit, cost: f.cost, orders: f.bills, paid: f.cashIn, credit: f.credit };
    });
  }

  // ─── 2. Top Products with Profit ───────────────────────────
  async topProducts(user: AuthenticatedUser, scope: ShopScope, limit = 10) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId: user.tenantId, ...scope.where, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      },
      _sum: { quantity: true, total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds.filter((id): id is string => !!id) } },
      select: {
        id: true, name: true, sku: true, unit: true, price: true,
        costPrice: true, stock: true,
        images: { take: 1, select: { url: true } },
      },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    return items.map((i) => {
      const product = i.productId ? map.get(i.productId) : undefined;
      const revenue = i._sum.total ?? 0;
      const qty = i._sum.quantity ?? 0;
      const cost = product ? product.costPrice * qty : 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        productId: i.productId,
        product,
        quantitySold: qty,
        revenue,
        profit,
        margin,
        orderCount: i._count._all,
      };
    });
  }

  // ─── 3. Category Breakdown ─────────────────────────────────
  async categoryBreakdown(user: AuthenticatedUser, scope: ShopScope) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: { tenantId: user.tenantId, ...scope.where, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      },
      include: { product: { include: { category: true } } },
    });

    const buckets: Record<string, any> = {};
    for (const item of items) {
      // `continue`, `return` nahi — repair/used-phone line ka product null hota
      // hai aur `return` poore function ko undefined kar deta tha, jis se har
      // industry ka category chart khaali aa jata tha.
      if (!item.product) continue;
      const cat = item.product.category;
      const key = cat?.id || 'uncategorized';
      const name = cat?.name || 'Uncategorized';
      const color = cat?.color || '#94a3b8';
      if (!buckets[key]) {
        buckets[key] = { id: key, name, color, revenue: 0, quantity: 0, orderCount: 0, cost: 0 };
      }
      buckets[key].revenue += item.total;
      buckets[key].quantity += item.quantity;
      buckets[key].orderCount += 1;
      buckets[key].cost += item.costPrice * item.quantity;
    }

    return Object.values(buckets)
      .map((c: any) => ({
        ...c,
        profit: c.revenue - c.cost,
        margin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);
  }

  // ─── 4. Payment Methods ────────────────────────────────────
  /** Money taken per method, from the bills' payment rows (a split bill counts under each of its methods). */
  async paymentMethods(user: AuthenticatedUser, scope: ShopScope) {
    const result = await this.prisma.salePayment.groupBy({
      by: ['method'],
      where: { tenantId: user.tenantId, sale: { tenantId: user.tenantId, ...scope.where, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const grandTotal = result.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
    return result
      .map((r) => ({
        paymentMethod: r.method,
        total: r._sum.amount ?? 0,
        paid: r._sum.amount ?? 0,
        count: r._count._all,
        percent: grandTotal > 0 ? ((r._sum.amount ?? 0) / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ─── 5. Hourly Sales Today ─────────────────────────────────
  async hourlySalesToday(user: AuthenticatedUser, scope: ShopScope) {
    const todayStart = startOfDay(new Date());
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        soldAt: { gte: todayStart },
      },
      select: { soldAt: true, total: true },
    });

    const buckets: Record<number, { hour: number; sales: number; orders: number }> = {};
    for (let h = 0; h < 24; h++) buckets[h] = { hour: h, sales: 0, orders: 0 };
    for (const s of sales) {
      const h = new Date(s.soldAt).getHours();
      if (buckets[h]) {
        buckets[h].sales += s.total;
        buckets[h].orders += 1;
      }
    }
    return Object.values(buckets);
  }

  // ─── 6. Cashier Performance ────────────────────────────────
  async cashierPerformance(user: AuthenticatedUser, scope: ShopScope, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const sales = await this.prisma.sale.groupBy({
      by: ['createdById'],
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        soldAt: { gte: start },
      },
      _sum: { total: true },
      _count: { _all: true },
    });

    const userIds = sales.map((s) => s.createdById).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return sales
      .map((s) => ({
        userId: s.createdById,
        user: s.createdById ? userMap.get(s.createdById) : null,
        totalSales: s._sum.total ?? 0,
        orderCount: s._count._all,
        avgOrderValue: s._count._all > 0 ? (s._sum.total ?? 0) / s._count._all : 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }

  // ─── 7. Top Customers ──────────────────────────────────────
  async topCustomers(user: AuthenticatedUser, scope: ShopScope, limit = 10) {
    const sales = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        customerId: { not: null },
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const customerIds = sales.map((s) => s.customerId).filter(Boolean) as string[];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true, name: true, phone: true, balance: true,
        loyaltyPoints: true, isVip: true, avatarUrl: true,
      },
    });
    const map = new Map(customers.map((c) => [c.id, c]));

    return sales.map((s) => ({
      customerId: s.customerId,
      customer: s.customerId ? map.get(s.customerId) : null,
      totalSpent: s._sum.total ?? 0,
      orderCount: s._count._all,
      avgOrderValue: s._count._all > 0 ? (s._sum.total ?? 0) / s._count._all : 0,
    }));
  }

  // ─── 8. Inventory Value ────────────────────────────────────
  async inventoryValue(user: AuthenticatedUser, scope: ShopScope) {
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      include: { category: true },
    });

    // `Product.stock` is the tenant-wide total. On one branch the question is
    // "what is sitting on *my* shelves", so read that branch's rows instead.
    let stockOf = (p: { id: string; stock: number }) => p.stock;
    if (scope.shopId) {
      const rows = await this.prisma.shopStock.groupBy({
        by: ['productId'],
        where: { shopId: scope.shopId, isActive: true },
        _sum: { stock: true },
      });
      const branch = new Map(
        rows.map((r) => [r.productId, Number(r._sum.stock ?? 0)]),
      );
      stockOf = (p) => branch.get(p.id) ?? 0;
    }

    const byCategory: Record<string, any> = {};
    let totalCost = 0, totalSell = 0, totalUnits = 0;

    for (const p of products) {
      const stock = stockOf(p);
      const cost = p.costPrice * stock;
      const sell = p.price * stock;
      totalCost += cost;
      totalSell += sell;
      totalUnits += stock;

      const cat = p.category;
      const key = cat?.id || 'uncategorized';
      const name = cat?.name || 'Uncategorized';
      const color = cat?.color || '#94a3b8';

      if (!byCategory[key]) {
        byCategory[key] = { id: key, name, color, productCount: 0, totalStock: 0, costValue: 0, sellValue: 0 };
      }
      byCategory[key].productCount += 1;
      byCategory[key].totalStock += stock;
      byCategory[key].costValue += cost;
      byCategory[key].sellValue += sell;
    }

    return {
      totals: {
        totalProducts: products.length,
        totalUnits,
        totalCostValue: totalCost,
        totalSellValue: totalSell,
        potentialProfit: totalSell - totalCost,
        potentialMargin: totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0,
      },
      byCategory: Object.values(byCategory).sort((a: any, b: any) => b.costValue - a.costValue),
    };
  }

  // ─── 9. Expense Breakdown ──────────────────────────────────
  async expenseBreakdown(user: AuthenticatedUser, scope: ShopScope, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId: user.tenantId, ...scope.where, status: 'PAID', expenseDate: { gte: start } },
      include: { category: true },
    });

    const byCategory: Record<string, any> = {};
    let total = 0;
    for (const e of expenses) {
      total += e.amount;
      const cat = e.category;
      const key = cat?.id || 'uncategorized';
      const name = cat?.name || 'Uncategorized';
      const color = cat?.color || '#94a3b8';
      if (!byCategory[key]) {
        byCategory[key] = { id: key, name, color, amount: 0, count: 0 };
      }
      byCategory[key].amount += e.amount;
      byCategory[key].count += 1;
    }

    return {
      total,
      count: expenses.length,
      byCategory: Object.values(byCategory)
        .map((c: any) => ({ ...c, percent: total > 0 ? (c.amount / total) * 100 : 0 }))
        .sort((a: any, b: any) => b.amount - a.amount),
    };
  }

  // ─── 10. Profit & Loss ─────────────────────────────────────
  /** Same rules as the P&L page (business-math.helper); returns count against their bill's day. */
  async profitAndLoss(user: AuthenticatedUser, scope: ShopScope, days = 30) {
    const { start } = await this.days(user.tenantId, days);
    const math = { tenantId: user.tenantId, shopId: scope.shopId };
    const [f, returnCount, purchasesAgg] = await Promise.all([
      profitFigures(this.prisma, math, { gte: start }),
      this.prisma.saleReturn.count({ where: { tenantId: user.tenantId, sale: { ...scope.where, status: LIVE_BILL, soldAt: { gte: start } } } }),
      this.prisma.purchase.aggregate({
        where: { tenantId: user.tenantId, ...scope.where, status: 'RECEIVED', purchasedAt: { gte: start } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);
    const t = f.sales;
    return {
      period: { days, startDate: start.toISOString() },
      revenue: t.gross,
      returns: t.refunds,
      netRevenue: t.net,
      cogs: t.cost,
      grossProfit: t.grossProfit,
      grossMargin: t.net > 0 ? (t.grossProfit / t.net) * 100 : 0,
      expenses: f.expenses,
      writeOffs: f.writeOffs.net,
      netProfit: f.netProfit,
      netMargin: t.net > 0 ? (f.netProfit / t.net) * 100 : 0,
      orderCount: t.bills,
      returnCount,
      paid: t.cashIn,
      credit: t.credit,
      discount: t.discount,
      purchases: purchasesAgg._sum.total ?? 0,
      purchaseCount: purchasesAgg._count._all,
    };
  }

  // ─── 11. NEW: Weekday Pattern (which days are best) ────────
  async weekdayPattern(user: AuthenticatedUser, scope: ShopScope, days = 90) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        soldAt: { gte: start },
      },
      select: { soldAt: true, total: true },
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = Array.from({ length: 7 }, (_, i) => ({
      day: dayNames[i],
      dayIndex: i,
      sales: 0,
      orders: 0,
      avg: 0,
      count: 0,
    }));

    const daysSeen: Record<string, Set<number>> = {};
    for (const s of sales) {
      const d = new Date(s.soldAt);
      const dayIdx = d.getDay();
      const dateKey = format(d, 'yyyy-MM-dd');
      buckets[dayIdx].sales += s.total;
      buckets[dayIdx].orders += 1;
      if (!daysSeen[dayIdx]) daysSeen[dayIdx] = new Set();
      daysSeen[dayIdx].add(dayIdx);
    }

    // Calculate avg per occurrence
    for (let i = 0; i < 7; i++) {
      const occurrences = Math.ceil(days / 7);
      buckets[i].avg = occurrences > 0 ? buckets[i].sales / occurrences : 0;
    }

    return buckets;
  }

  // ─── 12. NEW: Monthly Comparison (last 6 months) ───────────
  async monthlyComparison(user: AuthenticatedUser, scope: ShopScope) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const now = tzParts(new Date(), tz);
    const math = { tenantId: user.tenantId, shopId: scope.shopId };
    return Promise.all([5, 4, 3, 2, 1, 0].map(async (back) => {
      const from = startOfBusinessMonthTz(now.year, now.month - back, tz, dayStartHour);
      const to = startOfBusinessMonthTz(now.year, now.month - back + 1, tz, dayStartHour);
      const f = await profitFigures(this.prisma, math, { gte: from, lt: to });
      const label = new Date(Date.UTC(now.year, now.month - 1 - back, 1));
      return {
        month: format(label, 'MMM yy'),
        sales: f.sales.net,
        profit: f.netProfit,
        expenses: f.expenses,
        orders: f.sales.bills,
      };
    }));
  }

  // ─── 13. NEW: Sales vs Expenses (radar/composed) ───────────
  async salesVsExpenses(user: AuthenticatedUser, scope: ShopScope, days = 30) {
    const w = await this.days(user.tenantId, days);
    const math = { tenantId: user.tenantId, shopId: scope.shopId };
    const [byDay, expenses] = await Promise.all([
      saleFiguresBy(this.prisma, liveSaleSql(math, { gte: w.start }), w.dayOf(Prisma.sql`s."soldAt"`)),
      this.prisma.$queryRaw<Array<{ day: string; amount: number }>>`
        SELECT ${w.dayOf(Prisma.sql`e."expenseDate"`)} AS day, COALESCE(SUM(e.amount), 0)::float8 AS amount
        FROM "Expense" e WHERE ${paidExpenseSql(math, { gte: w.start })} GROUP BY 1`,
    ]);
    const spent = new Map(expenses.map((e) => [e.day, e.amount]));
    return w.keys.map((date) => {
      const f = byDay.get(date) ?? emptySaleFigures();
      return { date, sales: f.net, expenses: spent.get(date) ?? 0, profit: f.grossProfit };
    });
  }

  // ─── 14. NEW: Customer Acquisition Trend ──────────────────
  async customerAcquisition(user: AuthenticatedUser, scope: ShopScope, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId, createdAt: { gte: start } },
      select: { createdAt: true },
    });

    const buckets: Record<string, { date: string; newCustomers: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = { date: d, newCustomers: 0 };
    }
    for (const c of customers) {
      const key = format(c.createdAt, 'yyyy-MM-dd');
      if (buckets[key]) buckets[key].newCustomers += 1;
    }
    return Object.values(buckets);
  }
}
