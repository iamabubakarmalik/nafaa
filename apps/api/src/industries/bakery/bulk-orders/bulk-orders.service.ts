/**
 * Bulk orders (weddings, offices, schools): quote, booking with advance,
 * the work steps, payments, the paged record with counts, period analytics
 * and the bill made at delivery. Money received changes only through
 * payments; editing an order never touches it.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BakeryOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CLOSED_ORDER, DAY_MS, positive, r2, r3, shopClock, withNextNumber } from '../bakery-common';
import { findOrderBill } from '../cake-orders/cake-orders.service';

type Body = Record<string, unknown>;
type BulkView = 'active' | 'week' | 'late' | 'unpaid' | 'noAdvance' | 'done' | 'all';

interface BulkLine { productId?: string | null; name: string; qty: number; rate: number; unit?: string | null; total: number }

const VIEWS: BulkView[] = ['active', 'week', 'late', 'unpaid', 'noAdvance', 'done', 'all'];
/** Booked orders: the advance is expected and the goods have to be made. */
const COMMITTED: BakeryOrderStatus[] = ['CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK', 'READY', 'OUT_FOR_DELIVERY'];
const ALLOWED: BakeryOrderStatus[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const price = (o: { finalPrice: number | null; quotedPrice: number }) => o.finalPrice ?? o.quotedPrice;
const due = (o: { finalPrice: number | null; quotedPrice: number; paidAmount: number }) => Math.max(r2(price(o) - o.paidAmount), 0);

function paymentStatusOf(paid: number, total: number) {
  if (paid <= 0) return 'QUOTED';
  return paid >= total - 0.005 ? 'PAID' : 'PARTIALLY_PAID';
}

@Injectable()
export class BulkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async create(user: AuthenticatedUser, dto: Body) {
    const organizationName = str(dto?.organizationName);
    const contactPhone = str(dto?.contactPhone);
    if (!organizationName) throw new BadRequestException('Kis ka order hai — naam likhein');
    if (!contactPhone) throw new BadRequestException('Phone number likhein');
    const eventDate = this.date(dto.eventDate, 'Event ki tareekh chunein');
    const items = await this.lines(user.tenantId, dto.items);
    const linesTotal = r2(items.reduce((s, l) => s + l.total, 0));
    const quotedPrice = r2(Number(dto.quotedPrice) > 0 ? Number(dto.quotedPrice) : linesTotal);
    const finalPrice = Number(dto.finalPrice) > 0 ? r2(Number(dto.finalPrice)) : null;
    const total = finalPrice ?? quotedPrice;
    const advance = r2(Math.max(Number(dto.advancePaid) || 0, 0));
    if (advance > total + 0.005) throw new BadRequestException('Advance kul rakam se zyada nahi ho sakta');

    const twin = await this.prisma.bakeryBulkOrder.findFirst({
      where: { tenantId: user.tenantId, createdById: user.id, contactPhone, eventDate, quotedPrice, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (twin) return twin;

    const asked = typeof dto.status === 'string' && ['DRAFT', 'QUOTED', 'CONFIRMED'].includes(dto.status) ? (dto.status as BakeryOrderStatus) : null;
    const status: BakeryOrderStatus = advance > 0 ? 'CONFIRMED' : asked ?? 'DRAFT';
    const clock = await shopClock(this.tz, user.tenantId);
    const customerId = str(dto.customerId)
      ? (await this.prisma.customer.findFirst({ where: { id: String(dto.customerId), tenantId: user.tenantId }, select: { id: true } }))?.id ?? null
      : null;

    return withNextNumber(
      async (prefix) => (await this.prisma.bakeryBulkOrder.findFirst({
        where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' }, select: { orderNumber: true },
      }))?.orderNumber,
      `BULK-${clock.year()}-`, 4,
      (orderNumber) => this.prisma.bakeryBulkOrder.create({
        data: {
          tenantId: user.tenantId,
          orderNumber,
          customerId,
          organizationName,
          contactPerson: str(dto.contactPerson),
          contactPhone,
          contactEmail: str(dto.contactEmail),
          orderType: str(dto.orderType) ?? 'OTHER',
          eventDate,
          eventTime: str(dto.eventTime),
          venue: str(dto.venue),
          totalGuests: Number(dto.totalGuests) > 0 ? Math.round(Number(dto.totalGuests)) : null,
          totalItems: Math.round(items.reduce((s, l) => s + l.qty, 0)),
          items: items as unknown as Prisma.InputJsonValue,
          quotedPrice,
          finalPrice,
          advancePaid: advance,
          paidAmount: advance,
          paymentStatus: paymentStatusOf(advance, total),
          status,
          requiresDelivery: dto.requiresDelivery === undefined ? true : !!dto.requiresDelivery,
          deliveryAddress: str(dto.deliveryAddress),
          requiresSetup: !!dto.requiresSetup,
          setupTime: str(dto.setupTime),
          specialInstructions: str(dto.specialInstructions),
          createdById: user.id,
        },
      }),
    );
  }

  /** Plain list kept for older screens; `open=true` returns every order still to deliver. */
  async list(user: AuthenticatedUser, params: { status?: string; from?: string; to?: string; search?: string; open?: string }) {
    const clock = await shopClock(this.tz, user.tenantId);
    const range = clock.range(params.from, params.to)
      ?? (params.from || params.to ? { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } : undefined);
    const open = params.open === 'true';
    return this.prisma.bakeryBulkOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...this.searchWhere(params.search),
        ...(params.status && { status: params.status as BakeryOrderStatus }),
        ...(open && !params.status && { status: { notIn: [...CLOSED_ORDER] } }),
        ...(range && { eventDate: range }),
      },
      orderBy: open ? { eventDate: 'asc' } : { eventDate: 'desc' },
      take: open ? 500 : 200,
    });
  }

  async page(user: AuthenticatedUser, q: Record<string, string | undefined>) {
    const clock = await shopClock(this.tz, user.tenantId);
    const view: BulkView = VIEWS.includes(q.view as BulkView) ? (q.view as BulkView) : 'active';
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const range = clock.range(q.from, q.to);
    const base: Prisma.BakeryBulkOrderWhereInput = {
      tenantId: user.tenantId,
      ...this.searchWhere(q.search),
      ...(q.orderType && { orderType: q.orderType }),
      ...(range && { eventDate: range }),
    };
    const open = await this.prisma.bakeryBulkOrder.findMany({ where: { ...base, status: { notIn: [...CLOSED_ORDER] } }, orderBy: { eventDate: 'asc' }, take: 2000 });
    const now = Date.now();
    const views: Record<Exclude<BulkView, 'done' | 'all'>, typeof open> = {
      active: open,
      week: open.filter((o) => o.eventDate.getTime() >= now && o.eventDate.getTime() <= now + 7 * DAY_MS),
      late: open.filter((o) => o.eventDate.getTime() < now),
      unpaid: open.filter((o) => due(o) > 0.5),
      noAdvance: open.filter((o) => COMMITTED.includes(o.status) && o.paidAmount <= 0),
    };
    const closedWhere: Prisma.BakeryBulkOrderWhereInput = { ...base, status: { in: [...CLOSED_ORDER] } };
    const [doneCount, allCount] = await Promise.all([
      this.prisma.bakeryBulkOrder.count({ where: closedWhere }),
      this.prisma.bakeryBulkOrder.count({ where: base }),
    ]);
    let items: typeof open;
    let total: number;
    if (view === 'done' || view === 'all') {
      total = view === 'done' ? doneCount : allCount;
      items = await this.prisma.bakeryBulkOrder.findMany({
        where: view === 'done' ? closedWhere : base,
        orderBy: q.sort === 'amount' ? { quotedPrice: 'desc' } : q.sort === 'recent' ? { createdAt: 'desc' } : { eventDate: 'desc' },
        skip: (page - 1) * limit, take: limit,
      });
    } else {
      const list = [...views[view]];
      if (q.sort === 'amount') list.sort((a, b) => price(b) - price(a));
      else if (q.sort === 'recent') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      total = list.length;
      items = list.slice((page - 1) * limit, page * limit);
    }
    const shown = view === 'done' || view === 'all' ? null : views[view];
    return {
      items, total, page, pages: Math.max(Math.ceil(total / limit), 1),
      counts: { active: open.length, week: views.week.length, late: views.late.length, unpaid: views.unpaid.length, noAdvance: views.noAdvance.length, done: doneCount, all: allCount },
      totals: shown ? { value: r2(shown.reduce((s, o) => s + price(o), 0)), due: r2(shown.reduce((s, o) => s + due(o), 0)) } : null,
    };
  }

  /** Open-order numbers and analytics for a period of event dates (this year by default). */
  async summary(user: AuthenticatedUser, from?: string, to?: string) {
    const clock = await shopClock(this.tz, user.tenantId);
    const todayKey = clock.keyOf(new Date());
    const period = clock.range(from, to) ?? clock.range(`${todayKey.slice(0, 4)}-01-01`, `${todayKey.slice(0, 4)}-12-31`)!;
    const [open, rows] = await Promise.all([
      this.prisma.bakeryBulkOrder.findMany({ where: { tenantId: user.tenantId, status: { notIn: [...CLOSED_ORDER] } }, take: 2000 }),
      this.prisma.bakeryBulkOrder.findMany({ where: { tenantId: user.tenantId, eventDate: { gte: period.gte, lt: period.lt } }, take: 5000 }),
    ]);
    const now = Date.now();
    const live = rows.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const delivered = rows.filter((o) => o.status === 'DELIVERED');
    const group = (list: typeof rows, key: (o: (typeof rows)[number]) => string) => {
      const m = new Map<string, { key: string; count: number; value: number; guests: number }>();
      for (const o of list) {
        const k = key(o);
        const e = m.get(k) ?? { key: k, count: 0, value: 0, guests: 0 };
        e.count += 1; e.value = r2(e.value + price(o)); e.guests += o.totalGuests ?? 0;
        m.set(k, e);
      }
      return [...m.values()];
    };
    const items = new Map<string, { key: string; qty: number; value: number }>();
    for (const o of live) {
      for (const l of Array.isArray(o.items) ? (o.items as Array<Record<string, unknown>>) : []) {
        const name = String(l.name ?? l.productName ?? 'Cheez');
        const e = items.get(name) ?? { key: name, qty: 0, value: 0 };
        e.qty = r3(e.qty + (Number(l.qty ?? l.quantity) || 0));
        e.value = r2(e.value + (Number(l.qty ?? l.quantity) || 0) * (Number(l.rate ?? l.price) || 0));
        items.set(name, e);
      }
    }
    return {
      period: { from: clock.keyOf(period.gte), to: clock.keyOf(new Date(period.lt.getTime() - 1)) },
      open: {
        count: open.length,
        value: r2(open.reduce((s, o) => s + price(o), 0)),
        due: r2(open.reduce((s, o) => s + due(o), 0)),
        week: open.filter((o) => o.eventDate.getTime() >= now && o.eventDate.getTime() <= now + 7 * DAY_MS).length,
        late: open.filter((o) => o.eventDate.getTime() < now).length,
        noAdvance: open.filter((o) => COMMITTED.includes(o.status) && o.paidAmount <= 0).length,
      },
      totals: {
        orders: live.length,
        value: r2(live.reduce((s, o) => s + price(o), 0)),
        collected: r2(live.reduce((s, o) => s + o.paidAmount, 0)),
        delivered: delivered.length,
        avgOrder: delivered.length ? r2(delivered.reduce((s, o) => s + price(o), 0) / delivered.length) : 0,
        guests: live.reduce((s, o) => s + (o.totalGuests ?? 0), 0),
        cancelled: rows.length - live.length,
      },
      byMonth: group(live, (o) => clock.keyOf(o.eventDate).slice(0, 7)).sort((a, b) => a.key.localeCompare(b.key)),
      byType: group(live, (o) => o.orderType || 'OTHER').sort((a, b) => b.value - a.value),
      byStatus: group(rows, (o) => o.status).sort((a, b) => b.count - a.count),
      topItems: [...items.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    return this.mustFind(user, id);
  }

  async bill(user: AuthenticatedUser, id: string) {
    const o = await this.mustFind(user, id);
    return findOrderBill(this.prisma, user.tenantId, o.orderNumber);
  }

  /** Changes the details of an open order. Status and money received are left alone. */
  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const o = await this.mustFind(user, id);
    if ((CLOSED_ORDER as readonly string[]).includes(o.status)) throw new BadRequestException('Mukammal ya cancel order badla nahi ja sakta');
    const data: Prisma.BakeryBulkOrderUpdateManyMutationInput = {};
    for (const k of ['contactPerson', 'contactEmail', 'eventTime', 'venue', 'deliveryAddress', 'setupTime', 'specialInstructions'] as const) {
      if (dto?.[k] !== undefined) data[k] = str(dto[k]);
    }
    if (dto?.organizationName !== undefined) data.organizationName = str(dto.organizationName) ?? o.organizationName;
    if (dto?.contactPhone !== undefined) data.contactPhone = str(dto.contactPhone) ?? o.contactPhone;
    if (dto?.orderType !== undefined) data.orderType = str(dto.orderType) ?? o.orderType;
    if (dto?.eventDate !== undefined) data.eventDate = this.date(dto.eventDate, 'Event ki tareekh theek nahi');
    if (dto?.totalGuests !== undefined) data.totalGuests = Number(dto.totalGuests) > 0 ? Math.round(Number(dto.totalGuests)) : null;
    if (dto?.requiresDelivery !== undefined) data.requiresDelivery = !!dto.requiresDelivery;
    if (dto?.requiresSetup !== undefined) data.requiresSetup = !!dto.requiresSetup;
    if (dto?.items !== undefined) {
      const items = await this.lines(user.tenantId, dto.items);
      data.items = items as unknown as Prisma.InputJsonValue;
      data.totalItems = Math.round(items.reduce((s, l) => s + l.qty, 0));
    }
    if (dto?.quotedPrice !== undefined) data.quotedPrice = r2(Math.max(Number(dto.quotedPrice) || 0, 0));
    if (dto?.finalPrice !== undefined) data.finalPrice = Number(dto.finalPrice) > 0 ? r2(Number(dto.finalPrice)) : null;
    const newPrice = (data.finalPrice !== undefined ? (data.finalPrice as number | null) : o.finalPrice) ?? ((data.quotedPrice as number | undefined) ?? o.quotedPrice);
    if (newPrice + 0.005 < o.paidAmount) throw new BadRequestException(`${o.paidAmount} pehle hi mil chuka hai — kul rakam is se kam nahi ho sakti`);
    data.paymentStatus = paymentStatusOf(o.paidAmount, newPrice);
    const done = await this.prisma.bakeryBulkOrder.updateMany({ where: { id, tenantId: user.tenantId, updatedAt: o.updatedAt }, data });
    if (!done.count) throw new ConflictException('Order abhi kisi aur ne badla — safha taaza kar ke dobara save karein');
    return this.mustFind(user, id);
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    if (!ALLOWED.includes(status as BakeryOrderStatus)) throw new BadRequestException('Yeh halat nahi chal sakti');
    const o = await this.mustFind(user, id);
    if (o.status === status) return o;
    if (o.status === 'DELIVERED') throw new BadRequestException('Order de diya ja chuka — halat wapas nahi badli ja sakti');
    if (o.status === 'CANCELLED' && status !== 'CONFIRMED') throw new BadRequestException('Cancel order ko pehle "Pakka" karein');
    const done = await this.prisma.bakeryBulkOrder.updateMany({ where: { id, tenantId: user.tenantId, status: o.status }, data: { status: status as BakeryOrderStatus } });
    if (!done.count) throw new ConflictException('Halat abhi kisi aur ne badli — safha taaza karein');
    return this.mustFind(user, id);
  }

  /** Money received. A quoted order becomes booked once money comes in; `expectedPaid` stops a repeated request. */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, expectedPaid?: number) {
    const value = r2(positive(amount, 'Rakam likhein'));
    const o = await this.mustFind(user, id);
    if ((CLOSED_ORDER as readonly string[]).includes(o.status)) {
      throw new BadRequestException(o.status === 'DELIVERED' ? 'Order de diya ja chuka — baqi paisa customer ke khate se lein' : 'Cancel order par paisa nahi liya ja sakta');
    }
    if (expectedPaid !== undefined && Math.abs(Number(expectedPaid) - o.paidAmount) > 0.005) throw new ConflictException('Yeh paisa pehle hi darj ho chuka hai — safha taaza karein');
    const total = price(o);
    const paid = r2(o.paidAmount + value);
    if (paid > total + 0.005) throw new BadRequestException(`Baqi sirf ${due(o)} hai`);
    const status: BakeryOrderStatus = o.status === 'DRAFT' || o.status === 'QUOTED' ? 'CONFIRMED' : o.status;
    const done = await this.prisma.bakeryBulkOrder.updateMany({
      where: { id, tenantId: user.tenantId, paidAmount: o.paidAmount, status: o.status },
      data: { paidAmount: paid, advancePaid: r2(o.advancePaid + value), paymentStatus: paymentStatusOf(paid, total), status },
    });
    if (!done.count) throw new ConflictException('Order abhi badla gaya — safha taaza kar ke dobara koshish karein');
    return this.mustFind(user, id);
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private date(v: unknown, message: string) {
    const d = typeof v === 'string' || v instanceof Date ? new Date(v) : null;
    if (!d || Number.isNaN(d.getTime())) throw new BadRequestException(message);
    return d;
  }

  private async lines(tenantId: string, raw: unknown): Promise<BulkLine[]> {
    if (!Array.isArray(raw) || !raw.length) throw new BadRequestException('Kam se kam ek cheez daalein');
    const ids = [...new Set(raw.map((l) => (l as Body)?.productId).filter((x): x is string => typeof x === 'string' && !!x))];
    const known = ids.length
      ? new Set((await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } })).map((p) => p.id))
      : new Set<string>();
    return raw.map((item) => {
      const l = (item ?? {}) as Body;
      const name = str(l.name) ?? str(l.productName);
      if (!name) throw new BadRequestException('Har line ka naam likhein');
      const qty = Number(l.qty ?? l.quantity);
      const rate = Number(l.rate ?? l.price);
      if (!(qty > 0)) throw new BadRequestException(`"${name}" ki quantity likhein`);
      if (!(rate >= 0)) throw new BadRequestException(`"${name}" ka rate likhein`);
      const productId = typeof l.productId === 'string' && known.has(l.productId) ? l.productId : null;
      return { productId, name, qty: r3(qty), rate: r2(rate), unit: str(l.unit), total: r2(qty * rate) };
    });
  }

  private async mustFind(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.bakeryBulkOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    return o;
  }

  private searchWhere(search?: string): Prisma.BakeryBulkOrderWhereInput {
    const s = search?.trim();
    if (!s) return {};
    return {
      OR: [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { organizationName: { contains: s, mode: 'insensitive' } },
        { contactPerson: { contains: s, mode: 'insensitive' } },
        { contactPhone: { contains: s } },
        { venue: { contains: s, mode: 'insensitive' } },
      ],
    };
  }
}
