import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketplaceOrdersManageService {
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

  async updateStatus(tenantId: string, shopId: string | null | undefined, orderId: string, status: string, note?: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, shopId: resolvedShopId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        status: status as any,
        shopNotes: note || order.shopNotes,
      },
    });
  }

  async accept(tenantId: string, shopId: string | null | undefined, orderId: string) {
    return this.updateStatus(tenantId, shopId, orderId, 'CONFIRMED');
  }

  async reject(tenantId: string, shopId: string | null | undefined, orderId: string, reason: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, shopId: resolvedShopId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledBy: 'SHOP',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
  }

  async markReady(tenantId: string, shopId: string | null | undefined, orderId: string) {
    return this.updateStatus(tenantId, shopId, orderId, 'READY_FOR_PICKUP');
  }

  async markDelivered(tenantId: string, shopId: string | null | undefined, orderId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, shopId: resolvedShopId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        actualDeliveryAt: new Date(),
      },
    });
  }
}
