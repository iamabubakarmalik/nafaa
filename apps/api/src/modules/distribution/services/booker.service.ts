/**
 * The booker app's server side: the data it keeps offline (bootstrap) and
 * the batch upload of what it did offline (sync).
 *
 * Bootstrap: a small manifest (routes, settings, price lists, schemes) plus
 * paged entities (customers, products, price list rows). Pages run in
 * updatedAt order with an opaque cursor; with `updatedSince` only changed
 * rows come, including switched-off ones so the phone can drop them.
 *
 * Sync: orders, then visits, then collections, each item on its own. Every
 * item comes back as ok, duplicate (already saved; the saved id is given),
 * conflict (will never be accepted as sent; the reason is in Roman Urdu) or
 * error (server trouble; send again later).
 */

import { ForbiddenException, HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { BOOTSTRAP_PAGE, NO_ORDER_REASONS } from '../distribution.constants';
import { BootstrapQueryDto, CreateCollectionDto, CreateOrderDto, CreateVisitDto, SyncDto } from '../dto/field.dto';
import { loadSchemes } from '../helpers/pricing-loader';
import { checkKey, dayStart, r2, shiftKey, todayKey, weekdayOfKey } from '../distribution.support';
import { DistributionSettingsService } from './settings.service';
import { OrdersService } from './orders.service';
import { VisitsService } from './visits.service';
import { CollectionsService } from './collections.service';
import { TargetsService } from './targets.service';
import { MarketReturnsService } from './market-returns.service';
import type { CreateMarketReturnDto } from '../dto/market-return.dto';

export type SyncStatus = 'ok' | 'duplicate' | 'conflict' | 'error';

export interface SyncResult {
  kind: 'order' | 'visit' | 'collection' | 'return';
  clientRef: string | null;
  status: SyncStatus;
  /** Server id (ok and duplicate). */
  id?: string;
  /** Order number for orders. */
  number?: string;
  /** Roman Urdu reason (conflict, error). */
  reason?: string;
  /** Roman Urdu notes on an accepted order (price changed by the server, line dropped). */
  warnings?: string[];
  /** Server totals for an accepted order, to replace the phone's own. */
  total?: number;
  orderStatus?: string;
}

interface Cursor { t: string; id: string }
const encode = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
function decode(v?: string): Cursor | null {
  if (!v) return null;
  try {
    const c = JSON.parse(Buffer.from(v, 'base64url').toString('utf8'));
    return typeof c?.t === 'string' && typeof c?.id === 'string' ? c : null;
  } catch {
    return null;
  }
}

/** Rows after the cursor in (updatedAt, id) order, changed since `since`. */
function keyset(cursor: Cursor | null, since: Date | null) {
  const and: Array<Record<string, unknown>> = [];
  if (since) and.push({ updatedAt: { gt: since } });
  if (cursor) {
    const t = new Date(cursor.t);
    and.push({ OR: [{ updatedAt: { gt: t } }, { updatedAt: t, id: { gt: cursor.id } }] });
  }
  return and;
}

@Injectable()
export class BookerService {
  private readonly logger = new Logger('DistributionSync');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly settings: DistributionSettingsService,
    private readonly orders: OrdersService,
    private readonly visits: VisitsService,
    private readonly collections: CollectionsService,
    private readonly targets: TargetsService,
    private readonly marketReturns: MarketReturnsService,
  ) {}

  private can(user: AuthenticatedUser, p: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
    return hasPermission(user.role, user.permissions, p);
  }

  /** Routes the caller books (all routes with `all` and orders.manage). */
  private async myRoutes(user: AuthenticatedUser, all?: boolean) {
    const everything = !!all && this.can(user, PERMISSIONS.DISTRIBUTION_ORDERS_MANAGE);
    return this.prisma.distRoute.findMany({
      where: { tenantId: user.tenantId, isActive: true, ...(!everything && { bookerId: user.id }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async bootstrap(user: AuthenticatedUser, q: BootstrapQueryDto) {
    if (q.entity === 'customers') return this.customersPage(user, q);
    if (q.entity === 'products') return this.productsPage(user, q);
    if (q.entity === 'priceListItems') return this.priceListPage(user, q);
    return this.manifest(user, q);
  }

  private async manifest(user: AuthenticatedUser, q: BootstrapQueryDto) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const today = todayKey(clock);
    const weekday = weekdayOfKey(today);
    const [settings, routes, lists, schemes, shops, me] = await Promise.all([
      this.settings.get(user),
      this.myRoutes(user, q.all),
      this.prisma.priceList.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, code: true, basedOn: true, adjustPct: true, isDefault: true, updatedAt: true, _count: { select: { items: true } } } }),
      loadSchemes(this.prisma, tenantId),
      this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, type: true } }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, fullName: true, email: true, phone: true } }),
    ]);
    const routeIds = routes.map((r) => r.id);
    const [customerCount, productCount] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, isActive: true, routeId: { in: routeIds } } }),
      this.prisma.product.count({ where: { tenantId, isActive: true, isRawMaterial: false } }),
    ]);
    return {
      serverTime: new Date().toISOString(),
      today, weekday, timezone: clock.tz,
      me: {
        ...me,
        canOverridePrice: this.can(user, PERMISSIONS.DISTRIBUTION_PRICE_OVERRIDE),
        canCollect: this.can(user, PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT),
        canSeeBalance: this.can(user, PERMISSIONS.KHATA_VIEW),
        canSeeCustomers: this.can(user, PERMISSIONS.CUSTOMERS_VIEW),
        canSeeProducts: this.can(user, PERMISSIONS.PRODUCTS_VIEW),
      },
      settings: settings.settings,
      meta: settings.meta,
      routes: routes.map((r) => ({ id: r.id, name: r.name, code: r.code, area: r.area, shopId: r.shopId, visitDays: r.visitDays, dueToday: r.visitDays.includes(weekday), updatedAt: r.updatedAt })),
      shops,
      priceLists: lists.map(({ _count, ...l }) => ({ ...l, itemCount: _count.items })),
      schemes,
      noOrderReasons: NO_ORDER_REASONS,
      counts: { customers: customerCount, products: productCount },
      pageSize: BOOTSTRAP_PAGE,
    };
  }

  private async customersPage(user: AuthenticatedUser, q: BootstrapQueryDto) {
    if (!this.can(user, PERMISSIONS.CUSTOMERS_VIEW)) throw new ForbiddenException('Customers dekhne ki permission nahi (customers.view)');
    const tenantId = user.tenantId;
    const limit = Math.min(q.limit ?? BOOTSTRAP_PAGE, 1000);
    const since = q.updatedSince ? new Date(q.updatedSince) : null;
    const routes = await this.myRoutes(user, q.all);
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId, routeId: { in: routes.map((r) => r.id) },
        ...(!since && { isActive: true }),
        AND: keyset(decode(q.cursor), since) as Prisma.CustomerWhereInput[],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true, name: true, businessName: true, phone: true, address: true, area: true, city: true,
        routeId: true, routeSeq: true, priceListId: true, priceTier: true, latitude: true, longitude: true,
        ntn: true, strn: true, licenseNo: true, licenseExpiry: true, creditDays: true, creditLimit: true, balance: true,
        isActive: true, updatedAt: true,
      },
    });
    const showMoney = this.can(user, PERMISSIONS.KHATA_VIEW);
    // Oldest unpaid credit, so the phone can warn about overdue customers offline.
    const snaps = showMoney ? await this.orders.creditSnapshots(tenantId, rows.map((r) => r.id)) : null;
    const last = rows[rows.length - 1];
    return {
      entity: 'customers', serverTime: new Date().toISOString(),
      items: rows.map((r) => (showMoney
        ? { ...r, oldestDueAt: snaps?.get(r.id)?.oldestDueAt ?? null }
        : { ...r, balance: undefined, creditLimit: undefined })),
      nextCursor: rows.length === limit && last ? encode({ t: last.updatedAt.toISOString(), id: last.id }) : null,
    };
  }

  private async productsPage(user: AuthenticatedUser, q: BootstrapQueryDto) {
    if (!this.can(user, PERMISSIONS.PRODUCTS_VIEW)) throw new ForbiddenException('Products dekhne ki permission nahi (products.view)');
    const tenantId = user.tenantId;
    const limit = Math.min(q.limit ?? BOOTSTRAP_PAGE, 1000);
    const since = q.updatedSince ? new Date(q.updatedSince) : null;
    const rows = await this.prisma.product.findMany({
      where: {
        tenantId, isRawMaterial: false,
        ...(!since && { isActive: true }),
        AND: keyset(decode(q.cursor), since) as Prisma.ProductWhereInput[],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true, name: true, sku: true, barcode: true, unit: true, price: true, wholesalePrice: true, creditPrice: true,
        brandId: true, categoryId: true, taxRate: true, isActive: true, updatedAt: true,
        brand: { select: { name: true } }, category: { select: { name: true } },
        images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true, wholesalePrice: true, creditPrice: true } },
        units: { where: { isActive: true }, select: { id: true, variantId: true, unitName: true, conversionRate: true, price: true, wholesalePrice: true, creditPrice: true, barcode: true, isDefault: true } },
      },
    });
    // Free stock in the godowns of the caller's routes (what can be invoiced).
    const routes = await this.myRoutes(user, q.all);
    const shopIds = [...new Set(routes.map((r) => r.shopId).filter((x): x is string => !!x))];
    const stock = shopIds.length && rows.length
      ? await this.prisma.shopStock.findMany({ where: { shopId: { in: shopIds }, productId: { in: rows.map((r) => r.id) } }, select: { shopId: true, productId: true, variantId: true, stock: true, reserved: true } })
      : [];
    const last = rows[rows.length - 1];
    return {
      entity: 'products', serverTime: new Date().toISOString(),
      items: rows.map(({ brand, category, images, ...p }) => ({
        ...p,
        brandName: brand?.name ?? null, categoryName: category?.name ?? null, imageUrl: images[0]?.url ?? null,
        stock: stock.filter((s) => s.productId === p.id).map((s) => ({ shopId: s.shopId, variantId: s.variantId, qty: r2(Number(s.stock) - Math.max(Number(s.reserved) || 0, 0)) })),
      })),
      nextCursor: rows.length === limit && last ? encode({ t: last.updatedAt.toISOString(), id: last.id }) : null,
    };
  }

  /** All rows of one list, paged by id. Refetch a list whenever its updatedAt moved. */
  private async priceListPage(user: AuthenticatedUser, q: BootstrapQueryDto) {
    const tenantId = user.tenantId;
    if (!q.priceListId) throw new ForbiddenException('priceListId chahiye');
    const limit = Math.min(q.limit ?? BOOTSTRAP_PAGE, 1000);
    const list = await this.prisma.priceList.findFirst({ where: { id: q.priceListId, tenantId }, select: { id: true, updatedAt: true } });
    if (!list) throw new ForbiddenException('Price list nahi mili');
    const rows = await this.prisma.priceListItem.findMany({
      where: { priceListId: list.id, ...(q.cursor && { id: { gt: q.cursor } }) },
      orderBy: { id: 'asc' }, take: limit,
      select: { id: true, productId: true, variantId: true, unitId: true, price: true, minQty: true },
    });
    return {
      entity: 'priceListItems', priceListId: list.id, listUpdatedAt: list.updatedAt, serverTime: new Date().toISOString(),
      items: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
    };
  }

  /* ───────────── sync ───────────── */

  async sync(user: AuthenticatedUser, dto: SyncDto) {
    const results: SyncResult[] = [];
    for (const o of dto.orders ?? []) results.push(await this.one('order', o.clientRef, () => this.syncOrder(user, o)));
    for (const v of dto.visits ?? []) results.push(await this.one('visit', v.clientRef, () => this.syncVisit(user, v)));
    for (const c of dto.collections ?? []) results.push(await this.one('collection', c.clientRef, () => this.syncCollection(user, c)));
    for (const r of dto.returns ?? []) results.push(await this.one('return', r.clientRef, () => this.syncReturn(user, r)));
    return {
      serverTime: new Date().toISOString(),
      results,
      counts: {
        ok: results.filter((r) => r.status === 'ok').length,
        duplicate: results.filter((r) => r.status === 'duplicate').length,
        conflict: results.filter((r) => r.status === 'conflict').length,
        error: results.filter((r) => r.status === 'error').length,
      },
    };
  }

  private async one(kind: SyncResult['kind'], clientRef: string | undefined, run: () => Promise<Omit<SyncResult, 'kind' | 'clientRef'>>): Promise<SyncResult> {
    const ref = clientRef?.trim() || null;
    if (!ref) return { kind, clientRef: null, status: 'conflict', reason: 'clientRef nahi hai — app update karein' };
    try {
      return { kind, clientRef: ref, ...(await run()) };
    } catch (e) {
      if (e instanceof HttpException && e.getStatus() < 500) {
        const body = e.getResponse() as { message?: string | string[] } | string;
        const msg = typeof body === 'string' ? body : Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? e.message;
        return { kind, clientRef: ref, status: 'conflict', reason: msg };
      }
      this.logger.warn(`Sync ${kind} ${ref} failed: ${(e as Error)?.message}`);
      return { kind, clientRef: ref, status: 'error', reason: 'Server par masla — thori der baad dobara sync karein' };
    }
  }

  private async syncOrder(user: AuthenticatedUser, o: CreateOrderDto) {
    const res = await this.orders.create(user, o);
    return {
      status: (res.duplicate ? 'duplicate' : 'ok') as SyncStatus,
      id: res.order.id, number: res.order.orderNumber, total: res.order.total, orderStatus: res.order.status,
      ...(res.warnings.length && { warnings: res.warnings }),
    };
  }

  private async syncVisit(user: AuthenticatedUser, v: CreateVisitDto) {
    const res = await this.visits.create(user, v);
    return { status: (res.duplicate ? 'duplicate' : 'ok') as SyncStatus, id: res.visit.id, ...(res.duplicate ? {} : res.warning ? { warnings: [res.warning] } : {}) };
  }

  private async syncCollection(user: AuthenticatedUser, c: CreateCollectionDto) {
    if (!this.can(user, PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT)) throw new ForbiddenException('Recovery likhne ki permission nahi (collections.collect)');
    const res = await this.collections.create(user, c);
    return { status: (res.duplicate ? 'duplicate' : 'ok') as SyncStatus, id: res.collection.id };
  }

  private async syncReturn(user: AuthenticatedUser, r: CreateMarketReturnDto) {
    if (!this.can(user, PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT)) throw new ForbiddenException('Market return likhne ki permission nahi (returns.collect)');
    const res = await this.marketReturns.create(user, { ...r, approve: false });
    return { status: (res.duplicate ? 'duplicate' : 'ok') as SyncStatus, id: res.marketReturn.id, number: res.marketReturn.number, total: res.marketReturn.totalValue };
  }

  /* ───────────── end of day ───────────── */

  /** The caller's day: routes due, customers visited and not, orders and money. */
  async summary(user: AuthenticatedUser, q: { date?: string }) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const key = checkKey(q.date) ?? todayKey(clock);
    const gte = dayStart(key, clock);
    const lt = dayStart(shiftKey(key, 1), clock);
    const weekday = weekdayOfKey(key);
    const routes = (await this.myRoutes(user)).filter((r) => r.visitDays.includes(weekday));
    const [planned, visits, orders, collections] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, isActive: true, routeId: { in: routes.map((r) => r.id) } }, select: { id: true, name: true, businessName: true, routeId: true, routeSeq: true }, orderBy: [{ routeSeq: 'asc' }] }),
      this.prisma.distVisit.findMany({ where: { tenantId, userId: user.id, checkInAt: { gte, lt } }, select: { customerId: true, outcome: true, noOrderReason: true } }),
      this.prisma.salesOrder.findMany({ where: { tenantId, bookedById: user.id, bookedAt: { gte, lt }, status: { not: 'CANCELLED' } }, select: { id: true, customerId: true, total: true, status: true, _count: { select: { items: true } } } }),
      this.prisma.distCollection.findMany({ where: { tenantId, collectedById: user.id, collectedAt: { gte, lt } }, select: { amount: true, status: true, method: true } }),
    ]);
    const visited = new Set([...visits.map((v) => v.customerId), ...orders.map((o) => o.customerId)]);
    const productive = new Set(orders.map((o) => o.customerId));
    return {
      date: key,
      routes: routes.map((r) => ({ id: r.id, name: r.name })),
      planned: planned.length,
      visited: planned.filter((c) => visited.has(c.id)).length,
      productive: productive.size,
      strikeRate: visited.size ? r2((productive.size / visited.size) * 100) : 0,
      orders: { count: orders.length, value: r2(orders.reduce((s, o) => s + o.total, 0)), lines: orders.reduce((s, o) => s + o._count.items, 0) },
      noOrder: Object.entries(visits.filter((v) => v.outcome !== 'ORDER').reduce<Record<string, number>>((m, v) => {
        const k = v.noOrderReason ?? v.outcome;
        m[k] = (m[k] ?? 0) + 1;
        return m;
      }, {})).map(([reason, count]) => ({ reason, label: NO_ORDER_REASONS.find((x) => x.code === reason)?.label ?? reason, count })),
      collections: {
        count: collections.length,
        amount: r2(collections.reduce((s, c) => s + c.amount, 0)),
        cash: r2(collections.filter((c) => c.method === 'CASH').reduce((s, c) => s + c.amount, 0)),
        pending: r2(collections.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0)),
      },
      notVisited: planned.filter((c) => !visited.has(c.id)).map((c) => ({ id: c.id, name: c.businessName || c.name, routeId: c.routeId })),
      // The booker's own targets this month (phase 2).
      targets: (await this.targets.list(user, { period: key.slice(0, 7) }, user.id)).targets.map((t) => ({
        id: t.id, label: t.label, metric: t.metric, unitName: t.unitName, target: t.target, achieved: t.achieved, pct: t.pct,
        onTrack: t.onTrack, remaining: t.remaining, perDayNeeded: t.perDayNeeded,
      })),
    };
  }
}
