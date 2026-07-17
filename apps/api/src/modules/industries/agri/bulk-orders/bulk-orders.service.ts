import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class BulkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const count = await this.prisma.agriBulkOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'AGO-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    let subtotal = 0;
    const enrichedItems = dto.items.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.pricePerUnit) || 0;
      const discount = Number(it.discount) || 0;
      const total = Math.max((qty * price) - discount, 0);
      subtotal += total;
      return {
        productId: it.productId,
        productName: it.productName,
        category: it.category,
        quantity: qty,
        unit: it.unit || 'bag',
        pricePerUnit: price,
        discount,
        total,
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
        displayOrder: idx,
      };
    });

    const bulkDiscount = Number(dto.bulkDiscount) || 0;
    const taxAmount = Number(dto.taxAmount) || 0;
    const otherCharges = Number(dto.otherCharges) || 0;
    const deliveryCharges = Number(dto.deliveryCharges) || 0;
    const total = Math.max(subtotal + taxAmount + otherCharges + deliveryCharges - bulkDiscount, 0);

    return this.prisma.agriBulkOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        orderNumber,
        farmerId: dto.farmerId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        season: dto.season,
        cropTarget: dto.cropTarget,
        landAreaAcres: dto.landAreaAcres ? Number(dto.landAreaAcres) : null,
        isDelivery: dto.isDelivery ?? false,
        deliveryAddress: dto.deliveryAddress,
        deliveryCharges,
        transportType: dto.transportType,
        vehicleNumber: dto.vehicleNumber,
        subtotal,
        bulkDiscount,
        taxAmount,
        otherCharges,
        total,
        isCredit: dto.isCredit ?? false,
        creditDueDate: dto.creditDueDate ? new Date(dto.creditDueDate) : null,
        advisorNotes: dto.advisorNotes,
        farmerNotes: dto.farmerNotes,
        status: 'CONFIRMED',
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; farmerId?: string; season?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.agriBulkOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.farmerId && { farmerId: params.farmerId }),
        ...(params.season && { season: params.season as any }),
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
      orderBy: { orderDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.agriBulkOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, cancellationReason?: string) {
    const patch: any = { status };
    if (status === 'CANCELLED') {
      patch.cancelledAt = new Date();
      patch.cancellationReason = cancellationReason;
    }
    return this.prisma.agriBulkOrder.update({ where: { id }, data: patch, include: { items: true } });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const o = await this.prisma.agriBulkOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    const newPaid = o.paidAmount + amount;
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= o.total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.agriBulkOrder.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
      include: { items: true },
    });
  }
}
