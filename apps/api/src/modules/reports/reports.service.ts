import { Injectable } from '@nestjs/common';
import { startOfDay, startOfMonth, subDays, format, subMonths, startOfYear } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. Sales Trend (line/area chart) ──────────────────────
  async salesTrend(user: AuthenticatedUser, days = 14) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        soldAt: { gte: start },
      },
      select: { soldAt: true, total: true, costOfGoods: true, paidAmount: true, creditAmount: true },
    });

    const buckets: Record<string, any> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = { date: d, sales: 0, profit: 0, cost: 0, orders: 0, paid: 0, credit: 0 };
    }

    for (const s of sales) {
      const key = format(s.soldAt, 'yyyy-MM-dd');
      if (!buckets[key]) continue;
      buckets[key].sales += s.total;
      buckets[key].cost += s.costOfGoods;
      buckets[key].profit += s.total - s.costOfGoods;
      buckets[key].orders += 1;
      buckets[key].paid += s.paidAmount;
      buckets[key].credit += s.creditAmount;
    }
    return Object.values(buckets);
  }

  // ─── 2. Top Products with Profit ───────────────────────────
  async topProducts(user: AuthenticatedUser, limit = 10) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      },
      _sum: { quantity: true, total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, sku: true, unit: true, price: true,
        costPrice: true, stock: true,
        images: { take: 1, select: { url: true } },
      },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    return items.map((i) => {
      const product = map.get(i.productId);
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
  async categoryBreakdown(user: AuthenticatedUser) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      },
      include: { product: { include: { category: true } } },
    });

    const buckets: Record<string, any> = {};
    for (const item of items) {
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
  async paymentMethods(user: AuthenticatedUser) {
    const result = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      _sum: { total: true, paidAmount: true },
      _count: { _all: true },
    });

    const grandTotal = result.reduce((s, r) => s + (r._sum.total ?? 0), 0);
    return result
      .map((r) => ({
        paymentMethod: r.paymentMethod,
        total: r._sum.total ?? 0,
        paid: r._sum.paidAmount ?? 0,
        count: r._count._all,
        percent: grandTotal > 0 ? ((r._sum.total ?? 0) / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ─── 5. Hourly Sales Today ─────────────────────────────────
  async hourlySalesToday(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
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
  async cashierPerformance(user: AuthenticatedUser, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const sales = await this.prisma.sale.groupBy({
      by: ['createdById'],
      where: {
        tenantId: user.tenantId,
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
  async topCustomers(user: AuthenticatedUser, limit = 10) {
    const sales = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        tenantId: user.tenantId,
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
  async inventoryValue(user: AuthenticatedUser) {
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      include: { category: true },
    });

    const byCategory: Record<string, any> = {};
    let totalCost = 0, totalSell = 0, totalUnits = 0;

    for (const p of products) {
      const cost = p.costPrice * p.stock;
      const sell = p.price * p.stock;
      totalCost += cost;
      totalSell += sell;
      totalUnits += p.stock;

      const cat = p.category;
      const key = cat?.id || 'uncategorized';
      const name = cat?.name || 'Uncategorized';
      const color = cat?.color || '#94a3b8';

      if (!byCategory[key]) {
        byCategory[key] = { id: key, name, color, productCount: 0, totalStock: 0, costValue: 0, sellValue: 0 };
      }
      byCategory[key].productCount += 1;
      byCategory[key].totalStock += p.stock;
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
  async expenseBreakdown(user: AuthenticatedUser, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId: user.tenantId, status: 'PAID', expenseDate: { gte: start } },
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
  async profitAndLoss(user: AuthenticatedUser, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const [salesAgg, expensesAgg, returnsAgg, purchasesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          tenantId: user.tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: start },
        },
        _sum: { total: true, costOfGoods: true, paidAmount: true, creditAmount: true, discount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId: user.tenantId, status: 'PAID', expenseDate: { gte: start } },
        _sum: { amount: true },
      }),
      this.prisma.saleReturn.aggregate({
        where: { tenantId: user.tenantId, returnedAt: { gte: start } },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: start } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    const revenue = salesAgg._sum.total ?? 0;
    const cogs = salesAgg._sum.costOfGoods ?? 0;
    const expenses = expensesAgg._sum.amount ?? 0;
    const returns = returnsAgg._sum.refundAmount ?? 0;
    const discount = salesAgg._sum.discount ?? 0;
    const netRevenue = revenue - returns;
    const grossProfit = netRevenue - cogs;
    const netProfit = grossProfit - expenses;
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      period: { days, startDate: start.toISOString() },
      revenue,
      returns,
      netRevenue,
      cogs,
      grossProfit,
      grossMargin,
      expenses,
      netProfit,
      netMargin,
      orderCount: salesAgg._count._all,
      returnCount: returnsAgg._count._all,
      paid: salesAgg._sum.paidAmount ?? 0,
      credit: salesAgg._sum.creditAmount ?? 0,
      discount,
      purchases: purchasesAgg._sum.total ?? 0,
      purchaseCount: purchasesAgg._count._all,
    };
  }

  // ─── 11. NEW: Weekday Pattern (which days are best) ────────
  async weekdayPattern(user: AuthenticatedUser, days = 90) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
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
  async monthlyComparison(user: AuthenticatedUser) {
    const buckets: Array<{ month: string; sales: number; profit: number; expenses: number; orders: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = startOfMonth(subMonths(new Date(), i - 1));

      const [salesAgg, expensesAgg] = await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            tenantId: user.tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
            soldAt: { gte: monthStart, lt: monthEnd },
          },
          _sum: { total: true, costOfGoods: true },
          _count: { _all: true },
        }),
        this.prisma.expense.aggregate({
          where: { tenantId: user.tenantId, status: 'PAID', expenseDate: { gte: monthStart, lt: monthEnd } },
          _sum: { amount: true },
        }),
      ]);

      const revenue = salesAgg._sum.total ?? 0;
      const cogs = salesAgg._sum.costOfGoods ?? 0;
      buckets.push({
        month: format(monthStart, 'MMM yy'),
        sales: revenue,
        profit: revenue - cogs - (expensesAgg._sum.amount ?? 0),
        expenses: expensesAgg._sum.amount ?? 0,
        orders: salesAgg._count._all,
      });
    }
    return buckets;
  }

  // ─── 13. NEW: Sales vs Expenses (radar/composed) ───────────
  async salesVsExpenses(user: AuthenticatedUser, days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));
    const buckets: Record<string, { date: string; sales: number; expenses: number; profit: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = { date: d, sales: 0, expenses: 0, profit: 0 };
    }

    const [sales, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: start },
        },
        select: { soldAt: true, total: true, costOfGoods: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId: user.tenantId, status: 'PAID', expenseDate: { gte: start } },
        select: { expenseDate: true, amount: true },
      }),
    ]);

    for (const s of sales) {
      const key = format(s.soldAt, 'yyyy-MM-dd');
      if (buckets[key]) {
        buckets[key].sales += s.total;
        buckets[key].profit += s.total - s.costOfGoods;
      }
    }
    for (const e of expenses) {
      const key = format(e.expenseDate, 'yyyy-MM-dd');
      if (buckets[key]) buckets[key].expenses += e.amount;
    }
    return Object.values(buckets);
  }

  // ─── 14. NEW: Customer Acquisition Trend ──────────────────
  async customerAcquisition(user: AuthenticatedUser, days = 30) {
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
