import { Injectable } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RestaurantDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const weekAgo = startOfDay(subDays(new Date(), 7));

    const baseWhere = { tenantId: user.tenantId, ...(shopId && { shopId }) };

    const [todayRev, yesterdayRev, weekRev, activeOrders, byMode, tables, topItems, activeDeliveries] = await Promise.all([
      this.prisma.restaurantOrder.aggregate({
        where: { ...baseWhere, status: 'COMPLETED', createdAt: { gte: todayStart } },
        _sum: { total: true, tip: true }, _count: { _all: true },
      }),
      this.prisma.restaurantOrder.aggregate({
        where: { ...baseWhere, status: 'COMPLETED', createdAt: { gte: yesterdayStart, lt: todayStart } },
        _sum: { total: true },
      }),
      this.prisma.restaurantOrder.aggregate({
        where: { ...baseWhere, status: 'COMPLETED', createdAt: { gte: weekAgo } },
        _sum: { total: true }, _count: { _all: true },
      }),
      this.prisma.restaurantOrder.findMany({
        where: {
          ...baseWhere,
          status: { in: ['PLACED', 'CONFIRMED', 'COOKING', 'READY', 'OUT_FOR_DELIVERY'] },
        },
        include: { table: true, items: { take: 3 } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.restaurantOrder.groupBy({
        by: ['mode'],
        where: { ...baseWhere, status: 'COMPLETED', createdAt: { gte: todayStart } },
        _sum: { total: true }, _count: { _all: true },
      }),
      this.prisma.restaurantTableV2.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId, isActive: true, ...(shopId && { shopId }) },
        _count: { _all: true },
      }),
      this.prisma.restaurantOrderItem.groupBy({
        by: ['productId'],
        where: { order: { ...baseWhere, status: 'COMPLETED', createdAt: { gte: weekAgo } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      this.prisma.deliveryTracking.count({
        where: { order: baseWhere, status: { notIn: ['DELIVERED', 'FAILED', 'RETURNED'] } },
      }),
    ]);

    const todayR = todayRev._sum.total ?? 0;
    const yestR = yesterdayRev._sum.total ?? 0;
    const growth = yestR > 0 ? ((todayR - yestR) / yestR) * 100 : 0;

    // Enrich top items
    const productIds = topItems.map((t) => t.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });

    return {
      today: {
        revenue: todayR,
        orders: todayRev._count._all,
        tips: todayRev._sum.tip ?? 0,
        growthPercent: growth,
      },
      week: { revenue: weekRev._sum.total ?? 0, orders: weekRev._count._all },
      activeOrdersCount: activeOrders.length,
      activeOrders,
      byMode,
      tables,
      activeDeliveries,
      topItems: topItems.map((t) => ({ ...t, product: products.find((p) => p.id === t.productId) })),
    };
  }

  async ordersByHour(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const orders = await this.prisma.restaurantOrder.findMany({
      where: { tenantId: user.tenantId, status: 'COMPLETED', createdAt: { gte: todayStart }, ...(shopId && { shopId }) },
      select: { total: true, createdAt: true, mode: true },
    });
    const buckets: Record<number, { hour: number; revenue: number; count: number }> = {};
    for (let h = 0; h < 24; h++) buckets[h] = { hour: h, revenue: 0, count: 0 };
    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      buckets[h].revenue += o.total;
      buckets[h].count += 1;
    }
    return Object.values(buckets);
  }

  async kitchenPerformance(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const completed = await this.prisma.restaurantOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        createdAt: { gte: todayStart },
        cookingStartedAt: { not: null },
        readyAt: { not: null },
      },
      select: { placedAt: true, cookingStartedAt: true, readyAt: true, servedAt: true },
    });

    let avgPrep = 0;
    let avgServe = 0;
    let count = 0;

    for (const o of completed) {
      if (o.cookingStartedAt && o.readyAt) {
        avgPrep += (o.readyAt.getTime() - o.cookingStartedAt.getTime()) / 60000;
      }
      if (o.readyAt && o.servedAt) {
        avgServe += (o.servedAt.getTime() - o.readyAt.getTime()) / 60000;
      }
      count++;
    }

    return {
      avgPrepMinutes: count > 0 ? avgPrep / count : 0,
      avgServeMinutes: count > 0 ? avgServe / count : 0,
      totalCompleted: count,
    };
  }
}
