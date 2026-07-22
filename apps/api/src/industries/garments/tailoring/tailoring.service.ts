import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CreateTailoringOrderDto, UpdateOrderStatusDto } from './dto/create-tailoring-order.dto';

@Injectable()
export class TailoringService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTailoringOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const count = await this.prisma.garmentTailoringOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = `TO-${year}-${String(count + 1).padStart(4, '0')}`;

    // Get measurement snapshot if profile provided
    let measurementSnapshot: any = null;
    if (dto.measurementProfileId) {
      const profile = await this.prisma.garmentMeasurementProfile.findFirst({
        where: { id: dto.measurementProfileId, tenantId: user.tenantId },
      });
      if (profile) measurementSnapshot = profile;
    }

    let subtotal = 0;
    let stitchingCharges = 0;
    let embroideryCharges = 0;
    let fabricCharges = 0;
    let accessoryCharges = 0;

    const enrichedItems = dto.items.map((it) => {
      const q = it.quantity ?? 1;
      const stitching = (it.stitchingCost ?? 0) * q;
      const embroidery = (it.embroideryCost ?? 0) * q;
      const fabric = (it.fabricCost ?? 0);
      const accessory = (it.accessoryCost ?? 0) * q;
      const total = stitching + embroidery + fabric + accessory;

      subtotal += total;
      stitchingCharges += stitching;
      embroideryCharges += embroidery;
      fabricCharges += fabric;
      accessoryCharges += accessory;

      return {
        ...it,
        quantity: q,
        stitchingCost: stitching,
        embroideryCost: embroidery,
        fabricCost: fabric,
        accessoryCost: accessory,
        total,
        measurementSnapshot: measurementSnapshot ?? it.measurementSnapshot,
      };
    });

    const discount = dto.discount ?? 0;
    const tax = dto.taxAmount ?? 0;
    const total = Math.max(subtotal + tax - discount, 0);

    return this.prisma.garmentTailoringOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        orderNumber,
        customerId: dto.customerId,
        measurementProfileId: dto.measurementProfileId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerNotes: dto.customerNotes,
        priority: dto.priority ?? 'NORMAL',
        collectionId: dto.collectionId,
        tailorId: dto.tailorId,
        designerId: dto.designerId,
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
        subtotal,
        stitchingCharges,
        embroideryCharges,
        fabricCharges,
        accessoryCharges,
        discount,
        taxAmount: tax,
        total,
        designReferenceUrls: dto.designReferenceUrls ?? [],
        designInstructions: dto.designInstructions,
        internalNotes: dto.internalNotes,
        items: {
          create: enrichedItems.map((it, idx) => ({
            productId: it.productId,
            variantId: it.variantId,
            garmentName: it.garmentName,
            categoryType: it.categoryType,
            quantity: it.quantity,
            fabricProductId: it.fabricProductId,
            fabricVariantId: it.fabricVariantId,
            fabricMeters: it.fabricMeters,
            fabricCost: it.fabricCost,
            stitchingCost: it.stitchingCost,
            embroideryCost: it.embroideryCost,
            accessoryCost: it.accessoryCost,
            total: it.total,
            size: it.size,
            colorName: it.colorName,
            designNotes: it.designNotes,
            measurementSnapshot: it.measurementSnapshot,
            referenceImageUrls: it.referenceImageUrls ?? [],
            displayOrder: idx,
          })),
        },
      },
      include: { items: true, payments: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; customerId?: string; tailorId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.garmentTailoringOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { orderStatus: params.status as any }),
        ...(params.priority && { priority: params.priority as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.tailorId && { tailorId: params.tailorId }),
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
      include: {
        items: { take: 3 },
        payments: true,
      },
      orderBy: [{ priority: 'desc' }, { promisedDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true, payments: { orderBy: { paidAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    let customer = null;
    if (order.customerId) customer = await this.prisma.customer.findUnique({ where: { id: order.customerId } });

    let measurementProfile = null;
    if (order.measurementProfileId) {
      measurementProfile = await this.prisma.garmentMeasurementProfile.findUnique({ where: { id: order.measurementProfileId } });
    }

    return { ...order, customer, measurementProfile };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    const patch: any = { orderStatus: dto.status };
    const now = new Date();
    if (dto.status === 'READY') patch.readyDate = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }

    return this.prisma.garmentTailoringOrder.update({ where: { id }, data: patch, include: { items: true } });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.garmentTailoringPayment.create({
        data: {
          orderId: id,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          notes: dto.notes,
          receivedById: user.id,
        },
      });

      const newPaid = order.paidAmount + dto.amount;
      let paymentStatus: any = 'PARTIALLY_PAID';
      if (newPaid >= order.total) paymentStatus = 'PAID';
      if (newPaid <= 0) paymentStatus = 'UNPAID';

      return tx.garmentTailoringOrder.update({
        where: { id },
        data: { paidAmount: newPaid, paymentStatus },
        include: { payments: true },
      });
    });
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const where: any = { tenantId: user.tenantId };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from && { gte: new Date(params.from) }),
        ...(params.to && { lte: new Date(params.to) }),
      };
    }

    const [byStatus, revenue, pendingCount] = await Promise.all([
      this.prisma.garmentTailoringOrder.groupBy({ by: ['orderStatus'], where, _count: { _all: true } }),
      this.prisma.garmentTailoringOrder.aggregate({ where: { ...where, orderStatus: 'DELIVERED' }, _sum: { total: true, paidAmount: true } }),
      this.prisma.garmentTailoringOrder.count({ where: { tenantId: user.tenantId, orderStatus: { in: ['CONFIRMED', 'FABRIC_PENDING', 'CUTTING', 'STITCHING', 'EMBROIDERY', 'QUALITY_CHECK'] } } }),
    ]);

    return {
      totalRevenue: revenue._sum.total ?? 0,
      totalPaid: revenue._sum.paidAmount ?? 0,
      pendingCount,
      byStatus,
    };
  }
}
