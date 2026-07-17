import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class WeightOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const count = await this.prisma.meatWeightOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'MW-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    let subtotal = 0;
    const enrichedItems = dto.items.map((it: any) => {
      const kg = Number(it.requestedKg) || 0;
      const price = Number(it.pricePerKg) || 0;
      const total = kg * price;
      subtotal += total;
      return {
        productId: it.productId,
        productName: it.productName,
        cutCategory: it.cutCategory,
        requestedKg: kg,
        actualKg: it.actualKg ? Number(it.actualKg) : null,
        pricePerKg: price,
        total,
        cuttingInstructions: it.cuttingInstructions,
        packagingNotes: it.packagingNotes,
      };
    });

    const deliveryCharges = Number(dto.deliveryCharges) || 0;
    const taxAmount = Number(dto.taxAmount) || 0;
    const discount = Number(dto.discount) || 0;
    const total = Math.max(subtotal + deliveryCharges + taxAmount - discount, 0);

    return this.prisma.meatWeightOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        orderNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        neededBy: dto.neededBy ? new Date(dto.neededBy) : null,
        scheduledDelivery: dto.scheduledDelivery ? new Date(dto.scheduledDelivery) : null,
        isDelivery: dto.isDelivery ?? false,
        deliveryAddress: dto.deliveryAddress,
        deliveryCharges,
        occasion: dto.occasion,
        specialInstructions: dto.specialInstructions,
        subtotal,
        taxAmount,
        discount,
        total,
        cuttingStyle: dto.cuttingStyle,
        packagingPref: dto.packagingPref,
        numberOfPackets: dto.numberOfPackets,
        status: 'CONFIRMED',
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.meatWeightOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          orderDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.meatWeightOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, cancellationReason?: string) {
    const o = await this.prisma.meatWeightOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    const patch: any = { status };
    if (status === 'DELIVERED') patch.deliveredAt = new Date();
    if (status === 'CANCELLED') { patch.cancelledAt = new Date(); patch.cancellationReason = cancellationReason; }
    return this.prisma.meatWeightOrder.update({ where: { id }, data: patch, include: { items: true } });
  }

  async updateActualWeights(user: AuthenticatedUser, id: string, items: { itemId: string; actualKg: number }[]) {
    const o = await this.prisma.meatWeightOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!o) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      let newSubtotal = 0;
      for (const it of items) {
        const orig = o.items.find((oi) => oi.id === it.itemId);
        if (!orig) continue;
        const total = it.actualKg * orig.pricePerKg;
        newSubtotal += total;
        await tx.meatWeightOrderItem.update({
          where: { id: it.itemId },
          data: { actualKg: it.actualKg, total },
        });
      }

      // Recalculate total
      const total = Math.max(newSubtotal + o.taxAmount + o.deliveryCharges - o.discount, 0);
      return tx.meatWeightOrder.update({
        where: { id },
        data: { subtotal: newSubtotal, total },
        include: { items: true },
      });
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const o = await this.prisma.meatWeightOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    const newPaid = o.paidAmount + amount;
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= o.total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.meatWeightOrder.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
      include: { items: true },
    });
  }
}
