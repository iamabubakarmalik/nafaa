import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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

    // Enrich with related — group-buy status, bargains
    const bargainIds = order.items.map((i) => i.bargainId).filter(Boolean) as string[];
    const bargains = bargainIds.length
      ? await this.prisma.bargain.findMany({
          where: { id: { in: bargainIds } },
          select: {
            id: true, originalPrice: true, finalPrice: true, status: true,
          },
        })
      : [];

    return {
      ...order,
      isActive: ACTIVE_STATUSES.includes(order.status),
      isCompleted: COMPLETED_STATUSES.includes(order.status),
      canCancel: CANCELLABLE_STATUSES.includes(order.status),
      canRate: order.status === 'DELIVERED' && !order.isRated,
      canReorder: COMPLETED_STATUSES.includes(order.status),
      bargains,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TRACK ORDER — realtime status + timeline
  // ═══════════════════════════════════════════════════════════

  async trackOrder(customerId: string, orderId: string) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true, orderNumber: true, status: true, deliveryType: true,
        estimatedDeliveryAt: true, actualDeliveryAt: true,
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
    const canonicalStatuses: MarketplaceOrderStatus[] = [
      'PENDING', 'CONFIRMED', 'PREPARING',
      (order.deliveryType as string) === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP',
      'DELIVERED',
    ];
    const completed = new Set(order.statusHistory.map((h) => h.status));
    const timeline = canonicalStatuses.map((s) => ({
      status: s,
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
      isActive: ACTIVE_STATUSES.includes(order.status),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CANCEL ORDER
  // ═══════════════════════════════════════════════════════════

  async cancelOrder(customerId: string, orderId: string, dto: CancelOrderDto) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Order can no longer be cancelled (current status: ${order.status})`,
      );
    }

    const walletRefund = Number(order.walletUsed);
    const loyaltyRefund = order.loyaltyPointsUsed;

    await this.prisma.$transaction(async (tx) => {
      await tx.marketplaceOrder.update({
        where: { id: orderId },
        data: {
          status: MarketplaceOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: 'CUSTOMER',
          cancelReason: dto.reason,
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED',
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: MarketplaceOrderStatus.CANCELLED,
          note: dto.reason ?? 'Cancelled by customer',
          changedBy: 'CUSTOMER',
        },
      });

      // Refund wallet
      if (walletRefund > 0) {
        const customer = await tx.marketplaceCustomer.findUnique({
          where: { id: customerId },
          select: { walletBalance: true },
        });
        const newBalance = Number(customer!.walletBalance) + walletRefund;
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { walletBalance: newBalance },
        });
        await tx.customerWalletTxn.create({
          data: {
            customerId,
            type: 'REFUND',
            amount: walletRefund,
            balanceAfter: newBalance,
            reason: `Refund for cancelled order ${order.orderNumber}`,
            referenceType: 'ORDER',
            referenceId: order.id,
          },
        });
      }

      // Refund loyalty
      if (loyaltyRefund > 0) {
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { loyaltyPoints: { increment: loyaltyRefund } },
        });
      }

      // Refund paid amount to wallet if paid via non-COD
      if (order.paymentStatus === 'PAID' && order.paymentMethod !== 'COD') {
        const customer = await tx.marketplaceCustomer.findUnique({
          where: { id: customerId },
          select: { walletBalance: true },
        });
        const netPaid = Number(order.total) - walletRefund;
        if (netPaid > 0) {
          const newBalance = Number(customer!.walletBalance) + netPaid;
          await tx.marketplaceCustomer.update({
            where: { id: customerId },
            data: { walletBalance: newBalance },
          });
          await tx.customerWalletTxn.create({
            data: {
              customerId,
              type: 'REFUND',
              amount: netPaid,
              balanceAfter: newBalance,
              reason: `Payment refund for cancelled order ${order.orderNumber}`,
              referenceType: 'ORDER',
              referenceId: order.id,
            },
          });
        }
      }

      // Release bargain locks
      await tx.bargain.updateMany({
        where: { orderId: order.id },
        data: { orderId: null, convertedAt: null, status: 'ACCEPTED' },
      });
    });

    return { success: true, message: 'Order cancelled' };
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

    for (const item of order.items) {
      // Verify product still exists + available
      const product = await this.prisma.productMarketplaceProfile.findUnique({
        where: { productId: item.productId },
        select: {
          isAvailable: true, isListedOnMarketplace: true,
          publicPrice: true, shopId: true,
        },
      });
      if (!product?.isAvailable || !product.isListedOnMarketplace) {
        skipped.push(item.productName);
        skippedCount++;
        continue;
      }
      // Add to cart at CURRENT price (not old order price)
      const existing = await this.prisma.marketplaceCartLine.findFirst({
        where: {
          cartId: cart.id, productId: item.productId,
          variantId: item.variantId, bargainId: null, groupBuyId: null,
        },
      });
      if (existing) {
        await this.prisma.marketplaceCartLine.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await this.prisma.marketplaceCartLine.create({
          data: {
            cartId: cart.id,
            shopId: product.shopId,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            imageUrl: item.imageUrl,
            unitPrice: product.publicPrice,
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers as any,
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
      message: `${addedCount} items added to cart${skippedCount ? ` (${skippedCount} skipped)` : ''}`,
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
