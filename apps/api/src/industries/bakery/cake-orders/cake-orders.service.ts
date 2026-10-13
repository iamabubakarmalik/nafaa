/**
 * Cake orders: booking with advance, the work steps up to delivery,
 * payments, the paged record with its counts, period analytics and the bill
 * made at delivery. Every query is limited to the tenant and, for reads, to
 * the branch being viewed (orders saved before branches existed show in
 * every branch). Days follow the shop's business day.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BakeryOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { hourInTz } from '../../../common/helpers/business-time.helper';
import { ShopScope } from '../../../common/shop-scope';
import { CLOSED_ORDER, DAY_MS, positive, r2, shopClock, withNextNumber, writeShopId } from '../bakery-common';
import { CreateCakeOrderDto, UpdateCakeOrderDto, UpdateCakeOrderStatusDto } from './dto/create-cake-order.dto';

type CakeOrderView = 'active' | 'today' | 'tomorrow' | 'late' | 'ready' | 'unpaid' | 'done' | 'all';

export interface CakeOrderQuery {
  view?: string;
  search?: string;
  from?: string;
  to?: string;
  deliveryType?: string;
  occasion?: string;
  sort?: string;
  page?: string | number;
  limit?: string | number;
}

const VIEWS: CakeOrderView[] = ['active', 'today', 'tomorrow', 'late', 'ready', 'unpaid', 'done', 'all'];
const READY = ['READY', 'OUT_FOR_DELIVERY'];
/** Steps before the baking starts: an advance moves these to "advance received". */
const BEFORE_WORK = ['DRAFT', 'QUOTED', 'CONFIRMED'];
const MONEY_KEYS = ['basePrice', 'customizationCharges', 'photoCakeCharges', 'deliveryCharges', 'taxAmount', 'discount'] as const;

const num = (v: unknown) => Number(v) || 0;
const due = (o: { total: number; paidAmount: number }) => Math.max(r2(num(o.total) - num(o.paidAmount)), 0);

function paymentStatusOf(paid: number, total: number, advanceRequired: number) {
  if (paid <= 0) return 'UNPAID';
  if (paid >= total - 0.005) return 'PAID';
  if (paid >= advanceRequired) return 'DEPOSIT_PAID';
  return 'PARTIALLY_PAID';
}

function dateOrThrow(v: string | undefined | null, message: string): Date {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) throw new BadRequestException(message);
  return d;
}

const optionalDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

@Injectable()
export class CakeOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── booking ───────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateCakeOrderDto) {
    const customerName = dto.customerName?.trim();
    const customerPhone = dto.customerPhone?.trim();
    if (!customerName) throw new BadRequestException('Customer ka naam likhein');
    if (!customerPhone) throw new BadRequestException('Customer ka phone likhein');
    const neededBy = dateOrThrow(dto.neededBy, 'Cake kab chahiye — tareekh aur waqt chunein');

    const money = Object.fromEntries(MONEY_KEYS.map((k) => [k, Math.max(num(dto[k]), 0)])) as Record<(typeof MONEY_KEYS)[number], number>;
    const total = r2(Math.max(money.basePrice + money.customizationCharges + money.photoCakeCharges + money.deliveryCharges + money.taxAmount - money.discount, 0));
    const advancePaid = r2(Math.max(num(dto.advancePaid), 0));
    if (advancePaid > total + 0.005) throw new BadRequestException('Advance kul rakam se zyada nahi ho sakta');
    const advanceRequired = r2(dto.advanceRequired != null ? Math.max(num(dto.advanceRequired), 0) : total * 0.5);

    if (dto.productId) {
      const p = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } });
      if (!p) throw new NotFoundException('Product nahi mila');
    }
    const customerId = dto.customerId
      ? (await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } }))?.id ?? null
      : null;
    const shopId = await writeShopId(this.prisma, user.tenantId, scope, dto.shopId);

    // A double click or a retried request within a minute returns the order already saved.
    const twin = await this.prisma.bakeryCakeOrder.findFirst({
      where: { tenantId: user.tenantId, createdById: user.id, customerPhone, neededBy, total, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (twin) return twin;

    const requested = dto.status ?? 'CONFIRMED';
    const status: BakeryOrderStatus = advancePaid > 0 && advancePaid >= advanceRequired ? 'DEPOSIT_PAID' : requested;
    const clock = await shopClock(this.tz, user.tenantId);

    return withNextNumber(
      async (prefix) => (await this.prisma.bakeryCakeOrder.findFirst({
        where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' }, select: { orderNumber: true },
      }))?.orderNumber,
      `CK-${clock.year()}-`, 5,
      (orderNumber) => this.prisma.bakeryCakeOrder.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          orderNumber,
          customerId,
          customerName,
          customerPhone,
          customerEmail: dto.customerEmail?.trim() || null,
          productId: dto.productId || null,
          productName: dto.productName?.trim() || null,
          category: dto.category ?? 'CUSTOM_CAKE',
          size: dto.size,
          customWeightKg: dto.customWeightKg ?? null,
          shape: dto.shape ?? 'ROUND',
          customShapeDesc: dto.customShapeDesc || null,
          flavor: dto.flavor,
          customFlavorDesc: dto.customFlavorDesc || null,
          creamType: dto.creamType ?? null,
          numberOrLetter: dto.numberOrLetter || null,
          numberOfTiers: dto.numberOfTiers ?? 1,
          tierDetails: dto.tierDetails ?? undefined,
          messageOnCake: dto.messageOnCake?.trim() || null,
          messageColor: dto.messageColor || null,
          hasPhotoOnCake: dto.hasPhotoOnCake ?? false,
          photoUrl: dto.photoUrl || null,
          hasEdibleImage: dto.hasEdibleImage ?? false,
          designReferenceUrls: dto.designReferenceUrls ?? [],
          designInstructions: dto.designInstructions?.trim() || null,
          colorTheme: dto.colorTheme || null,
          primaryColor: dto.primaryColor || null,
          secondaryColor: dto.secondaryColor || null,
          decorativeItems: dto.decorativeItems ?? [],
          candlesRequired: dto.candlesRequired ?? null,
          candleType: dto.candleType || null,
          cakeStand: dto.cakeStand ?? false,
          cakeKnife: dto.cakeKnife ?? false,
          occasion: dto.occasion || 'OTHER',
          celebrantName: dto.celebrantName?.trim() || null,
          celebrantAge: dto.celebrantAge ?? null,
          eventDate: optionalDate(dto.eventDate),
          eventTime: dto.eventTime || null,
          eventVenue: dto.eventVenue || null,
          isEggless: dto.isEggless ?? false,
          isSugarFree: dto.isSugarFree ?? false,
          isVegan: dto.isVegan ?? false,
          allergies: dto.allergies ?? [],
          dietaryNotes: dto.dietaryNotes || null,
          deliveryType: dto.deliveryType ?? 'SELF_PICKUP',
          neededBy,
          deliveryDate: optionalDate(dto.deliveryDate),
          deliveryTime: dto.deliveryTime || null,
          deliveryAddress: dto.deliveryAddress?.trim() || null,
          deliveryLandmark: dto.deliveryLandmark || null,
          ...money,
          advanceRequired,
          advancePaid,
          paidAmount: advancePaid,
          total,
          status,
          confirmedAt: status === 'DRAFT' || status === 'QUOTED' ? null : new Date(),
          paymentStatus: paymentStatusOf(advancePaid, total, advanceRequired),
          specialInstructions: dto.specialInstructions?.trim() || null,
          internalNotes: dto.internalNotes?.trim() || null,
          createdById: user.id,
        },
      }),
    );
  }

  /** Changes the details of an open order. Money received is never touched here. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateCakeOrderDto) {
    const order = await this.mustFind(user, id);
    if ((CLOSED_ORDER as readonly string[]).includes(order.status)) throw new BadRequestException('De diya ya cancel order badla nahi ja sakta');

    const money = Object.fromEntries(MONEY_KEYS.map((k) => [k, dto[k] !== undefined ? Math.max(num(dto[k]), 0) : num(order[k])])) as Record<(typeof MONEY_KEYS)[number], number>;
    const total = r2(Math.max(money.basePrice + money.customizationCharges + money.photoCakeCharges + money.deliveryCharges + money.taxAmount - money.discount, 0));
    if (total + 0.005 < order.paidAmount) throw new BadRequestException(`${order.paidAmount} pehle hi mil chuka hai — kul rakam is se kam nahi ho sakti`);
    const advanceRequired = dto.advanceRequired !== undefined ? r2(Math.max(num(dto.advanceRequired), 0)) : order.advanceRequired;

    if (dto.productId) {
      const p = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } });
      if (!p) throw new NotFoundException('Product nahi mila');
    }
    let customerId: string | null | undefined;
    if (dto.customerId !== undefined) {
      customerId = dto.customerId
        ? (await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } }))?.id ?? null
        : null;
    }

    const text = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);
    const data: Prisma.BakeryCakeOrderUpdateManyMutationInput = {
      ...(customerId !== undefined && { customerId }),
      customerName: dto.customerName !== undefined ? dto.customerName.trim() || order.customerName : undefined,
      customerPhone: dto.customerPhone !== undefined ? dto.customerPhone.trim() || order.customerPhone : undefined,
      customerEmail: text(dto.customerEmail),
      productId: dto.productId !== undefined ? dto.productId || null : undefined,
      productName: text(dto.productName),
      category: dto.category,
      size: dto.size,
      customWeightKg: dto.customWeightKg,
      shape: dto.shape,
      customShapeDesc: text(dto.customShapeDesc),
      flavor: dto.flavor,
      customFlavorDesc: text(dto.customFlavorDesc),
      creamType: dto.creamType,
      numberOrLetter: text(dto.numberOrLetter),
      numberOfTiers: dto.numberOfTiers,
      tierDetails: dto.tierDetails,
      messageOnCake: text(dto.messageOnCake),
      messageColor: text(dto.messageColor),
      hasPhotoOnCake: dto.hasPhotoOnCake,
      photoUrl: text(dto.photoUrl),
      hasEdibleImage: dto.hasEdibleImage,
      designReferenceUrls: dto.designReferenceUrls,
      designInstructions: text(dto.designInstructions),
      colorTheme: text(dto.colorTheme),
      primaryColor: text(dto.primaryColor),
      secondaryColor: text(dto.secondaryColor),
      decorativeItems: dto.decorativeItems,
      candlesRequired: dto.candlesRequired,
      candleType: text(dto.candleType),
      cakeStand: dto.cakeStand,
      cakeKnife: dto.cakeKnife,
      occasion: dto.occasion || undefined,
      celebrantName: text(dto.celebrantName),
      celebrantAge: dto.celebrantAge,
      eventDate: dto.eventDate !== undefined ? optionalDate(dto.eventDate) : undefined,
      eventTime: text(dto.eventTime),
      eventVenue: text(dto.eventVenue),
      isEggless: dto.isEggless,
      isSugarFree: dto.isSugarFree,
      isVegan: dto.isVegan,
      allergies: dto.allergies,
      dietaryNotes: text(dto.dietaryNotes),
      deliveryType: dto.deliveryType,
      neededBy: dto.neededBy !== undefined ? dateOrThrow(dto.neededBy, 'Cake kab chahiye — tareekh theek nahi') : undefined,
      deliveryDate: dto.deliveryDate !== undefined ? optionalDate(dto.deliveryDate) : undefined,
      deliveryTime: text(dto.deliveryTime),
      deliveryAddress: text(dto.deliveryAddress),
      deliveryLandmark: text(dto.deliveryLandmark),
      ...money,
      total,
      advanceRequired,
      paymentStatus: paymentStatusOf(order.paidAmount, total, advanceRequired),
      specialInstructions: text(dto.specialInstructions),
      internalNotes: text(dto.internalNotes),
    };
    const done = await this.prisma.bakeryCakeOrder.updateMany({ where: { id, tenantId: user.tenantId, updatedAt: order.updatedAt }, data });
    if (!done.count) throw new ConflictException('Order abhi kisi aur ne badla — safha taaza kar ke dobara save karein');
    return this.mustFind(user, id);
  }

  /* ───────────────────────── reading ───────────────────────── */

  /** Plain list kept for older screens; `open=true` returns every order still to deliver. */
  async list(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; occasion?: string; deliveryType?: string; from?: string; to?: string; search?: string; customerId?: string; open?: string }) {
    const clock = await shopClock(this.tz, user.tenantId);
    const range = clock.range(params.from, params.to)
      ?? (params.from || params.to ? { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } : undefined);
    const open = params.open === 'true';
    return this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        AND: [scope.whereLoose, this.searchWhere(params.search)],
        ...(params.status && { status: params.status as BakeryOrderStatus }),
        ...(open && !params.status && { status: { notIn: [...CLOSED_ORDER] } }),
        ...(params.occasion && { occasion: params.occasion }),
        ...(params.deliveryType && { deliveryType: params.deliveryType as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(range && { neededBy: range }),
      },
      orderBy: open ? { neededBy: 'asc' } : { neededBy: 'desc' },
      take: open ? 500 : 200,
    });
  }

  /** The record page: one view (active, today, late…) at a time, with the counts of every view. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: CakeOrderQuery) {
    const clock = await shopClock(this.tz, user.tenantId);
    const view: CakeOrderView = VIEWS.includes(q.view as CakeOrderView) ? (q.view as CakeOrderView) : 'active';
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const range = clock.range(q.from, q.to);
    const base: Prisma.BakeryCakeOrderWhereInput = {
      tenantId: user.tenantId,
      AND: [scope.whereLoose, this.searchWhere(q.search)],
      ...(q.deliveryType && { deliveryType: q.deliveryType as never }),
      ...(q.occasion && { occasion: q.occasion }),
      ...(range && { neededBy: range }),
    };

    const open = await this.prisma.bakeryCakeOrder.findMany({
      where: { ...base, status: { notIn: [...CLOSED_ORDER] } },
      orderBy: { neededBy: 'asc' },
      take: 2000,
    });
    const today = clock.today();
    const tomorrow = { gte: today.lt, lt: new Date(today.lt.getTime() + DAY_MS) };
    const now = Date.now();
    const inRange = (d: Date, r: { gte: Date; lt: Date }) => d >= r.gte && d < r.lt;
    const views: Record<Exclude<CakeOrderView, 'done' | 'all'>, typeof open> = {
      active: open,
      today: open.filter((o) => inRange(o.neededBy, today)),
      tomorrow: open.filter((o) => inRange(o.neededBy, tomorrow)),
      late: open.filter((o) => o.neededBy.getTime() < now),
      ready: open.filter((o) => READY.includes(o.status)),
      unpaid: open.filter((o) => due(o) > 0.5),
    };
    const closedWhere: Prisma.BakeryCakeOrderWhereInput = { ...base, status: { in: [...CLOSED_ORDER] } };
    const [doneCount, allCount] = await Promise.all([
      this.prisma.bakeryCakeOrder.count({ where: closedWhere }),
      this.prisma.bakeryCakeOrder.count({ where: base }),
    ]);
    const counts = {
      active: open.length, today: views.today.length, tomorrow: views.tomorrow.length, late: views.late.length,
      ready: views.ready.length, unpaid: views.unpaid.length, done: doneCount, all: allCount,
    };

    let items: typeof open;
    let total: number;
    if (view === 'done' || view === 'all') {
      const orderBy: Prisma.BakeryCakeOrderOrderByWithRelationInput = q.sort === 'amount' ? { total: 'desc' } : q.sort === 'recent' ? { createdAt: 'desc' } : { neededBy: 'desc' };
      [items, total] = await Promise.all([
        this.prisma.bakeryCakeOrder.findMany({ where: view === 'done' ? closedWhere : base, orderBy, skip: (page - 1) * limit, take: limit }),
        Promise.resolve(view === 'done' ? doneCount : allCount),
      ]);
    } else {
      const list = [...views[view]];
      if (q.sort === 'amount') list.sort((a, b) => b.total - a.total);
      else if (q.sort === 'recent') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      total = list.length;
      items = list.slice((page - 1) * limit, page * limit);
    }

    // Money of the whole open view (not only this page); closed views show none.
    const shown = view === 'done' || view === 'all' ? null : views[view];
    return {
      items, total, page, pages: Math.max(Math.ceil(total / limit), 1), counts,
      totals: shown ? { value: r2(shown.reduce((s, o) => s + o.total, 0)), due: r2(shown.reduce((s, o) => s + due(o), 0)) } : null,
    };
  }

  /** Headline numbers for open orders, and analytics for a period of due dates (this month by default). */
  async summary(user: AuthenticatedUser, scope: ShopScope, from?: string, to?: string) {
    const clock = await shopClock(this.tz, user.tenantId);
    const todayKey = clock.keyOf(new Date());
    const period = clock.range(from, to) ?? clock.range(`${todayKey.slice(0, 7)}-01`, todayKey)!;
    const scoped: Prisma.BakeryCakeOrderWhereInput = { tenantId: user.tenantId, ...scope.whereLoose };

    const [open, rows] = await Promise.all([
      this.prisma.bakeryCakeOrder.findMany({
        where: { ...scoped, status: { notIn: [...CLOSED_ORDER] } },
        select: { id: true, status: true, neededBy: true, total: true, paidAmount: true, advanceRequired: true },
        take: 2000,
      }),
      this.prisma.bakeryCakeOrder.findMany({
        where: { ...scoped, neededBy: { gte: period.gte, lt: period.lt } },
        select: {
          id: true, status: true, neededBy: true, total: true, paidAmount: true, occasion: true, flavor: true, size: true,
          deliveryType: true, customerRating: true, createdAt: true, deliveredAt: true,
        },
        take: 5000,
      }),
    ]);

    const today = clock.today();
    const tomorrow = { gte: today.lt, lt: new Date(today.lt.getTime() + DAY_MS) };
    const now = Date.now();
    const live = rows.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const delivered = rows.filter((o) => o.status === 'DELIVERED');
    const rated = rows.filter((o) => num(o.customerRating) > 0);

    const bucket = <K extends string>(list: typeof rows, key: (o: (typeof rows)[number]) => K | null | undefined) => {
      const m = new Map<K, { key: K; count: number; value: number }>();
      for (const o of list) {
        const k = key(o);
        if (!k) continue;
        const e = m.get(k) ?? { key: k, count: 0, value: 0 };
        e.count += 1; e.value = r2(e.value + o.total);
        m.set(k, e);
      }
      return [...m.values()].sort((a, b) => b.count - a.count);
    };

    const days = Math.round((period.lt.getTime() - period.gte.getTime()) / DAY_MS);
    const byDay = bucket(live, (o) => (days > 92 ? clock.keyOf(o.neededBy).slice(0, 7) : clock.keyOf(o.neededBy))).sort((a, b) => a.key.localeCompare(b.key));
    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const o of live) byHour[hourInTz(o.neededBy, clock.zone)].count += 1;

    return {
      period: { from: clock.keyOf(period.gte), to: clock.keyOf(new Date(period.lt.getTime() - 1)), grouping: days > 92 ? 'month' : 'day' },
      open: {
        count: open.length,
        value: r2(open.reduce((s, o) => s + o.total, 0)),
        due: r2(open.reduce((s, o) => s + due(o), 0)),
        today: open.filter((o) => o.neededBy >= today.gte && o.neededBy < today.lt).length,
        tomorrow: open.filter((o) => o.neededBy >= tomorrow.gte && o.neededBy < tomorrow.lt).length,
        late: open.filter((o) => o.neededBy.getTime() < now).length,
        ready: open.filter((o) => READY.includes(o.status)).length,
        unpaid: open.filter((o) => due(o) > 0.5).length,
        advanceShort: open.filter((o) => !['DRAFT', 'QUOTED'].includes(o.status) && num(o.paidAmount) + 0.5 < num(o.advanceRequired)).length,
      },
      totals: {
        orders: live.length,
        value: r2(live.reduce((s, o) => s + o.total, 0)),
        collected: r2(live.reduce((s, o) => s + num(o.paidAmount), 0)),
        delivered: delivered.length,
        deliveredValue: r2(delivered.reduce((s, o) => s + o.total, 0)),
        cancelled: rows.length - live.length,
        avgOrder: live.length ? r2(live.reduce((s, o) => s + o.total, 0) / live.length) : 0,
        avgRating: rated.length ? Math.round((rated.reduce((s, o) => s + num(o.customerRating), 0) / rated.length) * 10) / 10 : null,
        rated: rated.length,
      },
      byDay,
      byHour,
      byStatus: bucket(rows, (o) => o.status),
      byOccasion: bucket(live, (o) => o.occasion),
      byFlavor: bucket(live, (o) => o.flavor),
      bySize: bucket(live, (o) => o.size),
      byDelivery: bucket(live, (o) => o.deliveryType),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    return this.mustFind(user, id);
  }

  /** The bill made when the order was handed over, found by the order note it carries. */
  async bill(user: AuthenticatedUser, id: string) {
    const order = await this.mustFind(user, id);
    return findOrderBill(this.prisma, user.tenantId, order.orderNumber);
  }

  /* ───────────────────────── work steps ───────────────────────── */

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateCakeOrderStatusDto) {
    const order = await this.mustFind(user, id);
    if (order.status === dto.status) return order;
    if (order.status === 'DELIVERED' && dto.status !== 'REFUNDED') throw new BadRequestException('Order de diya ja chuka — halat wapas nahi badli ja sakti');
    if (order.status === 'CANCELLED' && dto.status !== 'CONFIRMED') throw new BadRequestException('Cancel order ko pehle "Pakka" karein');

    const patch: Prisma.BakeryCakeOrderUpdateManyMutationInput = { status: dto.status };
    const now = new Date();
    if (dto.status === 'CONFIRMED') { patch.confirmedAt = order.confirmedAt ?? now; patch.cancelledAt = null; patch.cancellationReason = null; }
    if ((dto.status === 'IN_PRODUCTION' || dto.status === 'BAKING') && !order.startedAt) patch.startedAt = now;
    if (dto.status === 'READY') patch.completedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason?.trim() || null;
    }
    const done = await this.prisma.bakeryCakeOrder.updateMany({ where: { id, tenantId: user.tenantId, status: order.status }, data: patch });
    if (!done.count) throw new ConflictException('Halat abhi kisi aur ne badli — safha taaza karein');
    return this.mustFind(user, id);
  }

  /**
   * Records money received on the order. Before delivery it counts as
   * advance; once the advance asked for is in, an order that was only
   * booked moves to "advance received". `expectedPaid` makes a repeated
   * request fail instead of counting the money twice.
   */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, expectedPaid?: number) {
    const value = r2(positive(amount, 'Rakam likhein'));
    const order = await this.mustFind(user, id);
    if ((CLOSED_ORDER as readonly string[]).includes(order.status)) {
      throw new BadRequestException(order.status === 'DELIVERED' ? 'Order de diya ja chuka — baqi paisa customer ke khate se lein' : 'Cancel order par paisa nahi liya ja sakta');
    }
    if (expectedPaid !== undefined && Math.abs(num(expectedPaid) - order.paidAmount) > 0.005) {
      throw new ConflictException('Yeh paisa pehle hi darj ho chuka hai — safha taaza karein');
    }
    const paid = r2(order.paidAmount + value);
    if (paid > order.total + 0.005) throw new BadRequestException(`Baqi sirf ${due(order)} hai`);

    const status = BEFORE_WORK.includes(order.status) && paid >= order.advanceRequired && order.advanceRequired > 0 ? 'DEPOSIT_PAID' : order.status;
    const done = await this.prisma.bakeryCakeOrder.updateMany({
      where: { id, tenantId: user.tenantId, paidAmount: order.paidAmount, status: order.status },
      data: {
        paidAmount: paid,
        advancePaid: r2(order.advancePaid + value),
        paymentStatus: paymentStatusOf(paid, order.total, order.advanceRequired),
        status,
        ...(status !== order.status && { confirmedAt: order.confirmedAt ?? new Date() }),
      },
    });
    if (!done.count) throw new ConflictException('Order abhi badla gaya — safha taaza kar ke dobara koshish karein');
    return this.mustFind(user, id);
  }

  async assignBaker(user: AuthenticatedUser, id: string, bakerId: string, decoratorId?: string) {
    await this.mustFind(user, id);
    await this.prisma.bakeryCakeOrder.updateMany({ where: { id, tenantId: user.tenantId }, data: { assignedBakerId: bakerId, assignedDecoratorId: decoratorId ?? null } });
    return this.mustFind(user, id);
  }

  async addRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string, photoUrls?: string[]) {
    await this.mustFind(user, id);
    await this.prisma.bakeryCakeOrder.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { customerRating: Math.min(Math.max(Math.round(rating), 1), 5), customerFeedback: feedback?.trim() || null, finalPhotoUrls: photoUrls ?? [] },
    });
    return this.mustFind(user, id);
  }

  async upcoming(user: AuthenticatedUser, scope: ShopScope, days = 7) {
    const span = Math.min(Math.max(Number(days) || 7, 1), 90);
    return this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.whereLoose,
        status: { notIn: [...CLOSED_ORDER] },
        neededBy: { gte: new Date(), lte: new Date(Date.now() + span * DAY_MS) },
      },
      orderBy: { neededBy: 'asc' },
      take: 50,
    });
  }

  async calendar(user: AuthenticatedUser, scope: ShopScope, from: string, to: string) {
    const clock = await shopClock(this.tz, user.tenantId);
    const range = clock.range(from, to) ?? { gte: dateOrThrow(from, 'Tareekh theek nahi'), lt: dateOrThrow(to, 'Tareekh theek nahi') };
    return this.prisma.bakeryCakeOrder.findMany({
      where: { tenantId: user.tenantId, ...scope.whereLoose, status: { notIn: ['CANCELLED', 'REFUNDED'] }, neededBy: range },
      orderBy: { neededBy: 'asc' },
      take: 1000,
    });
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private async mustFind(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.bakeryCakeOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order nahi mila');
    return order;
  }

  private searchWhere(search?: string): Prisma.BakeryCakeOrderWhereInput {
    const s = search?.trim();
    if (!s) return {};
    return {
      OR: [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerPhone: { contains: s } },
        { celebrantName: { contains: s, mode: 'insensitive' } },
        { messageOnCake: { contains: s, mode: 'insensitive' } },
        { productName: { contains: s, mode: 'insensitive' } },
      ],
    };
  }
}

/** The sale made for an order (its lines carry the note "Order <number>"); null when not billed. */
export async function findOrderBill(prisma: PrismaService, tenantId: string, orderNumber: string) {
  const line = await prisma.saleItem.findFirst({
    where: { note: `Order ${orderNumber}`, sale: { tenantId, status: { not: 'VOIDED' } } },
    orderBy: { sale: { soldAt: 'desc' } },
    select: { sale: { select: { id: true, saleNumber: true, total: true, paidAmount: true, soldAt: true, status: true } } },
  });
  return line?.sale ?? null;
}
