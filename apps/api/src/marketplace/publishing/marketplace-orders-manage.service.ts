import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopScope } from '../../common/shop-scope';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { OnlineOrdersService } from '../../integrations/online-orders/online-orders.service';
import { MarketStatusSyncService } from '../_shared/market-status-sync.service';

/** Statuses a seller may set; everything else follows from Online Orders. */
const SELLER_STATUSES: MarketplaceOrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const CHANNEL_STATUS: Partial<Record<MarketplaceOrderStatus, string>> = {
  CONFIRMED: 'CONFIRMED', PREPARING: 'PREPARING', READY_FOR_PICKUP: 'READY', OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY', DELIVERED: 'DELIVERED',
};

@Injectable()
export class MarketplaceOrdersManageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onlineOrders: OnlineOrdersService,
    private readonly sync: MarketStatusSyncService,
  ) {}

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

  async list(tenantId: string, shopId: string | null | undefined, opts: {
    status?: string[];
    search?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { shopId: resolvedShopId };
    if (opts.status?.length) where.status = { in: opts.status };
    if (opts.search) {
      where.OR = [
        { orderNumber: { contains: opts.search, mode: 'insensitive' } },
        { customer: { fullName: { contains: opts.search, mode: 'insensitive' } } },
      ];
    }
    if (opts.fromDate || opts.toDate) {
      where.createdAt = {};
      if (opts.fromDate) where.createdAt.gte = new Date(opts.fromDate);
      if (opts.toDate) where.createdAt.lte = new Date(opts.toDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
          items: {
            take: 5,
            select: {
              id: true, productName: true, variantName: true, imageUrl: true,
              unitPrice: true, quantity: true, total: true,
            },
          },
        },
      }),
      this.prisma.marketplaceOrder.count({ where }),
    ]);

    const statusCounts = await this.prisma.marketplaceOrder.groupBy({
      by: ['status'],
      where: { shopId: resolvedShopId },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => {
      counts[s.status] = s._count._all;
    });

    return {
      items: items.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        deliveryFee: Number(o.deliveryFee),
        serviceFee: Number(o.serviceFee || 0),
        taxAmount: Number(o.taxAmount || 0),
        tipAmount: Number(o.tipAmount || 0),
        walletUsed: Number(o.walletUsed || 0),
        loyaltyDiscount: Number(o.loyaltyDiscount || 0),
        total: Number(o.total),
        couponDiscount: Number(o.couponDiscount || 0),
        itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    };
  }

  async getOne(tenantId: string, shopId: string | null | undefined, orderId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, shopId: resolvedShopId },
      include: {
        customer: true,
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Seller status change. A Market order with a ChannelOrder is changed only
   * through Online Orders (accept makes the POS bill, cancel voids it); the
   * Market order then follows through MarketStatusSyncService.
   */
  async updateStatus(user: AuthenticatedUser, shopId: string | null | undefined, orderId: string, status: string, note?: string) {
    const resolvedShopId = await this.resolveShopId(user.tenantId, shopId);
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, shopId: resolvedShopId, tenantId: user.tenantId },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    const target = String(status ?? '').toUpperCase() as MarketplaceOrderStatus;
    if (!SELLER_STATUSES.includes(target)) throw new BadRequestException('Ye status yahan se nahi lag sakta');

    if (order.channelOrderId) {
      const scope = new ShopScope(null, true);
      const co = await this.prisma.channelOrder.findUnique({ where: { id: order.channelOrderId }, select: { nafaaSaleId: true, orderStatus: true } });
      if (!co) throw new NotFoundException('Online order nahi mila');
      if (target === 'CANCELLED') {
        await this.onlineOrders.cancel(user, scope, order.channelOrderId, note, co.orderStatus === 'PENDING' ? 'REJECTED' : 'CANCELLED');
      } else {
        // Accept first: it makes the POS bill and takes the stock.
        if (!co.nafaaSaleId) await this.onlineOrders.accept(user, scope, order.channelOrderId, {});
        const channelStatus = CHANNEL_STATUS[target];
        if (channelStatus && channelStatus !== 'CONFIRMED') {
          await this.onlineOrders.updateStatus(user, scope, order.channelOrderId, { status: channelStatus, reason: note });
        }
      }
      if (note) await this.prisma.marketplaceOrder.update({ where: { id: order.id }, data: { shopNotes: note } });
      await this.sync.syncFromChannel(order.channelOrderId, { by: 'SHOP', note });
      return this.prisma.marketplaceOrder.findUnique({ where: { id: order.id } });
    }

    // Older orders placed before the Market channel existed.
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceOrder.update({
        where: { id: orderId },
        data: {
          status: target,
          shopNotes: note || order.shopNotes,
          ...(target === 'DELIVERED' && { actualDeliveryAt: new Date() }),
          ...(target === 'CANCELLED' && { cancelledBy: 'SHOP', cancelledAt: new Date(), cancelReason: note ?? null }),
        },
      });
      await tx.orderStatusHistory.create({ data: { orderId, status: target, note: note ?? null, changedBy: 'SHOP' } });
      return updated;
    });
  }

  async accept(user: AuthenticatedUser, shopId: string | null | undefined, orderId: string) {
    return this.updateStatus(user, shopId, orderId, 'CONFIRMED');
  }

  async reject(user: AuthenticatedUser, shopId: string | null | undefined, orderId: string, reason: string) {
    return this.updateStatus(user, shopId, orderId, 'CANCELLED', reason);
  }

  async markReady(user: AuthenticatedUser, shopId: string | null | undefined, orderId: string) {
    return this.updateStatus(user, shopId, orderId, 'READY_FOR_PICKUP');
  }

  async markDelivered(user: AuthenticatedUser, shopId: string | null | undefined, orderId: string) {
    return this.updateStatus(user, shopId, orderId, 'DELIVERED');
  }
}
