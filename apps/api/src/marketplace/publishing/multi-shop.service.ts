import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MultiShopService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(tenantId: string) {
    const shops = await this.prisma.shop.findMany({
      where: { tenantId },
      include: {
        marketplaceProfile: {
          select: {
            slug: true, publicName: true, logoUrl: true, city: true,
            isListedOnMarketplace: true, isPaused: true, pausedReason: true,
            verificationLevel: true, ratingAverage: true, ratingCount: true,
          },
        },
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const last30 = new Date(Date.now() - 30 * 86400000);

    const shopSummaries = await Promise.all(shops.map(async (shop) => {
      const [todayOrders, todayRev, pendingOrders, activeProducts] = await Promise.all([
        this.prisma.marketplaceOrder.count({
          where: { shopId: shop.id, createdAt: { gte: todayStart } },
        }),
        this.prisma.marketplaceOrder.aggregate({
          where: {
            shopId: shop.id,
            createdAt: { gte: todayStart },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
          _sum: { total: true },
        }),
        this.prisma.marketplaceOrder.count({
          where: { shopId: shop.id, status: 'PENDING' },
        }),
        this.prisma.productMarketplaceProfile.count({
          where: { shopId: shop.id, isListedOnMarketplace: true },
        }),
      ]);

      return {
        id: shop.id,
        name: shop.marketplaceProfile?.publicName || shop.name,
        slug: shop.marketplaceProfile?.slug,
        logoUrl: shop.marketplaceProfile?.logoUrl,
        city: shop.marketplaceProfile?.city,
        isListedOnMarketplace: shop.marketplaceProfile?.isListedOnMarketplace || false,
        isPaused: shop.marketplaceProfile?.isPaused || false,
        verificationLevel: shop.marketplaceProfile?.verificationLevel || 'UNVERIFIED',
        ratingAverage: shop.marketplaceProfile?.ratingAverage || 0,
        ratingCount: shop.marketplaceProfile?.ratingCount || 0,
        todayOrders,
        todayRevenue: Number(todayRev._sum.total || 0),
        pendingOrders,
        activeProducts,
      };
    }));

    // Aggregate stats
    const totalStats = await this.prisma.marketplaceOrder.aggregate({
      where: {
        tenantId,
        createdAt: { gte: last30 },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _sum: { total: true },
      _count: { _all: true },
    });

    // Best performer (last 30 days)
    const revenuePerShop = await this.prisma.marketplaceOrder.groupBy({
      by: ['shopId'],
      where: {
        tenantId,
        createdAt: { gte: last30 },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 1,
    });

    let bestPerformer;
    if (revenuePerShop[0]) {
      const bestShop = shopSummaries.find((s) => s.id === revenuePerShop[0].shopId);
      if (bestShop) {
        bestPerformer = {
          shopId: bestShop.id,
          shopName: bestShop.name,
          revenue: Number(revenuePerShop[0]._sum.total || 0),
        };
      }
    }

    // Needs attention
    const needsAttention: any[] = [];
    for (const shop of shopSummaries) {
      if (shop.pendingOrders > 5) {
        needsAttention.push({
          shopId: shop.id,
          shopName: shop.name,
          reason: `${shop.pendingOrders} pending orders need action`,
          severity: shop.pendingOrders > 10 ? 'high' : 'medium',
        });
      }
      if (shop.isPaused) {
        needsAttention.push({
          shopId: shop.id,
          shopName: shop.name,
          reason: 'Shop is paused',
          severity: 'medium',
        });
      }
      if (shop.isListedOnMarketplace && shop.activeProducts === 0) {
        needsAttention.push({
          shopId: shop.id,
          shopName: shop.name,
          reason: 'No products listed',
          severity: 'high',
        });
      }
    }

    return {
      totalShops: shops.length,
      activeShops: shopSummaries.filter((s) => s.isListedOnMarketplace && !s.isPaused).length,
      pausedShops: shopSummaries.filter((s) => s.isPaused).length,
      totalRevenue30d: Number(totalStats._sum.total || 0),
      totalOrders30d: totalStats._count._all,
      shops: shopSummaries,
      bestPerformer,
      needsAttention: needsAttention.slice(0, 6),
    };
  }

  async compareShops(tenantId: string, shopIds: string[], range: '7d' | '30d' | '90d' = '30d') {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const fromDate = new Date(Date.now() - days * 86400000);

    const shops = await this.prisma.shop.findMany({
      where: { id: { in: shopIds }, tenantId },
      include: {
        marketplaceProfile: {
          select: { publicName: true, ratingAverage: true },
        },
      },
    });

    const comparisons = await Promise.all(shops.map(async (shop) => {
      const [ordersData, topProduct, views] = await Promise.all([
        this.prisma.marketplaceOrder.aggregate({
          where: {
            shopId: shop.id,
            createdAt: { gte: fromDate },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
          _count: { _all: true },
          _sum: { total: true },
          _avg: { total: true },
        }),
        this.prisma.marketplaceOrderItem.groupBy({
          by: ['productName'],
          where: {
            order: { shopId: shop.id, createdAt: { gte: fromDate } },
          },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 1,
        }),
        this.prisma.productView.count({
          where: { shopId: shop.id, viewedAt: { gte: fromDate } },
        }),
      ]);

      const conversion = views > 0 ? (ordersData._count._all / views) * 100 : 0;

      return {
        shopId: shop.id,
        shopName: shop.marketplaceProfile?.publicName || shop.name,
        revenue: Number(ordersData._sum.total || 0),
        orders: ordersData._count._all,
        avgOrderValue: Number(ordersData._avg.total || 0),
        rating: shop.marketplaceProfile?.ratingAverage || 0,
        conversionRate: conversion,
        topProduct: topProduct[0]?.productName,
      };
    }));

    // Daily trend
    const dailyTrend: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayData: any = { date: dayStart.toISOString().slice(0, 10), shopData: {} };
      for (const shopId of shopIds) {
        const stats = await this.prisma.marketplaceOrder.aggregate({
          where: {
            shopId,
            createdAt: { gte: dayStart, lt: dayEnd },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
          _count: { _all: true },
          _sum: { total: true },
        });
        dayData.shopData[shopId] = {
          revenue: Number(stats._sum.total || 0),
          orders: stats._count._all,
        };
      }
      dailyTrend.push(dayData);
    }

    return { shops: comparisons, dailyTrend };
  }

  async transferProducts(tenantId: string, fromShopId: string, toShopId: string, productIds: string[]) {
    const fromShop = await this.prisma.shop.findFirst({ where: { id: fromShopId, tenantId } });
    const toShop = await this.prisma.shop.findFirst({ where: { id: toShopId, tenantId } });
    if (!fromShop || !toShop) throw new NotFoundException('Shop not found');

    const result = await this.prisma.productMarketplaceProfile.updateMany({
      where: { productId: { in: productIds }, shopId: fromShopId },
      data: { shopId: toShopId },
    });

    // Also update the underlying products
    await this.prisma.product.updateMany({
      where: { id: { in: productIds }, tenantId },
      data: {},
    });

    return { count: result.count };
  }

  async cloneShopSetup(tenantId: string, sourceShopId: string, targetShopId: string, sections: string[]) {
    const cloned: string[] = [];

    const source = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId: sourceShopId },
    });
    if (!source) throw new NotFoundException('Source shop profile not found');

    const updateData: any = {};

    if (sections.includes('working-hours') && source.workingHours) {
      updateData.workingHours = source.workingHours;
      cloned.push('working-hours');
    }
    if (sections.includes('delivery')) {
      updateData.offersDelivery = source.offersDelivery;
      updateData.offersPickup = source.offersPickup;
      updateData.deliveryFee = source.deliveryFee;
      updateData.freeDeliveryAbove = source.freeDeliveryAbove;
      updateData.minOrderAmount = source.minOrderAmount;
      updateData.deliveryRadiusKm = source.deliveryRadiusKm;
      updateData.estimatedDeliveryMinutes = source.estimatedDeliveryMinutes;
      cloned.push('delivery');
    }
    if (sections.includes('payment')) {
      updateData.acceptsCod = source.acceptsCod;
      updateData.acceptsCard = source.acceptsCard;
      updateData.acceptsJazzcash = source.acceptsJazzcash;
      updateData.acceptsEasypaisa = source.acceptsEasypaisa;
      updateData.acceptsRaast = source.acceptsRaast;
      cloned.push('payment');
    }
    if (sections.includes('features')) {
      updateData.bargainEnabled = source.bargainEnabled;
      updateData.groupBuyEnabled = source.groupBuyEnabled;
      updateData.auctionEnabled = source.auctionEnabled;
      updateData.liveShopEnabled = source.liveShopEnabled;
      cloned.push('features');
    }

    await this.prisma.shopMarketplaceProfile.update({
      where: { shopId: targetShopId },
      data: updateData,
    });

    return { cloned };
  }
}
