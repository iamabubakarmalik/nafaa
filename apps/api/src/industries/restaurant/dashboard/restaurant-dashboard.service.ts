import { Injectable } from '@nestjs/common';
import { hourInTz, startOfBusinessDayTz, startOfDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { saleFigures } from '../../../common/helpers/business-math.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RestaurantDashboardService {
  constructor(private readonly prisma: PrismaService, private readonly tzService: TenantTimezoneService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    // Business day edges in the shop's own clock; the server runs on UTC.
    const { tz, dayStartHour } = await this.tzService.clock(user.tenantId);
    const todayStart = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    const yesterdayStart = subDaysTz(todayStart, 1, tz);
    const weekAgo = subDaysTz(todayStart, 6, tz);
    // Money comes from the bills, net of returns, so it matches the day book and reports
    // (counter bills without an order are included; refunds are taken off).
    const math = { tenantId: user.tenantId, shopId: shopId ?? null };
    const [todaySales, yesterdaySales, weekSales] = await Promise.all([
      saleFigures(this.prisma, math, { gte: todayStart }),
      saleFigures(this.prisma, math, { gte: yesterdayStart, lt: todayStart }),
      saleFigures(this.prisma, math, { gte: weekAgo }),
    ]);

    // Orders made before branches carry no shop; they count for every branch view.
    const baseWhere = { tenantId: user.tenantId, ...(shopId && { OR: [{ shopId }, { shopId: null }] }) };

    const [todayRev, weekRev, activeOrders, byMode, tables, topItems, activeDeliveries] = await Promise.all([
      this.prisma.restaurantOrder.aggregate({
        where: { ...baseWhere, status: 'COMPLETED', createdAt: { gte: todayStart } },
        _sum: { total: true, tip: true }, _count: { _all: true },
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
        where: { tenantId: user.tenantId, isActive: true, ...(shopId && { OR: [{ shopId }, { shopId: null }] }) },
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

    const todayR = todaySales.net;
    const yestR = yesterdaySales.net;
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
        bills: todaySales.bills,
        refunds: todaySales.refunds,
        tips: todayRev._sum.tip ?? 0,
        growthPercent: growth,
      },
      week: { revenue: weekSales.net, orders: weekRev._count._all, bills: weekSales.bills },
      activeOrdersCount: activeOrders.length,
      activeOrders,
      byMode,
      tables,
      activeDeliveries,
      topItems: topItems.map((t) => ({ ...t, product: products.find((p) => p.id === t.productId) })),
    };
  }

  async ordersByHour(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDayTz(new Date());
    const orders = await this.prisma.restaurantOrder.findMany({
      where: { tenantId: user.tenantId, status: 'COMPLETED', createdAt: { gte: todayStart }, ...(shopId && { OR: [{ shopId }, { shopId: null }] }) },
      select: { total: true, createdAt: true, mode: true },
    });
    const buckets: Record<number, { hour: number; revenue: number; count: number }> = {};
    for (let h = 0; h < 24; h++) buckets[h] = { hour: h, revenue: 0, count: 0 };
    for (const o of orders) {
      const h = hourInTz(new Date(o.createdAt));
      buckets[h].revenue += o.total;
      buckets[h].count += 1;
    }
    return Object.values(buckets);
  }

  async kitchenPerformance(user: AuthenticatedUser) {
    const todayStart = startOfDayTz(new Date());
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