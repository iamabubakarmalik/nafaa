import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketplaceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  async get(tenantId: string, shopId: string | null | undefined, range: '7d' | '30d' | '90d' | 'year' = '30d') {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const fromDate = new Date(Date.now() - days * 86400000);

    const [
      totalOrders, totalRevenue, avgOrderResult, customersData,
      activeProducts, shopProfile,
      ordersByStatus, paymentMethodStats,
      topProducts, topCustomers, ordersTrend, reviewsBreakdown,
    ] = await Promise.all([
      this.prisma.marketplaceOrder.count({
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
      }),
      this.prisma.marketplaceOrder.aggregate({
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _sum: { total: true },
      }),
      this.prisma.marketplaceOrder.aggregate({
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _avg: { total: true },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
        select: { customerId: true },
        distinct: ['customerId'],
      }),
      this.prisma.productMarketplaceProfile.count({
        where: { shopId: resolvedShopId, isListedOnMarketplace: true },
      }),
      this.prisma.shopMarketplaceProfile.findUnique({
        where: { shopId: resolvedShopId },
        select: { ratingAverage: true },
      }),
      this.prisma.marketplaceOrder.groupBy({
        by: ['status'],
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
        _count: { _all: true },
      }),
      this.prisma.marketplaceOrder.groupBy({
        by: ['paymentMethod'],
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.marketplaceOrderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: { shopId: resolvedShopId, createdAt: { gte: fromDate } },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      this.prisma.marketplaceOrder.groupBy({
        by: ['customerId'],
        where: { shopId: resolvedShopId, createdAt: { gte: fromDate }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _count: { _all: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      this.getOrdersTrend(resolvedShopId, fromDate, days),
      this.prisma.marketplaceReview.groupBy({
        by: ['rating'],
        where: { shopId: resolvedShopId, isHidden: false },
        _count: { _all: true },
      }),
    ]);

    // Enrich top products
    const productIds = topProducts.map((p) => p.productId);
    const productImgs = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, publicImages: true },
    });
    const imgMap = new Map(productImgs.map((p) => [p.productId, p.publicImages?.[0]]));

    // Enrich top customers
    const customerIds = topCustomers.map((c) => c.customerId);
    const customerDetails = await this.prisma.marketplaceCustomer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    const custMap = new Map(customerDetails.map((c) => [c.id, c]));

    const ordersByStatusObj: Record<string, number> = {};
    ordersByStatus.forEach((s) => { ordersByStatusObj[s.status] = s._count._all; });

    const paymentBreakdown: Record<string, { count: number; total: number }> = {};
    paymentMethodStats.forEach((p) => {
      paymentBreakdown[p.paymentMethod] = {
        count: p._count._all,
        total: Number(p._sum.total || 0),
      };
    });

    const returningCustomerIds = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where: { shopId: resolvedShopId },
      _count: { _all: true },
      having: { customerId: { _count: { gt: 1 } } },
    });

    return {
      overview: {
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        avgOrderValue: Number(avgOrderResult._avg.total || 0),
        conversionRate: totalOrders > 0 ? (totalOrders / Math.max(customersData.length, 1)) * 100 : 0,
        totalCustomers: customersData.length,
        returningCustomers: returningCustomerIds.length,
        activeProducts,
        avgRating: shopProfile?.ratingAverage || 0,
      },
      ordersTrend,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: p.productName,
        imageUrl: imgMap.get(p.productId),
        totalSold: p._sum.quantity || 0,
        revenue: Number(p._sum.total || 0),
      })),
      topCustomers: topCustomers.map((c) => {
        const cd = custMap.get(c.customerId);
        return {
          customerId: c.customerId,
          fullName: cd?.fullName || 'Unknown',
          orderCount: c._count._all,
          totalSpent: Number(c._sum.total || 0),
        };
      }),
      ordersByStatus: ordersByStatusObj,
      paymentMethodBreakdown: paymentBreakdown,
      reviewsBreakdown: [5, 4, 3, 2, 1].map((star) => ({
        rating: star,
        count: reviewsBreakdown.find((r) => r.rating === star)?._count._all || 0,
      })),
    };
  }

  private async getOrdersTrend(shopId: string, fromDate: Date, days: number) {
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: { shopId, createdAt: { gte: fromDate } },
      select: { createdAt: true, total: true, status: true },
    });

    const trend: Record<string, { count: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      trend[key] = { count: 0, revenue: 0 };
    }

    orders.forEach((o) => {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (trend[key]) {
        trend[key].count += 1;
        if (o.status !== 'CANCELLED' && o.status !== 'REFUNDED') {
          trend[key].revenue += Number(o.total);
        }
      }
    });

    return Object.entries(trend)
      .map(([date, val]) => ({ date, count: val.count, revenue: val.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
