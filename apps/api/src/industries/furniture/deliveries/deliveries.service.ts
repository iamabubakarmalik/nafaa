/**
 * Deliveries of showroom sales and custom orders: schedule, vehicle, out,
 * delivered / fitted. Delivery charges (transport, loading, floors, fitting)
 * are billed on their own bill (FDV-<delivery>) when the shop collects them;
 * an order's own bill is written when its delivery reaches the customer. A
 * delivery is cancelled, never deleted.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AssignVehicleDto, BillChargesDto, ConfirmDeliveryDto, CreateFurnitureDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { BILLED, billCustomOrder, orderSaleNumber, r2 } from '../custom-orders/order-billing';

/** Bill number of a delivery's charges. */
export const chargesSaleNumber = (deliveryNumber: string) => `FDV-${deliveryNumber}`;

/** Finished one way or the other; no more steps. */
const CLOSED = ['DELIVERED', 'ASSEMBLED', 'FAILED', 'RETURNED'];
/** Allowed next steps from each status. */
const NEXT: Record<string, string[]> = {
  PENDING: ['SCHEDULED', 'DISPATCHED', 'DELIVERED', 'ASSEMBLED', 'RESCHEDULED', 'FAILED'],
  SCHEDULED: ['DISPATCHED', 'DELIVERED', 'ASSEMBLED', 'RESCHEDULED', 'FAILED'],
  RESCHEDULED: ['SCHEDULED', 'DISPATCHED', 'DELIVERED', 'ASSEMBLED', 'FAILED'],
  DISPATCHED: ['IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'ASSEMBLED', 'RESCHEDULED', 'RETURNED', 'FAILED'],
  IN_TRANSIT: ['ARRIVED', 'DELIVERED', 'ASSEMBLED', 'RESCHEDULED', 'RETURNED', 'FAILED'],
  ARRIVED: ['DELIVERED', 'ASSEMBLED', 'RETURNED', 'FAILED'],
  DELIVERED: ['ASSEMBLED'],
};

const total = (d: { deliveryCharge?: number | null; loadingCharge?: number | null; unloadingCharge?: number | null; floorCharge?: number | null; assemblyCharge?: number | null }) =>
  r2((d.deliveryCharge ?? 0) + (d.loadingCharge ?? 0) + (d.unloadingCharge ?? 0) + (d.floorCharge ?? 0) + (d.assemblyCharge ?? 0));

@Injectable()
export class FurnitureDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, input: CreateFurnitureDeliveryDto) {
    // Links must point at this shop's own records ("" means none).
    const dto = {
      ...input,
      saleId: input.saleId?.trim() || undefined,
      customOrderId: input.customOrderId?.trim() || undefined,
      customerId: input.customerId?.trim() || undefined,
    };
    const t = user.tenantId;
    if (dto.saleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: dto.saleId, tenantId: t },
        select: { id: true, status: true, customerId: true, items: { select: { quantity: true, productId: true, product: { select: { name: true } } } } },
      });
      if (!sale) throw new NotFoundException('Bill nahi mila');
      if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill cancel ho chuka hai');
      dto.customerId = dto.customerId ?? sale.customerId ?? undefined;
      if (!dto.productNames?.length) dto.productNames = sale.items.map((i) => i.product?.name).filter((n): n is string => !!n).slice(0, 30);
      if (!dto.productIds?.length) dto.productIds = sale.items.map((i) => i.productId).filter((id): id is string => !!id).slice(0, 30);
      if (!dto.itemsCount) dto.itemsCount = Math.max(Math.round(sale.items.reduce((s, i) => s + Number(i.quantity), 0)), 1);
    }
    if (dto.customOrderId) {
      const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id: dto.customOrderId, tenantId: t }, select: { id: true, customerId: true, productType: true } });
      if (!o) throw new NotFoundException('Order nahi mila');
      const open = await this.prisma.furnitureDelivery.findFirst({ where: { tenantId: t, customOrderId: o.id, status: { notIn: ['FAILED', 'RETURNED'] } }, select: { deliveryNumber: true } });
      if (open) throw new BadRequestException(`Is order ki delivery ${open.deliveryNumber} pehle se bani hai`);
      dto.customerId = dto.customerId ?? o.customerId ?? undefined;
      if (!dto.productNames?.length) dto.productNames = [o.productType];
    }
    if (dto.customerId && !(await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Customer nahi mila');
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');
    if (!dto.deliveryAddress?.trim()) throw new BadRequestException('Pata likhein');
    const prefix = `FDL-${new Date().getFullYear()}-`;

    let floorCharge = dto.floorCharge ?? 0;
    if (!dto.hasLift && dto.floorNumber && dto.floorNumber > 0 && dto.floorCharge === undefined) {
      floorCharge = dto.floorNumber * 500;
    }
    const scheduled = dto.scheduledDate ? new Date(dto.scheduledDate) : null;
    if (scheduled && Number.isNaN(scheduled.getTime())) throw new BadRequestException('Delivery ki date sahi likhein');

    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.furnitureDelivery.findMany({
        where: { tenantId: user.tenantId, deliveryNumber: { startsWith: prefix } },
        select: { deliveryNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((d) => d.deliveryNumber),
      create: (deliveryNumber) => this.prisma.furnitureDelivery.create({
        data: {
          tenantId: user.tenantId,
          deliveryNumber,
          ...dto,
          customerName: dto.customerName.trim(),
          deliveryAddress: dto.deliveryAddress.trim(),
          productIds: dto.productIds ?? [],
          productNames: dto.productNames ?? [],
          itemsCount: dto.itemsCount ?? 1,
          floorCharge,
          totalCharge: total({ ...dto, floorCharge }),
          helpersCount: dto.helpersCount ?? 2,
          scheduledDate: scheduled,
          requiresAssembly: dto.requiresAssembly ?? true,
          assemblyIncluded: dto.assemblyIncluded ?? true,
          status: scheduled ? 'SCHEDULED' : 'PENDING',
        },
      }),
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) {
    const search = params.search?.trim();
    const statuses = (params.status ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const where: Prisma.FurnitureDeliveryWhereInput = {
      tenantId: user.tenantId,
      ...(statuses.length === 1 && { status: statuses[0] as any }),
      ...(statuses.length > 1 && { status: { in: statuses as any } }),
      ...(params.customerId && { customerId: params.customerId }),
      ...(params.from || params.to ? {
        scheduledDate: {
          ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
          ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
        },
      } : {}),
      ...(search && {
        OR: [
          { deliveryNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { vehicleNumber: { contains: search, mode: 'insensitive' } },
          { driverName: { contains: search, mode: 'insensitive' } },
          { area: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    if (!params.page) {
      return this.prisma.furnitureDelivery.findMany({ where, orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }], take: 200 });
    }
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const [rows, count] = await Promise.all([
      this.prisma.furnitureDelivery.findMany({ where, orderBy: [{ scheduledDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.furnitureDelivery.count({ where }),
    ]);
    const bills = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, saleNumber: { in: rows.map((d) => chargesSaleNumber(d.deliveryNumber)) } },
      select: { id: true, saleNumber: true, status: true, total: true, creditAmount: true },
    });
    const byNumber = new Map(bills.map((b) => [b.saleNumber, b]));
    return { items: rows.map((d) => ({ ...d, chargesBill: byNumber.get(chargesSaleNumber(d.deliveryNumber)) ?? null })), total: count, page, limit };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    const chargesBill = await this.prisma.sale.findFirst({
      where: { tenantId: user.tenantId, saleNumber: chargesSaleNumber(d.deliveryNumber) },
      select: { id: true, saleNumber: true, status: true, total: true, creditAmount: true },
    });
    return { ...d, chargesBill };
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: AssignVehicleDto) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (CLOSED.includes(d.status)) throw new BadRequestException('Ye delivery band ho chuki hai');
    const text = (v?: string) => v?.trim() || undefined;
    const scheduled = dto.scheduledDate ? new Date(dto.scheduledDate) : undefined;
    if (scheduled && Number.isNaN(scheduled.getTime())) throw new BadRequestException('Delivery ki date sahi likhein');
    return this.prisma.furnitureDelivery.update({
      where: { id },
      data: {
        vehicleType: text(dto.vehicleType),
        vehicleNumber: text(dto.vehicleNumber),
        driverName: text(dto.driverName),
        driverPhone: text(dto.driverPhone),
        helpersCount: dto.helpersCount,
        scheduledDate: scheduled,
        scheduledSlot: text(dto.scheduledSlot),
        ...((d.status === 'PENDING' || d.status === 'RESCHEDULED') && { status: 'SCHEDULED' }),
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateDeliveryStatusDto) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (d.status === dto.status) return d;
    if (!(NEXT[d.status] ?? []).includes(dto.status)) throw new BadRequestException('Ye delivery is haal me nahi ja sakti');
    if ((dto.status === 'FAILED' || dto.status === 'RETURNED' || dto.status === 'RESCHEDULED') && !dto.notes?.trim()) {
      throw new BadRequestException('Wajah likhein');
    }

    const patch: Prisma.FurnitureDeliveryUpdateInput = { status: dto.status };
    const now = new Date();
    if (dto.status === 'DISPATCHED') patch.dispatchedAt = now;
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'ASSEMBLED') { patch.assembledAt = now; patch.deliveredAt = d.deliveredAt ?? now; }
    if (dto.notes?.trim()) patch.notes = [d.notes, dto.notes.trim()].filter(Boolean).join('\n').slice(-2000);

    return this.prisma.$transaction(async (tx) => {
      await this.billLinkedOrder(tx, user, d.customOrderId, dto.status);
      return tx.furnitureDelivery.update({ where: { id }, data: patch });
    });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmDeliveryDto) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (['FAILED', 'RETURNED', 'ASSEMBLED'].includes(d.status)) throw new BadRequestException('Ye delivery band ho chuki hai');

    const now = new Date();
    const assembled = d.requiresAssembly && (dto.assembled ?? !!dto.assemblyTimeSpent);
    const patch: Prisma.FurnitureDeliveryUpdateInput = {
      status: assembled ? 'ASSEMBLED' : 'DELIVERED',
      deliveredAt: d.deliveredAt ?? now,
      ...(assembled && { assembledAt: now }),
      receivedByName: dto.receivedByName?.trim() || undefined,
      receivedByCnic: dto.receivedByCnic?.trim() || undefined,
      signatureUrl: dto.signatureUrl,
      photoUrls: dto.photoUrls ?? d.photoUrls,
      customerRating: dto.customerRating,
      customerFeedback: dto.customerFeedback?.trim() || undefined,
      assemblyTimeSpent: dto.assemblyTimeSpent,
      assemblyNotes: dto.assemblyNotes?.trim() || undefined,
    };

    return this.prisma.$transaction(async (tx) => {
      await this.billLinkedOrder(tx, user, d.customOrderId, patch.status as string);
      return tx.furnitureDelivery.update({ where: { id }, data: patch });
    });
  }

  /**
   * Bills the delivery charges (FDV-<delivery>): money taken now goes to the
   * drawer, the rest on the customer's khata. Billed once; a voided bill
   * stays voided.
   */
  async billCharges(user: AuthenticatedUser, id: string, dto: BillChargesDto) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (d.status === 'FAILED') throw new BadRequestException('Cancel delivery ka bill nahi banta');
    const saleNumber = chargesSaleNumber(d.deliveryNumber);
    if (await this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, saleNumber }, select: { id: true } })) {
      throw new BadRequestException(`Is delivery ka bill ${saleNumber} pehle ban chuka`);
    }
    const lines = [
      { label: 'Delivery / transport', amount: r2(d.deliveryCharge) },
      { label: 'Loading', amount: r2(d.loadingCharge) },
      { label: 'Unloading', amount: r2(d.unloadingCharge) },
      { label: `Seerhi (${d.floorNumber ?? 0} manzil)`, amount: r2(d.floorCharge) },
      { label: 'Fitting / assembly', amount: r2(d.assemblyCharge) },
    ].filter((l) => l.amount > 0);
    const sum = r2(lines.reduce((s, l) => s + l.amount, 0));
    if (!(sum > 0)) throw new BadRequestException('Is delivery par koi charges nahi');
    const paid = r2(Math.min(Math.max(Number(dto.paidAmount ?? sum) || 0, 0), sum));

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      let customerId = d.customerId;
      if (!customerId && paid < sum - 0.009) {
        customerId = await ensureCustomer(tx, user, { name: d.customerName, phone: d.customerPhone, shopId });
        await tx.furnitureDelivery.update({ where: { id }, data: { customerId } });
      }
      const sale = await postIndustrySale(tx, user, {
        saleNumber,
        sourceRef: d.deliveryNumber,
        shopId,
        customerId,
        lines: lines.map((l) => ({ ...l, label: `${l.label} — ${d.deliveryNumber}` })),
        paidAmount: paid,
        paymentMethod: dto.paymentMethod,
      });
      return { id: sale.id, saleNumber: sale.saleNumber, total: sale.total, creditAmount: sale.creditAmount };
    });
  }

  /** A custom order reaching the customer is its sale: bill it with the delivery. */
  private async billLinkedOrder(tx: Prisma.TransactionClient, user: AuthenticatedUser, customOrderId: string | null, status: string) {
    if (!customOrderId || !['DELIVERED', 'ASSEMBLED'].includes(status)) return;
    const o = await tx.furnitureCustomOrder.findFirst({ where: { id: customOrderId, tenantId: user.tenantId } });
    if (!o || BILLED.includes(o.status) || ['CANCELLED', 'REFUNDED'].includes(o.status)) return;
    const billed = await billCustomOrder(tx, user, o);
    await tx.furnitureCustomOrder.update({
      where: { id: o.id },
      data: {
        ...billed,
        status: status as 'DELIVERED' | 'ASSEMBLED',
        actualDeliveryDate: o.actualDeliveryDate ?? new Date(),
        internalNotes: [o.internalNotes, `Bill ${orderSaleNumber(o.orderNumber)}`].filter(Boolean).join('\n'),
      },
    });
  }

  /** Older screens call delete: the delivery is marked cancelled (FAILED) instead. */
  async remove(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (CLOSED.includes(d.status)) throw new BadRequestException('Ye delivery band ho chuki hai');
    return this.prisma.furnitureDelivery.update({
      where: { id },
      data: { status: 'FAILED', notes: [d.notes, 'Cancel kar di'].filter(Boolean).join('\n').slice(-2000) },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, scheduled, inTransit, delivered, assembled, todayScheduled, rescheduled] = await Promise.all([
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'SCHEDULED' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED'] } } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'ASSEMBLED' } }),
      this.prisma.furnitureDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: { gte: startOfDayTz(), lte: endOfDayTz() },
          status: { notIn: ['FAILED', 'RETURNED'] },
        },
      }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'RESCHEDULED' } }),
    ]);
    return { pending, scheduled, inTransit, delivered, assembled, todayScheduled, rescheduled };
  }

  async todaySchedule(user: AuthenticatedUser) {
    // Business day (Pakistan time), not the server's UTC day.
    const start = startOfDayTz();
    const end = endOfDayTz();
    return this.prisma.furnitureDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDate: { gte: start, lte: end },
        status: { in: ['PENDING', 'SCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED'] },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}
