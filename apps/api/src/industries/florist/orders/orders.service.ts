/**
 * Florist delivery orders. The money is always a counter bill: the POS
 * rings up the flowers, delivery and wrapping, then `fromSale` writes the
 * delivery order (recipient, address, message card, time slot) with its
 * money copied from that bill. The order itself only tracks the work:
 * confirmed, being made, out for delivery, delivered. Orders are cancelled,
 * never deleted.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FloristOrderStatus, FloristOrderType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateFloristOrderDto, DeliveryConfirmDto, OrderFromSaleDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { cleanInput, dayEnd, dayKey, dayRange, dayStart, parseDay } from '../florist-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
/** Text on an order that ties it to its counter bill. */
export const billTag = (saleNumber: string) => `Bill ${saleNumber}`;
const OPEN = ['DRAFT', 'CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] as const;
/** Allowed next steps; DELIVERED goes through confirm-delivery. */
const NEXT: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  IN_PREPARATION: ['READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'CONFIRMED', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'IN_PREPARATION', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['READY_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class FloristOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(db: Prisma.TransactionClient | PrismaService, tenantId: string) {
    const year = dayKey().slice(0, 4);
    let n = (await db.floristOrder.count({ where: { tenantId } })) + 1;
    let orderNumber = `FL-${year}-${String(n).padStart(4, '0')}`;
    while (await db.floristOrder.findFirst({ where: { tenantId, orderNumber }, select: { id: true } })) {
      n += 1;
      orderNumber = `FL-${year}-${String(n).padStart(4, '0')}`;
    }
    return orderNumber;
  }

  /**
   * Delivery order for a bill already rung up at the counter. Items and
   * money come from the bill, so the order can never disagree with sales.
   * Calling it again for the same bill returns the first order.
   */
  async fromSale(user: AuthenticatedUser, dto: OrderFromSaleDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId: user.tenantId },
      include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { id: true, name: true, phone: true } } },
    });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill void ho chuka hai');
    const tag = billTag(sale.saleNumber);
    const existing = await this.prisma.floristOrder.findFirst({ where: { tenantId: user.tenantId, notes: tag } });
    if (existing) return existing;
    if (dto.orderType !== 'WALK_IN' && !dto.scheduledDeliveryDate) throw new BadRequestException('Delivery ki date chunein');
    if (dto.orderType === 'DELIVERY' && !dto.deliveryAddress?.trim()) throw new BadRequestException('Delivery ka pata likhein');

    // Charges kept by an outside rider (passThrough) are not the shop's money.
    const charges = Array.isArray(sale.serviceChargesBreakdown) ? (sale.serviceChargesBreakdown as Array<{ type?: string; amount?: number; passThrough?: boolean }>) : [];
    const chargeOf = (type: string) => r2(charges.filter((c) => !c?.passThrough && String(c?.type ?? '').toUpperCase() === type).reduce((t, c) => t + Number(c?.amount || 0), 0));
    const deliveryCharge = chargeOf('DELIVERY');
    const wrappingCharge = chargeOf('PACKAGING');
    const items = sale.items.map((i) => ({
      productId: i.productId, productName: i.product?.name ?? i.note ?? 'Item', quantity: i.quantity, unitPrice: i.price, total: i.total, customization: i.note ?? undefined,
    }));
    const subtotal = r2(items.reduce((t, i) => t + Number(i.total || 0), 0));
    const received = r2(Math.max(Number(sale.paidAmount) - Number(sale.changeAmount || 0), 0));
    const orderNumber = await this.nextNumber(this.prisma, user.tenantId);

    return this.prisma.floristOrder.create({
      data: {
        tenantId: user.tenantId,
        orderNumber,
        orderType: dto.orderType ?? 'DELIVERY',
        customerId: sale.customer?.id,
        customerName: sale.customer?.name ?? dto.senderName ?? 'Walk-in',
        customerPhone: sale.customer?.phone ?? dto.recipientPhone ?? '',
        senderName: dto.isAnonymous ? null : dto.senderName,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        deliveryAddress: dto.deliveryAddress,
        city: dto.city,
        area: dto.area,
        landmark: dto.landmark,
        messageCard: dto.messageCard,
        isAnonymous: dto.isAnonymous ?? false,
        items: items as unknown as Prisma.InputJsonValue,
        subtotal,
        discountAmount: r2(sale.discount),
        deliveryCharge,
        wrappingCharge,
        totalAmount: r2(sale.total),
        advancePaid: Math.min(received, r2(sale.total)),
        paymentMethod: sale.paymentMethod,
        deliveryTimeSlot: dto.deliveryTimeSlot,
        scheduledDeliveryDate: parseDay(dto.scheduledDeliveryDate),
        scheduledDeliveryTime: dto.scheduledDeliveryTime,
        eventName: dto.eventName,
        eventVenue: dto.eventVenue,
        specialInstructions: dto.specialInstructions,
        notes: tag,
        handledById: user.id,
        status: 'CONFIRMED',
      },
    });
  }

  /**
   * Order typed in by hand (no bill yet). Kept for older screens; money on
   * it is only a note until the bill is made at the counter.
   */
  async create(user: AuthenticatedUser, dto: CreateFloristOrderDto) {
    const orderNumber = await this.nextNumber(this.prisma, user.tenantId);

    const subtotal = r2(dto.items.reduce((s, it) => s + Number(it.total || 0), 0));
    const discountAmount = dto.discountAmount ?? 0;
    const deliveryCharge = dto.deliveryCharge ?? 0;
    const wrappingCharge = dto.wrappingCharge ?? 0;
    const totalAmount = r2(Math.max(subtotal - discountAmount + deliveryCharge + wrappingCharge, 0));

    return this.prisma.floristOrder.create({
      data: {
        tenantId: user.tenantId,
        orderNumber,
        orderType: dto.orderType ?? 'WALK_IN',
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        senderName: dto.senderName,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        deliveryAddress: dto.deliveryAddress,
        city: dto.city,
        area: dto.area,
        landmark: dto.landmark,
        latitude: dto.latitude,
        longitude: dto.longitude,
        messageCard: dto.messageCard,
        isAnonymous: dto.isAnonymous ?? false,
        items: dto.items as any,
        subtotal,
        discountAmount,
        deliveryCharge,
        wrappingCharge,
        totalAmount,
        advancePaid: dto.advancePaid ?? 0,
        paymentMethod: dto.paymentMethod,
        deliveryTimeSlot: dto.deliveryTimeSlot,
        scheduledDeliveryDate: parseDay(dto.scheduledDeliveryDate),
        scheduledDeliveryTime: dto.scheduledDeliveryTime,
        eventDate: parseDay(dto.eventDate),
        eventName: dto.eventName,
        eventVenue: dto.eventVenue,
        isRecurring: dto.isRecurring ?? false,
        recurringFrequency: dto.recurringFrequency,
        notes: dto.notes,
        specialInstructions: dto.specialInstructions,
        internalNotes: dto.internalNotes,
        handledById: user.id,
        status: 'DRAFT',
      },
    });
  }

  private where(user: AuthenticatedUser, params: { orderType?: string; status?: string; scheduledDate?: string; from?: string; to?: string; search?: string; bills?: string }): Prisma.FloristOrderWhereInput {
    const bills = (params.bills ?? '').split(',').map((b) => b.trim()).filter(Boolean).slice(0, 100);
    const range = dayRange(params.from, params.to);
    const known = (v: string | undefined, all: string[]) => (v && all.includes(v) ? v : undefined);
    const one = known(params.status, Object.values(FloristOrderStatus));
    const statuses = params.status === 'OPEN' ? [...OPEN] : one ? [one] : undefined;
    const orderType = known(params.orderType, Object.values(FloristOrderType));
    return {
      tenantId: user.tenantId,
      ...(orderType && { orderType: orderType as FloristOrderType }),
      ...(statuses && { status: { in: statuses as never[] } }),
      ...(params.scheduledDate && { scheduledDeliveryDate: { gte: dayStart(params.scheduledDate), lte: dayEnd(params.scheduledDate) } }),
      ...(range && { createdAt: range }),
      ...(bills.length && { notes: { in: bills.map(billTag) } }),
      ...(params.search && {
        OR: [
          { orderNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { recipientName: { contains: params.search, mode: 'insensitive' } },
          { recipientPhone: { contains: params.search } },
          { area: { contains: params.search, mode: 'insensitive' } },
          { notes: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  /** `bills` (comma separated bill numbers) finds the orders of those bills, for the sales history. */
  async list(user: AuthenticatedUser, params: {
    orderType?: string; status?: string; scheduledDate?: string; from?: string; to?: string; search?: string; bills?: string;
  }) {
    return this.prisma.floristOrder.findMany({
      where: this.where(user, params),
      orderBy: [{ status: 'asc' }, { scheduledDeliveryDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  /** Paged record with totals for the orders page. */
  async paged(user: AuthenticatedUser, params: {
    orderType?: string; status?: string; scheduledDate?: string; from?: string; to?: string; search?: string; page?: number; limit?: number;
  }) {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit) || 25)));
    const where = this.where(user, params);
    const [items, total, money, byStatus] = await Promise.all([
      this.prisma.floristOrder.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ scheduledDeliveryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      }),
      this.prisma.floristOrder.count({ where }),
      this.prisma.floristOrder.aggregate({ where: { ...where, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true, advancePaid: true, deliveryCharge: true } }),
      this.prisma.floristOrder.groupBy({ by: ['status'], where: { ...this.where(user, { ...params, status: undefined }) }, _count: { _all: true } }),
    ]);
    return {
      items, total, page, limit,
      totals: { value: r2(money._sum.totalAmount ?? 0), received: r2(money._sum.advancePaid ?? 0), delivery: r2(money._sum.deliveryCharge ?? 0) },
      counts: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
    };
  }

  /** Orders per day, slot, area and type over a period (analytics tab). */
  async analytics(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const range = dayRange(params.from, params.to) ?? { gte: dayStart(dayKey().slice(0, 8) + '01'), lte: dayEnd() };
    const rows = await this.prisma.floristOrder.findMany({
      where: { tenantId: user.tenantId, createdAt: range, status: { not: 'CANCELLED' } },
      select: { createdAt: true, totalAmount: true, deliveryTimeSlot: true, area: true, orderType: true, status: true, deliveryCharge: true },
      take: 5000,
    });
    const bump = (m: Map<string, { count: number; value: number }>, k: string, v: number) => {
      const x = m.get(k) ?? { count: 0, value: 0 };
      x.count += 1; x.value = r2(x.value + v); m.set(k, x);
    };
    const byDay = new Map<string, { count: number; value: number }>();
    const bySlot = new Map<string, { count: number; value: number }>();
    const byArea = new Map<string, { count: number; value: number }>();
    const byType = new Map<string, { count: number; value: number }>();
    for (const r of rows) {
      bump(byDay, dayKey(r.createdAt), r.totalAmount);
      bump(bySlot, r.deliveryTimeSlot ?? 'NONE', r.totalAmount);
      bump(byArea, r.area?.trim() || '—', r.totalAmount);
      bump(byType, r.orderType, r.totalAmount);
    }
    const list = (m: Map<string, { count: number; value: number }>) => [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.value - a.value);
    return {
      orders: rows.length,
      value: r2(rows.reduce((t, r) => t + r.totalAmount, 0)),
      delivered: rows.filter((r) => r.status === 'DELIVERED').length,
      deliveryCharges: r2(rows.reduce((t, r) => t + r.deliveryCharge, 0)),
      byDay: [...byDay.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.key.localeCompare(b.key)),
      bySlot: list(bySlot), byArea: list(byArea).slice(0, 10), byType: list(byType),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    if (o.status === dto.status) return o;
    if (dto.status === 'DELIVERED') throw new BadRequestException('Delivery "Pohancha diya" button se likhein');
    if (!(NEXT[o.status] ?? []).includes(dto.status)) throw new BadRequestException(`${o.status} se ${dto.status} nahi ho sakta`);

    const patch: Prisma.FloristOrderUpdateInput = { status: dto.status };
    const now = new Date();
    if (dto.status === 'IN_PREPARATION' && !o.preparedAt) patch.preparedAt = now;
    if (dto.notes) patch.internalNotes = ((o.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.floristOrder.update({ where: { id }, data: patch });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: DeliveryConfirmDto) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status === 'DELIVERED') return o;
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order deliver nahi ho sakta');

    return this.prisma.floristOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        actualDeliveryTime: new Date(),
        deliveredBy: dto.deliveredBy,
        deliveredToName: dto.deliveredToName,
        deliveryPhotoUrl: dto.deliveryPhotoUrl,
      },
    });
  }

  /**
   * Delivery details only (recipient, address, card, slot). Items and money
   * belong to the bill; change them there with a return.
   */
  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateFloristOrderDto>) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') throw new BadRequestException('Ye order band ho chuka hai');

    const patch = cleanInput(dto);
    for (const k of ['orderNumber', 'handledById', 'status', 'items', 'subtotal', 'discountAmount', 'deliveryCharge', 'wrappingCharge', 'totalAmount', 'advancePaid', 'paymentMethod', 'customerId', 'notes']) delete patch[k];
    if (dto.scheduledDeliveryDate !== undefined) patch.scheduledDeliveryDate = parseDay(dto.scheduledDeliveryDate);
    if (dto.eventDate !== undefined) patch.eventDate = parseDay(dto.eventDate);

    return this.prisma.floristOrder.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status === 'DELIVERED') throw new BadRequestException('Deliver ho chuka order cancel nahi ho sakta — bill par Return karein');
    if (o.status === 'CANCELLED') return o;
    // DELETE keeps its route but cancels; the order stays on record.
    return this.prisma.floristOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  /** The order's bill was voided or fully returned: the delivery is off. */
  async cancelForBill(tenantId: string, saleNumber: string, why: string) {
    const o = await this.prisma.floristOrder.findFirst({ where: { tenantId, notes: billTag(saleNumber), status: { in: [...OPEN] } } });
    if (!o) return null;
    return this.prisma.floristOrder.update({
      where: { id: o.id },
      data: { status: 'CANCELLED', internalNotes: [o.internalNotes, why].filter(Boolean).join('\n') },
    });
  }

  async todayDeliveries(user: AuthenticatedUser) {
    return this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDeliveryDate: { gte: dayStart(), lte: dayEnd() },
        status: { in: ['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] },
      },
      orderBy: [{ deliveryTimeSlot: 'asc' }, { scheduledDeliveryTime: 'asc' }],
    });
  }

  async summary(user: AuthenticatedUser) {
    const [draft, confirmed, inPrep, ready, outForDelivery, delivered] = await Promise.all([
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'DRAFT' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'CONFIRMED' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'IN_PREPARATION' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_DELIVERY' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'OUT_FOR_DELIVERY' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);
    return { counts: { draft, confirmed, inPrep, ready, outForDelivery, delivered } };
  }

  async byTimeSlot(user: AuthenticatedUser, date: string) {
    const orders = await this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDeliveryDate: { gte: dayStart(date), lte: dayEnd(date) },
        status: { not: 'CANCELLED' },
      },
    });
    const grouped: Record<string, any[]> = {};
    orders.forEach((o) => {
      const slot = o.deliveryTimeSlot || 'SCHEDULED';
      if (!grouped[slot]) grouped[slot] = [];
      grouped[slot].push(o);
    });
    return grouped;
  }
}
