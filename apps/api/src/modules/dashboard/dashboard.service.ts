import { Injectable } from '@nestjs/common';
import {
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  format,
  endOfDay,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveShopScope } from '../../common/helpers/shop-scope.helper';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfDay(subDays(monthStart, 1));
    const sevenDaysAgo = subDays(todayStart, 6);

    const [
      // Products
      products,
      totalUsers,
      recentProducts,
      lowStockList,

      // Sales today + yesterday for comparison
      salesTodayAgg,
      salesYesterdayAgg,
      ordersToday,
      ordersYesterday,

      // Sales this month + last month
      salesMonthAgg,
      salesLastMonthAgg,
      ordersMonth,

      // Total all-time
      totalOrders,
      totalRevenue,

      // Recent sales
      recentSales,

      // Suppliers / customers
      totalSuppliers,
      totalCustomers,
      totalCategories,

      // Customers with udhaar
      udhaarAgg,

      // Purchases
      purchasesTodayAgg,
      purchasesMonthAgg,

      // Expenses
      expensesTodayAgg,
      expensesMonthAgg,

      // 7 day trend
      last7DaysSales,

      // Top 5 products this month
      topProductsRaw,

      // Cash register
      currentRegister,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, stock: true, lowStockAlert: true, costPrice: true, price: true, unit: true, sku: true },
      }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          price: true,
          unit: true,
          createdAt: true,
          images: { take: 1, select: { url: true } },
        },
      }),
      this.prisma.product.findMany({
        where: {
          tenantId,
          isActive: true,
          stock: { lte: 10 },
        },
        orderBy: { stock: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockAlert: true,
          unit: true,
          price: true,
        },
      }),

      // Today sales
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: todayStart },
        },
        _sum: { total: true, costOfGoods: true, paidAmount: true, creditAmount: true },
        _count: { _all: true },
      }),
      // Yesterday sales
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: yesterdayStart, lte: yesterdayEnd },
        },
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: todayStart },
        },
      }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: yesterdayStart, lte: yesterdayEnd },
        },
      }),

      // This month sales
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: monthStart },
        },
        _sum: { total: true, costOfGoods: true },
      }),
      // Last month sales
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: monthStart },
        },
      }),

      // All-time totals
      this.prisma.sale.count({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
        _sum: { total: true },
      }),

      // Recent sales
      this.prisma.sale.findMany({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
        orderBy: { soldAt: 'desc' },
        take: 6,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),

      this.prisma.supplier.count({ where: { tenantId, isActive: true } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.category.count({ where: { tenantId, isActive: true } }),

      // Total udhaar
      this.prisma.customer.aggregate({
        where: { tenantId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),

      // Purchases
      this.prisma.purchase.aggregate({
        where: {
          tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: todayStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: monthStart },
        },
        _sum: { total: true },
      }),

      // Expenses
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          expenseDate: { gte: todayStart },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),

      // 7-day sales trend
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: sevenDaysAgo },
        },
        select: {
          soldAt: true,
          total: true,
          costOfGoods: true,
        },
      }),

      // Top 5 products this month
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
            soldAt: { gte: monthStart },
          },
        },
        _sum: { quantity: true, total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      // Current cash register
      this.prisma.cashRegister.findFirst({
        where: { tenantId, status: 'OPEN' },
        select: {
          id: true,
          registerNumber: true,
          openingBalance: true,
          expectedBalance: true,
          totalCashIn: true,
          totalCashOut: true,
          openedAt: true,
        },
      }),
    ]);

    // ===== Calculations =====
    const totalProducts = products.length;
    const lowStockCount = products.filter((p) => p.stock <= p.lowStockAlert).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    // Inventory value
    const inventoryValueAtCost = products.reduce(
      (sum, p) => sum + p.costPrice * p.stock,
      0,
    );
    const inventoryValueAtPrice = products.reduce(
      (sum, p) => sum + p.price * p.stock,
      0,
    );

    // Today metrics
    const salesToday = salesTodayAgg._sum.total ?? 0;
    const cogsToday = salesTodayAgg._sum.costOfGoods ?? 0;
    const expensesToday = expensesTodayAgg._sum.amount ?? 0;
    const grossProfitToday = salesToday - cogsToday;
    const netProfitToday = grossProfitToday - expensesToday;

    // Yesterday metrics for comparison
    const salesYesterday = salesYesterdayAgg._sum.total ?? 0;

    // This month metrics
    const salesMonth = salesMonthAgg._sum.total ?? 0;
    const cogsMonth = salesMonthAgg._sum.costOfGoods ?? 0;
    const expensesMonth = expensesMonthAgg._sum.amount ?? 0;
    const grossProfitMonth = salesMonth - cogsMonth;
    const netProfitMonth = grossProfitMonth - expensesMonth;

    // Last month for comparison
    const salesLastMonth = salesLastMonthAgg._sum.total ?? 0;

    // % changes
    const salesGrowthVsYesterday =
      salesYesterday > 0
        ? ((salesToday - salesYesterday) / salesYesterday) * 100
        : salesToday > 0
        ? 100
        : 0;

    const salesGrowthVsLastMonth =
      salesLastMonth > 0
        ? ((salesMonth - salesLastMonth) / salesLastMonth) * 100
        : salesMonth > 0
        ? 100
        : 0;

    // Today udhaar
    const todayCredit = salesTodayAgg._sum.creditAmount ?? 0;
    const todayPaid = salesTodayAgg._sum.paidAmount ?? 0;

    // AOV
    const aovToday = ordersToday > 0 ? salesToday / ordersToday : 0;
    const aovMonth = ordersMonth > 0 ? salesMonth / ordersMonth : 0;

    // 7-day trend buckets
    const trendBuckets: Record<
      string,
      { date: string; sales: number; profit: number; orders: number }
    > = {};
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(now, 6 - i), 'yyyy-MM-dd');
      trendBuckets[d] = { date: d, sales: 0, profit: 0, orders: 0 };
    }
    for (const s of last7DaysSales) {
      const key = format(s.soldAt, 'yyyy-MM-dd');
      if (!trendBuckets[key]) continue;
      trendBuckets[key].sales += s.total;
      trendBuckets[key].profit += s.total - s.costOfGoods;
      trendBuckets[key].orders += 1;
    }
    const salesTrend7Days = Object.values(trendBuckets);

    // Top products enriched
    const topProductIds = topProductsRaw.map((t) => t.productId);
    const topProductDetails = await this.prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, sku: true, unit: true, price: true },
    });
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((tp) => ({
      productId: tp.productId,
      product: topProductMap.get(tp.productId),
      quantitySold: tp._sum.quantity ?? 0,
      revenue: tp._sum.total ?? 0,
      orderCount: tp._count._all,
    }));

    return {
      stats: {
        // Today
        salesToday,
        ordersToday,
        cogsToday,
        grossProfitToday,
        netProfitToday,
        expensesToday,
        purchasesToday: purchasesTodayAgg._sum.total ?? 0,
        purchaseCountToday: purchasesTodayAgg._count._all ?? 0,
        expenseCountToday: expensesTodayAgg._count._all ?? 0,
        todayCredit,
        todayPaid,
        aovToday,

        // Yesterday comparison
        salesYesterday,
        ordersYesterday,
        salesGrowthVsYesterday,

        // This month
        salesMonth,
        ordersMonth,
        cogsMonth,
        grossProfitMonth,
        netProfitMonth,
        expensesMonth,
        purchasesMonth: purchasesMonthAgg._sum.total ?? 0,
        aovMonth,

        // Last month comparison
        salesLastMonth,
        salesGrowthVsLastMonth,

        // All-time
        totalOrders,
        totalRevenue: totalRevenue._sum.total ?? 0,
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalUsers,
        totalSuppliers,
        totalCustomers,
        totalCategories,

        // Udhaar
        totalUdhaar: udhaarAgg._sum.balance ?? 0,
        customersWithUdhaar: udhaarAgg._count._all ?? 0,

        // Inventory
        inventoryValueAtCost,
        inventoryValueAtPrice,
        potentialProfit: inventoryValueAtPrice - inventoryValueAtCost,

        // Cash register
        registerOpen: !!currentRegister,
        registerExpected: currentRegister?.expectedBalance ?? 0,
        registerOpening: currentRegister?.openingBalance ?? 0,
      },
      salesTrend7Days,
      topProducts,
      lowStockProducts: lowStockList,
      recentProducts,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        total: s.total,
        paidAmount: s.paidAmount,
        creditAmount: s.creditAmount,
        paymentMethod: s.paymentMethod,
        status: s.status,
        soldAt: s.soldAt,
        customer: s.customer
          ? {
              id: s.customer.id,
              name: s.customer.name,
              phone: s.customer.phone,
            }
          : null,
        cashier: s.createdBy?.fullName ?? null,
      })),
      currentRegister,
    };
  }
}
