import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerSubscriptionStatus, SubscriptionFrequency, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

function computeNextDelivery(from: Date, freq: SubscriptionFrequency, customDays?: number | null) {
  const d = new Date(from);
  switch (freq) {
    case 'DAILY': d.setDate(d.getDate() + 1); break;
    case 'WEEKLY': d.setDate(d.getDate() + 7); break;
    case 'BIWEEKLY': d.setDate(d.getDate() + 14); break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'CUSTOM_DAYS': d.setDate(d.getDate() + (customDays ?? 7)); break;
  }
  return d;
}

@Injectable()
export class CustomerSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateSubscriptionDto) {
    if (!dto.items?.length) throw new BadRequestException('At least 1 item required');

    // Snapshot product prices
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds }, isListedOnMarketplace: true },
      select: { productId: true, publicName: true, publicPrice: true, publicImages: true },
    });
    const productMap = new Map(products.map((p) => [p.productId, p]));

    const sub = await this.prisma.customerSubscription.create({
      data: {
        customerId, shopId: dto.shopId, addressId: dto.addressId,
        frequency: dto.frequency, customDays: dto.customDays,
        paymentMethod: dto.paymentMethod,
        status: CustomerSubscriptionStatus.ACTIVE,
        nextDeliveryAt: new Date(dto.startDate),
        items: {
          create: dto.items.map((i) => {
            const p = productMap.get(i.productId);
            if (!p) throw new BadRequestException(`Product ${i.productId} not available`);
            return {
              productId: i.productId, variantId: i.variantId,
              productName: p.publicName, imageUrl: p.publicImages?.[0],
              quantity: i.quantity, unitPrice: p.publicPrice,
            };
          }),
        },
      },
      include: { items: true },
    });
    return sub;
  }

  async list(customerId: string, status?: CustomerSubscriptionStatus) {
    return this.prisma.customerSubscription.findMany({
      where: { customerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { items: true, _count: { select: { deliveries: true } } },
    });
  }

  async get(customerId: string, id: string) {
    const sub = await this.prisma.customerSubscription.findFirst({
      where: { id, customerId },
      include: { items: true, deliveries: { orderBy: { scheduledFor: 'desc' }, take: 20 } },
    });
    if (!sub) throw new NotFoundException();
    return sub;
  }

  async pause(customerId: string, id: string, until?: string) {
    const sub = await this.prisma.customerSubscription.findFirst({ where: { id, customerId } });
    if (!sub) throw new NotFoundException();
    return this.prisma.customerSubscription.update({
      where: { id },
      data: {
        status: CustomerSubscriptionStatus.PAUSED,
        pausedUntil: until ? new Date(until) : null,
      },
    });
  }

  async resume(customerId: string, id: string) {
    const sub = await this.prisma.customerSubscription.findFirst({ where: { id, customerId } });
    if (!sub) throw new NotFoundException();
    return this.prisma.customerSubscription.update({
      where: { id },
      data: {
        status: CustomerSubscriptionStatus.ACTIVE,
        pausedUntil: null,
        nextDeliveryAt: computeNextDelivery(new Date(), sub.frequency, sub.customDays),
      },
    });
  }

  async cancel(customerId: string, id: string, reason?: string) {
    const sub = await this.prisma.customerSubscription.findFirst({ where: { id, customerId } });
    if (!sub) throw new NotFoundException();
    return this.prisma.customerSubscription.update({
      where: { id },
      data: {
        status: CustomerSubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
  }

  async skipNext(customerId: string, id: string) {
    const sub = await this.prisma.customerSubscription.findFirst({ where: { id, customerId } });
    if (!sub) throw new NotFoundException();
    const next = computeNextDelivery(sub.nextDeliveryAt, sub.frequency, sub.customDays);
    await this.prisma.subscriptionDelivery.create({
      data: {
        subscriptionId: id, scheduledFor: sub.nextDeliveryAt,
        status: 'SKIPPED', totalAmount: 0, skippedReason: 'Customer skipped',
      },
    });
    return this.prisma.customerSubscription.update({
      where: { id }, data: { nextDeliveryAt: next },
    });
  }

  async listDueForDelivery(before: Date) {
    return this.prisma.customerSubscription.findMany({
      where: {
        status: CustomerSubscriptionStatus.ACTIVE,
        nextDeliveryAt: { lte: before },
      },
      include: { items: true },
      take: 500,
    });
  }

  async processDelivery(subscriptionId: string) {
    const sub = await this.prisma.customerSubscription.findUnique({
      where: { id: subscriptionId }, include: { items: true },
    });
    if (!sub) throw new NotFoundException();

    const totalAmount = sub.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
    const discounted = totalAmount * (1 - sub.discountPercent / 100);
    const next = computeNextDelivery(new Date(), sub.frequency, sub.customDays);

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.subscriptionDelivery.create({
        data: {
          subscriptionId, scheduledFor: sub.nextDeliveryAt,
          status: 'CREATED', totalAmount: discounted,
        },
      });
      await tx.customerSubscription.update({
        where: { id: subscriptionId },
        data: {
          nextDeliveryAt: next,
          lastDeliveredAt: new Date(),
          totalDeliveries: { increment: 1 },
          totalSpent: { increment: discounted },
        },
      });
      return delivery;
    });
  }
}
