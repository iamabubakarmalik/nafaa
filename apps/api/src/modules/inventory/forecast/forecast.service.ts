/**
 * Stock forecast for every shop (not only online): per product, how fast it
 * sells, how many days the stock lasts, the day it runs out, safety stock
 * from how much the daily sales swing and the supplier's lead days, the
 * reorder point and an order quantity rounded to the supplier's pack and
 * minimum. Online orders count once billed, since a billed channel order is
 * a sale. Lines are also classed fast, slow, dead or overstock.
 *
 * A nightly job stores one snapshot per business (and branch) so the page
 * opens fast; the page recomputes when the snapshot is older than a day or
 * the settings differ from the defaults.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '../../../core/system-control/cron.decorator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { apiMessage } from '../../../common/i18n/api-message';
import { NotificationsService } from '../../notifications/notifications.service';
import { festivalsBetween } from '../../growth/social/social-math';
import {
  DAY_MS, FORECAST_DEFAULTS, type ForecastClass, type ForecastSettings, classify, dailyStdDev, daysOfCover, festivalFactor,
  percentile, reorderPlan, seasonalFactor, stockOutDate, weeklyTotals, weightedVelocity,
} from './forecast-math';
import type { ForecastQueryDto } from './forecast.dto';

export interface ForecastRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string } | null;
  stock: number;
  onOrder: number;
  cost: number;
  price: number;
  sold: { d7: number; d30: number; d90: number };
  /** Weighted units per day before season and festivals. */
  velocity: number;
  /** Last-year factor, or null when last year has too little history. */
  season: number | null;
  /** Festival bump applied (only without last-year history). */
  festival: { factor: number; names: string[] } | null;
  /** Forecast units per day. */
  demand: number;
  cover: number | null;
  stockOut: string | null;
  lastSale: string | null;
  daysSinceSale: number | null;
  supplier: { id: string; name: string; phone: string | null } | null;
  leadDays: number;
  leadFromSupplier: boolean;
  pack: { name: string; size: number } | null;
  minOrder: number | null;
  safety: number;
  reorderPoint: number;
  suggestQty: number;
  orderInDays: number | null;
  orderValue: number;
  cls: ForecastClass;
  /** Cost of the stock when dead; cost of the stock above the overstock days when overstocked. */
  tiedValue: number;
  /** Units sold per week, last 12 weeks, oldest first. */
  spark: number[];
  variants: Array<{ id: string; name: string; stock: number; sold30: number; cover: number | null }>;
}

export interface ForecastSummary {
  products: number;
  stockOut7: number;
  outNow: number;
  deadCount: number;
  deadValue: number;
  overCount: number;
  overValue: number;
  reorderCount: number;
  reorderValue: number;
  fast: number;
  slow: number;
  festivals: string[];
}

interface Computed { rows: ForecastRow[]; summary: ForecastSummary; today: string; computedAt: string; settings: ForecastSettings }

const LIVE = `'COMPLETED','PARTIALLY_RETURNED','FULLY_RETURNED'`;
const HISTORY = 90;
const FRESH_MS = 26 * 3_600_000;
const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Number((Number.isFinite(v) ? v : 0).toFixed(2));
const r3 = (v: number) => Number((Number.isFinite(v) ? v : 0).toFixed(3));
const dayNo = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const keyOf = (no: number) => new Date(no * DAY_MS).toISOString().slice(0, 10);

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly notifications: NotificationsService,
  ) {}

  settings(q: Partial<ForecastQueryDto> = {}): ForecastSettings {
    return {
      coverDays: q.coverDays ?? FORECAST_DEFAULTS.coverDays,
      defaultLeadDays: q.leadDays ?? FORECAST_DEFAULTS.defaultLeadDays,
      z: FORECAST_DEFAULTS.z,
      deadDays: q.deadDays ?? FORECAST_DEFAULTS.deadDays,
      overstockDays: q.overstockDays ?? FORECAST_DEFAULTS.overstockDays,
      festivals: q.festivals !== false,
    };
  }

  private isDefault(s: ForecastSettings) {
    const d = FORECAST_DEFAULTS;
    return s.coverDays === d.coverDays && s.defaultLeadDays === d.defaultLeadDays && s.deadDays === d.deadDays
      && s.overstockDays === d.overstockDays && s.festivals === d.festivals;
  }

  // ═══════════════════════════════════════════════════════════
  // PAGE
  // ═══════════════════════════════════════════════════════════

  async list(user: AuthenticatedUser, scope: ShopScope, q: ForecastQueryDto) {
    const s = this.settings(q);
    const data = await this.load(user.tenantId, scope.shopId, s, !!q.refresh);
    const search = q.search?.trim().toLowerCase();
    const filter = q.filter ?? 'all';
    const rows = data.rows.filter((r) => {
      if (search && !`${r.name} ${r.sku ?? ''}`.toLowerCase().includes(search)) return false;
      if (q.categoryId && r.category?.id !== q.categoryId) return false;
      if (q.supplierId && (q.supplierId === 'none' ? !!r.supplier : r.supplier?.id !== q.supplierId)) return false;
      switch (filter) {
        case 'stockout7': return r.cover !== null && r.cover <= 7;
        case 'reorder': return r.suggestQty > 0;
        case 'fast': case 'slow': case 'dead': case 'overstock': return r.cls === filter;
        default: return r.cls !== 'none' || r.stock > 0;
      }
    });
    const sort = q.sort ?? 'urgency';
    const cover = (r: ForecastRow) => (r.cover === null ? Number.MAX_SAFE_INTEGER : r.cover);
    rows.sort((a, b) => {
      switch (sort) {
        case 'value': return b.orderValue - a.orderValue || cover(a) - cover(b);
        case 'tied': return b.tiedValue - a.tiedValue;
        case 'demand': return b.demand - a.demand;
        case 'name': return a.name.localeCompare(b.name);
        default: return (b.suggestQty > 0 ? 1 : 0) - (a.suggestQty > 0 ? 1 : 0) || cover(a) - cover(b) || b.demand - a.demand;
      }
    });
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const items = rows.slice((page - 1) * limit, page * limit);
    const images = items.length
      ? await this.prisma.productImage.findMany({
        where: { productId: { in: items.map((r) => r.productId) } },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        select: { productId: true, url: true },
      })
      : [];
    const image = new Map<string, string>();
    for (const im of images) if (!image.has(im.productId)) image.set(im.productId, im.url);
    const categories = new Map<string, { id: string; name: string }>();
    const suppliers = new Map<string, { id: string; name: string }>();
    for (const r of data.rows) {
      if (r.category) categories.set(r.category.id, r.category);
      if (r.supplier) suppliers.set(r.supplier.id, { id: r.supplier.id, name: r.supplier.name });
    }
    return {
      items: items.map((r) => ({ ...r, image: image.get(r.productId) ?? null })),
      total: rows.length,
      page,
      limit,
      summary: data.summary,
      today: data.today,
      computedAt: data.computedAt,
      settings: data.settings,
      categories: [...categories.values()].sort((a, b) => a.name.localeCompare(b.name)),
      suppliers: [...suppliers.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Lines to order, grouped by supplier (and the lines with no supplier),
   * for the purchase editor to open as an unsaved order.
   */
  async orderGroups(user: AuthenticatedUser, scope: ShopScope, body: { productIds?: string[] }) {
    const data = await this.load(user.tenantId, scope.shopId, this.settings(), false);
    const pick = body?.productIds?.length ? new Set(body.productIds) : null;
    const rows = data.rows.filter((r) => r.suggestQty > 0 && (!pick || pick.has(r.productId)));
    const groups = new Map<string, { supplier: ForecastRow['supplier']; lines: Array<{ productId: string; name: string; qty: number; cost: number; unit: string }>; value: number }>();
    for (const r of rows) {
      const k = r.supplier?.id ?? 'none';
      const g = groups.get(k) ?? { supplier: r.supplier, lines: [], value: 0 };
      g.lines.push({ productId: r.productId, name: r.name, qty: r.suggestQty, cost: r.cost, unit: r.unit });
      g.value = r2(g.value + r.orderValue);
      groups.set(k, g);
    }
    return { shopId: scope.shopId, groups: [...groups.values()].sort((a, b) => (a.supplier ? 0 : 1) - (b.supplier ? 0 : 1) || b.value - a.value) };
  }

  private async load(tenantId: string, shopId: string | null, s: ForecastSettings, refresh: boolean): Promise<Computed> {
    const scopeKey = shopId ?? 'all';
    if (!refresh && this.isDefault(s)) {
      const snap = await this.prisma.stockForecastSnapshot.findUnique({ where: { tenantId_scopeKey: { tenantId, scopeKey } } });
      if (snap && Date.now() - snap.computedAt.getTime() < FRESH_MS) {
        const body = snap.rows as unknown as { rows: ForecastRow[]; today: string };
        return { rows: body.rows, today: body.today, summary: snap.summary as unknown as ForecastSummary, computedAt: snap.computedAt.toISOString(), settings: s };
      }
    }
    const c = await this.compute(tenantId, shopId, s);
    if (this.isDefault(s)) await this.save(tenantId, scopeKey, c);
    return c;
  }

  private async save(tenantId: string, scopeKey: string, c: Computed) {
    const data = { rows: { rows: c.rows, today: c.today } as unknown as Prisma.InputJsonValue, summary: c.summary as unknown as Prisma.InputJsonValue, computedAt: new Date(c.computedAt) };
    await this.prisma.stockForecastSnapshot.upsert({
      where: { tenantId_scopeKey: { tenantId, scopeKey } },
      create: { tenantId, scopeKey, ...data },
      update: data,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // COMPUTE
  // ═══════════════════════════════════════════════════════════

  async compute(tenantId: string, shopId: string | null, s: ForecastSettings): Promise<Computed> {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    const today = businessDayKey(now, tz, dayStartHour);
    const todayNo = dayNo(today);
    const horizon = s.defaultLeadDays + s.coverDays;
    // Last year: 30 days before this date and the coming horizon (plus a week for longer supplier lead times).
    const lyStart = todayNo - 365 - 30;
    const lyEnd = todayNo - 365 + horizon + 7;

    const shops = await this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true, isMain: true }, orderBy: { isMain: 'desc' } });
    const mainId = shops.find((x) => x.isMain)?.id ?? shops[0]?.id ?? null;
    const shopIds = shopId ? [shopId] : shops.map((x) => x.id);
    // Untagged sales belong to the main branch.
    const saleShop = !shopId
      ? Prisma.empty
      : shopId === mainId ? Prisma.sql`AND (s."shopId" = ${shopId} OR s."shopId" IS NULL)` : Prisma.sql`AND s."shopId" = ${shopId}`;
    const local = Prisma.sql`to_char((s."soldAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}) - make_interval(hours => ${dayStartHour}::int), 'YYYY-MM-DD')`;
    const since = new Date(now.getTime() - (HISTORY + 2) * DAY_MS);
    const lyFrom = new Date((lyStart - 1) * DAY_MS);
    const lyTo = new Date((lyEnd + 2) * DAY_MS);

    const [products, stockRows, daily, lastSales, open, links, lastBuys] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, sku: true, unit: true, price: true, costPrice: true, stock: true, createdAt: true, hasVariants: true, productType: true,
          category: { select: { id: true, name: true } },
          variants: { where: { isActive: true }, select: { id: true, name: true, stock: true } },
        },
      }),
      this.prisma.shopStock.findMany({ where: { tenantId, shopId: { in: shopIds } }, select: { productId: true, variantId: true, stock: true } }),
      this.prisma.$queryRaw<Array<{ pid: string; vid: string | null; day: string; qty: number }>>`
        SELECT si."productId" AS pid, siv."variantId" AS vid, ${local} AS day, SUM(si.quantity - si."returnedQty")::float AS qty
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        LEFT JOIN "SaleItemVariant" siv ON siv."saleItemId" = si.id
        WHERE s."tenantId" = ${tenantId} AND s.status::text IN (${Prisma.raw(LIVE)}) AND si."productId" IS NOT NULL
          AND ((s."soldAt" >= ${since}) OR (s."soldAt" >= ${lyFrom} AND s."soldAt" < ${lyTo})) ${saleShop}
        GROUP BY 1, 2, 3`,
      this.prisma.$queryRaw<Array<{ pid: string; at: Date }>>`
        SELECT si."productId" AS pid, MAX(s."soldAt") AS at
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${tenantId} AND s.status::text IN (${Prisma.raw(LIVE)}) AND si."productId" IS NOT NULL ${saleShop}
        GROUP BY 1`,
      this.prisma.purchaseItem.findMany({
        where: { productId: { not: null }, purchase: { tenantId, status: { in: ['PENDING', 'PARTIAL'] }, ...(shopId && { OR: [{ shopId }, { shopId: null }] }) } },
        select: { productId: true, quantity: true, conversionRate: true, baseQuantity: true, receivedQty: true },
      }),
      this.prisma.productSupplier.findMany({
        where: { tenantId },
        orderBy: [{ isPreferred: 'desc' }, { lastPurchasedAt: { sort: 'desc', nulls: 'last' } }],
        select: { productId: true, supplierId: true, costPrice: true, lastPurchasePrice: true, minOrderQty: true, leadDays: true, unitId: true },
      }),
      this.prisma.$queryRaw<Array<{ pid: string; sid: string; cost: number }>>`
        SELECT DISTINCT ON (pi."productId") pi."productId" AS pid, p."supplierId" AS sid, (pi."costPrice" / NULLIF(pi."conversionRate", 0))::float AS cost
        FROM "PurchaseItem" pi JOIN "Purchase" p ON p.id = pi."purchaseId"
        WHERE p."tenantId" = ${tenantId} AND p.status::text <> 'CANCELLED' AND pi."productId" IS NOT NULL
        ORDER BY pi."productId", p."purchasedAt" DESC`,
    ]);

    // Daily sales by product (and variant), indexed by days back from today.
    const recent = new Map<string, number[]>();
    const lastYear = new Map<string, { prev30: number; ahead: number }>();
    const variantSold = new Map<string, number>();
    for (const d of daily) {
      const no = dayNo(d.day);
      const qty = n(d.qty);
      const back = todayNo - no;
      if (back >= 0 && back < HISTORY) {
        const arr = recent.get(d.pid) ?? new Array<number>(HISTORY).fill(0);
        arr[HISTORY - 1 - back] += qty;
        recent.set(d.pid, arr);
        if (d.vid && back < 30) variantSold.set(d.vid, (variantSold.get(d.vid) ?? 0) + qty);
      } else if (no >= lyStart && no <= lyEnd) {
        const ly = lastYear.get(d.pid) ?? { prev30: 0, ahead: 0 };
        const base = todayNo - 365;
        if (no < base) ly.prev30 += qty;
        else if (no < base + horizon) ly.ahead += qty;
        lastYear.set(d.pid, ly);
      }
    }
    const last = new Map(lastSales.map((x) => [x.pid, x.at]));

    const stock = new Map<string, number>();
    const vStock = new Map<string, number>();
    for (const r of stockRows) {
      stock.set(r.productId, (stock.get(r.productId) ?? 0) + n(r.stock));
      if (r.variantId) vStock.set(r.variantId, (vStock.get(r.variantId) ?? 0) + n(r.stock));
    }
    const onOrder = new Map<string, number>();
    for (const o of open) {
      const left = Math.max(0, (n(o.baseQuantity) || n(o.quantity) * (o.conversionRate || 1)) - n(o.receivedQty));
      onOrder.set(o.productId!, (onOrder.get(o.productId!) ?? 0) + left);
    }
    const link = new Map<string, (typeof links)[number]>();
    for (const l of links) if (!link.has(l.productId)) link.set(l.productId, l);
    const lastBuy = new Map(lastBuys.map((x) => [x.pid, x]));
    const supplierIds = new Set<string>();
    for (const p of products) {
      const sid = link.get(p.id)?.supplierId ?? lastBuy.get(p.id)?.sid;
      if (sid) supplierIds.add(sid);
    }
    const unitIds = [...new Set(links.map((l) => l.unitId).filter(Boolean) as string[])];
    const [suppliers, units] = await Promise.all([
      supplierIds.size ? this.prisma.supplier.findMany({ where: { tenantId, id: { in: [...supplierIds] } }, select: { id: true, name: true, phone: true } }) : [],
      unitIds.length ? this.prisma.productUnit.findMany({ where: { tenantId, id: { in: unitIds } }, select: { id: true, unitName: true, conversionRate: true } }) : [],
    ]);
    const supplier = new Map(suppliers.map((x) => [x.id, x]));
    const unit = new Map(units.map((u) => [u.id, u]));

    const fest = s.festivals ? festivalsBetween(keyOf(todayNo), keyOf(todayNo + horizon + 30)).filter((f) => f.sale) : [];
    const festDefault = festivalFactor(fest, new Date(todayNo * DAY_MS), horizon);

    const rows: ForecastRow[] = [];
    for (const p of products) {
      if (p.productType === 'SERVICE') continue;
      const series = recent.get(p.id) ?? new Array<number>(HISTORY).fill(0);
      const ageDays = Math.max(0, Math.floor((now.getTime() - p.createdAt.getTime()) / DAY_MS));
      const sum = (days: number) => series.slice(HISTORY - days).reduce((a, x) => a + x, 0);
      const sold = { d7: r3(sum(7)), d30: r3(sum(30)), d90: r3(sum(90)) };
      const hasStockRow = stock.has(p.id);
      const qty = hasStockRow ? stock.get(p.id)! : n(p.stock);
      if (!(qty > 0) && !(sold.d90 > 0)) continue;

      const velocity = weightedVelocity(sold, ageDays);
      const ly = lastYear.get(p.id);
      const season = ly ? seasonalFactor({ prev30: ly.prev30, ahead: ly.ahead, aheadDays: horizon }) : null;
      const festival = season === null && festDefault.names.length && velocity > 0 ? festDefault : null;
      const demand = r3(velocity * (season ?? festival?.factor ?? 1));

      const l = link.get(p.id);
      const lb = lastBuy.get(p.id);
      const sup = supplier.get(l?.supplierId ?? lb?.sid ?? '') ?? null;
      const leadDays = l?.leadDays && l.leadDays > 0 ? l.leadDays : s.defaultLeadDays;
      const u = l?.unitId ? unit.get(l.unitId) : undefined;
      const pack = u && u.conversionRate > 1 ? { name: u.unitName, size: u.conversionRate } : null;
      const cost = n(l?.costPrice) || n(l?.lastPurchasePrice) || n(lb?.cost) || n(p.costPrice);
      const pending = r3(onOrder.get(p.id) ?? 0);
      const plan = reorderPlan({
        demand, stock: qty, onOrder: pending, stdDev: dailyStdDev(series.slice(HISTORY - Math.min(30, Math.max(7, ageDays)))),
        leadDays, coverDays: s.coverDays, z: s.z, pack: pack?.size, minOrder: l?.minOrderQty,
      });
      const cover = daysOfCover(qty, demand);
      const lastAt = last.get(p.id) ?? null;
      const lastKey = lastAt ? businessDayKey(lastAt, tz, dayStartHour) : null;
      const daysSinceSale = lastKey ? Math.max(0, todayNo - dayNo(lastKey)) : null;

      rows.push({
        productId: p.id, name: p.name, sku: p.sku, unit: p.unit, image: null, category: p.category,
        stock: r3(qty), onOrder: pending, cost: r2(cost), price: r2(n(p.price)),
        sold, velocity, season, festival, demand, cover, stockOut: stockOutDate(today, cover),
        lastSale: lastKey, daysSinceSale,
        supplier: sup, leadDays, leadFromSupplier: !!(l?.leadDays && l.leadDays > 0), pack, minOrder: l?.minOrderQty ?? null,
        safety: plan.safety, reorderPoint: plan.reorderPoint, suggestQty: plan.suggestQty, orderInDays: plan.orderInDays,
        orderValue: r2(plan.suggestQty * cost),
        cls: 'normal', tiedValue: 0, spark: weeklyTotals(series, 12),
        variants: p.hasVariants
          ? p.variants.map((v) => {
            const vs = hasStockRow ? vStock.get(v.id) ?? 0 : n(v.stock);
            const vd = (variantSold.get(v.id) ?? 0) / 30;
            return { id: v.id, name: v.name, stock: r3(vs), sold30: r3(variantSold.get(v.id) ?? 0), cover: daysOfCover(vs, vd) };
          })
          : [],
      });
      (rows[rows.length - 1] as ForecastRow & { ageDays?: number }).ageDays = ageDays;
    }

    const selling = rows.map((r) => r.demand).filter((d) => d > 0);
    const fastAt = percentile(selling, 0.8);
    const slowAt = percentile(selling, 0.3);
    for (const r of rows as Array<ForecastRow & { ageDays?: number }>) {
      r.cls = classify({
        stock: r.stock, demand: r.demand, cover: r.cover, ageDays: r.ageDays ?? 0, daysSinceSale: r.daysSinceSale,
        fastAt, slowAt, deadDays: s.deadDays, overstockDays: s.overstockDays,
      });
      r.tiedValue = r.cls === 'dead'
        ? r2(Math.max(0, r.stock) * r.cost)
        : r.cls === 'overstock' ? r2(Math.max(0, r.stock - r.demand * s.overstockDays) * r.cost) : 0;
      delete r.ageDays;
    }

    const summary: ForecastSummary = {
      products: rows.length,
      stockOut7: rows.filter((r) => r.cover !== null && r.cover <= 7).length,
      outNow: rows.filter((r) => r.stock <= 0 && r.demand > 0).length,
      deadCount: rows.filter((r) => r.cls === 'dead').length,
      deadValue: r2(rows.filter((r) => r.cls === 'dead').reduce((a, r) => a + r.tiedValue, 0)),
      overCount: rows.filter((r) => r.cls === 'overstock').length,
      overValue: r2(rows.filter((r) => r.cls === 'overstock').reduce((a, r) => a + r.tiedValue, 0)),
      reorderCount: rows.filter((r) => r.suggestQty > 0).length,
      reorderValue: r2(rows.reduce((a, r) => a + r.orderValue, 0)),
      fast: rows.filter((r) => r.cls === 'fast').length,
      slow: rows.filter((r) => r.cls === 'slow').length,
      festivals: festDefault.names,
    };
    return { rows, summary, today, computedAt: now.toISOString(), settings: s };
  }

  // ═══════════════════════════════════════════════════════════
  // NIGHTLY SNAPSHOT + ALERT
  // ═══════════════════════════════════════════════════════════

  /** 2:30 AM server time: snapshots for every business that sold in the last 90 days. */
  @Cron('30 2 * * *')
  async nightly() {
    if (process.env.DISABLE_FORECAST_JOB === '1' || process.env.DISABLE_FORECAST_JOB === 'true') return;
    const since = new Date(Date.now() - HISTORY * DAY_MS);
    const tenants = await this.prisma.sale.groupBy({ by: ['tenantId'], where: { soldAt: { gte: since } } });
    let done = 0;
    for (const { tenantId } of tenants) {
      try {
        await this.snapshotTenant(tenantId);
        done++;
      } catch (e) {
        this.logger.warn(`Forecast for ${tenantId} failed: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Stock forecast snapshots: ${done}/${tenants.length}`);
  }

  /** Whole-business snapshot, one per active branch when there are several, and the stock-out alert. */
  async snapshotTenant(tenantId: string) {
    const s = this.settings();
    const c = await this.compute(tenantId, null, s);
    await this.save(tenantId, 'all', c);
    const shops = await this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true } });
    if (shops.length > 1) {
      for (const sh of shops) await this.save(tenantId, sh.id, await this.compute(tenantId, sh.id, s));
    }
    const soon = c.rows.filter((r) => r.cover !== null && r.cover <= 7 && r.demand > 0);
    if (!soon.length) return;
    const dup = await this.prisma.notification.findFirst({
      where: { tenantId, type: 'LOW_STOCK', link: '/inventory/forecast', createdAt: { gte: new Date(Date.now() - 20 * 3_600_000) } },
      select: { id: true },
    });
    if (dup) return;
    const names = soon.slice(0, 3).map((r) => r.name).join(', ');
    await this.notifications.create({
      tenantId,
      type: 'LOW_STOCK',
      title: 'Stock khatam hone wala hai',
      message: apiMessage('{{count}} cheezein 7 din me khatam: {{names}}', { count: soon.length, names }),
      link: '/inventory/forecast',
      metadata: { forecast: true, count: soon.length },
    });
  }
}
