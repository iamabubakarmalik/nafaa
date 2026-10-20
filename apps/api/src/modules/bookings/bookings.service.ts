/**
 * Bookings: advance orders and reservations. A booking holds items for a
 * customer against an advance; more payments can follow; at pickup it turns
 * into a sale (stock goes out then), or it is cancelled with or without a
 * refund. Advances sit on the customer's khata as money held for them until
 * the sale uses it up.
 *
 * Every write checks the tenant and the user's branch; money writes are
 * claimed with a conditional update so a double click cannot post twice.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CustomerLedgerType, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey, startOfBusinessDayTz } from '../../common/helpers/business-time.helper';
import { PIN_NEEDS, requireManagerPin } from '../../common/helpers/manager-pin.helper';
import { hasPermission, PERMISSIONS } from '../../common/constants/permissions.constants';
import { ShopScope, applyStockDelta, assertShopAccess, isServiceProduct, recordSaleBatches } from '../../common/shop-scope';
import { periodRange } from '../inventory/taxonomy/taxonomy.helper';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AddBookingPaymentDto } from './dto/add-payment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ConvertBookingDto } from './dto/convert-booking.dto';
import { saveSalePayments } from '../../common/helpers/sale-payments.helper';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

const ACTIVE: BookingStatus[] = ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'];
const KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
/** Same booking from the same person within this window is a double click. */
const DUPLICATE_MS = 15_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

const ROW_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, balance: true } },
  shop: { select: { id: true, name: true } },
  items: true,
  sale: { select: { id: true, saleNumber: true, total: true } },
  _count: { select: { items: true, payments: true } },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof ROW_INCLUDE }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── scope ───────────────────────── */

  /** Branch filter for reads: an explicit branch (checked) or the active one. */
  private shopWhere(user: AuthenticatedUser, scope: ShopScope, shopId?: string): { shopId?: string } {
    if (shopId) {
      assertShopAccess(user, shopId, 'Doosri branch ki bookings');
      return { shopId };
    }
    return scope.where;
  }

  private async load(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!booking) throw new NotFoundException('Booking nahi mili');
    if (booking.shopId) assertShopAccess(user, booking.shopId, 'Doosri branch ki booking');
    return booking;
  }

  /** Changes the customer's khata by `amount` (positive = they owe more) and records the line. */
  private async ledger(
    tx: Tx, user: AuthenticatedUser, b: { customerId: string; shopId: string | null },
    type: CustomerLedgerType, amount: number, reference: string, note: string, paymentMethod?: PaymentMethod,
  ) {
    const { balance } = await tx.customer.update({
      where: { id: b.customerId }, data: { balance: { increment: amount } }, select: { balance: true },
    });
    await tx.customerLedger.create({
      data: {
        tenantId: user.tenantId, shopId: b.shopId, customerId: b.customerId, createdById: user.id,
        type, amount, balanceAfter: balance, reference, note, paymentMethod,
      },
    });
  }

  /* ───────────────────────── legacy list + summary ───────────────────────── */

  /** Older list shape (latest 100, plain array), kept for existing callers. */
  async findAll(
    user: AuthenticatedUser,
    scope: ShopScope,
    query: { status?: string; shopId?: string; customerId?: string; search?: string },
  ) {
    const where: Prisma.BookingWhereInput = { tenantId: user.tenantId, ...this.shopWhere(user, scope, query.shopId) };
    if (query.status && (Object.values(BookingStatus) as string[]).includes(query.status)) where.status = query.status as BookingStatus;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      where.OR = [
        { bookingNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: query.search } } },
      ];
    }
    return this.prisma.booking.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, balance: true } },
        shop: { select: { id: true, name: true } },
        items: true,
        payments: true,
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Older summary shape, kept for existing callers. */
  async summary(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const baseWhere = { tenantId: user.tenantId, ...this.shopWhere(user, scope, shopId) };
    const [byStatus, activeAgg, expiringSoon] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } }),
      this.prisma.booking.aggregate({
        where: { ...baseWhere, status: { in: ACTIVE } },
        _sum: { total: true, totalPaid: true, balanceDue: true },
      }),
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: { in: ['PENDING', 'ADVANCE_PAID'] },
          OR: [
            { expiresAt: { lte: new Date(Date.now() + 3 * DAY), gte: new Date() } },
            { expectedPickupAt: { lte: new Date(Date.now() + 3 * DAY), gte: new Date() } },
          ],
        },
      }),
    ]);
    const n = (s: BookingStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      counts: { pending: n('PENDING'), advancePaid: n('ADVANCE_PAID'), ready: n('READY_FOR_PICKUP'), converted: n('CONVERTED'), cancelled: n('CANCELLED') },
      totalActiveValue: activeAgg._sum.total ?? 0,
      totalAdvanceHeld: activeAgg._sum.totalPaid ?? 0,
      totalBalanceDue: activeAgg._sum.balanceDue ?? 0,
      expiringSoon,
    };
  }

  /* ───────────────────────── record ───────────────────────── */

  private async dayRange(tenantId: string, from?: string, to?: string) {
    if (from && to && KEY.test(from) && KEY.test(to)) return periodRange(this.tz, tenantId, from, to);
    return undefined;
  }

  private async todayStart(tenantId: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return startOfBusinessDayTz(new Date(), tz, dayStartHour);
  }

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListBookingsDto, withStatus = true): Promise<Prisma.BookingWhereInput> {
    const [createdAt, pickup] = await Promise.all([
      this.dayRange(user.tenantId, q.from, q.to),
      this.dayRange(user.tenantId, q.pickupFrom, q.pickupTo),
    ]);
    const s = q.search?.trim();
    const and: Prisma.BookingWhereInput[] = [];
    if (withStatus && q.status === 'ACTIVE') and.push({ status: { in: ACTIVE } });
    else if (withStatus && q.status === 'OVERDUE') {
      and.push({ status: { in: ACTIVE }, expectedPickupAt: { lt: await this.todayStart(user.tenantId) } });
    } else if (withStatus && q.status) and.push({ status: q.status as BookingStatus });
    if (s) {
      and.push({
        OR: [
          { bookingNumber: { contains: s, mode: 'insensitive' } },
          { customer: { name: { contains: s, mode: 'insensitive' } } },
          { customer: { phone: { contains: s } } },
          { notes: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return {
      tenantId: user.tenantId,
      ...this.shopWhere(user, scope, q.shopId),
      ...(createdAt && { createdAt }),
      ...(pickup && { expectedPickupAt: pickup }),
      ...(q.staffId && { createdById: q.staffId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(and.length && { AND: and }),
    };
  }

  /** Adds product names to items and the staff member who took each booking. */
  private async decorate(tenantId: string, rows: BookingRow[]) {
    const productIds = [...new Set(rows.flatMap((r) => r.items.map((i) => i.productId)))];
    const variantIds = [...new Set(rows.flatMap((r) => r.items.map((i) => i.variantId)).filter((x): x is string => !!x))];
    const userIds = [...new Set(rows.map((r) => r.createdById).filter((x): x is string => !!x))];
    const [products, variants, users] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId }, select: { id: true, name: true, unit: true, sku: true } }) : [],
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true } }) : [],
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds }, tenantId }, select: { id: true, fullName: true } }) : [],
    ]);
    const p = new Map(products.map((x) => [x.id, x]));
    const v = new Map(variants.map((x) => [x.id, x]));
    const u = new Map(users.map((x) => [x.id, x]));
    return rows.map((r) => ({
      ...r,
      createdBy: r.createdById ? u.get(r.createdById) ?? null : null,
      items: r.items.map((i) => ({ ...i, product: p.get(i.productId) ?? null, variant: i.variantId ? v.get(i.variantId) ?? null : null })),
    }));
  }

  /** Paged record for the list page, with money totals for the whole filter. */
  async records(user: AuthenticatedUser, scope: ShopScope, q: ListBookingsDto = {}) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const orderBy: Prisma.BookingOrderByWithRelationInput[] = q.sort === 'pickup'
      ? [{ expectedPickupAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }]
      : [{ createdAt: 'desc' }];
    const [rows, total, agg] = await Promise.all([
      this.prisma.booking.findMany({ where, include: ROW_INCLUDE, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.booking.count({ where }),
      this.prisma.booking.aggregate({ where, _sum: { total: true, totalPaid: true, totalRefunded: true, balanceDue: true } }),
    ]);
    return {
      items: await this.decorate(user.tenantId, rows),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        value: r2(agg._sum.total ?? 0),
        paid: r2((agg._sum.totalPaid ?? 0) - (agg._sum.totalRefunded ?? 0)),
        balance: r2(agg._sum.balanceDue ?? 0),
      },
    };
  }

  /**
   * Numbers for the KPI cards: today's bookings, open bookings waiting for
   * pickup, ready ones, overdue ones, pickups today and in the next 7 days
   * (all in the branch, whatever the period), plus the advance collected in
   * the chosen period net of refunds.
   */
  async overview(user: AuthenticatedUser, scope: ShopScope, q: ListBookingsDto = {}) {
    const base = { tenantId: user.tenantId, ...this.shopWhere(user, scope, q.shopId) };
    const today = await this.todayStart(user.tenantId);
    const tomorrow = new Date(today.getTime() + DAY);
    const week = new Date(today.getTime() + 8 * DAY);
    const period = (await this.dayRange(user.tenantId, q.from, q.to)) ?? { gte: today, lt: tomorrow };
    const open = { ...base, status: { in: ACTIVE } };
    const [created, active, ready, overdue, pickupToday, upcoming, payments] = await Promise.all([
      this.prisma.booking.aggregate({ where: { ...base, createdAt: { gte: today, lt: tomorrow } }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.booking.aggregate({ where: open, _count: { _all: true }, _sum: { total: true, totalPaid: true, balanceDue: true } }),
      this.prisma.booking.aggregate({ where: { ...base, status: 'READY_FOR_PICKUP' }, _count: { _all: true }, _sum: { balanceDue: true } }),
      this.prisma.booking.aggregate({ where: { ...open, expectedPickupAt: { lt: today } }, _count: { _all: true }, _sum: { balanceDue: true } }),
      this.prisma.booking.count({ where: { ...open, expectedPickupAt: { gte: today, lt: tomorrow } } }),
      this.prisma.booking.count({ where: { ...open, expectedPickupAt: { gte: today, lt: week } } }),
      this.prisma.bookingPayment.groupBy({
        by: ['type'], where: { booking: base, paidAt: period }, _sum: { amount: true }, _count: { _all: true },
      }),
    ]);
    const paid = (t: 'ADVANCE' | 'ADDITIONAL' | 'REFUND') => payments.find((p) => p.type === t)?._sum.amount ?? 0;
    return {
      today: { count: created._count._all, value: r2(created._sum.total ?? 0) },
      active: { count: active._count._all, value: r2(active._sum.total ?? 0), held: r2(active._sum.totalPaid ?? 0), balance: r2(active._sum.balanceDue ?? 0) },
      ready: { count: ready._count._all, balance: r2(ready._sum.balanceDue ?? 0) },
      overdue: { count: overdue._count._all, balance: r2(overdue._sum.balanceDue ?? 0) },
      pickupToday,
      upcoming,
      collected: {
        received: r2(paid('ADVANCE') + paid('ADDITIONAL')),
        refunded: r2(paid('REFUND')),
        net: r2(paid('ADVANCE') + paid('ADDITIONAL') - paid('REFUND')),
        payments: payments.filter((p) => p.type !== 'REFUND').reduce((s, p) => s + p._count._all, 0),
      },
    };
  }

  /**
   * Bookings made in the period: how many became sales or were cancelled,
   * money taken and refunded, the daily trend by business day, and the split
   * by status, staff, product and payment method; plus the pickup load of the
   * next 14 days.
   */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListBookingsDto = {}) {
    const where = await this.where(user, scope, { ...q, status: undefined, page: undefined, limit: undefined }, false);
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const rows = await this.prisma.booking.findMany({
      where,
      select: {
        id: true, status: true, total: true, totalPaid: true, totalRefunded: true, balanceDue: true, createdAt: true,
        convertedAt: true, cancelledAt: true, createdById: true, expectedPickupAt: true,
        items: { select: { productId: true, quantity: true, total: true } },
        payments: { select: { type: true, amount: true, paymentMethod: true } },
      },
    });

    const count = (s: BookingStatus) => rows.filter((r) => r.status === s).length;
    const converted = rows.filter((r) => r.status === 'CONVERTED');
    const cancelled = count('CANCELLED') + count('EXPIRED');
    const closed = converted.length + cancelled;
    const value = rows.reduce((s, r) => s + r.total, 0);
    const received = rows.reduce((s, r) => s + r.payments.filter((p) => p.type !== 'REFUND').reduce((a, p) => a + p.amount, 0), 0);
    const refunded = rows.reduce((s, r) => s + r.totalRefunded, 0);
    const withAdvance = rows.filter((r) => r.total > 0);
    const firstAdvance = (r: typeof rows[number]) => r.payments.find((p) => p.type === 'ADVANCE')?.amount ?? 0;
    const daysToSale = converted.filter((r) => r.convertedAt).map((r) => (r.convertedAt!.getTime() - r.createdAt.getTime()) / DAY);

    const days = new Map<string, { key: string; count: number; value: number; converted: number; cancelled: number }>();
    for (const r of rows) {
      const k = businessDayKey(r.createdAt, tz, dayStartHour);
      const d = days.get(k) ?? { key: k, count: 0, value: 0, converted: 0, cancelled: 0 };
      d.count++;
      d.value += r.total;
      if (r.status === 'CONVERTED') d.converted++;
      if (r.status === 'CANCELLED' || r.status === 'EXPIRED') d.cancelled++;
      days.set(k, d);
    }

    type Bucket = { key: string; label: string; count: number; value: number; qty: number };
    const bump = (m: Map<string, Bucket>, key: string, add: Partial<Bucket>) => {
      const b = m.get(key) ?? { key, label: key, count: 0, value: 0, qty: 0 };
      b.count += add.count ?? 0;
      b.value += add.value ?? 0;
      b.qty += add.qty ?? 0;
      m.set(key, b);
    };
    const sorted = (m: Map<string, Bucket>, names?: Map<string, string>) => [...m.values()]
      .map((b) => ({ ...b, label: names?.get(b.key) ?? b.label, value: r2(b.value), qty: Math.round(b.qty * 1000) / 1000 }))
      .sort((a, b) => b.value - a.value);

    const byStatus = new Map<string, Bucket>();
    const byStaff = new Map<string, Bucket>();
    const byProduct = new Map<string, Bucket>();
    const byMethod = new Map<string, Bucket>();
    for (const r of rows) {
      bump(byStatus, r.status, { count: 1, value: r.total });
      bump(byStaff, r.createdById ?? 'none', { count: 1, value: r.total });
      for (const i of r.items) bump(byProduct, i.productId, { count: 1, value: i.total, qty: i.quantity });
      for (const p of r.payments) if (p.type !== 'REFUND') bump(byMethod, p.paymentMethod, { count: 1, value: p.amount });
    }

    const staffIds = [...byStaff.keys()].filter((k) => k !== 'none');
    const productIds = [...byProduct.keys()];
    const [users, products] = await Promise.all([
      staffIds.length ? this.prisma.user.findMany({ where: { id: { in: staffIds }, tenantId: user.tenantId }, select: { id: true, fullName: true } }) : [],
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, name: true, unit: true } }) : [],
    ]);
    const staffNames = new Map<string, string>([['none', 'Pata nahi'], ...users.map((x) => [x.id, x.fullName] as [string, string])]);
    const productNames = new Map(products.map((x) => [x.id, x.name]));
    const units = new Map(products.map((x) => [x.id, x.unit]));

    // Pickup load ahead, over open bookings in the branch (not the period).
    const today = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    const ahead = await this.prisma.booking.findMany({
      where: {
        tenantId: user.tenantId, ...this.shopWhere(user, scope, q.shopId), status: { in: ACTIVE },
        expectedPickupAt: { gte: today, lt: new Date(today.getTime() + 14 * DAY) },
      },
      select: { expectedPickupAt: true, balanceDue: true },
    });
    const load = new Map<string, { key: string; count: number; balance: number }>();
    for (let i = 0; i < 14; i++) {
      const k = businessDayKey(new Date(today.getTime() + i * DAY + 3_600_000), tz, dayStartHour);
      load.set(k, { key: k, count: 0, balance: 0 });
    }
    for (const b of ahead) {
      const k = businessDayKey(b.expectedPickupAt!, tz, dayStartHour);
      const d = load.get(k);
      if (d) { d.count++; d.balance += b.balanceDue; }
    }

    return {
      totals: {
        count: rows.length,
        value: r2(value),
        converted: converted.length,
        convertedValue: r2(converted.reduce((s, r) => s + r.total, 0)),
        cancelled,
        open: rows.filter((r) => ACTIVE.includes(r.status)).length,
        /** Share of closed bookings that became a sale. */
        conversionRate: closed ? Math.round((converted.length / closed) * 1000) / 10 : null,
        received: r2(received),
        refunded: r2(refunded),
        /** Average first advance as a share of the booking total. */
        avgAdvancePct: withAdvance.length ? Math.round((withAdvance.reduce((s, r) => s + firstAdvance(r) / r.total, 0) / withAdvance.length) * 1000) / 10 : null,
        avgDaysToSale: daysToSale.length ? Math.round((daysToSale.reduce((s, d) => s + d, 0) / daysToSale.length) * 10) / 10 : null,
      },
      trend: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ ...d, value: r2(d.value) })),
      byStatus: sorted(byStatus),
      byStaff: sorted(byStaff, staffNames),
      byProduct: sorted(byProduct, productNames).slice(0, 10).map((b) => ({ ...b, unit: units.get(b.key) ?? '' })),
      byMethod: sorted(byMethod),
      pickupLoad: [...load.values()].map((d) => ({ ...d, balance: r2(d.balance) })),
    };
  }

  /* ───────────────────────── one booking ───────────────────────── */

  async findOne(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: true,
        shop: true,
        items: true,
        payments: { orderBy: { paidAt: 'desc' } },
        sale: { select: { id: true, saleNumber: true, total: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking nahi mili');

    // Hydrate item details (products, variants, IMEIs, rolls, cut pieces)
    const productIds = [...new Set(booking.items.map((i) => i.productId))];
    const variantIds = booking.items.map((i) => i.variantId).filter(Boolean) as string[];
    const imeiIds = booking.items.map((i) => i.imeiId).filter(Boolean) as string[];
    const rollIds = booking.items.map((i) => i.rollId).filter(Boolean) as string[];
    const cutPieceIds = booking.items.map((i) => i.cutPieceId).filter(Boolean) as string[];
    const people = [...new Set([booking.createdById, ...booking.payments.map((p) => p.createdById)].filter((x): x is string => !!x))];

    const [products, variants, imeis, rolls, cutPieces, users] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId } }),
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } } }) : Promise.resolve([]),
      imeiIds.length ? this.prisma.productImei.findMany({ where: { id: { in: imeiIds }, tenantId: user.tenantId } }) : Promise.resolve([]),
      rollIds.length ? this.prisma.carpetRoll.findMany({ where: { id: { in: rollIds }, tenantId: user.tenantId } }) : Promise.resolve([]),
      cutPieceIds.length ? this.prisma.carpetCutPiece.findMany({ where: { id: { in: cutPieceIds }, tenantId: user.tenantId } }) : Promise.resolve([]),
      people.length ? this.prisma.user.findMany({ where: { id: { in: people }, tenantId: user.tenantId }, select: { id: true, fullName: true } }) : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const imeiMap = new Map(imeis.map((i) => [i.id, i]));
    const rollMap = new Map(rolls.map((r) => [r.id, r]));
    const cutPieceMap = new Map(cutPieces.map((c) => [c.id, c]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      ...booking,
      createdBy: booking.createdById ? userMap.get(booking.createdById) ?? null : null,
      payments: booking.payments.map((p) => ({ ...p, createdBy: p.createdById ? userMap.get(p.createdById) ?? null : null })),
      items: booking.items.map((it) => ({
        ...it,
        product: productMap.get(it.productId) ?? null,
        variant: it.variantId ? variantMap.get(it.variantId) ?? null : null,
        imei: it.imeiId ? imeiMap.get(it.imeiId) ?? null : null,
        roll: it.rollId ? rollMap.get(it.rollId) ?? null : null,
        cutPiece: it.cutPieceId ? cutPieceMap.get(it.cutPieceId) ?? null : null,
      })),
    };
  }

  /* ───────────────────────── create ───────────────────────── */

  private async nextNumber(tenantId: string, bump: number) {
    const prefix = `BK-${new Date().getFullYear()}-`;
    const last = await this.prisma.booking.findFirst({
      where: { tenantId, bookingNumber: { startsWith: prefix } },
      orderBy: { bookingNumber: 'desc' },
      select: { bookingNumber: true },
    });
    const n = Number(last?.bookingNumber.slice(prefix.length)) || 0;
    return `${prefix}${String(n + 1 + bump).padStart(4, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateBookingDto) {
    assertShopAccess(user, dto.shopId, 'Booking');
    const [shop, customer] = await Promise.all([
      this.prisma.shop.findFirst({ where: { id: dto.shopId, tenantId: user.tenantId, isActive: true } }),
      this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } }),
    ]);
    if (!shop) throw new NotFoundException('Shop nahi mili');
    if (!customer) throw new NotFoundException('Customer nahi mila');

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: user.tenantId, isActive: true },
      select: { id: true },
    });
    if (products.length !== productIds.length) throw new NotFoundException('Kuch products nahi mile');

    const variantIds = [...new Set(dto.items.map((i) => i.variantId).filter((x): x is string => !!x))];
    if (variantIds.length) {
      const found = await this.prisma.productVariant.count({ where: { id: { in: variantIds }, productId: { in: productIds } } });
      if (found !== variantIds.length) throw new BadRequestException('Koi variant apne product ka nahi');
    }

    const imeiIds = dto.items.map((i) => i.imeiId).filter(Boolean) as string[];
    const rollIds = dto.items.map((i) => i.rollId).filter(Boolean) as string[];
    const cutPieceIds = dto.items.map((i) => i.cutPieceId).filter(Boolean) as string[];
    const openBooking = { tenantId: user.tenantId, status: { in: ACTIVE } };

    if (imeiIds.length) {
      if (new Set(imeiIds).size !== imeiIds.length) throw new BadRequestException('Ek IMEI do dafa chuna gaya hai');
      const imeis = await this.prisma.productImei.findMany({ where: { id: { in: imeiIds }, tenantId: user.tenantId } });
      if (imeis.length !== imeiIds.length) throw new NotFoundException('Koi IMEI nahi mila');
      for (const imei of imeis) {
        if (imei.status !== 'IN_STOCK') throw new BadRequestException(`IMEI ${imei.imei1} ${imei.status} hai, reserve nahi ho sakta`);
      }
      const taken = await this.prisma.bookingItem.count({ where: { imeiId: { in: imeiIds }, booking: openBooking } });
      if (taken) throw new BadRequestException('Koi IMEI pehle se doosri booking me reserve hai');
    }

    if (cutPieceIds.length) {
      const pieces = await this.prisma.carpetCutPiece.findMany({ where: { id: { in: cutPieceIds }, tenantId: user.tenantId } });
      if (pieces.length !== cutPieceIds.length) throw new NotFoundException('Koi cut piece nahi mila');
      for (const p of pieces) {
        if (p.status !== 'AVAILABLE') throw new BadRequestException(`Cut piece ${p.pieceCode} ${p.status} hai`);
      }
      const taken = await this.prisma.bookingItem.count({ where: { cutPieceId: { in: cutPieceIds }, booking: openBooking } });
      if (taken) throw new BadRequestException('Koi cut piece pehle se reserve hai');
    }

    if (rollIds.length) {
      const rolls = await this.prisma.carpetRoll.count({ where: { id: { in: rollIds }, tenantId: user.tenantId } });
      if (rolls !== new Set(rollIds).size) throw new NotFoundException('Koi roll nahi mila');
    }

    // Totals
    let subtotal = 0;
    let lineDiscountTotal = 0;
    for (const item of dto.items) {
      const gross = item.price * item.quantity;
      if ((item.lineDiscount ?? 0) > gross + 0.01) throw new BadRequestException('Line discount item ki qeemat se zyada hai');
      subtotal += gross;
      lineDiscountTotal += item.lineDiscount ?? 0;
    }
    subtotal = r2(subtotal);
    if ((dto.discount ?? 0) > subtotal - lineDiscountTotal + 0.01) throw new BadRequestException('Discount kul amount se zyada hai');
    const discount = r2((dto.discount ?? 0) + lineDiscountTotal);
    const serviceChargesArr = dto.serviceCharges ?? [];
    const serviceChargesTotal = r2(serviceChargesArr.reduce((s, sc) => s + Number(sc.amount || 0), 0));
    const total = r2(Math.max(subtotal - discount + serviceChargesTotal, 0));
    const initialAdvance = r2(dto.initialAdvance ?? 0);
    if (initialAdvance > total + 0.01) throw new BadRequestException('Advance kul amount se zyada nahi ho sakta');
    const balanceDue = r2(Math.max(total - initialAdvance, 0));

    // A double click sends the same booking twice; hand back the first one.
    const twin = await this.prisma.booking.findFirst({
      where: {
        tenantId: user.tenantId, customerId: customer.id, createdById: user.id, shopId: dto.shopId, total,
        totalPaid: initialAdvance, createdAt: { gte: new Date(Date.now() - DUPLICATE_MS) },
      },
    });
    if (twin) return twin;

    for (let attempt = 0; attempt < 5; attempt++) {
      const bookingNumber = await this.nextNumber(user.tenantId, attempt);
      try {
        return await this.prisma.$transaction(async (tx) => {
          const booking = await tx.booking.create({
            data: {
              tenantId: user.tenantId,
              shopId: dto.shopId,
              customerId: dto.customerId,
              createdById: user.id,
              bookingNumber,
              status: initialAdvance > 0 ? 'ADVANCE_PAID' : 'PENDING',
              subtotal,
              discount,
              serviceCharges: serviceChargesTotal,
              serviceChargesBreakdown: serviceChargesArr.length > 0 ? (serviceChargesArr as unknown as Prisma.InputJsonValue) : undefined,
              total,
              totalPaid: initialAdvance,
              balanceDue,
              expectedPickupAt: dto.expectedPickupAt ? new Date(dto.expectedPickupAt) : undefined,
              expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
              paymentMethod: dto.paymentMethod ?? 'CASH',
              notes: dto.notes?.trim() || null,
              internalNotes: dto.internalNotes?.trim() || null,
              items: {
                create: dto.items.map((it) => ({
                  productId: it.productId,
                  variantId: it.variantId,
                  imeiId: it.imeiId,
                  rollId: it.rollId,
                  cutPieceId: it.cutPieceId,
                  quantity: it.quantity,
                  price: it.price,
                  costPrice: it.costPrice ?? 0,
                  lineDiscount: it.lineDiscount ?? 0,
                  total: r2(it.price * it.quantity - (it.lineDiscount ?? 0)),
                  useWholesale: it.useWholesale ?? false,
                  cutWidthFt: it.cutWidthFt,
                  cutLengthFt: it.cutLengthFt,
                  cutLengthInch: it.cutLengthInch,
                  cutSqft: it.cutSqft,
                  note: it.note,
                  internalNote: it.internalNote,
                })),
              },
            },
          });

          // Reserve IMEIs, cut pieces and rolls; the status check stops two bookings taking one.
          if (imeiIds.length) {
            const held = await tx.productImei.updateMany({ where: { id: { in: imeiIds }, status: 'IN_STOCK' }, data: { status: 'RESERVED' } });
            if (held.count !== imeiIds.length) throw new BadRequestException('Koi IMEI abhi abhi bik gaya ya reserve ho gaya');
          }
          if (cutPieceIds.length) {
            const held = await tx.carpetCutPiece.updateMany({ where: { id: { in: cutPieceIds }, status: 'AVAILABLE' }, data: { status: 'RESERVED' } });
            if (held.count !== cutPieceIds.length) throw new BadRequestException('Koi cut piece abhi abhi bik gaya ya reserve ho gaya');
          }
          if (rollIds.length) {
            await tx.carpetRoll.updateMany({ where: { id: { in: rollIds } }, data: { status: 'RESERVED' } });
          }

          if (initialAdvance > 0) {
            await tx.bookingPayment.create({
              data: {
                bookingId: booking.id,
                type: 'ADVANCE',
                amount: initialAdvance,
                paymentMethod: dto.paymentMethod ?? 'CASH',
                createdById: user.id,
                notes: 'Booking ke waqt advance',
              },
            });
            await this.ledger(tx, user, booking, 'PAYMENT_RECEIVED', -initialAdvance, bookingNumber, `Booking advance: ${bookingNumber}`, dto.paymentMethod ?? 'CASH');
          }
          return booking;
        });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new BadRequestException('Booking number nahi bana, dobara koshish karein');
  }

  /* ───────────────────────── change ───────────────────────── */

  /** Reschedule pickup or deadline, or edit notes, while the booking is open. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateBookingDto) {
    const booking = await this.load(user, id);
    if (!ACTIVE.includes(booking.status)) throw new BadRequestException('Band booking badli nahi ja sakti');
    const date = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));
    await this.prisma.booking.update({
      where: { id },
      data: {
        expectedPickupAt: date(dto.expectedPickupAt),
        expiresAt: date(dto.expiresAt),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
        ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes.trim() || null }),
      },
    });
    return this.findOne(user, id);
  }

  /** Ready for pickup on/off. Taking it back returns to "advance paid" or "pending". */
  async markReady(user: AuthenticatedUser, id: string, ready: boolean) {
    const booking = await this.load(user, id);
    const done = ready
      ? await this.prisma.booking.updateMany({
        where: { id, tenantId: user.tenantId, status: { in: ['PENDING', 'ADVANCE_PAID'] } },
        data: { status: 'READY_FOR_PICKUP' },
      })
      : await this.prisma.booking.updateMany({
        where: { id, tenantId: user.tenantId, status: 'READY_FOR_PICKUP' },
        data: { status: booking.totalPaid > 0 ? 'ADVANCE_PAID' : 'PENDING' },
      });
    if (!done.count) throw new BadRequestException(ready ? 'Yeh booking tayyar nahi ki ja sakti' : 'Yeh booking tayyar wali nahi');
    return this.findOne(user, id);
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddBookingPaymentDto) {
    const booking = await this.load(user, id);
    if (!ACTIVE.includes(booking.status)) throw new BadRequestException('Band booking par payment nahi li ja sakti');
    const amount = r2(dto.amount);
    if (booking.totalPaid + amount > booking.total + 0.01) {
      throw new BadRequestException(`Payment baqi se zyada hai. Baqi: ${booking.balanceDue.toFixed(2)}`);
    }
    const twin = await this.prisma.bookingPayment.findFirst({
      where: { bookingId: id, amount, createdById: user.id, type: { not: 'REFUND' }, createdAt: { gte: new Date(Date.now() - DUPLICATE_MS) } },
    });
    if (twin) throw new BadRequestException('Yehi payment abhi abhi likhi gayi hai');

    const newPaid = r2(booking.totalPaid + amount);
    const newBalance = r2(Math.max(booking.total - newPaid, 0));
    const newStatus: BookingStatus = newBalance === 0 || booking.status === 'READY_FOR_PICKUP' ? 'READY_FOR_PICKUP' : 'ADVANCE_PAID';

    await this.prisma.$transaction(async (tx) => {
      // Claim on the amount read above: a second request in flight finds it changed.
      const claimed = await tx.booking.updateMany({
        where: { id, tenantId: user.tenantId, status: { in: ACTIVE }, totalPaid: booking.totalPaid },
        data: { totalPaid: newPaid, balanceDue: newBalance, status: newStatus },
      });
      if (!claimed.count) throw new BadRequestException('Booking abhi badli hai, page dobara khol kar koshish karein');
      await tx.bookingPayment.create({
        data: {
          bookingId: id,
          type: booking.totalPaid > 0 ? 'ADDITIONAL' : 'ADVANCE',
          amount,
          paymentMethod: dto.paymentMethod ?? 'CASH',
          reference: dto.reference,
          notes: dto.notes,
          createdById: user.id,
        },
      });
      await this.ledger(tx, user, booking, 'PAYMENT_RECEIVED', -amount, booking.bookingNumber, `Booking payment: ${booking.bookingNumber}`, dto.paymentMethod ?? 'CASH');
    });
    return this.findOne(user, id);
  }

  async cancel(user: AuthenticatedUser, id: string, dto: CancelBookingDto) {
    const booking = await this.load(user, id);
    if (booking.status === 'CONVERTED') throw new BadRequestException('Bik chuki booking cancel nahi ho sakti');
    if (!ACTIVE.includes(booking.status)) throw new BadRequestException('Booking pehle hi band hai');
    const refundAmount = dto.refundAdvance ? booking.totalPaid : 0;
    if (refundAmount > 0) {
      // Giving money back is a refund: it needs the returns permission on top of bookings.
      if (!hasPermission(user.role, user.permissions, PERMISSIONS.RETURNS_CREATE)) {
        throw new ForbiddenException('Advance wapas karne ke liye "Returns banana" ki permission chahiye');
      }
      const rules = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForRefund: true } });
      if (rules?.requirePinForRefund) await requireManagerPin(this.prisma, user, dto.managerPin, 'Advance wapsi', false, PIN_NEEDS.refund);
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.booking.updateMany({
        where: { id, tenantId: user.tenantId, status: { in: ACTIVE }, totalPaid: booking.totalPaid },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: dto.reason?.trim() || null,
          totalRefunded: refundAmount,
          balanceDue: r2(booking.total - booking.totalPaid + refundAmount),
        },
      });
      if (!claimed.count) throw new BadRequestException('Booking abhi badli hai, page dobara khol kar koshish karein');

      await this.releaseReservations(tx, booking.items);

      if (refundAmount > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: id,
            type: 'REFUND',
            amount: refundAmount,
            paymentMethod: dto.refundMethod ?? booking.paymentMethod,
            notes: `Cancel par wapsi: ${dto.reason?.trim() || 'wajah nahi likhi'}`,
            createdById: user.id,
          },
        });
        await this.ledger(tx, user, booking, 'REFUND', refundAmount, booking.bookingNumber, `Cancel booking ki wapsi: ${booking.bookingNumber}`);
      }
    });
    return this.findOne(user, id);
  }

  private async releaseReservations(tx: Tx, items: Array<{ imeiId: string | null; rollId: string | null; cutPieceId: string | null }>) {
    const imeiIds = items.map((i) => i.imeiId).filter(Boolean) as string[];
    const rollIds = items.map((i) => i.rollId).filter(Boolean) as string[];
    const cutPieceIds = items.map((i) => i.cutPieceId).filter(Boolean) as string[];
    if (imeiIds.length) await tx.productImei.updateMany({ where: { id: { in: imeiIds }, status: 'RESERVED' }, data: { status: 'IN_STOCK' } });
    if (rollIds.length) await tx.carpetRoll.updateMany({ where: { id: { in: rollIds }, status: 'RESERVED' }, data: { status: 'ACTIVE' } });
    if (cutPieceIds.length) await tx.carpetCutPiece.updateMany({ where: { id: { in: cutPieceIds }, status: 'RESERVED' }, data: { status: 'AVAILABLE' } });
  }

  /* ───────────────────────── convert to sale ───────────────────────── */

  /**
   * Turn the booking into a completed sale: stock leaves the booking's branch
   * (IMEIs and cut pieces are marked sold), the advance is applied to the bill
   * and what is still unpaid goes on the customer's khata.
   */
  async convertToSale(user: AuthenticatedUser, id: string, dto: ConvertBookingDto) {
    const booking = await this.load(user, id);
    if (booking.status === 'CONVERTED') throw new BadRequestException('Yeh booking pehle hi bik chuki hai');
    if (!ACTIVE.includes(booking.status)) throw new BadRequestException('Band booking ki sale nahi ho sakti');
    if (!booking.shopId) throw new BadRequestException('Booking ki branch nahi hai, sale nahi ho sakti');
    const shopId = booking.shopId;

    const additionalPayment = r2(dto.additionalPayment ?? 0);
    if (additionalPayment > booking.balanceDue + 0.01) {
      throw new BadRequestException(`Payment baqi se zyada hai. Baqi: ${booking.balanceDue.toFixed(2)}`);
    }
    const totalPaidNow = r2(booking.totalPaid + additionalPayment);
    const creditAmount = r2(Math.max(booking.total - totalPaidNow, 0));
    const paymentMethod = dto.paymentMethod ?? booking.paymentMethod;

    const [settings, shop, products] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { allowNegativeStock: true } }),
      this.prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } }),
      this.prisma.product.findMany({ where: { id: { in: booking.items.map((i) => i.productId) } }, select: { id: true, name: true, productType: true, unit: true } }),
    ]);
    const names = new Map(products.map((p) => [p.id, p.name]));
    // Services and fees hold no shelf stock, the same as at the counter.
    const serviceIds = new Set(products.filter((p) => isServiceProduct(p)).map((p) => p.id));

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.booking.updateMany({
        where: { id, tenantId: user.tenantId, status: { in: ACTIVE }, totalPaid: booking.totalPaid },
        data: { status: 'CONVERTED', convertedAt: new Date(), totalPaid: totalPaidNow, balanceDue: creditAmount },
      });
      if (!claimed.count) throw new BadRequestException('Booking abhi badli hai, page dobara khol kar koshish karein');

      await this.releaseReservations(tx, booking.items);

      const saleNumber = `NF-${Date.now().toString().slice(-8)}`;
      const sale = await tx.sale.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          customerId: booking.customerId,
          createdById: user.id,
          saleNumber,
          subtotal: booking.subtotal,
          discount: booking.discount,
          serviceCharges: booking.serviceCharges,
          serviceChargesBreakdown: booking.serviceChargesBreakdown ?? undefined,
          total: booking.total,
          costOfGoods: r2(booking.items.reduce((s, it) => s + (it.costPrice ?? 0) * it.quantity, 0)),
          paidAmount: totalPaidNow,
          changeAmount: 0,
          creditAmount,
          paymentMethod,
          status: 'COMPLETED',
          bookingId: booking.id,
        },
      });
      // Booking bills keep their row like any bill; drawer and accounts skip
      // them because each booking payment was counted when it came in.
      await saveSalePayments(tx, sale, totalPaidNow > 0 ? [{ method: paymentMethod, amount: totalPaidNow }] : []);

      // Stock out of the booking's branch, the same way the counter does it.
      for (const it of booking.items) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            costPrice: it.costPrice ?? 0,
            total: it.total,
            note: it.note,
            internalNote: it.internalNote,
            ...(it.variantId && { variantLink: { create: { variantId: it.variantId } } }),
          },
        });
        const label = names.get(it.productId) ?? 'Item';
        if (it.imeiId) {
          await tx.productImei.update({
            where: { id: it.imeiId },
            data: { status: 'SOLD', saleItemId: saleItem.id, soldPrice: it.price, soldAt: new Date() },
          });
          await this.imeiSold(tx, user.tenantId, shopId, it.productId, it.variantId, saleNumber, booking.bookingNumber, user.id);
        } else if (it.rollId || it.cutPieceId) {
          // Carpet stock lives on the roll; record the movement only, as the counter does.
          if (it.cutPieceId) {
            await tx.carpetCutPiece.update({ where: { id: it.cutPieceId }, data: { status: 'SOLD', saleItemId: saleItem.id, soldAt: new Date() } });
          }
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId, shopId, productId: it.productId, type: 'SALE_OUT', quantity: -it.quantity, balanceAfter: 0,
              reference: saleNumber, note: `Booking ${booking.bookingNumber} • ${shop?.name ?? ''}${it.note ? ` • ${it.note}` : ''}`, createdById: user.id,
            },
          });
        } else if (serviceIds.has(it.productId)) {
          // Service line: billed, no stock out.
        } else {
          const moved = await applyStockDelta({
            tx, tenantId: user.tenantId, shopId, productId: it.productId, variantId: it.variantId, delta: -it.quantity,
            movementType: 'SALE_OUT', reference: saleNumber, note: `Booking ${booking.bookingNumber} ki sale`,
            preventNegative: !settings?.allowNegativeStock, label, userId: user.id, unitCost: it.costPrice || null,
          });
          await recordSaleBatches(tx, saleItem.id, moved.batches);
        }
      }

      if (additionalPayment > 0) {
        await tx.bookingPayment.create({
          data: { bookingId: id, type: 'ADDITIONAL', amount: additionalPayment, paymentMethod, notes: dto.notes?.trim() || 'Sale ke waqt payment', createdById: user.id },
        });
      }

      // The advance was held on the khata as the customer's money; the bill uses
      // it up now. What is still unpaid becomes udhaar, as on a counter sale.
      if (booking.totalPaid > 0) {
        await this.ledger(tx, user, booking, 'ADJUSTMENT', booking.totalPaid, saleNumber, `Booking advance bill me laga: ${booking.bookingNumber} → ${saleNumber}`);
      }
      if (creditAmount > 0) {
        await this.ledger(tx, user, booking, 'SALE_CREDIT', creditAmount, saleNumber, `Booking ki sale ka udhaar: ${saleNumber}`);
      }
      await tx.customer.update({ where: { id: booking.customerId }, data: { totalSpent: { increment: booking.total } } });

      return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true } });
    }).then(async (sale) => ({ booking: await this.findOne(user, id), sale }));
  }

  /**
   * Stock after an IMEI unit is sold, as the counter does it: the product and
   * variant totals are recounted from units in stock, the branch row drops by one.
   */
  private async imeiSold(
    tx: Tx, tenantId: string, shopId: string, productId: string, variantId: string | null,
    saleNumber: string, bookingNumber: string, userId: string,
  ) {
    const inStock = (extra: Prisma.ProductImeiWhereInput = {}) =>
      tx.productImei.count({ where: { tenantId, productId, status: 'IN_STOCK', ...extra } });
    const productStock = await inStock();
    await tx.product.update({ where: { id: productId }, data: { stock: productStock } });
    if (variantId) await tx.productVariant.update({ where: { id: variantId }, data: { stock: await inStock({ variantId }) } });
    const row = await tx.shopStock.findFirst({ where: { shopId, productId, variantId }, select: { id: true, stock: true } });
    let after = 0;
    if (row) {
      after = Math.max(Number(row.stock) - 1, 0);
      await tx.shopStock.update({ where: { id: row.id }, data: { stock: after } });
    }
    await tx.stockMovement.create({
      data: {
        tenantId, shopId, productId, variantId, type: 'SALE_OUT', quantity: -1, balanceAfter: after,
        reference: saleNumber, note: `Booking ${bookingNumber} ki sale (IMEI)`, createdById: userId,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const booking = await this.load(user, id);
    if (booking.status !== 'CANCELLED' && booking.status !== 'EXPIRED') {
      throw new BadRequestException('Sirf cancel ya expire booking mitayi ja sakti hai');
    }
    await this.prisma.booking.delete({ where: { id } });
    return { success: true };
  }
}
