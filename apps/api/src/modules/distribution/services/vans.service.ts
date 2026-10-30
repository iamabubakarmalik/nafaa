/**
 * Van sales. A van is a WAREHOUSE-type Shop that carries stock on the route:
 *
 *   1. Load: a stock transfer from the van's godown, sent and received at
 *      once, so batches and cost follow the normal transfer rules.
 *   2. Sell: a spot invoice from the van. It is a normal sales order (priced
 *      by the customer's price list and schemes) invoiced through the sales
 *      path out of the van's stock and marked delivered; money taken is a
 *      field collection of the van day, counted at close.
 *   3. Close: the end-of-day count. For every item the van moved today:
 *      opening + loaded − sold + returns − written off = expected (the
 *      system stock); counted − expected is booked as a stock adjustment
 *      (short = loss, extra = gain), then what is left goes back to the
 *      godown by transfer. Cash expected vs handed in gives the short.
 *
 * One van day (DistVanSession) is open per van at a time.
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { refreshSettlements } from '../../../common/helpers/sale-settlement.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TransfersService } from '../../inventory/transfers/transfers.service';
import { StockAdjustmentsService } from '../../inventory/stock-adjustments/stock-adjustments.service';
import { SaveVanDto, UpdateVanDto, VanCloseDto, VanLoadDto, VanOpenDto, VanSellDto } from '../dto/phase2.dto';
import { splitPacks } from '../helpers/logistics';
import { countVariance, vanDayLines } from '../helpers/van-day';
import { loadCatalog } from '../helpers/pricing-loader';
import { assertUser, customerCards, postCollection, r2, r4, routeNames, shopNames, todayKey, userNames } from '../distribution.support';
import { OrdersService } from './orders.service';
import { InvoicingService } from './invoicing.service';
import { CollectionsService } from './collections.service';

type Van = Prisma.DistVanGetPayload<object>;
type Session = Prisma.DistVanSessionGetPayload<object>;

export interface VanLine {
  productId: string;
  variantId: string | null;
  name: string | null;
  baseUnit: string;
  opening: number;
  loaded: number;
  sold: number;
  returnsIn: number;
  writtenOff: number;
  other: number;
  expected: number;
  counted?: number;
  variance?: number;
  unloaded?: number;
  text?: string;
  cost?: number;
}

const k = (productId: string, variantId: string | null | undefined) => `${productId}:${variantId ?? ''}`;

@Injectable()
export class VansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly transfers: TransfersService,
    private readonly adjustments: StockAdjustmentsService,
    private readonly orders: OrdersService,
    private readonly invoicing: InvoicingService,
    private readonly collections: CollectionsService,
  ) {}

  private can(user: AuthenticatedUser, p: string) {
    return hasPermission(user.role, user.permissions, p as never);
  }

  /** Managers and office viewers see every van; a salesman only his own. */
  private seesAll(user: AuthenticatedUser) {
    return this.can(user, PERMISSIONS.DISTRIBUTION_VANS_MANAGE) || this.can(user, PERMISSIONS.DISTRIBUTION_ORDERS_VIEW);
  }

  private async van(user: AuthenticatedUser, id: string): Promise<Van> {
    const van = await this.prisma.distVan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!van) throw new NotFoundException('Van nahi mili');
    if (!this.seesAll(user) && van.salesmanId !== user.id) throw new ForbiddenException('Ye van aap ki nahi');
    return van;
  }

  private openSession(tenantId: string, vanId: string) {
    return this.prisma.distVanSession.findFirst({ where: { tenantId, vanId, status: 'OPEN' } });
  }

  /* ───────────── setup ───────────── */

  async create(user: AuthenticatedUser, dto: SaveVanDto) {
    const tenantId = user.tenantId;
    const name = dto.name.trim();
    if (await this.prisma.distVan.findFirst({ where: { tenantId, name }, select: { id: true } })) throw new ConflictException('Is naam ki van pehle se hai');
    const refs = await this.checkRefs(tenantId, dto);
    let shopName = `Van: ${name}`;
    if (await this.prisma.shop.findFirst({ where: { tenantId, name: shopName }, select: { id: true } })) shopName = `${shopName} (${dto.vehicleNo?.trim() || Date.now().toString().slice(-4)})`;
    const id = await this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({ data: { tenantId, name: shopName, type: 'WAREHOUSE', isActive: true }, select: { id: true } });
      const van = await tx.distVan.create({
        data: { tenantId, name, vehicleNo: dto.vehicleNo?.trim() || null, shopId: shop.id, ...refs, isActive: dto.isActive ?? true, note: dto.note?.trim() || null },
        select: { id: true },
      });
      return van.id;
    });
    return this.get(user, id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateVanDto) {
    const tenantId = user.tenantId;
    const van = await this.van(user, id);
    const refs = await this.checkRefs(tenantId, dto);
    const name = dto.name?.trim();
    if (name && name !== van.name && await this.prisma.distVan.findFirst({ where: { tenantId, name }, select: { id: true } })) throw new ConflictException('Is naam ki van pehle se hai');
    if (dto.isActive === false && await this.openSession(tenantId, id)) throw new BadRequestException('Van ka din khula hai — pehle close karein');
    await this.prisma.$transaction(async (tx) => {
      await tx.distVan.update({
        where: { id },
        data: {
          ...(name && { name }), ...(dto.vehicleNo !== undefined && { vehicleNo: dto.vehicleNo?.trim() || null }), ...refs,
          ...(dto.isActive !== undefined && { isActive: dto.isActive }), ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        },
      });
      if (name && name !== van.name) {
        const taken = await tx.shop.findFirst({ where: { tenantId, name: `Van: ${name}`, id: { not: van.shopId } }, select: { id: true } });
        if (!taken) await tx.shop.update({ where: { id: van.shopId }, data: { name: `Van: ${name}` } });
      }
      if (dto.isActive !== undefined) await tx.shop.update({ where: { id: van.shopId }, data: { isActive: dto.isActive } });
    });
    return this.get(user, id);
  }

  private async checkRefs(tenantId: string, dto: Partial<SaveVanDto>) {
    const out: { homeShopId?: string | null; salesmanId?: string | null; routeId?: string | null } = {};
    if (dto.homeShopId !== undefined) {
      if (dto.homeShopId) {
        const s = await this.prisma.shop.findFirst({ where: { id: dto.homeShopId, tenantId, isActive: true }, select: { id: true } });
        if (!s) throw new BadRequestException('Godown nahi mila');
        if (await this.prisma.distVan.findFirst({ where: { tenantId, shopId: dto.homeShopId }, select: { id: true } })) throw new BadRequestException('Van ka godown koi doosri van nahi ho sakti');
      }
      out.homeShopId = dto.homeShopId || null;
    }
    if (dto.salesmanId !== undefined) {
      if (dto.salesmanId) await assertUser(this.prisma, tenantId, dto.salesmanId, 'Salesman');
      out.salesmanId = dto.salesmanId || null;
    }
    if (dto.routeId !== undefined) {
      if (dto.routeId && !(await this.prisma.distRoute.findFirst({ where: { id: dto.routeId, tenantId }, select: { id: true } }))) throw new BadRequestException('Route nahi mila');
      out.routeId = dto.routeId || null;
    }
    return out;
  }

  /* ───────────── read ───────────── */

  async list(user: AuthenticatedUser, opts: { mine?: boolean } = {}) {
    const tenantId = user.tenantId;
    const mine = opts.mine || !this.seesAll(user);
    const vans = await this.prisma.distVan.findMany({
      where: { tenantId, ...(mine && { salesmanId: user.id, isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    const [sessions, stock, users, shops, routes] = await Promise.all([
      this.prisma.distVanSession.findMany({ where: { tenantId, vanId: { in: vans.map((v) => v.id) }, status: 'OPEN' } }),
      this.prisma.shopStock.findMany({
        where: { tenantId, shopId: { in: vans.map((v) => v.shopId) }, stock: { gt: 0 } },
        select: { shopId: true, stock: true, product: { select: { costPrice: true } }, variant: { select: { costPrice: true } } },
      }),
      userNames(this.prisma, tenantId, vans.map((v) => v.salesmanId)),
      shopNames(this.prisma, tenantId, vans.map((v) => v.homeShopId)),
      routeNames(this.prisma, tenantId, vans.map((v) => v.routeId)),
    ]);
    const sales = sessions.length
      ? await this.prisma.salesOrder.groupBy({ by: ['vanSessionId'], where: { tenantId, vanSessionId: { in: sessions.map((s) => s.id) }, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true } })
      : [];
    return {
      vans: vans.map((v) => {
        const s = sessions.find((x) => x.vanId === v.id) ?? null;
        const mineStock = stock.filter((x) => x.shopId === v.shopId);
        const sold = s ? sales.find((x) => x.vanSessionId === s.id) : null;
        return {
          ...v,
          salesmanName: v.salesmanId ? users.get(v.salesmanId) ?? null : null,
          homeShopName: v.homeShopId ? shops.get(v.homeShopId) ?? null : null,
          routeName: v.routeId ? routes.get(v.routeId) ?? null : null,
          stock: { lines: mineStock.length, qty: r4(mineStock.reduce((t, x) => t + x.stock, 0)), value: r2(mineStock.reduce((t, x) => t + x.stock * (Number(x.variant?.costPrice) || Number(x.product.costPrice) || 0), 0)) },
          session: s ? { id: s.id, dayKey: s.dayKey, openedAt: s.openedAt, sales: sold?._count._all ?? 0, salesValue: r2(sold?._sum.total ?? 0) } : null,
        };
      }),
    };
  }

  /** Van with its stock (free to sell), the open day and recent days. */
  async get(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const van = await this.van(user, id);
    const [rows, session, recent, users, shops, routes] = await Promise.all([
      this.prisma.shopStock.findMany({ where: { tenantId, shopId: van.shopId, stock: { not: 0 } }, select: { productId: true, variantId: true, stock: true, reserved: true } }),
      this.openSession(tenantId, id),
      this.prisma.distVanSession.findMany({ where: { tenantId, vanId: id, status: 'CLOSED' }, orderBy: { closedAt: 'desc' }, take: 10, select: { id: true, dayKey: true, closedAt: true, expectedCash: true, handedIn: true, shortAmount: true } }),
      userNames(this.prisma, tenantId, [van.salesmanId]),
      shopNames(this.prisma, tenantId, [van.homeShopId, van.shopId]),
      routeNames(this.prisma, tenantId, [van.routeId]),
    ]);
    const catalog = await loadCatalog(this.prisma, tenantId, rows.map((r) => r.productId));
    const variants = await this.prisma.productVariant.findMany({ where: { id: { in: rows.map((r) => r.variantId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
    const vName = new Map(variants.map((v) => [v.id, v.name]));
    const stock = rows.map((r) => {
      const p = catalog.products.get(r.productId);
      const packs = (catalog.unitsByProduct.get(r.productId) ?? []).filter((u) => !u.variantId || u.variantId === r.variantId);
      const cost = Number(p?.costPrice) || 0;
      return {
        productId: r.productId, variantId: r.variantId, name: p?.name ?? null, variantName: r.variantId ? vName.get(r.variantId) ?? null : null,
        baseUnit: p?.unit ?? 'pcs', qty: r4(r.stock), free: r4(r.stock - Math.max(0, r.reserved)), text: splitPacks(r.stock, packs, p?.unit || 'pcs').text,
        price: Number(p?.price) || 0, wholesalePrice: Number(p?.wholesalePrice) || null, value: r2(r.stock * cost),
        units: packs.map((u) => ({ id: u.id, unitName: u.unitName, conversionRate: u.conversionRate })),
      };
    }).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    return {
      ...van,
      shopName: shops.get(van.shopId) ?? null,
      salesmanName: van.salesmanId ? users.get(van.salesmanId) ?? null : null,
      homeShopName: van.homeShopId ? shops.get(van.homeShopId) ?? null : null,
      routeName: van.routeId ? routes.get(van.routeId) ?? null : null,
      stock,
      stockValue: r2(stock.reduce((t, s) => t + s.value, 0)),
      session: session ? await this.sessionView(tenantId, session) : null,
      recent,
    };
  }

  /* ───────────── the van day ───────────── */

  async open(user: AuthenticatedUser, id: string, dto: VanOpenDto = {}) {
    const tenantId = user.tenantId;
    const van = await this.van(user, id);
    if (!van.isActive) throw new BadRequestException('Van band hai');
    const existing = await this.openSession(tenantId, id);
    if (existing) return this.sessionView(tenantId, existing);
    if (dto.salesmanId) await assertUser(this.prisma, tenantId, dto.salesmanId, 'Salesman');
    const clock = await this.tz.clock(tenantId);
    const opening = await this.prisma.shopStock.findMany({ where: { tenantId, shopId: van.shopId, stock: { not: 0 } }, select: { productId: true, variantId: true, stock: true } });
    try {
      const s = await this.prisma.distVanSession.create({
        data: {
          tenantId, vanId: id, dayKey: todayKey(clock), status: 'OPEN', salesmanId: dto.salesmanId || van.salesmanId || null,
          openingStock: opening.map((o) => ({ productId: o.productId, variantId: o.variantId, qty: r4(o.stock) })) as unknown as Prisma.InputJsonValue,
          openedById: user.id, note: dto.note?.trim() || null,
        },
      });
      return this.sessionView(tenantId, s);
    } catch (e) {
      // Two opens raced; the partial unique index keeps one.
      const again = await this.openSession(tenantId, id);
      if (again) return this.sessionView(tenantId, again);
      throw e;
    }
  }

  /** Loads the van from its godown (a transfer sent and received at once). Opens the day when needed. */
  async load(user: AuthenticatedUser, id: string, dto: VanLoadDto) {
    const tenantId = user.tenantId;
    const van = await this.van(user, id);
    if (!van.homeShopId) throw new BadRequestException('Van ka godown set karein (Vans → edit)');
    let session = await this.openSession(tenantId, id);
    if (!session) {
      await this.open(user, id);
      session = (await this.openSession(tenantId, id))!;
    }
    const catalog = await loadCatalog(this.prisma, tenantId, dto.items.map((i) => i.productId));
    const merged = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const it of dto.items) {
      const p = catalog.products.get(it.productId);
      if (!p) throw new BadRequestException('Item nahi mila ya band hai');
      const unit = it.unitId ? catalog.units.get(it.unitId) : null;
      if (it.unitId && (!unit || unit.productId !== p.id)) throw new BadRequestException(`${p.name}: pack nahi mila`);
      const qty = r4(it.qty * (unit ? Number(unit.conversionRate) || 1 : 1));
      const key = k(p.id, it.variantId);
      const e = merged.get(key) ?? { productId: p.id, ...(it.variantId && { variantId: it.variantId }), quantity: 0 };
      e.quantity = r4(e.quantity + qty);
      merged.set(key, e);
    }
    const transfer = await this.transfers.create(user, {
      fromShopId: van.homeShopId, toShopId: van.shopId, notes: `Van load: ${van.name}${dto.note ? ` — ${dto.note.trim()}` : ''}`,
      items: [...merged.values()],
    } as never);
    await this.transfers.receive(user, transfer.id, { notes: 'Van par load' });
    await this.prisma.distVanSession.update({ where: { id: session.id }, data: { loadTransferIds: { push: transfer.id } } });
    return { transferId: transfer.id, transferNumber: transfer.transferNumber, van: await this.get(user, id) };
  }

  /**
   * Spot invoice from the van. A failed invoice (stock short, PIN needed)
   * leaves nothing behind, so the phone can send the same clientRef again.
   */
  async sell(user: AuthenticatedUser, id: string, dto: VanSellDto) {
    const tenantId = user.tenantId;
    const van = await this.prisma.distVan.findFirst({ where: { id, tenantId } });
    if (!van) throw new NotFoundException('Van nahi mili');
    if (van.salesmanId !== user.id && !this.can(user, PERMISSIONS.DISTRIBUTION_VANS_MANAGE)) throw new ForbiddenException('Ye van aap ki nahi');
    const session = await this.openSession(tenantId, id);
    if (!session) throw new BadRequestException('Van ka din shuru nahi hua — office se van open / load karwayein');
    const cash = r2(dto.cashReceived ?? 0);

    const booked = await this.orders.create(user, {
      clientRef: dto.clientRef, customerId: dto.customerId, shopId: van.shopId, items: dto.items, note: dto.note || 'Van sale',
      latitude: dto.latitude, longitude: dto.longitude, ...(van.routeId && { routeId: van.routeId }),
    });
    if (booked.duplicate) return { order: booked.order, duplicate: true, invoice: null, collection: null, warnings: [] };
    const order = booked.order;
    if (cash > order.total + 0.005) {
      await this.prisma.salesOrder.delete({ where: { id: order.id } });
      throw new BadRequestException(`Cash (Rs ${cash}) bill (Rs ${order.total}) se zyada hai`);
    }
    await this.prisma.salesOrder.update({ where: { id: order.id }, data: { status: 'APPROVED', approvedById: user.id, approvedAt: new Date(), vanSessionId: session.id } });
    const inv = await this.invoicing.invoiceSpot(user, order.id, { cashNow: cash, managerPin: dto.managerPin });
    if (!inv.ok) {
      await this.prisma.salesOrder.delete({ where: { id: order.id } });
      const err = new BadRequestException({ message: inv.error ?? 'Invoice nahi bani', needsPin: !!inv.needsPin });
      throw err;
    }
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.salesOrderItem.findMany({ where: { salesOrderId: order.id }, select: { id: true, baseQty: true, freeBaseQty: true } });
      for (const it of items) await tx.salesOrderItem.update({ where: { id: it.id }, data: { deliveredBaseQty: it.baseQty, deliveredFreeQty: it.freeBaseQty } });
      await tx.salesOrder.update({ where: { id: order.id }, data: { status: 'DELIVERED', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), cashCollected: cash } });
    });
    let collection = null;
    if (cash > 0) {
      const res = await this.collections.create(
        user,
        {
          customerId: order.customerId, amount: cash, method: dto.method ?? 'CASH', saleId: inv.saleId, note: 'Van sale',
          bankName: dto.bankName, chequeNo: dto.chequeNo, chequeDate: dto.chequeDate, latitude: dto.latitude, longitude: dto.longitude,
          ...(dto.clientRef && { clientRef: `${dto.clientRef}:pay` }),
        },
        { kind: 'INVOICE_CASH', salesOrderId: order.id, vanSessionId: session.id },
      );
      collection = res.collection;
    }
    return { order: await this.orders.detail(user, order.id), duplicate: false, invoice: { saleId: inv.saleId, saleNumber: inv.saleNumber }, collection, warnings: booked.warnings };
  }

  /* ───────────── close ───────────── */

  /** Lines of the van day: what came in and went out per item, from the stock movements of the van. */
  private async lines(tenantId: string, van: Van, session: Session): Promise<VanLine[]> {
    const [moves, now] = await Promise.all([
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'variantId', 'type'],
        where: { tenantId, shopId: van.shopId, createdAt: { gte: session.openedAt } },
        _sum: { quantity: true },
      }),
      this.prisma.shopStock.findMany({ where: { tenantId, shopId: van.shopId }, select: { productId: true, variantId: true, stock: true } }),
    ]);
    const base = vanDayLines(
      (session.openingStock as unknown as Array<{ productId: string; variantId: string | null; qty: number }> | null) ?? [],
      moves.map((m) => ({ productId: m.productId, variantId: m.variantId, type: m.type, qty: Number(m._sum.quantity) || 0 })),
      now,
    );
    const catalog = await loadCatalog(this.prisma, tenantId, base.map((l) => l.productId));
    return base.map((l) => {
      const p = catalog.products.get(l.productId);
      const packs = (catalog.unitsByProduct.get(l.productId) ?? []).filter((u) => !u.variantId || u.variantId === l.variantId);
      return { ...l, name: p?.name ?? null, baseUnit: p?.unit ?? 'pcs', text: splitPacks(l.expected, packs, p?.unit || 'pcs').text, cost: Number(p?.costPrice) || 0 };
    }).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  private async money(tenantId: string, sessionId: string) {
    const [cols, sales] = await Promise.all([
      this.prisma.distCollection.findMany({ where: { tenantId, vanSessionId: sessionId, status: { not: 'REJECTED' } }, select: { amount: true, method: true, status: true, kind: true } }),
      this.prisma.salesOrder.aggregate({ where: { tenantId, vanSessionId: sessionId, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true, cashCollected: true } }),
    ]);
    const sum = (f: (c: (typeof cols)[number]) => boolean) => r2(cols.filter(f).reduce((s, c) => s + c.amount, 0));
    return {
      invoices: sales._count._all, salesValue: r2(sales._sum.total ?? 0), creditGiven: r2((sales._sum.total ?? 0) - (sales._sum.cashCollected ?? 0)),
      expectedCash: sum((c) => c.method === 'CASH'), otherMoney: sum((c) => c.method !== 'CASH'),
      recoveries: sum((c) => c.kind === 'RECOVERY'), pending: sum((c) => c.status === 'PENDING'),
    };
  }

  private async sessionView(tenantId: string, s: Session) {
    const van = await this.prisma.distVan.findUniqueOrThrow({ where: { id: s.vanId } });
    const [money, users, invoices, returns] = await Promise.all([
      this.money(tenantId, s.id),
      userNames(this.prisma, tenantId, [s.salesmanId, s.openedById, s.closedById]),
      this.prisma.salesOrder.findMany({
        where: { tenantId, vanSessionId: s.id, status: { not: 'CANCELLED' } }, orderBy: { bookedAt: 'asc' },
        select: { id: true, orderNumber: true, saleId: true, customerId: true, total: true, cashCollected: true, bookedAt: true },
      }),
      this.prisma.distMarketReturn.findMany({ where: { tenantId, vanSessionId: s.id }, select: { id: true, number: true, customerId: true, totalValue: true, status: true } }),
    ]);
    const customers = await customerCards(this.prisma, tenantId, [...invoices.map((i) => i.customerId), ...returns.map((r) => r.customerId)]);
    const sales = await this.prisma.sale.findMany({ where: { tenantId, id: { in: invoices.map((i) => i.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true } });
    const saleNo = new Map(sales.map((x) => [x.id, x.saleNumber]));
    return {
      ...s,
      vanName: van.name,
      salesmanName: s.salesmanId ? users.get(s.salesmanId) ?? null : null,
      openedByName: s.openedById ? users.get(s.openedById) ?? null : null,
      closedByName: s.closedById ? users.get(s.closedById) ?? null : null,
      money,
      invoices: invoices.map((i) => ({ ...i, saleNumber: i.saleId ? saleNo.get(i.saleId) ?? null : null, customerName: customers.get(i.customerId)?.businessName || customers.get(i.customerId)?.name || null })),
      returns: returns.map((r) => ({ ...r, customerName: customers.get(r.customerId)?.businessName || customers.get(r.customerId)?.name || null })),
    };
  }

  /** What closing looks like now: each item's day and the money. */
  async closePreview(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const van = await this.van(user, id);
    const session = await this.openSession(tenantId, id);
    if (!session) throw new BadRequestException('Is van ka koi din khula nahi');
    return { session: await this.sessionView(tenantId, session), lines: await this.lines(tenantId, van, session) };
  }

  async close(user: AuthenticatedUser, id: string, dto: VanCloseDto) {
    const tenantId = user.tenantId;
    const van = await this.van(user, id);
    const session = await this.openSession(tenantId, id);
    if (!session) throw new BadRequestException('Is van ka koi din khula nahi');
    if (dto.verifyCollections && !this.can(user, PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY)) throw new ForbiddenException('Collection verify karne ki permission nahi (collections.verify)');
    const unload = dto.unload !== false;
    if (unload && !van.homeShopId) throw new BadRequestException('Van ka godown set karein — maal wapas kahan jaye?');

    // 1. Count: short is a loss, extra a gain, both on the Adjustments page.
    const lines: VanLine[] = countVariance(await this.lines(tenantId, van, session), dto.counts ?? []);
    const shorts = lines.filter((l) => (l.variance ?? 0) < -0.0001);
    const extras = lines.filter((l) => (l.variance ?? 0) > 0.0001);
    let varianceRef: string | null = null;
    if (shorts.length) {
      const res = await this.adjustments.batch(user, new ShopScope(null, true), {
        shopId: van.shopId, reason: `Van count short (${van.name})`, reasonCode: 'THEFT', note: `Van din ${session.dayKey}`,
        items: shorts.map((l) => ({ productId: l.productId, ...(l.variantId && { variantId: l.variantId }), type: 'LOSS', quantity: Math.abs(l.variance!) })),
      } as never) as { groupRef: string };
      varianceRef = res.groupRef;
    }
    if (extras.length) {
      const res = await this.adjustments.batch(user, new ShopScope(null, true), {
        shopId: van.shopId, reason: `Van count zyada (${van.name})`, reasonCode: 'AUDIT_FOUND', note: `Van din ${session.dayKey}`,
        items: extras.map((l) => ({ productId: l.productId, ...(l.variantId && { variantId: l.variantId }), type: 'ADJUSTMENT_IN', quantity: l.variance! })),
      } as never) as { groupRef: string };
      varianceRef = [varianceRef, res.groupRef].filter(Boolean).join(',');
    }

    // 2. Money of the day verified now, when asked.
    if (dto.verifyCollections) {
      const pending = await this.prisma.distCollection.findMany({ where: { tenantId, vanSessionId: session.id, status: 'PENDING' } });
      const touched = new Set<string>();
      for (const c of pending) if (await this.prisma.$transaction((tx) => postCollection(tx, c, user.id))) touched.add(c.customerId);
      for (const cid of touched) refreshSettlements(this.prisma, tenantId, cid);
    }

    // 3. What is left goes back to the godown.
    let unloadTransferId: string | null = null;
    if (unload) {
      const left = await this.prisma.shopStock.findMany({ where: { tenantId, shopId: van.shopId, stock: { gt: 0.0001 } }, select: { productId: true, variantId: true, stock: true } });
      if (left.length) {
        const t = await this.transfers.create(user, {
          fromShopId: van.shopId, toShopId: van.homeShopId!, notes: `Van unload: ${van.name} (${session.dayKey})`,
          items: left.map((s) => ({ productId: s.productId, ...(s.variantId && { variantId: s.variantId }), quantity: r4(s.stock) })),
        } as never);
        await this.transfers.receive(user, t.id, { notes: 'Van se godown wapas' });
        unloadTransferId = t.id;
        for (const l of lines) l.unloaded = r4(left.find((s) => s.productId === l.productId && (s.variantId ?? null) === (l.variantId ?? null))?.stock ?? 0);
      }
    }

    const money = await this.money(tenantId, session.id);
    const handedIn = dto.handedIn != null ? r2(dto.handedIn) : null;
    const done = await this.prisma.distVanSession.updateMany({
      where: { id: session.id, status: 'OPEN' },
      data: {
        status: 'CLOSED', closedById: user.id, closedAt: new Date(), reconciliation: lines as unknown as Prisma.InputJsonValue,
        varianceRef, unloadTransferId, expectedCash: money.expectedCash, handedIn, shortAmount: handedIn == null ? 0 : r2(money.expectedCash - handedIn),
        ...(dto.note && { note: dto.note.trim() }),
      },
    });
    if (!done.count) throw new BadRequestException('Van ka din abhi kisi aur ne close kar diya');
    return this.session(user, session.id);
  }

  async sessions(user: AuthenticatedUser, vanId: string) {
    await this.van(user, vanId);
    const rows = await this.prisma.distVanSession.findMany({ where: { tenantId: user.tenantId, vanId }, orderBy: { openedAt: 'desc' }, take: 60 });
    return { sessions: rows.map(({ reconciliation: _r, openingStock: _o, ...s }) => s) };
  }

  async session(user: AuthenticatedUser, sessionId: string) {
    const s = await this.prisma.distVanSession.findFirst({ where: { id: sessionId, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Van ka din nahi mila');
    await this.van(user, s.vanId);
    return { ...(await this.sessionView(user.tenantId, s)), lines: (s.reconciliation as unknown as VanLine[] | null) ?? null };
  }

  /** Stock on every active van, for the AI tool. */
  async stockSummary(user: AuthenticatedUser) {
    const { vans } = await this.list(user);
    return vans.filter((v) => v.isActive).map((v) => ({ id: v.id, name: v.name, salesmanName: v.salesmanName, open: !!v.session, sales: v.session?.sales ?? 0, salesValue: v.session?.salesValue ?? 0, stockLines: v.stock.lines, stockValue: v.stock.value }));
  }
}
