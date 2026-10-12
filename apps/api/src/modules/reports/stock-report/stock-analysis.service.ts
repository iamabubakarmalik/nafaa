/**
 * Stock report for every industry: what stock is worth at cost and at the
 * selling price in each branch, how long it has been sitting (days since the
 * last sale and since stock last came in), what is dead, slow or fast, what
 * is near expiry, how branches compare, and the stock on any past date from
 * the stock ledger.
 *
 * Valuation is the weighted average cost kept on the product (a branch cost
 * override wins; variants use their own cost). IMEI and serial goods use the
 * cost of each unit in stock; carpet uses its rolls and cut pieces. Sales are
 * net of returns, leave out voided bills, and take their cost from the sale
 * line. Every period is counted in business days of the shop's timezone.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { addDaysTz, businessDayKey } from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import type { LedgerSort, StockFilterDto, StockLedgerDto, StockListDto, StockSort, StockStatusFilter } from './dto/stock-report.dto';

export type StockFlag =
  | 'dead' | 'slow' | 'fast' | 'expiry' | 'expired' | 'blocked' | 'regSoon'
  | 'raw' | 'made' | 'fridge' | 'noCost' | 'negative' | 'inactive';

export interface Sold { qty: number; revenue: number; cost: number; profit: number }

export interface ShopPart {
  shopId: string;
  stock: number;
  cost: number;
  retail: number;
  alert: number;
  sold: number;
  revenue: number;
}

export interface StockLine {
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  brand: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  /** Per unit, averaged over the branches and units in scope. */
  price: number;
  cost: number;
  stock: number;
  alert: number;
  valueAtCost: number;
  retail: number;
  profit: number;
  margin: number;
  status: 'out' | 'low' | 'ok';
  flags: StockFlag[];
  sold: Sold;
  prevSold: Sold;
  /** Net units sold per day in the period. */
  perDay: number;
  /** Days the stock lasts at that rate; null when nothing sold. */
  cover: number | null;
  lastSoldAt: Date | null;
  lastInAt: Date | null;
  saleAge: number | null;
  stockAge: number | null;
  devices: { label: 'IMEI' | 'Serial'; count: number } | null;
  rolls: { rolls: number; pieces: number } | null;
  group: string | null;
  detail: string | null;
  agri: { season: string | null; reg: { state: 'expired' | 'soon' | 'none'; days: number | null } | null } | null;
  expiry: { date: Date; qty: number; expiredQty: number; batches: number; cost: number } | null;
  active: boolean;
  shops: ShopPart[];
}

interface Batch { productId: string; batchNumber: string; expiryDate: Date; quantity: number; cost: number }

interface Ctx {
  tenantId: string;
  tz: string;
  dayStartHour: number;
  now: Date;
  range: { gte: Date; lt: Date };
  prev: { gte: Date; lt: Date };
  from: string;
  to: string;
  days: number;
  deadDays: number;
  shops: Array<{ id: string; name: string; isMain: boolean }>;
  mainId: string;
  /** Branch that holds untagged rows (serials, batches) in this view. */
  homeId: string;
  multi: boolean;
  batches: Batch[];
}

const DAY = 86_400_000;
const LIVE = Prisma.sql`('COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED')`;
const IN_TYPES = ['PURCHASE_IN', 'OPENING_BALANCE', 'TRANSFER_IN', 'ADJUSTMENT_IN'] as const;
const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
/** Agri categories that need a government registration to be sold. */
const REGULATED = new Set(['SEEDS', 'FERTILIZER', 'PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE', 'GROWTH_HORMONE', 'VETERINARY_MEDICINE']);
const REG_SOON_DAYS = 60;
const EXPIRY_DAYS = 30;
const FAST_COVER = 15;
const SLOW_COVER = 90;
const DEFAULT_DEAD_DAYS = 90;
/** Sales older than this only matter as "not sold for a year". */
const HISTORY_DAYS = 400;

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const noSale = (): Sold => ({ qty: 0, revenue: 0, cost: 0, profit: 0 });
const ageOf = (now: Date, d: Date | null) => (d ? Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY)) : null);

const TESTS: Record<StockStatusFilter, (l: StockLine) => boolean> = {
  all: () => true,
  in: (l) => l.stock > 0,
  low: (l) => l.status === 'low',
  out: (l) => l.status === 'out',
  dead: (l) => l.flags.includes('dead'),
  slow: (l) => l.flags.includes('slow'),
  fast: (l) => l.flags.includes('fast'),
  expiry: (l) => l.flags.includes('expiry') || l.flags.includes('expired'),
  blocked: (l) => l.flags.includes('blocked') || l.flags.includes('regSoon'),
  raw: (l) => l.flags.includes('raw'),
  made: (l) => l.flags.includes('made'),
  noCost: (l) => l.flags.includes('noCost'),
  negative: (l) => l.flags.includes('negative'),
  inactive: (l) => l.flags.includes('inactive'),
};

const SORTS: Record<StockSort, (a: StockLine, b: StockLine) => number> = {
  value: (a, b) => b.valueAtCost - a.valueAtCost,
  retail: (a, b) => b.retail - a.retail,
  profit: (a, b) => b.profit - a.profit,
  margin: (a, b) => b.margin - a.margin,
  stock: (a, b) => b.stock - a.stock,
  // Never sold first, then the longest wait.
  age: (a, b) => (b.saleAge ?? 1e9) - (a.saleAge ?? 1e9) || b.valueAtCost - a.valueAtCost,
  sold: (a, b) => b.sold.qty - a.sold.qty,
  revenue: (a, b) => b.sold.revenue - a.sold.revenue,
  cover: (a, b) => (b.cover ?? -1) - (a.cover ?? -1),
  name: (a, b) => a.name.localeCompare(b.name),
};

@Injectable()
export class StockAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  // ─── Core ────────────────────────────────────────────────

  private async context(user: AuthenticatedUser, scope: ShopScope, q: StockFilterDto): Promise<Ctx> {
    const tenantId = user.tenantId;
    const [{ tz, dayStartHour }, range, allShops] = await Promise.all([
      this.tz.clock(tenantId),
      periodRange(this.tz, tenantId, q.from, q.to),
      this.prisma.shop.findMany({
        where: { tenantId },
        select: { id: true, name: true, isMain: true, isActive: true },
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      }),
    ]);
    const now = new Date();
    const active = allShops.filter((s) => s.isActive);
    const mainId = (active.find((s) => s.isMain) ?? active[0] ?? allShops[0])?.id ?? '';
    const shops = (scope.shopId ? allShops.filter((s) => s.id === scope.shopId) : active).map(({ id, name, isMain }) => ({ id, name, isMain }));
    const span = range.lt.getTime() - range.gte.getTime();
    const end = Math.min(range.lt.getTime(), now.getTime());
    return {
      tenantId, tz, dayStartHour, now, range,
      prev: { gte: new Date(range.gte.getTime() - span), lt: range.gte },
      from: businessDayKey(range.gte, tz, dayStartHour),
      to: businessDayKey(new Date(range.lt.getTime() - 1), tz, dayStartHour),
      days: Math.max(1, (end - range.gte.getTime()) / DAY),
      deadDays: q.deadDays ?? DEFAULT_DEAD_DAYS,
      shops, mainId,
      homeId: scope.shopId ?? mainId,
      multi: !scope.shopId && active.length > 1,
      batches: [],
    };
  }

  /** `AND col = branch`, also matching untagged rows when the branch is the main one. */
  private shopSql(scope: ShopScope, ctx: Ctx, col: string) {
    if (!scope.shopId) return Prisma.empty;
    const c = Prisma.raw(col);
    return scope.shopId === ctx.mainId
      ? Prisma.sql`AND (${c} = ${scope.shopId} OR ${c} IS NULL)`
      : Prisma.sql`AND ${c} = ${scope.shopId}`;
  }

  private shopWhere(scope: ShopScope, ctx: Ctx) {
    if (!scope.shopId) return {};
    return scope.shopId === ctx.mainId ? { OR: [{ shopId: scope.shopId }, { shopId: null }] } : { shopId: scope.shopId };
  }

  /** One line per product with its value, sales and age in the branches of this view. */
  private async build(user: AuthenticatedUser, scope: ShopScope, q: StockFilterDto, productId?: string) {
    const ctx = await this.context(user, scope, q);
    const { tenantId, now, range, prev } = ctx;
    const shopIds = ctx.shops.map((s) => s.id);
    const one = productId ? { productId } : {};
    const oneSql = productId ? Prisma.sql`AND si."productId" = ${productId}` : Prisma.empty;
    const historyFrom = new Date(Math.min(prev.gte.getTime(), now.getTime() - HISTORY_DAYS * DAY));
    const tenantShops = await this.prisma.shop.count({ where: { tenantId, isActive: true } });

    const [
      products, shopRows, variants, sales, lastIn, lastSupplier, batches, imeiAll, imeiIn,
      elecProfiles, elecSerials, applProfiles, applSerials, agriProfiles, bakeryProfiles, dishes, ingredients, rolls, pieces,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, ...(productId && { id: productId }) },
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, stock: true,
          lowStockAlert: true, isActive: true, isRawMaterial: true, productType: true, createdAt: true,
          category: { select: { id: true, name: true, color: true } },
          brand: { select: { id: true, name: true } },
        },
      }),
      this.prisma.shopStock.findMany({
        where: { tenantId, shopId: { in: shopIds }, ...one },
        select: { shopId: true, productId: true, variantId: true, stock: true, lowStockAlert: true, shopCostPrice: true, shopPrice: true },
      }),
      this.prisma.productVariant.findMany({
        where: { product: { tenantId }, ...one },
        select: { id: true, price: true, costPrice: true },
      }),
      this.prisma.$queryRaw<Array<{
        productId: string; shopId: string; qty: number; revenue: number; cost: number;
        prevQty: number; prevRevenue: number; prevCost: number; last: Date | null;
      }>>`
        SELECT si."productId" AS "productId", COALESCE(s."shopId", ${ctx.mainId}) AS "shopId",
          COALESCE(SUM(CASE WHEN s."soldAt" >= ${range.gte} AND s."soldAt" < ${range.lt} THEN si.quantity - si."returnedQty" END), 0)::float AS qty,
          COALESCE(SUM(CASE WHEN s."soldAt" >= ${range.gte} AND s."soldAt" < ${range.lt} THEN si.total * (si.quantity - si."returnedQty") / NULLIF(si.quantity, 0) END), 0)::float AS revenue,
          COALESCE(SUM(CASE WHEN s."soldAt" >= ${range.gte} AND s."soldAt" < ${range.lt} THEN si."costPrice" * (si.quantity - si."returnedQty") END), 0)::float AS cost,
          COALESCE(SUM(CASE WHEN s."soldAt" >= ${prev.gte} AND s."soldAt" < ${prev.lt} THEN si.quantity - si."returnedQty" END), 0)::float AS "prevQty",
          COALESCE(SUM(CASE WHEN s."soldAt" >= ${prev.gte} AND s."soldAt" < ${prev.lt} THEN si.total * (si.quantity - si."returnedQty") / NULLIF(si.quantity, 0) END), 0)::float AS "prevRevenue",
          COALESCE(SUM(CASE WHEN s."soldAt" >= ${prev.gte} AND s."soldAt" < ${prev.lt} THEN si."costPrice" * (si.quantity - si."returnedQty") END), 0)::float AS "prevCost",
          MAX(CASE WHEN si.quantity > si."returnedQty" THEN s."soldAt" END) AS last
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${tenantId} AND s.status IN ${LIVE} AND si."productId" IS NOT NULL
          AND s."soldAt" >= ${historyFrom} ${oneSql} ${this.shopSql(scope, ctx, 's."shopId"')}
        GROUP BY 1, 2
      `,
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId, quantity: { gt: 0 }, type: { in: [...IN_TYPES] }, ...one, ...this.shopWhere(scope, ctx) },
        _max: { createdAt: true },
      }),
      this.prisma.$queryRaw<Array<{ productId: string; supplierId: string; name: string }>>`
        SELECT DISTINCT ON (pi."productId") pi."productId" AS "productId", p."supplierId" AS "supplierId", sp.name AS name
        FROM "PurchaseItem" pi
        JOIN "Purchase" p ON p.id = pi."purchaseId"
        JOIN "Supplier" sp ON sp.id = p."supplierId"
        WHERE p."tenantId" = ${tenantId} AND p.status IN ('RECEIVED', 'PARTIAL') AND pi."productId" IS NOT NULL
          ${productId ? Prisma.sql`AND pi."productId" = ${productId}` : Prisma.empty}
        ORDER BY pi."productId", COALESCE(p."receivedAt", p."purchasedAt") DESC
      `,
      this.prisma.productBatch.findMany({
        where: { tenantId, isActive: true, quantity: { gt: 0 }, expiryDate: { not: null }, ...one },
        select: { productId: true, batchNumber: true, expiryDate: true, quantity: true, costPrice: true },
      }),
      this.prisma.productImei.groupBy({ by: ['productId'], where: { tenantId, ...one }, _count: { _all: true } }),
      this.prisma.productImei.groupBy({
        by: ['productId', 'variantId', 'shopId'],
        where: { tenantId, status: 'IN_STOCK', ...one },
        _count: { _all: true },
        _sum: { costPrice: true },
      }),
      this.prisma.electronicsProductProfile.findMany({
        where: { tenantId, ...one },
        select: { productId: true, categoryType: true, requiresSerial: true, modelNumber: true },
      }),
      this.prisma.electronicsSerialTracking.groupBy({
        by: ['productId', 'shopId'],
        where: { tenantId, status: 'IN_STOCK', ...one },
        _count: { _all: true, purchasePrice: true },
        _sum: { purchasePrice: true },
      }),
      this.prisma.applianceProductProfile.findMany({
        where: { tenantId, ...one },
        select: { productId: true, categoryType: true, requiresSerial: true, modelNumber: true, capacity: true },
      }),
      this.prisma.applianceSerialTracking.groupBy({
        by: ['productId'],
        where: { tenantId, status: 'IN_STOCK', ...one },
        _count: { _all: true, purchasePrice: true },
        _sum: { purchasePrice: true },
      }),
      this.prisma.agriProductProfile.findMany({
        where: { tenantId, ...one },
        select: { productId: true, category: true, season: true, govtRegExpiry: true, reorderLevel: true, minStockAlert: true, packSize: true, packUnit: true },
      }),
      this.prisma.bakeryProductProfile.findMany({
        where: { tenantId, ...one },
        select: { productId: true, isCustomizable: true, isCakeCustomizable: true, requiresRefrigeration: true },
      }),
      this.prisma.recipe.findMany({ where: { tenantId }, select: { menuItem: { select: { productId: true } } } }),
      this.prisma.recipeIngredient.findMany({
        where: { recipe: { tenantId }, ...(productId && { ingredientProductId: productId }) },
        select: { ingredientProductId: true },
        distinct: ['ingredientProductId'],
      }),
      this.prisma.carpetRoll.findMany({
        where: { tenantId, status: 'ACTIVE', ...one },
        select: { productId: true, shopId: true, remainingSqft: true, costPerSqft: true, salePricePerSqft: true },
      }),
      this.prisma.carpetCutPiece.findMany({
        where: { tenantId, status: 'AVAILABLE', ...one },
        select: { productId: true, shopId: true, totalSqft: true, costAmount: true, salePrice: true },
      }),
    ]);

    // Lookups
    const variant = new Map(variants.map((v) => [v.id, v]));
    const stockRows = new Map<string, typeof shopRows>();
    for (const r of shopRows) {
      const k = `${r.shopId}:${r.productId}`;
      const list = stockRows.get(k) ?? [];
      list.push(r);
      stockRows.set(k, list);
    }
    const soldBy = new Map<string, { qty: number; revenue: number }>();
    const soldTotal = new Map<string, { sold: Sold; prev: Sold; last: Date | null }>();
    for (const s of sales) {
      soldBy.set(`${s.shopId}:${s.productId}`, { qty: n(s.qty), revenue: n(s.revenue) });
      const cur = soldTotal.get(s.productId) ?? { sold: noSale(), prev: noSale(), last: null };
      cur.sold.qty += n(s.qty); cur.sold.revenue += n(s.revenue); cur.sold.cost += n(s.cost);
      cur.prev.qty += n(s.prevQty); cur.prev.revenue += n(s.prevRevenue); cur.prev.cost += n(s.prevCost);
      if (s.last && (!cur.last || s.last > cur.last)) cur.last = s.last;
      soldTotal.set(s.productId, cur);
    }
    const inAt = new Map(lastIn.map((x) => [x.productId, x._max.createdAt]));
    const supplierOf = new Map(lastSupplier.map((x) => [x.productId, { id: x.supplierId, name: x.name }]));
    const imeiTracked = new Set(imeiAll.map((x) => x.productId));
    const imeiAt = new Map<string, Array<{ variantId: string | null; count: number; cost: number }>>();
    for (const x of imeiIn) {
      const k = `${x.shopId ?? ctx.mainId}:${x.productId}`;
      const list = imeiAt.get(k) ?? [];
      list.push({ variantId: x.variantId, count: x._count._all, cost: n(x._sum.costPrice) });
      imeiAt.set(k, list);
    }
    const elec = new Map(elecProfiles.map((p) => [p.productId, p]));
    const elecAt = new Map<string, { count: number; priced: number; cost: number }>();
    for (const x of elecSerials) {
      const k = `${x.shopId ?? ctx.mainId}:${x.productId}`;
      const cur = elecAt.get(k) ?? { count: 0, priced: 0, cost: 0 };
      cur.count += x._count._all; cur.priced += x._count.purchasePrice; cur.cost += n(x._sum.purchasePrice);
      elecAt.set(k, cur);
    }
    const appl = new Map(applProfiles.map((p) => [p.productId, p]));
    const applIn = new Map(applSerials.map((x) => [x.productId, { count: x._count._all, priced: x._count.purchasePrice, cost: n(x._sum.purchasePrice) }]));
    const agri = new Map(agriProfiles.map((p) => [p.productId, p]));
    const bakery = new Map(bakeryProfiles.map((p) => [p.productId, p]));
    const dishIds = new Set(dishes.map((d) => d.menuItem?.productId).filter(Boolean) as string[]);
    const rawIds = new Set(ingredients.map((x) => x.ingredientProductId));
    const carpetAt = new Map<string, { sqft: number; cost: number; retail: number; rolls: number; pieces: number }>();
    const carpetProducts = new Set<string>();
    const addCarpet = (shopId: string | null, pid: string, sqft: number, cost: number, retail: number, roll: boolean) => {
      const k = `${shopId ?? ctx.mainId}:${pid}`;
      const cur = carpetAt.get(k) ?? { sqft: 0, cost: 0, retail: 0, rolls: 0, pieces: 0 };
      cur.sqft += sqft; cur.cost += cost; cur.retail += retail;
      if (roll) cur.rolls += 1; else cur.pieces += 1;
      carpetAt.set(k, cur);
      carpetProducts.add(pid);
    };
    for (const r of rolls) addCarpet(r.shopId, r.productId, n(r.remainingSqft), n(r.remainingSqft) * n(r.costPerSqft), n(r.remainingSqft) * n(r.salePricePerSqft), true);
    for (const p of pieces) addCarpet(p.shopId, p.productId, n(p.totalSqft), n(p.costAmount), n(p.salePrice), false);

    // Batches with an expiry date, priced at the batch cost.
    const expiryLimit = new Date(now.getTime() + EXPIRY_DAYS * DAY);
    const batchesOf = new Map<string, typeof batches>();
    for (const b of batches) {
      const list = batchesOf.get(b.productId) ?? [];
      list.push(b);
      batchesOf.set(b.productId, list);
    }

    const lines: StockLine[] = [];
    const single = tenantShops <= 1;
    for (const p of products) {
      // A dish is made to order from its recipe; its ingredients hold the money.
      if (dishIds.has(p.id)) continue;
      const baseCost = n(p.costPrice);
      const basePrice = n(p.price);
      const ep = elec.get(p.id);
      const ap = appl.get(p.id);
      const isCarpet = carpetProducts.has(p.id) && CARPET_UNITS.has((p.unit || '').toLowerCase());
      let deviceLabel: 'IMEI' | 'Serial' | null = null;
      let deviceCount = 0;

      const parts: ShopPart[] = [];
      for (const sh of ctx.shops) {
        const key = `${sh.id}:${p.id}`;
        const rowsHere = stockRows.get(key) ?? [];
        let stock = 0, cost = 0, retail = 0, alert: number | null = null;
        let shopPrice = basePrice;
        for (const r of rowsHere) {
          const v = r.variantId ? variant.get(r.variantId) : null;
          const uc = v ? n(v.costPrice) || baseCost : r.shopCostPrice ?? baseCost;
          const up = v ? n(v.price) || basePrice : r.shopPrice ?? basePrice;
          stock += n(r.stock); cost += n(r.stock) * uc; retail += n(r.stock) * up;
          if (!r.variantId) { alert = n(r.lowStockAlert); shopPrice = r.shopPrice ?? basePrice; }
        }
        if (!rowsHere.length && single) {
          stock = n(p.stock); cost = stock * baseCost; retail = stock * basePrice;
        }

        if (imeiTracked.has(p.id)) {
          const units = imeiAt.get(key) ?? [];
          stock = units.reduce((a, u) => a + u.count, 0);
          cost = units.reduce((a, u) => a + (u.cost || u.count * baseCost), 0);
          retail = units.reduce((a, u) => a + u.count * ((u.variantId && n(variant.get(u.variantId)?.price)) || shopPrice), 0);
          deviceLabel = 'IMEI'; deviceCount += stock;
        } else if (ep?.requiresSerial) {
          const u = elecAt.get(key) ?? { count: 0, priced: 0, cost: 0 };
          stock = u.count; cost = u.cost + (u.count - u.priced) * baseCost; retail = u.count * shopPrice;
          deviceLabel = 'Serial'; deviceCount += stock;
        } else if (ap?.requiresSerial) {
          // Appliance serials carry no branch; they count in the home branch.
          const u = sh.id === ctx.homeId ? applIn.get(p.id) ?? { count: 0, priced: 0, cost: 0 } : { count: 0, priced: 0, cost: 0 };
          stock = u.count; cost = u.cost + (u.count - u.priced) * baseCost; retail = u.count * shopPrice;
          deviceLabel = 'Serial'; deviceCount += stock;
        } else if (isCarpet) {
          const c = carpetAt.get(key);
          stock = c?.sqft ?? 0; cost = c?.cost ?? 0; retail = c?.retail ?? 0;
        }

        const sold = soldBy.get(key);
        parts.push({
          shopId: sh.id, stock: r3(stock), cost: r2(cost), retail: r2(retail),
          alert: alert ?? n(p.lowStockAlert), sold: r3(sold?.qty ?? 0), revenue: r2(sold?.revenue ?? 0),
        });
      }

      const st = soldTotal.get(p.id);
      const stock = r3(parts.reduce((a, x) => a + x.stock, 0));
      if (!p.isActive && stock === 0 && !st?.sold.qty) continue;

      const valueAtCost = r2(parts.reduce((a, x) => a + x.cost, 0));
      const retail = r2(parts.reduce((a, x) => a + x.retail, 0));
      const ag = agri.get(p.id);
      const agriLevel = ag ? ag.reorderLevel ?? ag.minStockAlert : null;
      const alert = agriLevel != null ? n(agriLevel) : parts.length === 1 ? parts[0].alert : parts.reduce((a, x) => a + (x.stock !== 0 || x.sold ? x.alert : 0), 0) || n(p.lowStockAlert);
      const sold = st?.sold ?? noSale();
      sold.profit = r2(sold.revenue - sold.cost);
      const prevSold = st?.prev ?? noSale();
      prevSold.profit = r2(prevSold.revenue - prevSold.cost);
      const perDay = Math.max(0, sold.qty) / ctx.days;
      const cover = perDay > 0 ? Math.max(0, stock) / perDay : null;
      const lastSoldAt = st?.last ?? null;
      const lastInAt = inAt.get(p.id) ?? null;
      const saleAge = ageOf(now, lastSoldAt);
      const stockAge = ageOf(now, lastInAt ?? p.createdAt);

      const flags: StockFlag[] = [];
      if (stock > 0) {
        const idle = saleAge ?? stockAge ?? 0;
        if (idle >= ctx.deadDays) flags.push('dead');
        else if (cover === null || cover > SLOW_COVER) flags.push('slow');
      }
      if (sold.qty > 0 && cover !== null && cover <= FAST_COVER) flags.push('fast');

      let exp: StockLine['expiry'] = null;
      for (const b of batchesOf.get(p.id) ?? []) {
        if (!b.expiryDate) continue;
        ctx.batches.push({ productId: p.id, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantity: n(b.quantity), cost: n(b.costPrice) || baseCost });
        if (b.expiryDate > expiryLimit) continue;
        exp = exp ?? { date: b.expiryDate, qty: 0, expiredQty: 0, batches: 0, cost: 0 };
        if (b.expiryDate < exp.date) exp.date = b.expiryDate;
        exp.qty += n(b.quantity);
        if (b.expiryDate < now) exp.expiredQty += n(b.quantity);
        exp.batches += 1;
        exp.cost = r2(exp.cost + n(b.quantity) * (n(b.costPrice) || baseCost));
      }
      if (exp) flags.push(exp.expiredQty > 0 ? 'expired' : 'expiry');

      let reg: NonNullable<StockLine['agri']>['reg'] = null;
      if (ag && REGULATED.has(ag.category)) {
        if (!ag.govtRegExpiry) reg = { state: 'none', days: null };
        else {
          const d = Math.round((ag.govtRegExpiry.getTime() - now.getTime()) / DAY);
          if (d < 0) reg = { state: 'expired', days: d };
          else if (d <= REG_SOON_DAYS) reg = { state: 'soon', days: d };
        }
      }
      if (reg?.state === 'expired' && stock > 0) flags.push('blocked');
      else if (reg && stock > 0) flags.push('regSoon');

      const bp = bakery.get(p.id);
      if (p.isRawMaterial || rawIds.has(p.id)) flags.push('raw');
      if (p.productType === 'MADE' || (p.productType !== 'BOUGHT' && !!bp && (bp.isCustomizable || bp.isCakeCustomizable))) flags.push('made');
      if (bp?.requiresRefrigeration) flags.push('fridge');
      if (stock > 0 && valueAtCost <= 0) flags.push('noCost');
      if (stock < 0) flags.push('negative');
      if (!p.isActive) flags.push('inactive');

      const pack = ag?.packSize && ag.packUnit ? `${ag.packSize} ${ag.packUnit}` : null;
      const carpet = isCarpet ? parts.reduce((a, x) => {
        const c = carpetAt.get(`${x.shopId}:${p.id}`);
        return { rolls: a.rolls + (c?.rolls ?? 0), pieces: a.pieces + (c?.pieces ?? 0) };
      }, { rolls: 0, pieces: 0 }) : null;

      lines.push({
        productId: p.id, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit, image: null,
        category: p.category, brand: p.brand, supplier: supplierOf.get(p.id) ?? null,
        price: r2(stock > 0 ? retail / stock : basePrice),
        cost: r2(stock > 0 ? valueAtCost / stock : baseCost),
        stock, alert,
        valueAtCost, retail, profit: r2(retail - valueAtCost), margin: retail > 0 ? r2(((retail - valueAtCost) / retail) * 100) : 0,
        status: stock <= 0 ? 'out' : stock <= alert ? 'low' : 'ok',
        flags,
        sold: { qty: r3(sold.qty), revenue: r2(sold.revenue), cost: r2(sold.cost), profit: sold.profit },
        prevSold: { qty: r3(prevSold.qty), revenue: r2(prevSold.revenue), cost: r2(prevSold.cost), profit: prevSold.profit },
        perDay: r3(perDay), cover: cover === null ? null : Math.round(cover),
        lastSoldAt, lastInAt, saleAge, stockAge,
        devices: deviceLabel ? { label: deviceLabel, count: deviceCount } : null, rolls: carpet,
        group: ap?.categoryType ?? ep?.categoryType ?? ag?.category ?? null,
        detail: [ap?.modelNumber ?? ep?.modelNumber, ap?.capacity, pack].filter(Boolean).join(' · ') || null,
        agri: ag ? { season: ag.season, reg } : null,
        expiry: exp,
        active: p.isActive,
        shops: parts,
      });
    }
    return { ctx, lines };
  }

  private match(q: StockFilterDto) {
    const term = q.search?.trim().toLowerCase();
    return (l: StockLine) =>
      (!q.categoryId || (q.categoryId === 'none' ? !l.category : l.category?.id === q.categoryId))
      && (!q.brandId || (q.brandId === 'none' ? !l.brand : l.brand?.id === q.brandId))
      && (!q.supplierId || (q.supplierId === 'none' ? !l.supplier : l.supplier?.id === q.supplierId))
      && (!q.group || l.group === q.group)
      && (!term || [l.name, l.sku, l.barcode, l.brand?.name, l.category?.name, l.detail].some((v) => v?.toLowerCase().includes(term)));
  }

  private period(ctx: Ctx) {
    return { from: ctx.from, to: ctx.to, days: Math.round(ctx.days), deadDays: ctx.deadDays, expiryDays: EXPIRY_DAYS, fastCover: FAST_COVER, slowCover: SLOW_COVER };
  }

  private totals(rows: StockLine[], ctx: Ctx) {
    const sum = (f: (l: StockLine) => number, list = rows) => r2(list.reduce((a, l) => a + f(l), 0));
    const pick = (flag: (l: StockLine) => boolean) => {
      const list = rows.filter(flag);
      return { count: list.length, cost: sum((l) => l.valueAtCost, list), retail: sum((l) => l.retail, list) };
    };
    const cost = sum((l) => l.valueAtCost);
    const retail = sum((l) => l.retail);
    const soldCost = sum((l) => l.sold.cost);
    const sold = { qty: sum((l) => l.sold.qty), revenue: sum((l) => l.sold.revenue), cost: soldCost, profit: sum((l) => l.sold.profit) };
    const prevSold = { qty: sum((l) => l.prevSold.qty), revenue: sum((l) => l.prevSold.revenue), cost: sum((l) => l.prevSold.cost), profit: sum((l) => l.prevSold.profit) };
    return {
      lines: rows.length,
      stocked: rows.filter((l) => l.stock > 0).length,
      units: sum((l) => Math.max(0, l.stock)),
      cost, retail, profit: r2(retail - cost), margin: retail > 0 ? r2(((retail - cost) / retail) * 100) : 0,
      sold, prevSold,
      /** Days the stock lasts at the period's selling rate (by cost). */
      coverDays: soldCost > 0 ? Math.round(cost / (soldCost / ctx.days)) : null,
      dead: pick(TESTS.dead),
      slow: pick(TESTS.slow),
      expiry: { ...pick(TESTS.expiry), qty: sum((l) => l.expiry?.qty ?? 0), batch: { cost: sum((l) => l.expiry?.cost ?? 0) } },
      blocked: pick((l) => l.flags.includes('blocked')),
      noCost: rows.filter((l) => l.flags.includes('noCost')).length,
    };
  }

  private async withImages(rows: StockLine[]) {
    if (!rows.length) return rows;
    const images = await this.prisma.productImage.findMany({
      where: { productId: { in: rows.map((r) => r.productId) } },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      select: { productId: true, url: true },
    });
    const first = new Map<string, string>();
    for (const i of images) if (!first.has(i.productId)) first.set(i.productId, i.url);
    return rows.map((r) => ({ ...r, image: first.get(r.productId) ?? null }));
  }

  private view(l: StockLine, multi: boolean) {
    const { shops, ...rest } = l;
    return multi ? { ...rest, shops } : rest;
  }

  // ─── Endpoints ───────────────────────────────────────────

  /** Paged lines for the filter, counts per status, totals and facets. */
  async list(user: AuthenticatedUser, scope: ShopScope, q: StockListDto) {
    const { ctx, lines } = await this.build(user, scope, q);
    const base = lines.filter(this.match(q));
    const status = q.status ?? 'all';
    const rows = base.filter(TESTS[status]).sort(SORTS[q.sort ?? 'value']);
    const limit = q.limit ?? 50;
    const pages = Math.max(1, Math.ceil(rows.length / limit));
    const page = Math.min(q.page ?? 1, pages);
    const items = await this.withImages(rows.slice((page - 1) * limit, page * limit));

    const facet = (key: (l: StockLine) => string | null, info: (l: StockLine) => Record<string, unknown>) => {
      const m = new Map<string, Record<string, unknown> & { count: number; retail: number; cost: number }>();
      for (const l of lines) {
        const k = key(l) ?? 'none';
        const cur = m.get(k) ?? { ...info(l), id: k, count: 0, retail: 0, cost: 0 };
        cur.count += 1; cur.retail = r2(cur.retail + l.retail); cur.cost = r2(cur.cost + l.valueAtCost);
        m.set(k, cur);
      }
      return [...m.values()].sort((a, b) => b.count - a.count);
    };

    return {
      items: items.map((l) => this.view(l, ctx.multi)),
      total: rows.length, page, pages,
      counts: Object.fromEntries(Object.entries(TESTS).map(([k, t]) => [k, base.filter(t).length])) as Record<StockStatusFilter, number>,
      totals: this.totals(rows, ctx),
      facets: {
        categories: facet((l) => l.category?.id ?? null, (l) => ({ name: l.category?.name ?? 'Baghair category', color: l.category?.color ?? null })),
        brands: facet((l) => l.brand?.id ?? null, (l) => ({ name: l.brand?.name ?? 'Baghair brand' })),
        suppliers: facet((l) => l.supplier?.id ?? null, (l) => ({ name: l.supplier?.name ?? 'Supplier nahi' })),
        groups: facet((l) => l.group, () => ({})).filter((g) => g.id !== 'none'),
      },
      period: this.period(ctx),
      shops: ctx.multi ? ctx.shops : [],
    };
  }

  /** Breakdowns, age buckets, movers, expiry and the previous-period comparison. */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: StockFilterDto) {
    const { ctx, lines } = await this.build(user, scope, q);
    const rows = lines.filter(this.match(q));
    const stocked = rows.filter((l) => l.stock > 0);

    const by = (key: (l: StockLine) => string | null, name: (l: StockLine) => string, color?: (l: StockLine) => string | null) => {
      const m = new Map<string, { id: string; name: string; color: string | null; lines: number; units: number; cost: number; retail: number; revenue: number }>();
      for (const l of rows) {
        const k = key(l) ?? 'none';
        const cur = m.get(k) ?? { id: k, name: name(l), color: color?.(l) ?? null, lines: 0, units: 0, cost: 0, retail: 0, revenue: 0 };
        cur.lines += 1; cur.units = r3(cur.units + Math.max(0, l.stock));
        cur.cost = r2(cur.cost + l.valueAtCost); cur.retail = r2(cur.retail + l.retail); cur.revenue = r2(cur.revenue + l.sold.revenue);
        m.set(k, cur);
      }
      return [...m.values()].sort((a, b) => b.retail - a.retail).slice(0, 12);
    };
    const buckets = (age: (l: StockLine) => number | null, never: string) => {
      const defs = [
        { key: 'd30', label: '0–30 din', min: 0, max: 30 },
        { key: 'd60', label: '31–60 din', min: 31, max: 60 },
        { key: 'd90', label: '61–90 din', min: 61, max: 90 },
        { key: 'd180', label: '91–180 din', min: 91, max: 180 },
        { key: 'old', label: '180+ din', min: 181, max: Infinity },
      ];
      const out = [...defs.map((d) => ({ key: d.key, label: d.label, lines: 0, cost: 0, retail: 0 })), { key: 'never', label: never, lines: 0, cost: 0, retail: 0 }];
      for (const l of stocked) {
        const a = age(l);
        const b = a === null ? out[out.length - 1] : out[defs.findIndex((d) => a >= d.min && a <= d.max)];
        b.lines += 1; b.cost = r2(b.cost + l.valueAtCost); b.retail = r2(b.retail + l.retail);
      }
      return out;
    };
    const brief = (l: StockLine) => ({
      productId: l.productId, name: l.name, unit: l.unit, stock: l.stock, valueAtCost: l.valueAtCost, retail: l.retail,
      sold: l.sold.qty, revenue: l.sold.revenue, cover: l.cover, saleAge: l.saleAge, stockAge: l.stockAge,
    });

    const ids = new Set(rows.map((l) => l.productId));
    const names = new Map(rows.map((l) => [l.productId, l.name]));
    const batches = ctx.batches.filter((b) => ids.has(b.productId));
    const expDefs = [
      { key: 'expired', label: 'Expire ho chuka', test: (d: number) => d < 0 },
      { key: 'd30', label: '30 din me', test: (d: number) => d >= 0 && d <= 30 },
      { key: 'd90', label: '31–90 din', test: (d: number) => d > 30 && d <= 90 },
      { key: 'd180', label: '91–180 din', test: (d: number) => d > 90 && d <= 180 },
      { key: 'later', label: '180+ din', test: (d: number) => d > 180 },
    ];
    const daysTo = (d: Date) => Math.floor((d.getTime() - ctx.now.getTime()) / DAY);
    const seasons = rows.some((l) => l.agri) ? by((l) => l.agri?.season ?? null, (l) => l.agri?.season ?? 'none') : [];

    return {
      period: this.period(ctx),
      totals: this.totals(rows, ctx),
      status: (['ok', 'low', 'out'] as const).map((s) => {
        const list = rows.filter((l) => l.status === s);
        return { key: s, lines: list.length, cost: r2(list.reduce((a, l) => a + l.valueAtCost, 0)), retail: r2(list.reduce((a, l) => a + l.retail, 0)) };
      }),
      byCategory: by((l) => l.category?.id ?? null, (l) => l.category?.name ?? 'Baghair category', (l) => l.category?.color ?? null),
      byBrand: by((l) => l.brand?.id ?? null, (l) => l.brand?.name ?? 'Baghair brand'),
      bySupplier: by((l) => l.supplier?.id ?? null, (l) => l.supplier?.name ?? 'Supplier nahi'),
      byGroup: rows.some((l) => l.group) ? by((l) => l.group, (l) => l.group ?? 'none') : [],
      bySeason: seasons,
      saleAge: buckets((l) => l.saleAge, 'Saal bhar se nahi bika'),
      stockAge: buckets((l) => l.stockAge, 'Pata nahi'),
      topValue: [...stocked].sort(SORTS.retail).slice(0, 10).map(brief),
      fast: rows.filter((l) => l.sold.qty > 0).sort(SORTS.sold).slice(0, 10).map(brief),
      slow: rows.filter(TESTS.slow).sort(SORTS.retail).slice(0, 10).map(brief),
      dead: rows.filter(TESTS.dead).sort(SORTS.retail).slice(0, 15).map(brief),
      expiry: {
        buckets: expDefs.map((d) => {
          const list = batches.filter((b) => d.test(daysTo(b.expiryDate)));
          return { key: d.key, label: d.label, batches: list.length, qty: r3(list.reduce((a, b) => a + b.quantity, 0)), cost: r2(list.reduce((a, b) => a + b.quantity * b.cost, 0)) };
        }),
        soonest: [...batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime()).slice(0, 15).map((b) => ({
          productId: b.productId, name: names.get(b.productId) ?? '', batchNumber: b.batchNumber, expiryDate: b.expiryDate,
          days: daysTo(b.expiryDate), qty: b.quantity, cost: r2(b.quantity * b.cost),
        })),
      },
      quality: {
        noCost: rows.filter(TESTS.noCost).length,
        negative: rows.filter(TESTS.negative).length,
        inactive: rows.filter((l) => l.flags.includes('inactive') && l.stock > 0).length,
        devices: rows.filter((l) => l.devices).length,
        carpet: rows.filter((l) => l.rolls).length,
      },
    };
  }

  /** Each branch side by side, the most valuable lines per branch, and stock worth moving between them. */
  async branches(user: AuthenticatedUser, scope: ShopScope, q: StockFilterDto) {
    const { ctx, lines } = await this.build(user, scope, q);
    if (!ctx.multi) return { period: this.period(ctx), shops: [], matrix: [], moves: [] };
    const rows = lines.filter(this.match(q));
    const shops = ctx.shops.map((sh) => {
      const parts = rows.map((l) => ({ l, p: l.shops.find((x) => x.shopId === sh.id)! })).filter((x) => x.p);
      const sum = (f: (x: { l: StockLine; p: ShopPart }) => number) => r2(parts.reduce((a, x) => a + f(x), 0));
      const dead = parts.filter((x) => x.p.stock > 0 && x.l.flags.includes('dead'));
      return {
        shopId: sh.id, name: sh.name, isMain: sh.isMain,
        lines: parts.filter((x) => x.p.stock > 0).length,
        units: sum((x) => Math.max(0, x.p.stock)),
        cost: sum((x) => x.p.cost),
        retail: sum((x) => x.p.retail),
        out: parts.filter((x) => x.p.stock <= 0 && (x.p.sold > 0 || x.l.active)).length,
        low: parts.filter((x) => x.p.stock > 0 && x.p.stock <= x.p.alert).length,
        dead: { count: dead.length, cost: r2(dead.reduce((a, x) => a + x.p.cost, 0)) },
        sold: { qty: sum((x) => x.p.sold), revenue: sum((x) => x.p.revenue) },
      };
    });

    const matrix = [...rows].filter((l) => l.stock > 0).sort(SORTS.retail).slice(0, 25).map((l) => ({
      productId: l.productId, name: l.name, unit: l.unit, stock: l.stock, retail: l.retail,
      shops: l.shops.map((p) => ({ shopId: p.shopId, stock: p.stock, sold: p.sold })),
    }));

    // Short where it sells, plenty where it does not: worth a transfer.
    const moves: Array<{ productId: string; name: string; unit: string; from: string; to: string; qty: number; revenue: number }> = [];
    for (const l of rows) {
      for (const need of l.shops) {
        if (need.sold <= 0 || need.stock > need.alert) continue;
        const want = Math.max(need.alert * 2 - need.stock, (need.sold / ctx.days) * 14);
        const giver = l.shops
          .filter((g) => g.shopId !== need.shopId && g.stock > g.alert * 2 && g.sold < need.sold)
          .sort((a, b) => b.stock - a.stock)[0];
        if (!giver) continue;
        const qty = Math.floor(Math.min(want, giver.stock - giver.alert));
        if (qty > 0) moves.push({ productId: l.productId, name: l.name, unit: l.unit, from: giver.shopId, to: need.shopId, qty, revenue: need.revenue });
      }
    }
    return { period: this.period(ctx), shops, matrix, moves: moves.sort((a, b) => b.revenue - a.revenue).slice(0, 20) };
  }

  /** Opening stock, what came in and went out by kind, and closing stock for the period; plus the daily value. */
  async ledger(user: AuthenticatedUser, scope: ShopScope, q: StockLedgerDto) {
    const { ctx, lines } = await this.build(user, scope, q);
    // Carpet is counted from its rolls, not the ledger.
    const rows = lines.filter(this.match(q)).filter((l) => !l.rolls);
    const ids = new Set(rows.map((l) => l.productId));
    const { range, tenantId } = ctx;
    const shopSql = this.shopSql(scope, ctx, 'm."shopId"');
    // Recipe use is written to the ledger but not to branch stock; leave it out so the roll-back stays true.
    const notRecipe = Prisma.sql`AND (m.reference IS NULL OR m.reference NOT LIKE 'Recipe:%')`;

    const [moves, daily] = await Promise.all([
      this.prisma.$queryRaw<Array<{ productId: string; type: string; qty: number; after: number }>>`
        SELECT m."productId" AS "productId", m.type::text AS type,
          COALESCE(SUM(CASE WHEN m."createdAt" < ${range.lt} THEN m.quantity END), 0)::float AS qty,
          COALESCE(SUM(CASE WHEN m."createdAt" >= ${range.lt} THEN m.quantity END), 0)::float AS after
        FROM "StockMovement" m
        WHERE m."tenantId" = ${tenantId} AND m."createdAt" >= ${range.gte} ${shopSql} ${notRecipe}
        GROUP BY 1, 2
      `,
      this.prisma.$queryRaw<Array<{ day: string; productId: string; qty: number }>>`
        SELECT to_char(((m."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ctx.tz}) - make_interval(hours => ${ctx.dayStartHour}::int), 'YYYY-MM-DD') AS day,
          m."productId" AS "productId", SUM(m.quantity)::float AS qty
        FROM "StockMovement" m
        WHERE m."tenantId" = ${tenantId} AND m."createdAt" >= ${range.gte} AND m."createdAt" < ${range.lt} ${shopSql} ${notRecipe}
        GROUP BY 1, 2
      `,
    ]);

    const KIND: Record<string, string> = {
      PURCHASE_IN: 'buy', RETURN_IN: 'returnIn', TRANSFER_IN: 'transferIn', ADJUSTMENT_IN: 'adjustIn', OPENING_BALANCE: 'adjustIn',
      SALE_OUT: 'sale', TRANSFER_OUT: 'transferOut', DAMAGE: 'damage', LOSS: 'damage', ADJUSTMENT_OUT: 'adjustOut', PURCHASE_RETURN: 'supplier',
    };
    const per = new Map<string, { after: number; kinds: Record<string, number> }>();
    for (const m of moves) {
      if (!ids.has(m.productId)) continue;
      const cur = per.get(m.productId) ?? { after: 0, kinds: {} };
      cur.after += n(m.after);
      const k = KIND[m.type] ?? (n(m.qty) >= 0 ? 'adjustIn' : 'adjustOut');
      cur.kinds[k] = (cur.kinds[k] ?? 0) + n(m.qty);
      per.set(m.productId, cur);
    }

    const ledger = rows.map((l) => {
      const p = per.get(l.productId) ?? { after: 0, kinds: {} };
      const net = Object.values(p.kinds).reduce((a, v) => a + v, 0);
      const closing = r3(l.stock - p.after);
      const opening = r3(closing - net);
      const kinds = Object.fromEntries(Object.entries(p.kinds).map(([k, v]) => [k, r3(v)]));
      const inQty = r3(Object.values(p.kinds).filter((v) => v > 0).reduce((a, v) => a + v, 0));
      const outQty = r3(-Object.values(p.kinds).filter((v) => v < 0).reduce((a, v) => a + v, 0));
      return {
        productId: l.productId, name: l.name, sku: l.sku, unit: l.unit, category: l.category,
        opening, closing, change: r3(closing - opening), inQty, outQty, kinds,
        openingValue: { cost: r2(opening * l.cost), retail: r2(opening * l.price) },
        closingValue: { cost: r2(closing * l.cost), retail: r2(closing * l.price) },
        unitCost: { cost: l.cost },
        moved: Object.keys(p.kinds).length > 0,
      };
    });
    const shown = (q.show === 'moved' ? ledger.filter((x) => x.moved) : ledger);
    const SORT: Record<LedgerSort, (a: (typeof ledger)[number], b: (typeof ledger)[number]) => number> = {
      closing: (a, b) => b.closingValue.retail - a.closingValue.retail,
      change: (a, b) => Math.abs(b.change * b.unitCost.cost) - Math.abs(a.change * a.unitCost.cost) || Math.abs(b.change) - Math.abs(a.change),
      in: (a, b) => b.inQty - a.inQty,
      out: (a, b) => b.outQty - a.outQty,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    shown.sort(SORT[q.sort ?? 'closing']);

    // Totals by kind, valued at today's average cost.
    const cost = new Map(rows.map((l) => [l.productId, l]));
    const kinds = new Map<string, { qty: number; cost: number; retail: number }>();
    for (const x of shown) {
      const l = cost.get(x.productId)!;
      for (const [k, v] of Object.entries(x.kinds)) {
        const cur = kinds.get(k) ?? { qty: 0, cost: 0, retail: 0 };
        cur.qty = r3(cur.qty + v); cur.cost = r2(cur.cost + v * l.cost); cur.retail = r2(cur.retail + v * l.price);
        kinds.set(k, cur);
      }
    }
    const sum = (f: (x: (typeof ledger)[number]) => number) => r2(shown.reduce((a, x) => a + f(x), 0));
    const totals = {
      lines: shown.length,
      moved: ledger.filter((x) => x.moved).length,
      opening: { units: sum((x) => x.opening), cost: sum((x) => x.openingValue.cost), retail: sum((x) => x.openingValue.retail) },
      closing: { units: sum((x) => x.closing), cost: sum((x) => x.closingValue.cost), retail: sum((x) => x.closingValue.retail) },
      kinds: [...kinds.entries()].map(([key, v]) => ({ key, ...v })),
    };

    // Value at the end of each business day, rolled back from the closing figure.
    const shownIds = new Set(shown.map((x) => x.productId));
    const netByDay = new Map<string, { units: number; cost: number; retail: number }>();
    for (const d of daily) {
      if (!shownIds.has(d.productId)) continue;
      const l = cost.get(d.productId)!;
      const cur = netByDay.get(d.day) ?? { units: 0, cost: 0, retail: 0 };
      cur.units += n(d.qty); cur.cost += n(d.qty) * l.cost; cur.retail += n(d.qty) * l.price;
      netByDay.set(d.day, cur);
    }
    const keys: string[] = [];
    for (let i = 0; keys.length < 400; i++) {
      const at = addDaysTz(range.gte, i, ctx.tz);
      if (at >= range.lt || at > ctx.now) break;
      keys.push(businessDayKey(at, ctx.tz, ctx.dayStartHour));
    }
    const trend: Array<{ key: string; units: number; cost: number; retail: number }> = [];
    let run = { units: totals.closing.units, cost: totals.closing.cost, retail: totals.closing.retail };
    for (let i = keys.length - 1; i >= 0; i--) {
      trend.unshift({ key: keys[i], units: r3(run.units), cost: r2(run.cost), retail: r2(run.retail) });
      const net = netByDay.get(keys[i]);
      if (net) run = { units: run.units - net.units, cost: run.cost - net.cost, retail: run.retail - net.retail };
    }

    const limit = q.limit ?? 50;
    const pages = Math.max(1, Math.ceil(shown.length / limit));
    const page = Math.min(q.page ?? 1, pages);
    return {
      period: this.period(ctx),
      items: shown.slice((page - 1) * limit, page * limit),
      total: shown.length, page, pages,
      totals, trend,
      skipped: { carpet: lines.filter((l) => l.rolls).length },
    };
  }

  /** One product in this view: branches, variants, batches, units, rolls, recent moves and monthly sales. */
  async item(user: AuthenticatedUser, scope: ShopScope, productId: string, q: StockFilterDto) {
    const { ctx, lines } = await this.build(user, scope, q, productId);
    const line = lines[0];
    if (!line) {
      const exists = await this.prisma.product.count({ where: { id: productId, tenantId: user.tenantId } });
      if (!exists) throw new NotFoundException('Product nahi mila');
    }
    const shopIds = ctx.shops.map((s) => s.id);
    const shopName = new Map(ctx.shops.map((s) => [s.id, s.name]));
    const shopFilter = this.shopWhere(scope, ctx);
    const since = addDaysTz(ctx.now, -180, ctx.tz);

    const [variants, batches, imeis, serials, applSerials, rolls, pieces, moves, monthly, product] = await Promise.all([
      this.prisma.shopStock.findMany({
        where: { tenantId: user.tenantId, productId, shopId: { in: shopIds }, variantId: { not: null } },
        select: { shopId: true, stock: true, variant: { select: { id: true, name: true, costPrice: true, price: true } } },
      }),
      this.prisma.productBatch.findMany({
        where: { tenantId: user.tenantId, productId, isActive: true, quantity: { gt: 0 } },
        orderBy: [{ expiryDate: 'asc' }], take: 50,
        select: { id: true, batchNumber: true, expiryDate: true, quantity: true, costPrice: true },
      }),
      this.prisma.productImei.findMany({
        where: { tenantId: user.tenantId, productId, status: 'IN_STOCK', ...shopFilter },
        orderBy: { createdAt: 'asc' }, take: 100,
        select: { id: true, imei1: true, ptaStatus: true, costPrice: true, purchasedAt: true, createdAt: true, shopId: true, variant: { select: { name: true } } },
      }),
      this.prisma.electronicsSerialTracking.findMany({
        where: { tenantId: user.tenantId, productId, status: 'IN_STOCK', ...shopFilter },
        orderBy: { createdAt: 'asc' }, take: 100,
        select: { id: true, serialNumber: true, purchasePrice: true, purchaseDate: true, warrantyEndDate: true, createdAt: true, shopId: true },
      }),
      this.prisma.applianceSerialTracking.findMany({
        where: { tenantId: user.tenantId, productId, status: 'IN_STOCK' },
        orderBy: { createdAt: 'asc' }, take: 100,
        select: { id: true, serialNumber: true, purchasePrice: true, purchaseDate: true, warrantyEndDate: true, createdAt: true },
      }),
      this.prisma.carpetRoll.findMany({
        where: { tenantId: user.tenantId, productId, status: 'ACTIVE', ...shopFilter },
        orderBy: { rollNumber: 'asc' }, take: 100,
        select: { id: true, rollNumber: true, remainingSqft: true, costPerSqft: true, salePricePerSqft: true, receivedAt: true, shopId: true },
      }),
      this.prisma.carpetCutPiece.findMany({
        where: { tenantId: user.tenantId, productId, status: 'AVAILABLE', ...shopFilter },
        orderBy: { pieceCode: 'asc' }, take: 100,
        select: { id: true, pieceCode: true, totalSqft: true, costAmount: true, salePrice: true, createdAt: true, shopId: true },
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId: user.tenantId, productId, ...shopFilter },
        orderBy: { createdAt: 'desc' }, take: 25,
        select: { id: true, type: true, quantity: true, balanceAfter: true, reference: true, note: true, createdAt: true, shopId: true },
      }),
      this.prisma.$queryRaw<Array<{ key: string; qty: number; revenue: number }>>`
        SELECT to_char(((s."soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ctx.tz}) - make_interval(hours => ${ctx.dayStartHour}::int), 'YYYY-MM') AS key,
          COALESCE(SUM(si.quantity - si."returnedQty"), 0)::float AS qty,
          COALESCE(SUM(si.total * (si.quantity - si."returnedQty") / NULLIF(si.quantity, 0)), 0)::float AS revenue
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${user.tenantId} AND s.status IN ${LIVE} AND si."productId" = ${productId}
          AND s."soldAt" >= ${since} ${this.shopSql(scope, ctx, 's."shopId"')}
        GROUP BY 1 ORDER BY 1
      `,
      line ? null : this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, name: true, unit: true } }),
    ]);

    const age = (d: Date | null) => ageOf(ctx.now, d);
    const variantRows = new Map<string, { id: string; name: string; stock: number; cost: number; retail: number }>();
    for (const v of variants) {
      if (!v.variant) continue;
      const cur = variantRows.get(v.variant.id) ?? { id: v.variant.id, name: v.variant.name, stock: 0, cost: 0, retail: 0 };
      cur.stock = r3(cur.stock + n(v.stock));
      cur.cost = r2(cur.cost + n(v.stock) * (n(v.variant.costPrice) || (line?.cost ?? 0)));
      cur.retail = r2(cur.retail + n(v.stock) * (n(v.variant.price) || (line?.price ?? 0)));
      variantRows.set(v.variant.id, cur);
    }
    return {
      period: this.period(ctx),
      line: line ? (await this.withImages([line])).map((l) => ({ ...l, shops: l.shops.map((s) => ({ ...s, name: shopName.get(s.shopId) ?? '' })) }))[0] : null,
      product: product ?? null,
      variants: [...variantRows.values()].sort((a, b) => b.stock - a.stock),
      batches: batches.map((b) => ({
        id: b.id, batchNumber: b.batchNumber, expiryDate: b.expiryDate, qty: n(b.quantity),
        cost: r2(n(b.quantity) * (n(b.costPrice) || (line?.cost ?? 0))),
        days: b.expiryDate ? Math.floor((b.expiryDate.getTime() - ctx.now.getTime()) / DAY) : null,
      })),
      units: [
        ...imeis.map((u) => ({ id: u.id, label: 'IMEI', ref: u.imei1, note: [u.variant?.name, u.ptaStatus].filter(Boolean).join(' · '), cost: n(u.costPrice), ageDays: age(u.purchasedAt ?? u.createdAt), warrantyEnd: null as Date | null, shop: shopName.get(u.shopId ?? ctx.mainId) ?? '' })),
        ...serials.map((u) => ({ id: u.id, label: 'Serial', ref: u.serialNumber, note: '', cost: n(u.purchasePrice), ageDays: age(u.purchaseDate ?? u.createdAt), warrantyEnd: u.warrantyEndDate, shop: shopName.get(u.shopId ?? ctx.mainId) ?? '' })),
        ...applSerials.map((u) => ({ id: u.id, label: 'Serial', ref: u.serialNumber, note: '', cost: n(u.purchasePrice), ageDays: age(u.purchaseDate ?? u.createdAt), warrantyEnd: u.warrantyEndDate, shop: '' })),
      ],
      rolls: [
        ...rolls.map((r) => ({ id: r.id, kind: 'roll' as const, ref: r.rollNumber, sqft: n(r.remainingSqft), cost: r2(n(r.remainingSqft) * n(r.costPerSqft)), retail: r2(n(r.remainingSqft) * n(r.salePricePerSqft)), ageDays: age(r.receivedAt), shop: shopName.get(r.shopId ?? ctx.mainId) ?? '' })),
        ...pieces.map((p) => ({ id: p.id, kind: 'piece' as const, ref: p.pieceCode, sqft: n(p.totalSqft), cost: n(p.costAmount), retail: n(p.salePrice), ageDays: age(p.createdAt), shop: shopName.get(p.shopId ?? ctx.mainId) ?? '' })),
      ],
      moves: moves.map((m) => ({ ...m, shop: m.shopId ? shopName.get(m.shopId) ?? '' : '' })),
      monthly: monthly.map((m) => ({ key: m.key, qty: r3(n(m.qty)), revenue: r2(n(m.revenue)) })),
    };
  }
}
