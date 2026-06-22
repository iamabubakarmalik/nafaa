import { Injectable } from '@nestjs/common';
import {
  startOfDay, startOfMonth, subDays, subMonths, format, endOfDay,
} from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

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
    const thirtyDaysAgo = subDays(todayStart, 29);

    // ─── Fetch tenant business type for industry-aware logic ───
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true, name: true, defaultUnit: true },
    });

    const [
      products,
      totalUsers,
      recentProducts,
      lowStockList,
      salesTodayAgg,
      salesYesterdayAgg,
      ordersToday,
      ordersYesterday,
      salesMonthAgg,
      salesLastMonthAgg,
      ordersMonth,
      totalOrders,
      totalRevenue,
      recentSales,
      totalSuppliers,
      totalCustomers,
      totalCategories,
      udhaarAgg,
      purchasesTodayAgg,
      purchasesMonthAgg,
      expensesTodayAgg,
      expensesMonthAgg,
      last7DaysSales,
      last30DaysSales,
      topProductsRaw,
      currentRegister,
      // ─── Industry-specific data ───
      carpetRollsAgg,
      carpetCutPiecesAgg,
      carpetRollsLow,
      carpetActiveRolls,
      imeisAgg,
      imeisSoldToday,
      usedPhonesInStock,
      repairTicketsOpen,
      emiActivePlans,
      returnsToday,
      returnsMonth,
      pendingTransfers,
      // ─── Hourly sales today ───
      salesTodayHourly,
      // ─── Payment method breakdown ───
      paymentMethodAgg,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, stock: true, lowStockAlert: true,
          costPrice: true, price: true, unit: true, sku: true,
        },
      }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, sku: true, stock: true, price: true,
          unit: true, createdAt: true,
          images: { take: 1, select: { url: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, stock: { lte: 10 } },
        orderBy: { stock: 'asc' },
        take: 8,
        select: {
          id: true, name: true, stock: true, lowStockAlert: true,
          unit: true, price: true,
          images: { take: 1, select: { url: true } },
        },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: todayStart } },
        _sum: { total: true, costOfGoods: true, paidAmount: true, creditAmount: true },
        _count: { _all: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),
      this.prisma.sale.count({ where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: todayStart } } }),
      this.prisma.sale.count({ where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: monthStart } },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.count({ where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: monthStart } } }),
      this.prisma.sale.count({ where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } } }),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
        _sum: { total: true },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
        orderBy: { soldAt: 'desc' },
        take: 8,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.supplier.count({ where: { tenantId, isActive: true } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.category.count({ where: { tenantId, isActive: true } }),
      this.prisma.customer.aggregate({
        where: { tenantId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, status: 'RECEIVED', purchasedAt: { gte: todayStart } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, status: 'RECEIVED', purchasedAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: 'PAID', expenseDate: { gte: todayStart } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: 'PAID', expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: sevenDaysAgo } },
        select: { soldAt: true, total: true, costOfGoods: true },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: thirtyDaysAgo } },
        select: { soldAt: true, total: true, costOfGoods: true },
      }),
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
      this.prisma.cashRegister.findFirst({
        where: { tenantId, status: 'OPEN' },
        select: {
          id: true, registerNumber: true, openingBalance: true,
          expectedBalance: true, totalCashIn: true, totalCashOut: true,
          openedAt: true,
        },
      }),
      // ─── Carpet rolls ───
      this.prisma.carpetRoll.aggregate({
        where: { tenantId, status: 'ACTIVE' },
        _sum: { remainingSqft: true, remainingLengthFt: true },
        _count: { _all: true },
      }),
      this.prisma.carpetCutPiece.aggregate({
        where: { tenantId, status: 'AVAILABLE' },
        _sum: { totalSqft: true, salePrice: true },
        _count: { _all: true },
      }),
      this.prisma.carpetRoll.findMany({
        where: { tenantId, status: 'ACTIVE', remainingLengthFt: { lt: 10 } },
        orderBy: { remainingLengthFt: 'asc' },
        take: 5,
        select: {
          id: true, rollNumber: true, remainingLengthFt: true,
          remainingSqft: true, salePricePerSqft: true,
          product: { select: { name: true } },
        },
      }),
      this.prisma.carpetRoll.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, rollNumber: true, remainingSqft: true,
          remainingLengthFt: true, salePricePerSqft: true,
          designCode: true,
          product: { select: { name: true } },
          variant: { select: { name: true, colorHex: true } },
        },
      }),
      // ─── Mobile IMEIs ───
      this.prisma.productImei.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.productImei.count({
        where: { tenantId, status: 'SOLD', soldAt: { gte: todayStart } },
      }),
      this.prisma.usedPhone.count({
        where: { tenantId, status: 'IN_STOCK' },
      }),
      this.prisma.repairTicket.count({
        where: {
          tenantId,
          status: { in: ['RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'READY'] },
        },
      }),
      this.prisma.emiPlan.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      // ─── Returns ───
      this.prisma.saleReturn.aggregate({
        where: { tenantId, returnedAt: { gte: todayStart } },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleReturn.aggregate({
        where: { tenantId, returnedAt: { gte: monthStart } },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      // ─── Pending transfers ───
      this.prisma.stockTransfer.count({
        where: { tenantId, status: { in: ['PENDING', 'IN_TRANSIT'] } },
      }),
      // ─── Today hourly sales ───
      this.prisma.sale.findMany({
        where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: todayStart } },
        select: { soldAt: true, total: true },
      }),
      // ─── Payment methods this month ───
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: monthStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    // ─── Calculations ───
    const totalProducts = products.length;
    const lowStockCount = products.filter((p) => p.stock <= p.lowStockAlert).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;
    const inventoryValueAtCost = products.reduce((s, p) => s + p.costPrice * p.stock, 0);
    const inventoryValueAtPrice = products.reduce((s, p) => s + p.price * p.stock, 0);

    const salesToday = salesTodayAgg._sum.total ?? 0;
    const cogsToday = salesTodayAgg._sum.costOfGoods ?? 0;
    const expensesToday = expensesTodayAgg._sum.amount ?? 0;
    const grossProfitToday = salesToday - cogsToday;
    const netProfitToday = grossProfitToday - expensesToday;
    const salesYesterday = salesYesterdayAgg._sum.total ?? 0;

    const salesMonth = salesMonthAgg._sum.total ?? 0;
    const cogsMonth = salesMonthAgg._sum.costOfGoods ?? 0;
    const expensesMonth = expensesMonthAgg._sum.amount ?? 0;
    const grossProfitMonth = salesMonth - cogsMonth;
    const netProfitMonth = grossProfitMonth - expensesMonth;
    const salesLastMonth = salesLastMonthAgg._sum.total ?? 0;

    const salesGrowthVsYesterday = salesYesterday > 0
      ? ((salesToday - salesYesterday) / salesYesterday) * 100
      : salesToday > 0 ? 100 : 0;

    const salesGrowthVsLastMonth = salesLastMonth > 0
      ? ((salesMonth - salesLastMonth) / salesLastMonth) * 100
      : salesMonth > 0 ? 100 : 0;

    const todayCredit = salesTodayAgg._sum.creditAmount ?? 0;
    const todayPaid = salesTodayAgg._sum.paidAmount ?? 0;
    const aovToday = ordersToday > 0 ? salesToday / ordersToday : 0;
    const aovMonth = ordersMonth > 0 ? salesMonth / ordersMonth : 0;

    // ─── 7-day trend ───
    const trendBuckets: Record<string, { date: string; sales: number; profit: number; orders: number }> = {};
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

    // ─── 30-day trend ───
    const trend30Buckets: Record<string, { date: string; sales: number; profit: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(now, 29 - i), 'yyyy-MM-dd');
      trend30Buckets[d] = { date: d, sales: 0, profit: 0 };
    }
    for (const s of last30DaysSales) {
      const key = format(s.soldAt, 'yyyy-MM-dd');
      if (!trend30Buckets[key]) continue;
      trend30Buckets[key].sales += s.total;
      trend30Buckets[key].profit += s.total - s.costOfGoods;
    }
    const salesTrend30Days = Object.values(trend30Buckets);

    // ─── Hourly today ───
    const hourlyBuckets: Record<number, { hour: number; sales: number; orders: number }> = {};
    for (let h = 0; h < 24; h++) hourlyBuckets[h] = { hour: h, sales: 0, orders: 0 };
    for (const s of salesTodayHourly) {
      const h = new Date(s.soldAt).getHours();
      hourlyBuckets[h].sales += s.total;
      hourlyBuckets[h].orders += 1;
    }
    const hourlySalesToday = Object.values(hourlyBuckets);

    // ─── Top products ───
    const topProductIds = topProductsRaw.map((t) => t.productId);
    const topProductDetails = await this.prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: {
        id: true, name: true, sku: true, unit: true, price: true,
        images: { take: 1, select: { url: true } },
      },
    });
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((tp) => ({
      productId: tp.productId,
      product: topProductMap.get(tp.productId),
      quantitySold: tp._sum.quantity ?? 0,
      revenue: tp._sum.total ?? 0,
      orderCount: tp._count._all,
    }));

    // ─── Industry detection ───
    const bt = (tenant?.businessType || '').toUpperCase();
    const isCarpet = bt.includes('CARPET') || bt.includes('FLOORING');
    const isMobile = bt.includes('MOBILE') || bt.includes('PHONE') || bt.includes('ELECTRONICS');

    // ─── IMEI breakdown ───
    const imeiStats = {
      total: 0, inStock: 0, sold: 0, returned: 0, damaged: 0,
    };
    for (const row of imeisAgg) {
      const count = row._count._all;
      imeiStats.total += count;
      if (row.status === 'IN_STOCK') imeiStats.inStock = count;
      else if (row.status === 'SOLD') imeiStats.sold = count;
      else if (row.status === 'RETURNED') imeiStats.returned = count;
      else if (row.status === 'DAMAGED') imeiStats.damaged = count;
    }

    return {
      tenant: {
        name: tenant?.name,
        businessType: tenant?.businessType,
        defaultUnit: tenant?.defaultUnit,
        isCarpet,
        isMobile,
      },
      stats: {
        salesToday, ordersToday, cogsToday, grossProfitToday, netProfitToday, expensesToday,
        purchasesToday: purchasesTodayAgg._sum.total ?? 0,
        purchaseCountToday: purchasesTodayAgg._count._all ?? 0,
        expenseCountToday: expensesTodayAgg._count._all ?? 0,
        todayCredit, todayPaid, aovToday,
        salesYesterday, ordersYesterday, salesGrowthVsYesterday,
        salesMonth, ordersMonth, cogsMonth, grossProfitMonth, netProfitMonth, expensesMonth,
        purchasesMonth: purchasesMonthAgg._sum.total ?? 0,
        aovMonth, salesLastMonth, salesGrowthVsLastMonth,
        totalOrders, totalRevenue: totalRevenue._sum.total ?? 0,
        totalProducts, lowStockCount, outOfStockCount, totalUsers,
        totalSuppliers, totalCustomers, totalCategories,
        totalUdhaar: udhaarAgg._sum.balance ?? 0,
        customersWithUdhaar: udhaarAgg._count._all ?? 0,
        inventoryValueAtCost, inventoryValueAtPrice,
        potentialProfit: inventoryValueAtPrice - inventoryValueAtCost,
        registerOpen: !!currentRegister,
        registerExpected: currentRegister?.expectedBalance ?? 0,
        registerOpening: currentRegister?.openingBalance ?? 0,
        // ─── Returns ───
        returnsTodayCount: returnsToday._count._all ?? 0,
        returnsTodayAmount: returnsToday._sum.refundAmount ?? 0,
        returnsMonthCount: returnsMonth._count._all ?? 0,
        returnsMonthAmount: returnsMonth._sum.refundAmount ?? 0,
        // ─── Pending tasks ───
        pendingTransfers,
      },
      // ─── Industry-specific stats ───
      carpetStats: isCarpet ? {
        totalActiveRolls: carpetRollsAgg._count._all ?? 0,
        totalSqft: Number(carpetRollsAgg._sum.remainingSqft ?? 0),
        totalLengthFt: Number(carpetRollsAgg._sum.remainingLengthFt ?? 0),
        cutPiecesCount: carpetCutPiecesAgg._count._all ?? 0,
        cutPiecesSqft: Number(carpetCutPiecesAgg._sum.totalSqft ?? 0),
        cutPiecesValue: Number(carpetCutPiecesAgg._sum.salePrice ?? 0),
        lowStockRolls: carpetRollsLow.map((r) => ({
          id: r.id,
          rollNumber: r.rollNumber,
          productName: r.product?.name,
          remainingLengthFt: Number(r.remainingLengthFt),
          remainingSqft: Number(r.remainingSqft),
          salePricePerSqft: Number(r.salePricePerSqft),
        })),
        recentRolls: carpetActiveRolls.map((r) => ({
          id: r.id,
          rollNumber: r.rollNumber,
          designCode: r.designCode,
          productName: r.product?.name,
          variantName: r.variant?.name,
          variantColorHex: r.variant?.colorHex,
          remainingSqft: Number(r.remainingSqft),
          remainingLengthFt: Number(r.remainingLengthFt),
          salePricePerSqft: Number(r.salePricePerSqft),
        })),
      } : null,
      mobileStats: isMobile ? {
        ...imeiStats,
        soldToday: imeisSoldToday,
        usedPhonesInStock,
        repairTicketsOpen,
        emiActivePlans,
      } : null,
      salesTrend7Days,
      salesTrend30Days,
      hourlySalesToday,
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
        customer: s.customer ? {
          id: s.customer.id, name: s.customer.name, phone: s.customer.phone,
        } : null,
        cashier: s.createdBy?.fullName ?? null,
      })),
      paymentBreakdown: paymentMethodAgg.map((p) => ({
        method: p.paymentMethod,
        total: p._sum.total ?? 0,
        count: p._count._all,
      })),
      currentRegister,
    };
  }
}
