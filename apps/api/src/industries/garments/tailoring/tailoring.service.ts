import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CreateTailoringOrderDto, UpdateOrderStatusDto } from './dto/create-tailoring-order.dto';
import { nextRunningNumber } from '../common/service-sale.helper';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Orders that can no longer change. */
const CLOSED = new Set(['DELIVERED', 'CANCELLED']);

@Injectable()
export class TailoringService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTailoringOrderDto, activeShopId?: string | null) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const orderNumber = await nextRunningNumber(
      async (prefix) => (await this.prisma.garmentTailoringOrder.findFirst({
        where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      }))?.orderNumber,
      `TO-${new Date().getFullYear()}-`,
    );

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
        // The branch the order was taken at, so its sale lands there on delivery.
        shopId: dto.shopId || activeShopId || user.shopId || null,
        orderNumber,
        customerId: dto.customerId || null,
        measurementProfileId: dto.measurementProfileId || null,
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
            ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
            ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
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
    const order = await this.prisma.garmentTailoringOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { select: { garmentName: true, quantity: true, total: true } }, payments: { orderBy: { paidAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (CLOSED.has(order.orderStatus) && dto.status !== order.orderStatus) {
      throw new BadRequestException(`Order ${order.orderNumber} pehle hi ${order.orderStatus === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (order.orderStatus === dto.status) return this.getOne(user, id);

    const patch: any = { orderStatus: dto.status };
    const now = new Date();
    if (dto.status === 'READY') patch.readyDate = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }

    if (dto.status !== 'DELIVERED') {
      return this.prisma.garmentTailoringOrder.update({ where: { id }, data: patch, include: { items: true } });
    }

    // Delivery is when the stitching income is earned: it becomes a sale.
    // Advances already sit on the customer's khata and are used up by it.
    const total = r2(order.total);
    const advance = r2(order.paidAmount);
    const due = r2(Math.max(total - advance, 0));
    const paidNow = r2(Math.max(dto.paidNow ?? due, 0));
    const kept = r2(Math.min(paidNow, due));
    const stillOwed = r2(due - kept);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, order.shopId);
      let customerId = order.customerId;
      if (!customerId && stillOwed > 0) {
        if (!order.customerName?.trim()) {
          throw new BadRequestException(`Rs ${stillOwed} baqi hai — poori raqam lein, ya udhaar ke liye customer ka naam likhein`);
        }
        customerId = await ensureCustomer(tx, user, {
          name: order.customerName, phone: order.customerPhone, shopId,
        });
      }

      if (total > 0) {
        // Payments taken before advances went to khata count as paid with this bill.
        const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, order.orderNumber)), 0));
        const lines = order.items.map((it) => ({
          label: `Silai: ${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.garmentName}`,
          amount: Number(it.total) || 0,
        }));
        lines.push({ label: 'Tax', amount: Number(order.taxAmount) || 0 });
        await postIndustrySale(tx, user, {
          saleNumber: order.orderNumber,
          sourceRef: order.orderNumber,
          shopId,
          customerId,
          lines,
          discount: Number(order.discount) || 0,
          paidAmount: r2(paidNow + legacyPaid),
          paymentMethod: dto.paymentMethod ?? order.payments[0]?.paymentMethod,
        });
      }

      if (kept > 0) {
        await tx.garmentTailoringPayment.create({
          data: {
            orderId: id, amount: kept, paymentMethod: dto.paymentMethod ?? 'CASH',
            notes: 'Delivery par wasooli', receivedById: user.id,
          },
        });
      }
      const paidTotal = r2(advance + kept);
      return tx.garmentTailoringOrder.update({
        where: { id },
        data: {
          ...patch,
          shopId,
          customerId,
          paidAmount: paidTotal,
          paymentStatus: paidTotal >= total - 0.01 ? 'PAID' : paidTotal > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        },
        include: { items: true },
      });
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.orderStatus === 'CANCELLED') throw new BadRequestException('Cancel shuda order par payment nahi li ja sakti');
    if (order.orderStatus === 'DELIVERED') {
      throw new BadRequestException('Order deliver ho chuka — baqi raqam customer ke khate se wasool karein');
    }
    const due = Math.round((Number(order.total) - Number(order.paidAmount)) * 100) / 100;
    if (dto.amount > due + 0.01) {
      throw new BadRequestException(due > 0 ? `Baqi sirf Rs ${due} hai` : 'Is order ki poori raqam mil chuki hai');
    }

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

      // The advance is cash in hand today: it is kept on the customer's
      // khata and used up by the sale made on delivery.
      const shopId = await resolveIndustryShopId(tx, user, order.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: order.customerId, name: order.customerName, phone: order.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId,
        shopId,
        amount: dto.amount,
        reference: order.orderNumber,
        note: `Silai advance ${order.orderNumber}`,
      });

      const newPaid = r2(order.paidAmount + dto.amount);
      const paymentStatus = newPaid >= order.total - 0.01 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      return tx.garmentTailoringOrder.update({
        where: { id },
        data: { paidAmount: newPaid, paymentStatus, customerId, shopId },
        include: { payments: true },
      });
    });
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const where: any = { tenantId: user.tenantId };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
        ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
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
