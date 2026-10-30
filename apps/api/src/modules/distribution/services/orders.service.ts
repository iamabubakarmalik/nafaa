/**
 * Sales orders: booked by a booker (or the office) for a retailer, priced on
 * the server from the customer's price list and the running schemes, then
 * approved and invoiced (see invoicing.service).
 *
 * Booking is idempotent on clientRef: the phone sends the same order again
 * after a lost reply and gets the first one back. Credit is only a warning
 * at booking; the PIN is asked at invoicing.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ORDER_STATUSES } from '../distribution.constants';
import { CancelOrdersDto, CreateOrderDto, ListOrdersDto, OrderLineDto, PreviewOrderDto, UpdateOrderDto } from '../dto/field.dto';
import { creditStatus, openDebts, type CreditStatus } from '../helpers/credit';
import { priceOrder, type PricedOrder } from '../helpers/pricing';
import { pricingFor, readSettings } from '../helpers/pricing-loader';
import { orderNeeds, releaseOrder } from '../helpers/reservation';
import {
  CUSTOMER_CARD, customerCards, dayRange, nextNumber, parseWhen, r2, r4, routeNames, shopNames, userNames,
} from '../distribution.support';

export interface CreditSnapshot {
  balance: number;
  creditLimit: number;
  creditDays: number | null;
  oldestDueAt: Date | null;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /* ───────────── credit ───────────── */

  /** Balance, limit, credit days and oldest unpaid credit for each customer. */
  async creditSnapshots(tenantId: string, customerIds: string[]): Promise<Map<string, CreditSnapshot>> {
    const ids = [...new Set(customerIds)];
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, balance: true, creditLimit: true, creditDays: true },
    });
    const owing = customers.filter((c) => c.balance > 0.005 && (c.creditDays ?? 0) > 0).map((c) => c.id);
    const ledger = owing.length
      ? await this.prisma.customerLedger.findMany({ where: { tenantId, customerId: { in: owing } }, select: { customerId: true, amount: true, createdAt: true } })
      : [];
    const byCustomer = new Map<string, Array<{ amount: number; createdAt: Date }>>();
    for (const l of ledger) byCustomer.set(l.customerId, [...(byCustomer.get(l.customerId) ?? []), l]);
    return new Map(customers.map((c) => [c.id, {
      balance: c.balance, creditLimit: c.creditLimit, creditDays: c.creditDays,
      oldestDueAt: byCustomer.has(c.id) ? openDebts(byCustomer.get(c.id)!)[0]?.at ?? null : null,
    }]));
  }

  creditOf(snap: CreditSnapshot | undefined, orderTotal: number): CreditStatus {
    if (!snap) return { overLimit: false, overdue: false, dueDays: null, message: null };
    return creditStatus({ ...snap, orderTotal });
  }

  /* ───────────── pricing ───────────── */

  private async price(user: AuthenticatedUser, customerId: string, items: OrderLineDto[]): Promise<{ priced: PricedOrder; priceListId: string | null }> {
    const { list, tier, schemes, catalog } = await pricingFor(this.prisma, user.tenantId, { customerId, productIds: items.map((i) => i.productId) });
    const priced = priceOrder(items, catalog, {
      list, tier, schemes, canOverride: hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_PRICE_OVERRIDE),
    });
    if (!priced.lines.length) throw new BadRequestException(priced.warnings[0] ?? 'Order me koi item nahi');
    return { priced, priceListId: list?.id ?? null };
  }

  private async activeCustomer(tenantId: string, customerId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: CUSTOMER_CARD });
    if (!c) throw new NotFoundException('Customer nahi mila');
    if (!c.isActive) throw new BadRequestException(`${c.name} band (inactive) hai`);
    return c;
  }

  /** Prices a cart and checks credit, saving nothing. */
  async preview(user: AuthenticatedUser, dto: PreviewOrderDto) {
    const customer = await this.activeCustomer(user.tenantId, dto.customerId);
    const { priced, priceListId } = await this.price(user, customer.id, dto.items);
    const settings = await readSettings(this.prisma, user.tenantId);
    const snap = (await this.creditSnapshots(user.tenantId, [customer.id])).get(customer.id);
    const credit = settings?.creditMode === 'OFF' ? null : this.creditOf(snap, priced.total);
    return { ...priced, priceListId, credit, customer };
  }

  /* ───────────── create ───────────── */

  /**
   * Books an order. With a clientRef already saved, returns that order with
   * `duplicate: true` and changes nothing.
   */
  async create(user: AuthenticatedUser, dto: CreateOrderDto): Promise<{ order: Awaited<ReturnType<OrdersService['detail']>>; duplicate: boolean; warnings: string[] }> {
    const tenantId = user.tenantId;
    const clientRef = dto.clientRef?.trim() || null;
    if (clientRef) {
      const seen = await this.prisma.salesOrder.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } }, select: { id: true } });
      if (seen) return { order: await this.detail(user, seen.id), duplicate: true, warnings: [] };
    }

    const customer = await this.activeCustomer(tenantId, dto.customerId);
    const manage = hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_ORDERS_MANAGE);
    let bookedById = user.id;
    if (dto.bookedById && dto.bookedById !== user.id) {
      if (!manage) throw new ForbiddenException('Doosre booker ke naam Order sirf manager laga sakta hai');
      const b = await this.prisma.user.findFirst({ where: { id: dto.bookedById, tenantId }, select: { id: true } });
      if (!b) throw new BadRequestException('Booker nahi mila');
      bookedById = b.id;
    }

    const settings = await readSettings(this.prisma, tenantId);
    const routeId = dto.routeId || customer.routeId || null;
    const route = routeId ? await this.prisma.distRoute.findFirst({ where: { id: routeId, tenantId }, select: { id: true, shopId: true } }) : null;
    if (routeId && !route) throw new BadRequestException('Route nahi mila');
    const shopId = await this.pickShop(tenantId, dto.shopId || route?.shopId || settings?.defaultShopId || null);

    const { priced, priceListId } = await this.price(user, customer.id, dto.items);
    const snap = (await this.creditSnapshots(tenantId, [customer.id])).get(customer.id);
    const credit = settings?.creditMode === 'OFF' ? null : this.creditOf(snap, priced.total);

    const now = new Date();
    const bookedAt = dto.bookedAt ? new Date(Math.min(new Date(dto.bookedAt).getTime(), now.getTime())) : now;
    const clock = await this.tz.clock(tenantId);

    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const orderNumber = await nextNumber(tx, tenantId, 'order');
        const order = await tx.salesOrder.create({
          data: {
            tenantId, orderNumber, clientRef, customerId: customer.id, routeId: route?.id ?? null, shopId,
            bookedById, priceListId, status: 'BOOKED',
            subtotal: priced.subtotal, schemeDiscount: priced.schemeDiscount, discount: priced.discount, total: priced.total,
            bookedAt, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, gpsAccuracy: dto.gpsAccuracy ?? null,
            deliveryDate: parseWhen(dto.deliveryDate, clock), note: dto.note?.trim() || null,
            creditWarning: credit?.message ?? null,
            items: { create: priced.lines.map((l, i) => this.itemRow(l, i)) },
          },
          select: { id: true },
        });
        return order.id;
      });
      return { order: await this.detail(user, id), duplicate: false, warnings: priced.warnings };
    } catch (e) {
      // Two copies of the same phone order raced; the other one won.
      if (clientRef && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const seen = await this.prisma.salesOrder.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } }, select: { id: true } });
        if (seen) return { order: await this.detail(user, seen.id), duplicate: true, warnings: [] };
      }
      throw e;
    }
  }

  private itemRow(l: PricedOrder['lines'][number], sortOrder: number) {
    return {
      productId: l.productId, variantId: l.variantId, unitId: l.unitId, unitName: l.unitName, conversionRate: l.conversionRate,
      qty: l.qty, baseQty: l.baseQty, price: l.price, schemeDiscount: l.schemeDiscount, discount: l.discount, total: l.total,
      schemeId: l.schemeId, schemeNote: l.schemeNote, freeBaseQty: l.freeBaseQty, freeProductId: l.freeProductId, sortOrder,
    };
  }

  private async pickShop(tenantId: string, shopId: string | null): Promise<string | null> {
    if (shopId) {
      const s = await this.prisma.shop.findFirst({ where: { id: shopId, tenantId, isActive: true }, select: { id: true } });
      if (!s) throw new BadRequestException('Godown / shop nahi mila ya band hai');
      return s.id;
    }
    // A business with one active shop or godown needs no choice.
    const shops = await this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true, type: true }, take: 5 });
    const stores = shops.filter((s) => s.type !== 'SHOP');
    if (stores.length === 1) return stores[0].id;
    return shops.length === 1 ? shops[0].id : null;
  }

  /* ───────────── edit and cancel ───────────── */

  /** Changes a booked order. A booker without orders.manage may change only their own. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateOrderDto) {
    const tenantId = user.tenantId;
    const order = await this.prisma.salesOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.status !== 'BOOKED') throw new BadRequestException(`Order ${order.orderNumber} ${order.status} hai — sirf BOOKED Order badal sakte hain`);
    const manage = hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_ORDERS_MANAGE);
    if (!manage && order.bookedById !== user.id) throw new ForbiddenException('Sirf apna Order badal sakte hain');

    const clock = await this.tz.clock(tenantId);
    const data: Prisma.SalesOrderUncheckedUpdateInput = {};
    let warnings: string[] = [];
    if (dto.shopId !== undefined) data.shopId = await this.pickShop(tenantId, dto.shopId || null);
    if (dto.deliveryDate !== undefined) data.deliveryDate = parseWhen(dto.deliveryDate, clock);
    if (dto.note !== undefined) data.note = dto.note?.trim() || null;

    await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const { priced, priceListId } = await this.price(user, order.customerId, dto.items);
        warnings = priced.warnings;
        const settings = await readSettings(tx, tenantId);
        const snap = (await this.creditSnapshots(tenantId, [order.customerId])).get(order.customerId);
        const credit = settings?.creditMode === 'OFF' ? null : this.creditOf(snap, priced.total);
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
        await tx.salesOrderItem.createMany({ data: priced.lines.map((l, i) => ({ ...this.itemRow(l, i), salesOrderId: id })) });
        Object.assign(data, {
          priceListId, subtotal: priced.subtotal, schemeDiscount: priced.schemeDiscount, discount: priced.discount, total: priced.total,
          creditWarning: credit?.message ?? null,
        });
      }
      // Only while still booked: approval may have started meanwhile.
      const done = await tx.salesOrder.updateMany({ where: { id, status: 'BOOKED' }, data: data as Prisma.SalesOrderUncheckedUpdateManyInput });
      if (!done.count) throw new BadRequestException('Order abhi approve ho gaya — badla nahi ja sakta');
    });
    return { order: await this.detail(user, id), warnings };
  }

  /** Cancels orders not yet invoiced. Invoiced goods come back through settlement instead. */
  async cancel(user: AuthenticatedUser, dto: CancelOrdersDto) {
    const tenantId = user.tenantId;
    const orders = await this.prisma.salesOrder.findMany({ where: { tenantId, id: { in: dto.ids } }, select: { id: true, orderNumber: true, status: true, reservation: true } });
    const results = [];
    for (const o of orders) {
      const done = await this.prisma.$transaction(async (tx) => {
        const res = await tx.salesOrder.updateMany({
          where: { id: o.id, status: { in: ['BOOKED', 'APPROVED'] } },
          data: { status: 'CANCELLED', cancelReason: dto.reason?.trim() || null, cancelledAt: new Date() },
        });
        // Godown stock held for it goes back on the shelf.
        if (res.count) await releaseOrder(tx, tenantId, o);
        return res;
      });
      results.push(done.count
        ? { id: o.id, orderNumber: o.orderNumber, ok: true, status: 'CANCELLED' }
        : { id: o.id, orderNumber: o.orderNumber, ok: false, status: o.status, error: `${o.status} Order cancel nahi ho sakta — Invoice ban chuki ho to settlement me return karein` });
    }
    for (const id of dto.ids) if (!orders.some((o) => o.id === id)) results.push({ id, orderNumber: null, ok: false, status: null, error: 'Order nahi mila' });
    return { results };
  }

  /**
   * Overbooking check for the desk: what the given orders (not yet invoiced)
   * need from each godown against the free stock there (stock less what other
   * orders and the counter hold). An order's own hold counts as free for it.
   */
  async stockCheck(user: AuthenticatedUser, ids: string[]) {
    const tenantId = user.tenantId;
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, id: { in: [...new Set(ids)] }, status: { in: ['BOOKED', 'APPROVED'] }, shopId: { not: null } },
      select: { id: true, orderNumber: true, shopId: true, reservation: true, items: { select: { productId: true, variantId: true, baseQty: true, freeBaseQty: true, freeProductId: true } } },
    });
    const need = new Map<string, { shopId: string; productId: string; variantId: string | null; need: number; ownHold: number; orders: string[] }>();
    for (const o of orders) {
      for (const n of orderNeeds(o.items).values()) {
        const k = `${o.shopId}:${n.productId}:${n.variantId ?? ''}`;
        const e = need.get(k) ?? { shopId: o.shopId!, productId: n.productId, variantId: n.variantId, need: 0, ownHold: 0, orders: [] };
        e.need = r4(e.need + n.qty);
        e.orders.push(o.id);
        need.set(k, e);
      }
      for (const h of (Array.isArray(o.reservation) ? (o.reservation as Array<{ shopId: string; productId: string; variantId: string | null; qty: number }>) : [])) {
        const e = need.get(`${h.shopId}:${h.productId}:${h.variantId ?? ''}`);
        if (e) e.ownHold = r4(e.ownHold + h.qty);
      }
    }
    const lines = [...need.values()];
    const [stock, products] = await Promise.all([
      lines.length
        ? this.prisma.shopStock.findMany({
          where: { tenantId, OR: lines.map((l) => ({ shopId: l.shopId, productId: l.productId, variantId: l.variantId })) },
          select: { shopId: true, productId: true, variantId: true, stock: true, reserved: true },
        })
        : [],
      this.prisma.product.findMany({ where: { tenantId, id: { in: [...new Set(lines.map((l) => l.productId))] } }, select: { id: true, name: true, unit: true } }),
    ]);
    const sMap = new Map(stock.map((s) => [`${s.shopId}:${s.productId}:${s.variantId ?? ''}`, s]));
    const pMap = new Map(products.map((p) => [p.id, p]));
    const out = lines.map((l) => {
      const s = sMap.get(`${l.shopId}:${l.productId}:${l.variantId ?? ''}`);
      const onHand = r4(Number(s?.stock ?? 0));
      const heldByOthers = r4(Math.max(0, Number(s?.reserved ?? 0) - l.ownHold));
      const free = r4(onHand - heldByOthers);
      return {
        shopId: l.shopId, productId: l.productId, variantId: l.variantId, name: pMap.get(l.productId)?.name ?? null, baseUnit: pMap.get(l.productId)?.unit ?? 'pcs',
        need: l.need, stock: onHand, reservedByOthers: heldByOthers, free, short: r4(Math.max(0, l.need - free)), orderIds: l.orders,
      };
    }).sort((a, b) => b.short - a.short);
    const shortOrders = new Set(out.filter((l) => l.short > 0).flatMap((l) => l.orderIds));
    return {
      lines: out,
      shortLines: out.filter((l) => l.short > 0).length,
      orders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, short: shortOrders.has(o.id), holding: Array.isArray(o.reservation) && o.reservation.length > 0 })),
    };
  }

  /* ───────────── read ───────────── */

  async list(user: AuthenticatedUser, q: ListOrdersDto, restrictToBooker?: string) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const statuses = (q.status ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => (ORDER_STATUSES as readonly string[]).includes(s));
    const where: Prisma.SalesOrderWhereInput = {
      tenantId,
      ...(statuses.length && { status: { in: statuses } }),
      ...(q.routeId && { routeId: q.routeId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.loadSheetId && { loadSheetId: q.loadSheetId }),
      ...(q.shopId && { shopId: q.shopId }),
      ...(q.unloaded && { loadSheetId: null }),
      ...((restrictToBooker ?? q.bookedById) && { bookedById: restrictToBooker ?? q.bookedById }),
    };
    if (q.from || q.to) {
      const r = dayRange(clock, q.from ?? q.to, q.to ?? q.from);
      where.bookedAt = { gte: r.gte, lt: r.lt };
    }
    const search = q.search?.trim();
    if (search) {
      const matches = await this.prisma.customer.findMany({
        where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { businessName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] },
        select: { id: true }, take: 500,
      });
      where.OR = [{ orderNumber: { contains: search, mode: 'insensitive' } }, { customerId: { in: matches.map((m) => m.id) } }];
    }
    const [total, rows, sums] = await Promise.all([
      this.prisma.salesOrder.count({ where }),
      this.prisma.salesOrder.findMany({
        where, orderBy: { bookedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.salesOrder.aggregate({ where, _sum: { total: true } }),
    ]);
    const [customers, users, routes, sales, sheets] = await Promise.all([
      customerCards(this.prisma, tenantId, rows.map((r) => r.customerId)),
      userNames(this.prisma, tenantId, rows.map((r) => r.bookedById)),
      routeNames(this.prisma, tenantId, rows.map((r) => r.routeId)),
      this.saleNumbers(tenantId, rows.map((r) => r.saleId)),
      this.sheetNumbers(tenantId, rows.map((r) => r.loadSheetId)),
    ]);
    return {
      total, page, limit, totalValue: r2(sums._sum.total ?? 0),
      orders: rows.map(({ _count, ...r }) => ({
        ...r,
        itemCount: _count.items,
        customer: customers.get(r.customerId) ?? null,
        bookedByName: users.get(r.bookedById) ?? null,
        routeName: r.routeId ? routes.get(r.routeId) ?? null : null,
        saleNumber: r.saleId ? sales.get(r.saleId) ?? null : null,
        loadSheetNumber: r.loadSheetId ? sheets.get(r.loadSheetId) ?? null : null,
      })),
    };
  }

  /** One order with its lines, names and current credit position. */
  async detail(user: AuthenticatedUser, id: string, restrictToBooker?: string) {
    const tenantId = user.tenantId;
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId, ...(restrictToBooker && { bookedById: restrictToBooker }) },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    const productIds = order.items.flatMap((i) => [i.productId, ...(i.freeProductId ? [i.freeProductId] : [])]);
    const [products, variants, customers, users, routes, shops, sales, sheets] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, unit: true, sku: true } }),
      this.prisma.productVariant.findMany({ where: { id: { in: order.items.map((i) => i.variantId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
      customerCards(this.prisma, tenantId, [order.customerId]),
      userNames(this.prisma, tenantId, [order.bookedById, order.approvedById]),
      routeNames(this.prisma, tenantId, [order.routeId]),
      shopNames(this.prisma, tenantId, [order.shopId]),
      this.saleNumbers(tenantId, [order.saleId]),
      this.sheetNumbers(tenantId, [order.loadSheetId]),
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const vMap = new Map(variants.map((v) => [v.id, v.name]));
    return {
      ...order,
      customer: customers.get(order.customerId) ?? null,
      bookedByName: users.get(order.bookedById) ?? null,
      approvedByName: order.approvedById ? users.get(order.approvedById) ?? null : null,
      routeName: order.routeId ? routes.get(order.routeId) ?? null : null,
      shopName: order.shopId ? shops.get(order.shopId) ?? null : null,
      saleNumber: order.saleId ? sales.get(order.saleId) ?? null : null,
      loadSheetNumber: order.loadSheetId ? sheets.get(order.loadSheetId) ?? null : null,
      items: order.items.map((i) => ({
        ...i,
        productName: pMap.get(i.productId)?.name ?? null,
        sku: pMap.get(i.productId)?.sku ?? null,
        baseUnit: pMap.get(i.productId)?.unit ?? 'pcs',
        variantName: i.variantId ? vMap.get(i.variantId) ?? null : null,
        freeProductName: i.freeProductId ? pMap.get(i.freeProductId)?.name ?? null : null,
      })),
    };
  }

  private async saleNumbers(tenantId: string, ids: Array<string | null>) {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map<string, string>();
    const rows = await this.prisma.sale.findMany({ where: { tenantId, id: { in: list } }, select: { id: true, saleNumber: true } });
    return new Map(rows.map((r) => [r.id, r.saleNumber]));
  }

  private async sheetNumbers(tenantId: string, ids: Array<string | null>) {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map<string, string>();
    const rows = await this.prisma.loadSheet.findMany({ where: { tenantId, id: { in: list } }, select: { id: true, number: true } });
    return new Map(rows.map((r) => [r.id, r.number]));
  }
}
