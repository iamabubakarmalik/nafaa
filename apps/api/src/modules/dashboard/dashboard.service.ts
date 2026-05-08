import { Injectable } from '@nestjs/common';
import { startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [
      products,
      totalUsers,
      recentProducts,
      salesTodayAgg,
      salesMonthAgg,
      totalOrders,
      recentSales,
      totalSuppliers,
      purchasesTodayAgg,
      expensesTodayAgg,
      expensesMonthAgg,
      totalCategories,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { stock: true, lowStockAlert: true },
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
          createdAt: true,
        },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          soldAt: { gte: todayStart },
        },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          soldAt: { gte: monthStart },
        },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.count({
        where: { tenantId, status: 'COMPLETED' },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, status: 'COMPLETED' },
        orderBy: { soldAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.supplier.count({
        where: { tenantId, isActive: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: todayStart },
        },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          expenseDate: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.category.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    const totalProducts = products.length;
    const lowStockProducts = products.filter(
      (p) => p.stock <= p.lowStockAlert,
    ).length;

    const todayRevenue = salesTodayAgg._sum.total ?? 0;
    const todayCogs = salesTodayAgg._sum.costOfGoods ?? 0;
    const todayExpenses = expensesTodayAgg._sum.amount ?? 0;
    const todayGrossProfit = todayRevenue - todayCogs;
    const todayNetProfit = todayGrossProfit - todayExpenses;

    const monthRevenue = salesMonthAgg._sum.total ?? 0;
    const monthCogs = salesMonthAgg._sum.costOfGoods ?? 0;
    const monthExpenses = expensesMonthAgg._sum.amount ?? 0;
    const monthGrossProfit = monthRevenue - monthCogs;
    const monthNetProfit = monthGrossProfit - monthExpenses;

    return {
      stats: {
        salesToday: todayRevenue,
        grossProfitToday: todayGrossProfit,
        netProfitToday: todayNetProfit,
        expensesToday: todayExpenses,
        salesMonth: monthRevenue,
        grossProfitMonth: monthGrossProfit,
        netProfitMonth: monthNetProfit,
        expensesMonth: monthExpenses,
        purchasesToday: purchasesTodayAgg._sum.total ?? 0,
        totalOrders,
        totalProducts,
        lowStockProducts,
        totalUsers,
        totalSuppliers,
        totalCategories,
      },
      recentProducts,
      recentSales,
    };
  }
}
