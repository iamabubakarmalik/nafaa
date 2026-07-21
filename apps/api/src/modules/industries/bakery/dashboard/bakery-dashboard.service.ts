import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class BakeryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthAgo = subDays(new Date(), 30);

    const [
      totalProducts, totalIngredients, criticalIngredients, lowStock,
      todayOrders, tomorrowOrders, weekOrders, urgentOrders,
      inProduction, ready, todayRevenue, monthlyRevenue,
      activeBulkOrders,
      freshnessSummary,
    ] = await Promise.all([
      this.prisma.bakeryProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.bakeryIngredient.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.bakeryIngredient.count({ where: { tenantId: user.tenantId, isActive: true, isCritical: true } }),
      this.prisma.bakeryIngredient.findMany({
        where: { tenantId: user.tenantId, isActive: true },
      }).then((all) => all.filter((i) => i.currentStock <= i.minStock).length),

      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: todayEnd, lte: tomorrowEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: new Date(), lte: weekEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: new Date(), lte: new Date(Date.now() + 6 * 60 * 60 * 1000) },
          status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          status: 'READY',
        },
      }),
      this.prisma.bakeryCakeOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          deliveredAt: { gte: todayStart, lte: todayEnd },
          status: 'DELIVERED',
        },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.bakeryCakeOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          deliveredAt: { gte: monthAgo },
          status: 'DELIVERED',
        },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.bakeryBulkOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { notIn: ['CANCELLED', 'DELIVERED'] },
        },
      }),
      this.getFreshnessSummary(user),
    ]);

    // Upcoming cake orders
    const upcoming = await this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] },
        neededBy: { gte: new Date(), lte: weekEnd },
      },
      orderBy: { neededBy: 'asc' },
      take: 10,
    });

    // Top selling products (30 days)
    const topSelling = await this.prisma.bakeryCakeOrder.groupBy({
      by: ['productName'],
      where: {
        tenantId: user.tenantId,
        deliveredAt: { gte: monthAgo },
        status: 'DELIVERED',
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const top = topSelling
      .filter((t) => t.productName)
      .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
      .slice(0, 5);

    // By category
    const byCategory = await this.prisma.bakeryProductProfile.groupBy({
      by: ['category'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
      _sum: { totalOrders: true, totalRevenue: true },
    });

    // By occasion
    const byOccasion = await this.prisma.bakeryCakeOrder.groupBy({
      by: ['occasion'],
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: monthAgo },
      },
      _count: { _all: true },
    });

    return {
      totals: {
        totalProducts,
        totalIngredients,
        criticalIngredients,
        lowStockIngredients: lowStock,
        activeBulkOrders,
      },
      operations: {
        todayOrders,
        tomorrowOrders,
        weekOrders,
        urgentOrders,
        inProduction,
        ready,
      },
      revenue: {
        today: todayRevenue._sum.total ?? 0,
        todayCollected: todayRevenue._sum.paidAmount ?? 0,
        monthly: monthlyRevenue._sum.total ?? 0,
        monthlyCollected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      freshness: freshnessSummary,
      upcoming,
      topSelling: top,
      byCategory,
      byOccasion,
    };
  }

  private async getFreshnessSummary(user: AuthenticatedUser) {
    const [fresh, dayOld, nearExpiry, expired] = await Promise.all([
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'FRESH' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'DAY_OLD' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'NEAR_EXPIRY' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'EXPIRED' } }),
    ]);
    return { fresh, dayOld, nearExpiry, expired };
  }
}
