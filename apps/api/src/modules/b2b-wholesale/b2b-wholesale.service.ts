import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { B2BAccountTier, B2BOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateB2BOrderDto } from './dto/create-b2b-order.dto';

@Injectable()
export class B2BWholesaleService {
  constructor(private readonly prisma: PrismaService) {}

  async registerBuyer(buyerShopId: string, dto?: { cnicNumber?: string; taxNumber?: string; businessProofUrls?: string[] }) {
    return this.prisma.b2BAccount.upsert({
      where: { buyerShopId },
      create: {
        buyerShopId,
        tier: 'STANDARD',
        cnicNumber: dto?.cnicNumber,
        taxNumber: dto?.taxNumber,
        businessProofUrls: dto?.businessProofUrls ?? [],
      },
      update: dto ?? {},
    });
  }

  async verifyAccount(buyerShopId: string, tier: B2BAccountTier, creditLimit: number, creditDays: number, discountPct: number) {
    return this.prisma.b2BAccount.update({
      where: { buyerShopId },
      data: {
        tier,
        creditLimit,
        creditDays,
        discountPct,
        verifiedAt: new Date(),
      },
    });
  }

  async createOrder(dto: CreateB2BOrderDto) {
    const account = await this.prisma.b2BAccount.findUnique({
      where: { buyerShopId: dto.buyerShopId },
    });
    if (!account || !account.verifiedAt) throw new BadRequestException('Buyer not verified');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { marketplaceProfile: true },
    });
    if (products.length !== dto.items.length) throw new BadRequestException('Some products not found');

    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.sellerShopId },
      select: { tenantId: true },
    });
    if (!shop) throw new NotFoundException('Seller shop not found');

    let subtotal = 0;
    const itemsData = dto.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      const wholesale = p.wholesalePrice ?? p.price * 0.8;
      const total = wholesale * i.quantity;
      subtotal += total;
      return {
        productId: i.productId,
        variantId: i.variantId,
        productName: p.name,
        imageUrl: p.marketplaceProfile?.publicImages?.[0],
        unitPrice: p.price,
        wholesalePrice: wholesale,
        quantity: i.quantity,
        total,
      };
    });

    const discountAmount = subtotal * (account.discountPct / 100);
    const total = subtotal - discountAmount;

    if (dto.paymentTerms === 'CREDIT') {
      const availableCredit = Number(account.creditLimit) - Number(account.creditUsed);
      if (total > availableCredit) {
        throw new BadRequestException(`Credit limit exceeded. Available: PKR ${availableCredit.toFixed(0)}`);
      }
    }

    const orderNumber = `B2B-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const dueDate = dto.paymentTerms === 'CREDIT' && dto.creditDays
      ? new Date(Date.now() + dto.creditDays * 86400000)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.b2BOrder.create({
        data: {
          orderNumber,
          buyerShopId: dto.buyerShopId,
          sellerShopId: dto.sellerShopId,
          tenantId: shop.tenantId,
          status: 'CONFIRMED',
          subtotal,
          discount: discountAmount,
          total,
          paymentTerms: dto.paymentTerms ?? 'COD',
          creditDays: dto.creditDays ?? 0,
          dueDate,
          buyerNotes: dto.buyerNotes,
          items: { create: itemsData },
        },
        include: { items: true },
      });
      if (dto.paymentTerms === 'CREDIT') {
        await tx.b2BAccount.update({
          where: { buyerShopId: dto.buyerShopId },
          data: {
            creditUsed: { increment: total },
            outstandingDue: { increment: total },
            totalOrders: { increment: 1 },
            totalSpent: { increment: total },
          },
        });
      } else {
        await tx.b2BAccount.update({
          where: { buyerShopId: dto.buyerShopId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: total },
          },
        });
      }
      return order;
    });
  }

  async updateStatus(orderId: string, status: B2BOrderStatus, notes?: string) {
    return this.prisma.b2BOrder.update({
      where: { id: orderId },
      data: {
        status,
        actualDeliveryAt: status === 'DELIVERED' ? new Date() : undefined,
        sellerNotes: notes,
      },
    });
  }

  async recordPayment(orderId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.b2BOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException();
      const newPaid = Number(order.paidAmount) + amount;
      const isFullyPaid = newPaid >= Number(order.total) - 0.01;

      const updated = await tx.b2BOrder.update({
        where: { id: orderId },
        data: {
          paidAmount: newPaid,
          paidAt: isFullyPaid ? new Date() : undefined,
        },
      });

      if (order.paymentTerms === 'CREDIT') {
        await tx.b2BAccount.update({
          where: { buyerShopId: order.buyerShopId },
          data: {
            creditUsed: { decrement: amount },
            outstandingDue: { decrement: amount },
          },
        });
      }
      return updated;
    });
  }

  async listOrders(opts: { buyerShopId?: string; sellerShopId?: string; status?: B2BOrderStatus; limit?: number; offset?: number }) {
    const where: Prisma.B2BOrderWhereInput = {};
    if (opts.buyerShopId) where.buyerShopId = opts.buyerShopId;
    if (opts.sellerShopId) where.sellerShopId = opts.sellerShopId;
    if (opts.status) where.status = opts.status;
    return this.prisma.b2BOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
      include: { items: true },
    });
  }

  async getAccount(buyerShopId: string) {
    const account = await this.prisma.b2BAccount.findUnique({ where: { buyerShopId } });
    if (!account) throw new NotFoundException();
    return account;
  }
}
