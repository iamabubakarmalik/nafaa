import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopScope } from '../../common/shop-scope';
import { OnlineOrdersService } from '../../integrations/online-orders/online-orders.service';
import { courierLink, courierName } from '../../integrations/online-orders/couriers';
import { MarketCatalogService, lineKey } from '../_shared/market-catalog.service';
import { MARKET_STATUS_LABEL, MarketStatusSyncService } from '../_shared/market-status-sync.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { RateOrderDto } from './dto/rate-order.dto';

const CANCELLABLE_STATUSES: MarketplaceOrderStatus[] = ['PENDING', 'CONFIRMED'];
const ACTIVE_STATUSES: MarketplaceOrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY',
];
const COMPLETED_STATUSES: MarketplaceOrderStatus[] = [
  'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED',
];

@Injectable()
export class MarketplaceOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onlineOrders: OnlineOrdersService,
    private readonly sync: MarketStatusSyncService,
    private readonly catalog: MarketCatalogService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // LIST ORDERS
  // ═══════════════════════════════════════════════════════════

  async listOrders(customerId: string, dto: ListOrdersDto) {
    const where: Prisma.MarketplaceOrderWhereInput = { customerId };
    if (dto.status?.length) where.status = { in: dto.status };
    if (dto.shopId) where.shopId = dto.shopId;
    if (dto.search) where.orderNumber = { contains: dto.search, mode: 'insensitive' };
    if (dto.fromDate || dto.toDate) {
      where.createdAt = {};
      if (dto.fromDate) (where.createdAt as any).gte = new Date(dto.fromDate);
      if (dto.toDate) (where.createdAt as any).lte = new Date(dto.toDate);
    }

    const [items, total, statusCounts] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
        select: {
          id: true, orderNumber: true, shopId: true, status: true,
          deliveryType: true, paymentMethod: true, paymentStatus: true,
          subtotal: true, deliveryFee: true, discount: true, total: true, currency: true,
          isRated: true, source: true, createdAt: true, updatedAt: true,
          estimatedDeliveryAt: true, actualDeliveryAt: true,
          items: {
            take: 3,
            select: {
              productName: true, variantName: true, imageUrl: true,
              quantity: true, unitPrice: true,
            },
          },
          shop: {
            select: {
              id: true,
              marketplaceProfile: {
                select: { slug: true, publicName: true, logoUrl: true, ratingAverage: true },
              },
            },
          },
        },
      }),
      this.prisma.marketplaceOrder.count({ where }),
      this.prisma.marketplaceOrder.groupBy({
        by: ['status'],
        where: { customerId },
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count.status; });

    return {
      items: items.map((o) => ({
        ...o,
        totalItems: o.items.reduce((s, i) => s + i.quantity, 0),
        isActive: ACTIVE_STATUSES.includes(o.status),
        isCompleted: COMPLETED_STATUSES.includes(o.status),
        canCancel: CANCELLABLE_STATUSES.includes(o.status),
      })),
      total,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
      counts: {
        all: total,
        active: (counts.PENDING ?? 0) + (counts.CONFIRMED ?? 0) + (counts.PREPARING ?? 0) +
               (counts.READY_FOR_PICKUP ?? 0) + (counts.OUT_FOR_DELIVERY ?? 0),
        delivered: counts.DELIVERED ?? 0,
        cancelled: counts.CANCELLED ?? 0,
        refunded: counts.REFUNDED ?? 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVE ORDERS (for banner on home)
  // ═══════════════════════════════════════════════════════════

  async getActiveOrders(customerId: string) {
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: { customerId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, orderNumber: true, status: true, total: true, currency: true,
        estimatedDeliveryAt: true, riderName: true, riderPhone: true,
        createdAt: true, updatedAt: true,
        shop: {
          select: {
            marketplaceProfile: {
              select: { publicName: true, logoUrl: true, slug: true },
            },
          },
        },
      },
    });
    return { items: orders, count: orders.length };
  }

  // ═══════════════════════════════════════════════════════════
  // ORDER DETAIL
  // ═══════════════════════════════════════════════════════════

  async getOrderDetail(customerId: string, orderId: string) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
      include: {
        items: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
        address: true,
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: {
                shopId: true, slug: true, publicName: true, logoUrl: true,
                publicPhone: true, whatsappNumber: true, city: true, area: true,
                ratingAverage: true, ratingCount: true,
              },
            },
          },
        },
        reviews: {
          select: { id: true, rating: true, reviewType: true, createdAt: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const live = await this.liveStatus(order.channelOrderId);
    return {
      ...order,
      statusLabel: MARKET_STATUS_LABEL[order.status],
      live,
      isActive: ACTIVE_STATUSES.includes(order.status),
      isCompleted: COMPLETED_STATUSES.includes(order.status),
      canCancel: CANCELLABLE_STATUSES.includes(order.status),
      canRate: order.status === 'DELIVERED' && !order.isRated,
      canReorder: COMPLETED_STATUSES.includes(order.status),
    };
  }

  /** Live state from the shop's Online Orders record: status, rider and courier tracking. */
  private async liveStatus(channelOrderId: string | null) {
    if (!channelOrderId) return null;
    const co = await this.prisma.channelOrder.findUnique({
      where: { id: channelOrderId },
      select: {
        orderStatus: true, acceptedAt: true, dispatchedAt: true, deliveredAt: true, cancelledAt: true, cancelReason: true,
        courierCode: true, courierName: true, trackingNumber: true, courierStatus: true, courierStatusAt: true, assignedToId: true,
      },
    });
    if (!co) return null;
    const rider = co.assignedToId
      ? await this.prisma.user.findUnique({ where: { id: co.assignedToId }, select: { fullName: true, phone: true } })
      : null;
    return {
      orderStatus: co.orderStatus,
      acceptedAt: co.acceptedAt,
      dispatchedAt: co.dispatchedAt,
      deliveredAt: co.deliveredAt,
      cancelledAt: co.cancelledAt,
      cancelReason: co.cancelReason,
      rider: rider ? { name: rider.fullName, phone: rider.phone } : null,
      courier: co.courierCode || co.trackingNumber
        ? {
            code: co.courierCode,
            name: co.courierName ?? courierName(co.courierCode),
            trackingNumber: co.trackingNumber,
            trackUrl: courierLink(co.courierCode, co.trackingNumber),
            status: co.courierStatus,
            statusAt: co.courierStatusAt,
          }
        : null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TRACK ORDER — realtime status + timeline
  // ═══════════════════════════════════════════════════════════

  async trackOrder(customerId: string, orderId: string) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true, orderNumber: true, status: true, deliveryType: true, channelOrderId: true,
        estimatedDeliveryAt: true, actualDeliveryAt: true, deliverySlotStart: true, deliverySlotEnd: true,
        riderId: true, riderName: true, riderPhone: true,
        createdAt: true, updatedAt: true,
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          select: {
            status: true, note: true, changedBy: true, changedAt: true,
          },
        },
        address: true,
        shop: {
          select: {
            marketplaceProfile: {
              select: {
                publicName: true, logoUrl: true, publicPhone: true, lat: true, lng: true,
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Build a canonical timeline with all possible statuses
    const pickup = ['PICKUP', 'SELF_PICKUP', 'DINE_IN'].includes(order.deliveryType as string);
    const canonicalStatuses: MarketplaceOrderStatus[] = pickup
      ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERED']
      : ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const completed = new Set(order.statusHistory.map((h) => h.status));
    const timeline = canonicalStatuses.map((s) => ({
      status: s,
      label: MARKET_STATUS_LABEL[s],
      reached: completed.has(s) || (
        // If current status is later in flow, mark previous as reached
        canonicalStatuses.indexOf(order.status) >= canonicalStatuses.indexOf(s)
      ),
      reachedAt: order.statusHistory.find((h) => h.status === s)?.changedAt ?? null,
      isCurrent: order.status === s,
    }));

    return {
      order,
      timeline,
      currentStatus: order.status,
      statusLabel: MARKET_STATUS_LABEL[order.status],
      live: await this.liveStatus(order.channelOrderId),
      isActive: ACTIVE_STATUSES.includes(order.status),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CANCEL ORDER
  // ═══════════════════════════════════════════════════════════

  async cancelOrder(customerId: string, orderId: string, dto: CancelOrderDto) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
      select: { id: true, tenantId: true, status: true, channelOrderId: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Ye order ab cancel nahi ho sakta. Dukaan se baat karein.');
    }
    const reason = dto.reason?.trim() || 'Customer ne cancel kiya';

    if (order.channelOrderId) {
      // Cancel at the source: the POS bill is voided and the stock comes back.
      const co = await this.prisma.channelOrder.findUnique({ where: { id: order.channelOrderId }, select: { orderStatus: true } });
      if (co && !['PENDING', 'ACCEPTING', 'CONFIRMED', 'CANCELLED', 'REJECTED'].includes(co.orderStatus)) {
        throw new BadRequestException('Dukaan order tayyar kar rahi hai, ab cancel nahi ho sakta. Dukaan se baat karein.');
      }
      const actor = await this.onlineOrders.systemActor(order.tenantId);
      await this.onlineOrders.cancel(actor, new ShopScope(null, true), order.channelOrderId, `Customer: ${reason}`);
      await this.sync.syncFromChannel(order.channelOrderId, { by: 'CUSTOMER', note: reason });
    } else {
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.marketplaceOrder.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'CUSTOMER', cancelReason: reason, paymentStatus: 'FAILED' },
        });
        if (!res.count) return;
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: 'CANCELLED', note: reason, changedBy: 'CUSTOMER' } });
        const o = await tx.marketplaceOrder.findUnique({ where: { id: order.id }, select: { walletUsed: true, loyaltyPointsUsed: true, orderNumber: true } });
        const wallet = Number(o?.walletUsed ?? 0);
        if (wallet > 0) {
          const c = await tx.marketplaceCustomer.update({ where: { id: customerId }, data: { walletBalance: { increment: wallet } }, select: { walletBalance: true } });
          await tx.customerWalletTxn.create({
            data: { customerId, type: 'REFUND', amount: wallet, balanceAfter: c.walletBalance, reason: `Cancel order ${o!.orderNumber} ka refund`, referenceType: 'ORDER', referenceId: order.id },
          });
        }
        if (o?.loyaltyPointsUsed) {
          await tx.marketplaceCustomer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: o.loyaltyPointsUsed } } });
        }
      });
    }
    return { success: true, message: 'Order cancel ho gaya' };
  }

  // ═══════════════════════════════════════════════════════════
  // REORDER (copy items into cart)
  // ═══════════════════════════════════════════════════════════

  async reorder(customerId: string, orderId: string) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const cart = await this.prisma.marketplaceCart.upsert({
      where: { customerId }, update: {}, create: { customerId },
    });

    let addedCount = 0;
    let skippedCount = 0;
    const skipped: string[] = [];

    const live = await this.catalog.lines(order.items.map((i) => ({ productId: i.productId, variantId: i.variantId })));
    for (const item of order.items) {
      const info = live.get(lineKey(item.productId, item.variantId));
      if (!info || info.problem) {
        skipped.push(item.productName);
        skippedCount++;
        continue;
      }
      const existing = await this.prisma.marketplaceCartLine.findFirst({
        where: { cartId: cart.id, productId: item.productId, variantId: item.variantId },
      });
      const qty = Math.min(info.maxQty, (existing?.quantity ?? 0) + item.quantity);
      if (existing) {
        await this.prisma.marketplaceCartLine.update({ where: { id: existing.id }, data: { quantity: qty, unitPrice: info.price } });
      } else {
        await this.prisma.marketplaceCartLine.create({
          data: {
            cartId: cart.id,
            shopId: info.shopId,
            productId: item.productId,
            variantId: item.variantId,
            productName: info.name,
            variantName: info.variantName,
            imageUrl: info.image,
            unitPrice: info.price,
            quantity: Math.min(info.maxQty, item.quantity),
            notes: item.notes,
            options: (item.options ?? Prisma.DbNull) as Prisma.InputJsonValue,
            modifiers: (item.modifiers ?? Prisma.DbNull) as Prisma.InputJsonValue,
          },
        });
      }
      addedCount++;
    }

    return {
      success: true,
      addedCount,
      skippedCount,
      skippedItems: skipped,
      message: `${addedCount} item cart me add ho gaye${skippedCount ? ` (${skippedCount} abhi available nahi)` : ''}`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RATE ORDER
  // ═══════════════════════════════════════════════════════════

  async rateOrder(customerId: string, orderId: string, dto: RateOrderDto) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Only delivered orders can be rated');
    }
    if (order.isRated) {
      throw new BadRequestException('Order already rated');
    }

    await this.prisma.$transaction(async (tx) => {
      // Shop review
      await tx.marketplaceReview.create({
        data: {
          customerId,
          reviewType: 'SHOP',
          orderId: order.id,
          shopId: order.shopId,
          rating: dto.shopRating,
          title: dto.title,
          comment: dto.comment,
          imageUrls: dto.imageUrls ?? [],
          videoUrl: dto.videoUrl,
          qualityRating: dto.qualityRating,
          packagingRating: dto.packagingRating,
          deliveryRating: dto.deliveryRating,
          valueRating: dto.valueRating,
          isVerifiedPurchase: true,
        },
      });

      // Update shop rolling rating (denormalized)
      const shopRatings = await tx.marketplaceReview.aggregate({
        where: { shopId: order.shopId, reviewType: 'SHOP', isApproved: true, isHidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.shopMarketplaceProfile.update({
        where: { shopId: order.shopId },
        data: {
          ratingAverage: shopRatings._avg.rating ?? 0,
          ratingCount: shopRatings._count.rating,
        },
      });

      // Mark order rated
      await tx.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          isRated: true,
          shopRating: dto.shopRating,
          riderRating: dto.riderRating,
        },
      });

      // Award loyalty points (5 points per review)
      await tx.marketplaceCustomer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: 5 } },
      });
    });

    return { success: true, message: 'Thanks for your review! 5 loyalty points earned' };
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOMER STATS (for profile screen)
  // ═══════════════════════════════════════════════════════════

  async getCustomerStats(customerId: string) {
    const [totalOrders, delivered, cancelled, totalSpentAgg, favShops] = await Promise.all([
      this.prisma.marketplaceOrder.count({ where: { customerId } }),
      this.prisma.marketplaceOrder.count({ where: { customerId, status: 'DELIVERED' } }),
      this.prisma.marketplaceOrder.count({ where: { customerId, status: 'CANCELLED' } }),
      this.prisma.marketplaceOrder.aggregate({
        where: { customerId, status: 'DELIVERED' },
        _sum: { total: true },
      }),
      this.prisma.marketplaceOrder.groupBy({
        by: ['shopId'],
        where: { customerId, status: 'DELIVERED' },
        _count: { shopId: true },
        orderBy: { _count: { shopId: 'desc' } },
        take: 3,
      }),
    ]);

    return {
      totalOrders,
      deliveredOrders: delivered,
      cancelledOrders: cancelled,
      totalSpent: Number(totalSpentAgg._sum.total ?? 0),
      favouriteShops: favShops.map((s) => ({
        shopId: s.shopId,
        orderCount: s._count.shopId,
      })),
    };
  }
}
