import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true },
    });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  async insights(tenantId: string, shopId: string | null | undefined) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const insights: any[] = [];

    // Insight 1: Recent revenue vs previous period
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86400000);
    const prev30 = new Date(now.getTime() - 60 * 86400000);

    const [recentRev, previousRev] = await Promise.all([
      this.prisma.marketplaceOrder.aggregate({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: last30 },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.marketplaceOrder.aggregate({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: prev30, lt: last30 },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { total: true },
      }),
    ]);

    const recentRevenue = Number(recentRev._sum.total || 0);
    const previousRevenue = Number(previousRev._sum.total || 0);
    const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    if (revenueChange > 15) {
      insights.push({
        id: 'rev-up',
        type: 'CELEBRATION',
        title: '🎉 Revenue Growing!',
        description: `Aap ki revenue last 30 din mein ${revenueChange.toFixed(1)}% barh gayi. Best month yet!`,
        impact: 'HIGH',
        metric: { value: `Rs ${recentRevenue.toLocaleString('en-PK')}`, change: revenueChange },
      });
    } else if (revenueChange < -15) {
      insights.push({
        id: 'rev-down',
        type: 'WARNING',
        title: '⚠️ Revenue Decline',
        description: `Revenue last 30 din mein ${Math.abs(revenueChange).toFixed(1)}% kam ho gayi. Promotion launch karein.`,
        impact: 'HIGH',
        actionUrl: '/marketplace/coupons-advanced',
        actionLabel: 'Create Promotion',
        metric: { value: `Rs ${recentRevenue.toLocaleString('en-PK')}`, change: revenueChange },
      });
    }

    // Insight 2: Cart abandonment
    const carts = await this.prisma.marketplaceCartLine.count({
      where: { shopId: resolvedShopId, createdAt: { gte: last30 } },
    });
    const orders = recentRev._count._all;
    if (carts > 20 && orders > 0) {
      const conversion = (orders / carts) * 100;
      if (conversion < 30) {
        insights.push({
          id: 'low-conversion',
          type: 'OPPORTUNITY',
          title: '📊 Low Cart-to-Order Rate',
          description: `Sirf ${conversion.toFixed(1)}% carts orders ban rahe hain. Retargeting coupons se recover karein.`,
          impact: 'MEDIUM',
          actionUrl: '/marketplace/sales-funnel',
          actionLabel: 'View Funnel',
          metric: { value: `${conversion.toFixed(1)}%`, change: 0 },
        });
      }
    }

    // Insight 3: Top-performing product
    const topProduct = await this.prisma.marketplaceOrderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { shopId: resolvedShopId, createdAt: { gte: last30 } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 1,
    });

    if (topProduct[0]) {
      insights.push({
        id: 'top-product',
        type: 'INFO',
        title: '⭐ Star Product',
        description: `"${topProduct[0].productName}" is your top seller with Rs ${Number(topProduct[0]._sum.total).toLocaleString('en-PK')} revenue. Stock zyada rakhein.`,
        impact: 'MEDIUM',
        metric: { value: `${topProduct[0]._sum.quantity} sold`, change: 0 },
      });
    }

    // Insight 4: New customers this week
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const newCustomers = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where: { shopId: resolvedShopId, createdAt: { gte: weekAgo } },
    });

    if (newCustomers.length > 5) {
      insights.push({
        id: 'new-customers',
        type: 'OPPORTUNITY',
        title: '👥 New Customers Alert',
        description: `${newCustomers.length} naye customers is hafte. Welcome coupon bhejein retention barhaane ke liye.`,
        impact: 'MEDIUM',
        actionUrl: '/marketplace/segments',
        actionLabel: 'View Segments',
        metric: { value: `${newCustomers.length}`, change: 0 },
      });
    }

    // Insight 5: Unreplied reviews
    const unrepliedReviews = await this.prisma.marketplaceReview.count({
      where: { shopId: resolvedShopId, replyFromShop: null, isHidden: false },
    });
    if (unrepliedReviews > 3) {
      insights.push({
        id: 'unreplied-reviews',
        type: 'WARNING',
        title: '💬 Reviews Awaiting Reply',
        description: `${unrepliedReviews} reviews ka jawab nahi diya. Customer engagement improve karein.`,
        impact: 'MEDIUM',
        actionUrl: '/marketplace/reviews',
        actionLabel: 'Reply Now',
        metric: { value: `${unrepliedReviews}`, change: 0 },
      });
    }

    return insights;
  }

  async demandForecast(tenantId: string, shopId: string | null | undefined) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const last30 = new Date(Date.now() - 30 * 86400000);

    // Get products with sales
    const salesData = await this.prisma.marketplaceOrderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          shopId: resolvedShopId,
          createdAt: { gte: last30 },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      _sum: { quantity: true },
    });

    const productIds = salesData.map((s) => s.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true },
    });
    const stockMap = new Map(products.map((p) => [p.id, Number(p.stock)]));

    const profiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, publicImages: true },
    });
    const imgMap = new Map(profiles.map((p) => [p.productId, p.publicImages?.[0]]));

    const forecasts = salesData.map((s) => {
      const currentStock = stockMap.get(s.productId) || 0;
      const totalSold = s._sum.quantity || 0;
      const avgDailySales = totalSold / 30;
      const forecastNext7Days = Math.round(avgDailySales * 7);
      const forecastNext30Days = Math.round(avgDailySales * 30);
      const daysUntilStockout = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : undefined;

      let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';
      let recommendedReorderQty = 0;

      if (daysUntilStockout !== undefined) {
        if (daysUntilStockout <= 3) {
          urgency = 'CRITICAL';
          recommendedReorderQty = Math.round(avgDailySales * 30);
        } else if (daysUntilStockout <= 7) {
          urgency = 'HIGH';
          recommendedReorderQty = Math.round(avgDailySales * 21);
        } else if (daysUntilStockout <= 14) {
          urgency = 'MEDIUM';
          recommendedReorderQty = Math.round(avgDailySales * 14);
        } else if (daysUntilStockout <= 30) {
          urgency = 'LOW';
        }
      }

      return {
        productId: s.productId,
        productName: s.productName,
        imageUrl: imgMap.get(s.productId),
        currentStock,
        avgDailySales,
        forecastNext7Days,
        forecastNext30Days,
        daysUntilStockout,
        recommendedReorderQty,
        urgency,
      };
    });

    return forecasts.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
      return order[a.urgency] - order[b.urgency];
    }).slice(0, 30);
  }

  async priceOptimization(tenantId: string, shopId: string | null | undefined) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const last60 = new Date(Date.now() - 60 * 86400000);

    // Get sold products
    const sales = await this.prisma.marketplaceOrderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          shopId: resolvedShopId,
          createdAt: { gte: last60 },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      _sum: { quantity: true, total: true },
      _count: { _all: true },
    });

    // Get views
    const productIds = sales.map((s) => s.productId);
    const views = await this.prisma.productView.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        shopId: resolvedShopId,
        viewedAt: { gte: last60 },
      },
      _count: { _all: true },
    });
    const viewMap = new Map(views.map((v) => [v.productId, v._count._all]));

    const profiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, publicName: true, publicPrice: true, publicImages: true },
    });

    const optimizations = profiles.map((p) => {
      const sale = sales.find((s) => s.productId === p.productId);
      const viewCount = viewMap.get(p.productId) || 0;
      const currentPrice = Number(p.publicPrice);
      const salesCount = sale?._count._all || 0;

      // Simple heuristic
      let suggestedPrice = currentPrice;
      let reasoning = '';
      let expectedRevenueLift = 0;
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

      const conversionRate = viewCount > 0 ? (salesCount / viewCount) * 100 : 0;

      if (viewCount > 100 && conversionRate < 2 && salesCount > 5) {
        // Low conversion despite high views — reduce price
        suggestedPrice = Math.round(currentPrice * 0.9);
        reasoning = `High views (${viewCount}) but low conversion (${conversionRate.toFixed(1)}%). 10% discount se sales barhengi.`;
        expectedRevenueLift = 8;
        confidence = viewCount > 500 ? 'HIGH' : 'MEDIUM';
      } else if (viewCount > 50 && conversionRate > 15) {
        // High conversion — try increasing price
        suggestedPrice = Math.round(currentPrice * 1.08);
        reasoning = `High conversion (${conversionRate.toFixed(1)}%). Demand strong hai, price barhane se revenue barh sakti hai.`;
        expectedRevenueLift = 5;
        confidence = conversionRate > 20 ? 'HIGH' : 'MEDIUM';
      } else if (salesCount < 3 && viewCount > 200) {
        suggestedPrice = Math.round(currentPrice * 0.85);
        reasoning = `Sirf ${salesCount} sales despite ${viewCount} views. Bara discount trial.`;
        expectedRevenueLift = 15;
        confidence = 'MEDIUM';
      }

      return {
        productId: p.productId,
        productName: p.publicName,
        imageUrl: p.publicImages?.[0],
        currentPrice,
        suggestedPrice,
        reasoning,
        expectedRevenueLift,
        confidence,
      };
    }).filter((o) => o.suggestedPrice !== o.currentPrice);

    return optimizations.slice(0, 20);
  }

  async applyPriceSuggestion(tenantId: string, shopId: string | null | undefined, productId: string, newPrice: number) {
    if (newPrice <= 0) throw new BadRequestException('Invalid price');
    await this.prisma.productMarketplaceProfile.update({
      where: { productId },
      data: { publicPrice: newPrice },
    });
    return { success: true };
  }

  async customerRecommendations(tenantId: string, shopId: string | null | undefined, limit: number = 20) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const last90 = new Date(Date.now() - 90 * 86400000);

    // Get active customers
    const activeCustomers = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where: {
        shopId: resolvedShopId,
        createdAt: { gte: last90 },
        status: 'DELIVERED',
      },
      _count: { _all: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: limit,
    });

    const custIds = activeCustomers.map((c) => c.customerId);
    const [customers, customerOrders] = await Promise.all([
      this.prisma.marketplaceCustomer.findMany({
        where: { id: { in: custIds } },
        select: { id: true, fullName: true, avatarUrl: true },
      }),
      this.prisma.marketplaceOrderItem.findMany({
        where: {
          order: { customerId: { in: custIds }, shopId: resolvedShopId },
        },
        select: { orderId: true, productId: true, order: { select: { customerId: true } } },
      }),
    ]);

    // Map customer -> purchased productIds
    const customerProducts = new Map<string, Set<string>>();
    for (const item of customerOrders) {
      const cid = item.order.customerId;
      if (!customerProducts.has(cid)) customerProducts.set(cid, new Set());
      customerProducts.get(cid)!.add(item.productId);
    }

    // Get top-selling products (shop-wide) as recommendation pool
    const topProducts = await this.prisma.marketplaceOrderItem.groupBy({
      by: ['productId'],
      where: { order: { shopId: resolvedShopId, status: 'DELIVERED' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 50,
    });
    const topProductIds = topProducts.map((p) => p.productId);
    const topProfiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: topProductIds }, isListedOnMarketplace: true },
      select: { productId: true, publicName: true, publicImages: true, publicPrice: true, marketplaceCategory: true },
    });

    return customers.map((c) => {
      const purchased = customerProducts.get(c.id) || new Set();
      // Suggest top-selling products they haven't bought yet
      const suggestions = topProfiles
        .filter((p) => !purchased.has(p.productId))
        .slice(0, 5)
        .map((p) => ({
          productId: p.productId,
          productName: p.publicName,
          imageUrl: p.publicImages?.[0],
          price: Number(p.publicPrice),
          score: 0.7 + Math.random() * 0.3,
          reason: `Trending in ${p.marketplaceCategory || 'store'}`,
        }));

      return {
        customerId: c.id,
        fullName: c.fullName,
        avatarUrl: c.avatarUrl,
        suggestions,
      };
    }).filter((r) => r.suggestions.length > 0);
  }

  async crossSellSuggestions(tenantId: string, shopId: string | null | undefined, productId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    // Find orders containing this product
    const relatedOrderItems = await this.prisma.marketplaceOrderItem.findMany({
      where: {
        productId,
        order: { shopId: resolvedShopId, status: 'DELIVERED' },
      },
      select: { orderId: true },
    });
    const orderIds = relatedOrderItems.map((r) => r.orderId);

    if (orderIds.length === 0) return [];

    // Find other products in those orders
    const cooccurring = await this.prisma.marketplaceOrderItem.groupBy({
      by: ['productId'],
      where: { orderId: { in: orderIds }, productId: { not: productId } },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 10,
    });

    const suggIds = cooccurring.map((c) => c.productId);
    const profiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: suggIds }, isListedOnMarketplace: true },
      select: { productId: true, publicName: true, publicImages: true, publicPrice: true },
    });
    const profMap = new Map(profiles.map((p) => [p.productId, p]));

    return cooccurring.map((c) => {
      const p = profMap.get(c.productId);
      if (!p) return null;
      return {
        productId: c.productId,
        productName: p.publicName,
        imageUrl: p.publicImages?.[0],
        price: Number(p.publicPrice),
        cooccurrenceScore: ((c._count as any)?._all ?? 0) / orderIds.length,
      };
    }).filter(Boolean);
  }
}
