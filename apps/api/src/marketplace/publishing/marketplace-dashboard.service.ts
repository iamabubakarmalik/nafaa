import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketplaceDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string, shopId?: string | null) {
    let resolvedShopId = shopId;
    if (!resolvedShopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('No shop found');
      resolvedShopId = shop.id;
    }

    const shopProfile = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId: resolvedShopId },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalProducts, listedProducts] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.productMarketplaceProfile.count({
        where: { shopId: resolvedShopId, isListedOnMarketplace: true },
      }),
    ]);

    const [todayOrders, pendingCount, preparingCount, outForDeliveryCount, monthOrders] = await Promise.all([
      this.prisma.marketplaceOrder.aggregate({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: todayStart },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.marketplaceOrder.count({
        where: { shopId: resolvedShopId, status: 'PENDING' },
      }),
      this.prisma.marketplaceOrder.count({
        where: { shopId: resolvedShopId, status: 'PREPARING' },
      }),
      this.prisma.marketplaceOrder.count({
        where: { shopId: resolvedShopId, status: 'OUT_FOR_DELIVERY' },
      }),
      this.prisma.marketplaceOrder.aggregate({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: monthStart },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const [unrespondedReviews, unreadMessages, activeBargains, activeGroupBuys, liveAuctions, upcomingLiveShows] = await Promise.all([
      this.prisma.marketplaceReview.count({
        where: { shopId: resolvedShopId, replyFromShop: null },
      }).catch(() => 0),
      this.prisma.conversation.count({
        where: { shopId: resolvedShopId, unreadCount: { gt: 0 } },
      }).catch(() => 0),
      this.prisma.bargain.count({
        where: { shopId: resolvedShopId, status: { in: ['PENDING', 'COUNTER_OFFERED'] } },
      }).catch(() => 0),
      this.prisma.groupBuy.count({
        where: { shopId: resolvedShopId, status: 'ACTIVE' },
      }).catch(() => 0),
      this.prisma.auction.count({
        where: { shopId: resolvedShopId, status: 'LIVE' },
      }).catch(() => 0),
      this.prisma.liveShop.count({
        where: { shopId: resolvedShopId, status: 'SCHEDULED' },
      }).catch(() => 0),
    ]);

    const recentOrders = await this.prisma.marketplaceOrder.findMany({
      where: { shopId: resolvedShopId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        items: { take: 3, select: { productName: true, quantity: true } },
      },
    });

    return {
      shop: {
        isListed: shopProfile?.isListedOnMarketplace || false,
        verificationLevel: shopProfile?.verificationLevel || 'UNVERIFIED',
        ratingAverage: shopProfile?.ratingAverage || 0,
        ratingCount: shopProfile?.ratingCount || 0,
        followerCount: shopProfile?.followerCount || 0,
      },
      products: {
        total: totalProducts,
        listed: listedProducts,
        unlisted: totalProducts - listedProducts,
      },
      orders: {
        todayCount: todayOrders._count._all,
        todayRevenue: Number(todayOrders._sum.total || 0),
        pendingCount,
        preparingCount,
        outForDeliveryCount,
        monthCount: monthOrders._count._all,
        monthRevenue: Number(monthOrders._sum.total || 0),
      },
      activity: {
        unrespondedReviews,
        unreadMessages,
        activeBargains,
        activeGroupBuys,
        liveAuctions,
        upcomingLiveShows,
      },
      recent: {
        orders: recentOrders.map((o) => ({
          ...o,
          subtotal: Number(o.subtotal),
          discount: Number(o.discount),
          deliveryFee: Number(o.deliveryFee),
          total: Number(o.total),
          itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        })),
      },
    };
  }
}
