import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesFunnelService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  async get(tenantId: string, shopId: string | null | undefined, range: '7d' | '30d' | '90d' | 'year' = '30d') {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const fromDate = new Date(Date.now() - days * 86400000);

    const [productViews, cartsCreated, ordersData, uniqueVisitorsData] = await Promise.all([
      this.prisma.productView.count({
        where: {
          shopId: resolvedShopId,
          viewedAt: { gte: fromDate },
        },
      }),
      this.prisma.marketplaceCartLine.count({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: fromDate },
        },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: fromDate },
        },
        select: {
          id: true,
          status: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      this.prisma.productView.findMany({
        where: { shopId: resolvedShopId, viewedAt: { gte: fromDate } },
        select: { customerId: true },
        distinct: ['customerId'],
      }),
    ]);

    const uniqueVisitors = uniqueVisitorsData.length;
    const ordersPlaced = ordersData.length;
    const ordersDelivered = ordersData.filter((o) => o.status === 'DELIVERED').length;
    const ordersCancelled = ordersData.filter((o) => ['CANCELLED', 'REFUNDED'].includes(o.status)).length;
    const totalRevenue = ordersData
      .filter((o) => !['CANCELLED', 'REFUNDED'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Approximation for "checkouts started" — orders with PENDING or higher
    const checkoutsStarted = ordersData.length;

    // Conversion rates
    const viewToCart = productViews > 0 ? (cartsCreated / productViews) * 100 : 0;
    const cartToCheckout = cartsCreated > 0 ? (checkoutsStarted / cartsCreated) * 100 : 0;
    const checkoutToOrder = checkoutsStarted > 0 ? (ordersPlaced / checkoutsStarted) * 100 : 0;
    const orderToDelivered = ordersPlaced > 0 ? (ordersDelivered / ordersPlaced) * 100 : 0;
    const overallConversion = productViews > 0 ? (ordersPlaced / productViews) * 100 : 0;

    // Drop-off points
    const dropOffPoints = [
      { stage: 'Product Views → Cart', entered: productViews, exited: productViews - cartsCreated, dropOffRate: 100 - viewToCart },
      { stage: 'Cart → Checkout', entered: cartsCreated, exited: cartsCreated - checkoutsStarted, dropOffRate: cartsCreated > 0 ? ((cartsCreated - checkoutsStarted) / cartsCreated) * 100 : 0 },
      { stage: 'Checkout → Order Placed', entered: checkoutsStarted, exited: checkoutsStarted - ordersPlaced, dropOffRate: checkoutsStarted > 0 ? ((checkoutsStarted - ordersPlaced) / checkoutsStarted) * 100 : 0 },
      { stage: 'Order → Delivered', entered: ordersPlaced, exited: ordersPlaced - ordersDelivered, dropOffRate: ordersPlaced > 0 ? ((ordersPlaced - ordersDelivered) / ordersPlaced) * 100 : 0 },
    ];

    // Top dropped products
    const productViewsAgg = await this.prisma.productView.groupBy({
      by: ['productId'],
      where: { shopId: resolvedShopId, viewedAt: { gte: fromDate } },
      _count: { _all: true },
    });

    const productIds = productViewsAgg.map((v) => v.productId).slice(0, 20);

    const [ordersPerProduct, cartsPerProduct, productProfiles] = await Promise.all([
      this.prisma.marketplaceOrderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          order: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
        },
        _sum: { quantity: true },
      }),
      this.prisma.marketplaceCartLine.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          shopId: resolvedShopId,
          createdAt: { gte: fromDate },
        },
        _count: { _all: true },
      }),
      this.prisma.productMarketplaceProfile.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, publicName: true, publicImages: true },
      }),
    ]);

    const ordersMap = new Map(ordersPerProduct.map((o) => [o.productId, o._sum.quantity || 0]));
    const cartsMap = new Map(cartsPerProduct.map((c) => [c.productId, c._count._all]));
    const profileMap = new Map(productProfiles.map((p) => [p.productId, p]));

    const topDroppedProducts = productViewsAgg
      .map((v) => {
        const profile = profileMap.get(v.productId);
        const cartCount = cartsMap.get(v.productId) || 0;
        const orderCount = ordersMap.get(v.productId) || 0;
        const dropOffRate = v._count._all > 0 ? ((v._count._all - orderCount) / v._count._all) * 100 : 0;
        return {
          productId: v.productId,
          name: profile?.publicName || 'Unknown',
          imageUrl: profile?.publicImages?.[0],
          views: v._count._all,
          addedToCart: cartCount,
          ordered: orderCount,
          dropOffRate,
        };
      })
      .filter((p) => p.views > 5)
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .slice(0, 10);

    // Hourly activity
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ hour: i, views: 0, orders: 0 }));

    const [allViews, allOrders] = await Promise.all([
      this.prisma.productView.findMany({
        where: { shopId: resolvedShopId, viewedAt: { gte: fromDate } },
        select: { viewedAt: true },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
        select: { createdAt: true },
      }),
    ]);

    for (const v of allViews) {
      hourlyActivity[v.viewedAt.getHours()].views += 1;
    }
    for (const o of allOrders) {
      hourlyActivity[o.createdAt.getHours()].orders += 1;
    }

    // Cohort analysis (simplified — last 8 weeks)
    const cohortAnalysis: any[] = [];
    for (let wk = 0; wk < 8; wk++) {
      const weekStart = new Date(Date.now() - (wk + 1) * 7 * 86400000);
      const weekEnd = new Date(Date.now() - wk * 7 * 86400000);
      const newCustomers = await this.prisma.marketplaceCustomer.findMany({
        where: {
          createdAt: { gte: weekStart, lt: weekEnd },
          orders: { some: { shopId: resolvedShopId } },
        },
        select: { id: true },
      });
      const newCustIds = newCustomers.map((c) => c.id);
      if (newCustIds.length === 0) continue;

      const [week1, week2, week4] = await Promise.all([
        this.prisma.marketplaceOrder.findMany({
          where: {
            customerId: { in: newCustIds },
            shopId: resolvedShopId,
            createdAt: { gte: new Date(weekEnd.getTime()), lt: new Date(weekEnd.getTime() + 7 * 86400000) },
          },
          select: { customerId: true },
          distinct: ['customerId'],
        }),
        this.prisma.marketplaceOrder.findMany({
          where: {
            customerId: { in: newCustIds },
            shopId: resolvedShopId,
            createdAt: { gte: new Date(weekEnd.getTime() + 7 * 86400000), lt: new Date(weekEnd.getTime() + 14 * 86400000) },
          },
          select: { customerId: true },
          distinct: ['customerId'],
        }),
        this.prisma.marketplaceOrder.findMany({
          where: {
            customerId: { in: newCustIds },
            shopId: resolvedShopId,
            createdAt: { gte: new Date(weekEnd.getTime() + 21 * 86400000), lt: new Date(weekEnd.getTime() + 28 * 86400000) },
          },
          select: { customerId: true },
          distinct: ['customerId'],
        }),
      ]);

      cohortAnalysis.push({
        week: weekStart.toISOString().slice(0, 10),
        newCustomers: newCustIds.length,
        returnedWeek1: week1.length,
        returnedWeek2: week2.length,
        returnedWeek4: week4.length,
        retentionRate: (week1.length / newCustIds.length) * 100,
      });
    }

    // Payment failures
    const paymentGroups = await this.prisma.marketplaceOrder.groupBy({
      by: ['paymentMethod', 'paymentStatus'],
      where: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
      _count: { _all: true },
    });

    const paymentStats: Record<string, { attempts: number; failures: number }> = {};
    for (const p of paymentGroups) {
      if (!paymentStats[p.paymentMethod]) paymentStats[p.paymentMethod] = { attempts: 0, failures: 0 };
      paymentStats[p.paymentMethod].attempts += p._count._all;
      if (p.paymentStatus === 'FAILED') {
        paymentStats[p.paymentMethod].failures += p._count._all;
      }
    }

    const paymentFailures = Object.entries(paymentStats)
      .map(([method, stats]) => ({
        method,
        attempts: stats.attempts,
        failures: stats.failures,
        failureRate: stats.attempts > 0 ? (stats.failures / stats.attempts) * 100 : 0,
      }))
      .sort((a, b) => b.failureRate - a.failureRate);

    return {
      overview: {
        productViews,
        uniqueVisitors,
        cartsCreated,
        checkoutsStarted,
        ordersPlaced,
        ordersDelivered,
        ordersCancelled,
        totalRevenue,
      },
      conversionRates: {
        viewToCart,
        cartToCheckout,
        checkoutToOrder,
        orderToDelivered,
        overallConversion,
      },
      dropOffPoints,
      topDroppedProducts,
      hourlyActivity,
      cohortAnalysis: cohortAnalysis.reverse(),
      paymentFailures,
    };
  }
}
