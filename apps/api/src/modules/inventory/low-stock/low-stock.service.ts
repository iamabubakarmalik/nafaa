/**
 * Low stock and reorder for every industry, one row per branch and product.
 * Stock and the alert level come from ShopStock; the daily average comes
 * from that branch's sales over the last N business days (shop timezone and
 * day start). Each row says how long the stock lasts, how much to order to
 * cover the target days, what is already on order, who supplied it last and
 * at what cost, and which batches are expiring. Industry facts are added
 * where the shop keeps them: IMEI and serial counts, appliance and
 * electronics types, bakery items made in-house, agri registration and
 * season, and restaurant ingredients used through recipes.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { addDaysTz, businessDayKey, startOfBusinessDayTz, tzParts } from '../../../common/helpers/business-time.helper';
import type { IgnoreDto, ListLowStockDto, LowStockSettingsDto, SetAlertDto } from './dto/low-stock.dto';

export type LowStatus = 'out' | 'low' | 'soon' | 'expiry' | 'registration' | 'season';

export interface LowStockSettings { days: number; targetDays: number; soonDays: number; expiryDays: number }

export interface LowStockRow {
  key: string;
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  price: number;
  cost: number;
  stock: number;
  alert: number;
  alertFrom: 'branch' | 'product' | 'agri';
  /** Most urgent reason; the full list is in `flags`. */
  status: LowStatus;
  flags: LowStatus[];
  /** Net units sold (plus recipe use) per business day. */
  perDay: number;
  /** Business days the daily average is spread over. */
  historyDays: number;
  sold: number;
  daysLeft: number | null;
  /** Stock level an order should reach. */
  target: number;
  suggestQty: number;
  onOrder: number;
  supplier: { id: string; name: string; phone: string | null } | null;
  lastCost: number;
  lastPurchasedAt: Date | null;
  orderValue: number;
  /** Days since the last sale while out of stock (estimate, capped at the window). */
  outDays: number | null;
  lostPerDay: number;
  lostSales: number;
  expiry: { date: Date; qty: number; expiredQty: number; batches: number } | null;
  /** Made in-house (bakery): to be baked, not ordered. */
  made: boolean;
  devices: { label: 'IMEI' | 'Serial'; count: number; variants: Array<{ name: string; count: number }> } | null;
  group: string | null;
  detail: string | null;
  agri: { season: string | null; seasonNow: boolean; reg: { state: 'expired' | 'soon' | 'none'; days: number | null } | null } | null;
  ignored: boolean;
}

const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const DAY = 86_400_000;
const DEFAULTS: LowStockSettings = { days: 30, targetDays: 30, soonDays: 7, expiryDays: 30 };
/** Agri categories that need a government registration to be sold. */
const REGULATED = new Set(['SEEDS', 'FERTILIZER', 'PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE', 'GROWTH_HORMONE', 'VETERINARY_MEDICINE']);
const REG_SOON_DAYS = 60;
/** Shortest history the daily average is spread over, so one busy day does not drive a big order. */
const MIN_HISTORY_DAYS = 7;
const RANK: Record<LowStatus, number> = { out: 0, low: 1, soon: 2, expiry: 3, registration: 4, season: 5 };

const n = (v: unknown) => Number(v ?? 0) || 0;
const round = (v: number, d = 2) => Number(v.toFixed(d));

/** Seasons running now and the one to stock up for, by month in the shop's timezone. */
function seasonsFor(month: number) {
  const now = ['ALL_SEASON', month >= 5 && month <= 10 ? 'KHARIF' : 'RABI'];
  if (month >= 3 && month <= 6) now.push('ZAID');
  return { now, next: month >= 5 && month <= 10 ? 'RABI' : 'KHARIF' };
}

@Injectable()
export class LowStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  settings(q: LowStockSettingsDto = {}): LowStockSettings {
    return {
      days: q.days ?? DEFAULTS.days,
      targetDays: q.targetDays ?? DEFAULTS.targetDays,
      soonDays: q.soonDays ?? DEFAULTS.soonDays,
      expiryDays: q.expiryDays ?? DEFAULTS.expiryDays,
    };
  }

  /** Every branch × product that needs attention, with its numbers. */
  async rows(user: AuthenticatedUser, scope: ShopScope, s: LowStockSettings): Promise<LowStockRow[]> {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const since = addDaysTz(todayStart, -s.days, tz);
    // The window is N full business days plus the part of today already gone.
    const windowDays = s.days + Math.min(1, (now.getTime() - todayStart.getTime()) / DAY);
    const expiryLimit = new Date(now.getTime() + s.expiryDays * DAY);
    const seasons = seasonsFor(tzParts(now, tz).month);

    const activeShops = await this.prisma.shop.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, isMain: true },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
    const shops = scope.shopId ? activeShops.filter((x) => x.id === scope.shopId) : activeShops;
    if (!shops.length) return [];
    const single = activeShops.length === 1;
    // Untagged history (old sales, IMEIs, recipe use) belongs to the main branch.
    const homeId = scope.shopId ?? (activeShops.find((x) => x.isMain) ?? activeShops[0]).id;
    const shopIds = shops.map((x) => x.id);
    const mainId = (activeShops.find((x) => x.isMain) ?? activeShops[0]).id;

    const [
      products, shopRows, sales, recipeUse, batches, ignores, imeiAll, imeiIn,
      elecProfiles, elecSerials, applProfiles, applSerials, agriProfiles, bakeryProfiles, dishes,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, stock: true,
          lowStockAlert: true, productType: true, createdAt: true,
          category: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.shopStock.findMany({
        where: { tenantId, shopId: { in: shopIds } },
        select: { shopId: true, productId: true, variantId: true, stock: true, lowStockAlert: true, shopCostPrice: true, shopPrice: true },
      }),
      Promise.all(shops.map((sh) => this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          productId: { not: null },
          sale: {
            tenantId, status: { in: [...LIVE] }, soldAt: { gte: since },
            ...(sh.id === mainId ? { OR: [{ shopId: sh.id }, { shopId: null }] } : { shopId: sh.id }),
          },
        },
        _sum: { quantity: true, returnedQty: true },
        _max: { createdAt: true },
      }).then((g) => ({ shopId: sh.id, g })))),
      // Restaurant recipes and manufacturing take raw materials out without a sale line; count that use too.
      // A reversed production carries the opposite sign, so the sum stays right.
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId, OR: [{ type: 'ADJUSTMENT_OUT', reference: { startsWith: 'Recipe:' } }, { type: 'PRODUCTION_OUT' }], createdAt: { gte: since } },
        _sum: { quantity: true },
      }),
      this.prisma.productBatch.findMany({
        where: { tenantId, isActive: true, quantity: { gt: 0 }, expiryDate: { not: null, lte: expiryLimit } },
        select: { shopId: true, productId: true, expiryDate: true, quantity: true },
      }),
      this.prisma.reorderSuggestion.findMany({
        where: { tenantId, status: 'IGNORED', shopId: { in: shopIds } },
        select: { id: true, shopId: true, productId: true },
      }),
      this.prisma.productImei.groupBy({ by: ['productId'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.productImei.groupBy({ by: ['productId', 'variantId', 'shopId'], where: { tenantId, status: 'IN_STOCK' }, _count: { _all: true } }),
      this.prisma.electronicsProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, categoryType: true, requiresSerial: true, modelNumber: true, conditionType: true },
      }),
      this.prisma.electronicsSerialTracking.groupBy({ by: ['productId', 'shopId'], where: { tenantId, status: 'IN_STOCK' }, _count: { _all: true } }),
      this.prisma.applianceProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, categoryType: true, requiresSerial: true, modelNumber: true, capacity: true },
      }),
      this.prisma.applianceSerialTracking.groupBy({ by: ['productId'], where: { tenantId, status: 'IN_STOCK' }, _count: { _all: true } }),
      this.prisma.agriProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, category: true, season: true, govtRegExpiry: true, reorderLevel: true, minStockAlert: true, packSize: true, packUnit: true },
      }),
      this.prisma.bakeryProductProfile.findMany({ where: { tenantId }, select: { productId: true, isCustomizable: true, isCakeCustomizable: true } }),
      this.prisma.recipe.findMany({ where: { tenantId }, select: { menuItem: { select: { productId: true } } } }),
    ]);

    // Branch stock: variants add up; the alert and branch prices come from the base row.
    const branch = new Map<string, { stock: number; alert: number | null; cost: number | null; price: number | null }>();
    for (const r of shopRows) {
      const k = `${r.shopId}:${r.productId}`;
      const cur = branch.get(k) ?? { stock: 0, alert: null, cost: null, price: null };
      cur.stock += n(r.stock);
      if (!r.variantId) { cur.alert = n(r.lowStockAlert); cur.cost = r.shopCostPrice; cur.price = r.shopPrice; }
      branch.set(k, cur);
    }
    const sold = new Map<string, { qty: number; last: Date | null }>();
    for (const { shopId, g } of sales) {
      for (const x of g) sold.set(`${shopId}:${x.productId}`, { qty: n(x._sum.quantity) - n(x._sum.returnedQty), last: x._max.createdAt });
    }
    const recipe = new Map(recipeUse.map((x) => [x.productId, Math.abs(n(x._sum.quantity))]));
    const expiry = new Map<string, { date: Date; qty: number; expiredQty: number; batches: number }>();
    // Each branch flags only the batches on its own shelf.
    for (const b of batches) {
      const k = `${b.shopId ?? mainId}:${b.productId}`;
      const cur = expiry.get(k) ?? { date: b.expiryDate!, qty: 0, expiredQty: 0, batches: 0 };
      if (b.expiryDate! < cur.date) cur.date = b.expiryDate!;
      cur.qty += n(b.quantity);
      if (b.expiryDate! < now) cur.expiredQty += n(b.quantity);
      cur.batches += 1;
      expiry.set(k, cur);
    }
    const ignored = new Set(ignores.map((x) => `${x.shopId}:${x.productId}`));

    // Devices: phones count by IMEI, serial-tracked goods by their serials.
    const imeiTracked = new Set(imeiAll.map((x) => x.productId));
    const imeiCount = new Map<string, { count: number; variants: Map<string | null, number> }>();
    for (const x of imeiIn) {
      const k = `${x.shopId ?? mainId}:${x.productId}`;
      const cur = imeiCount.get(k) ?? { count: 0, variants: new Map() };
      cur.count += x._count._all;
      cur.variants.set(x.variantId, (cur.variants.get(x.variantId) ?? 0) + x._count._all);
      imeiCount.set(k, cur);
    }
    const elec = new Map(elecProfiles.map((p) => [p.productId, p]));
    const elecCount = new Map<string, number>();
    for (const x of elecSerials) {
      const k = `${x.shopId ?? mainId}:${x.productId}`;
      elecCount.set(k, (elecCount.get(k) ?? 0) + x._count._all);
    }
    const appl = new Map(applProfiles.map((p) => [p.productId, p]));
    const applCount = new Map(applSerials.map((x) => [x.productId, x._count._all]));
    const agri = new Map(agriProfiles.map((p) => [p.productId, p]));
    const bakery = new Map(bakeryProfiles.map((p) => [p.productId, p]));
    const dishIds = new Set(dishes.map((d) => d.menuItem?.productId).filter(Boolean) as string[]);

    const rows: LowStockRow[] = [];
    for (const sh of shops) {
      for (const p of products) {
        // A dish is made to order from its recipe; its ingredients are what run out.
        if (dishIds.has(p.id)) continue;
        const key = `${sh.id}:${p.id}`;
        const b = branch.get(key);
        const sale = sold.get(key);
        if (!b && !sale && !single) continue;

        let stock = b ? b.stock : single ? n(p.stock) : 0;
        let devices: LowStockRow['devices'] = null;
        const ep = elec.get(p.id);
        const ap = appl.get(p.id);
        if (imeiTracked.has(p.id)) {
          const c = imeiCount.get(key);
          stock = c?.count ?? 0;
          devices = { label: 'IMEI', count: stock, variants: c ? [...c.variants.entries()].map(([id, count]) => ({ name: id ?? '', count })) : [] };
        } else if (ep?.requiresSerial) {
          stock = elecCount.get(key) ?? 0;
          devices = { label: 'Serial', count: stock, variants: [] };
        } else if (ap?.requiresSerial && sh.id === homeId) {
          // Appliance serials carry no branch; they count at the home branch.
          stock = applCount.get(p.id) ?? 0;
          devices = { label: 'Serial', count: stock, variants: [] };
        }

        const ag = agri.get(p.id);
        const agriLevel = ag ? (ag.reorderLevel ?? ag.minStockAlert) : null;
        const alert = agriLevel != null ? n(agriLevel) : b?.alert ?? n(p.lowStockAlert);
        const alertFrom: LowStockRow['alertFrom'] = agriLevel != null ? 'agri' : b?.alert != null ? 'branch' : 'product';

        // A new product's first day of sales is not a trend: the daily average is
        // taken over at least MIN_HISTORY_DAYS (or the whole window when shorter).
        const days = Math.max(Math.min(MIN_HISTORY_DAYS, windowDays), Math.min(windowDays, (now.getTime() - p.createdAt.getTime()) / DAY));
        const used = (sale?.qty ?? 0) + (sh.id === homeId ? recipe.get(p.id) ?? 0 : 0);
        const perDay = Math.max(0, used) / days;
        const daysLeft = perDay > 0 ? Math.max(0, stock) / perDay : null;
        const exp = expiry.get(`${sh.id}:${p.id}`) ?? null;

        let reg: { state: 'expired' | 'soon' | 'none'; days: number | null } | null = null;
        if (ag && REGULATED.has(ag.category)) {
          if (!ag.govtRegExpiry) reg = { state: 'none', days: null };
          else {
            const d = Math.round((ag.govtRegExpiry.getTime() - now.getTime()) / DAY);
            if (d < 0) reg = { state: 'expired', days: d };
            else if (d <= REG_SOON_DAYS) reg = { state: 'soon', days: d };
          }
        }
        const seasonNow = !!ag?.season && seasons.now.includes(ag.season);
        const seasonNext = !!ag?.season && ag.season === seasons.next;

        const flags: LowStatus[] = [];
        if (stock <= 0) flags.push('out');
        else if (stock <= alert) flags.push('low');
        else if (daysLeft !== null && daysLeft <= s.soonDays) flags.push('soon');
        if (exp) flags.push('expiry');
        if (reg) flags.push('registration');
        if ((seasonNow || seasonNext) && stock <= alert) flags.push('season');
        if (!flags.length) continue;

        const bp = bakery.get(p.id);
        const made = p.productType === 'MADE' || (p.productType !== 'BOUGHT' && !!bp && (bp.isCustomizable || bp.isCakeCustomizable));
        const price = b?.price ?? n(p.price);
        const cost = b?.cost ?? n(p.costPrice);
        // Fresh goods are made for about a day; bought goods cover the target days.
        const target = made ? Math.max(alert, Math.ceil(perDay)) : perDay > 0 ? Math.max(perDay * s.targetDays, alert) : Math.max(alert * 2, 1);
        const lastSale = sale?.last ?? null;
        const outDays = stock <= 0 && perDay > 0 && lastSale ? Math.min(s.days, Math.max(0, (now.getTime() - lastSale.getTime()) / DAY)) : null;
        const lostPerDay = stock <= 0 ? perDay * price : 0;
        const pack = ag?.packSize && ag.packUnit ? `${ag.packSize} ${ag.packUnit}` : null;

        rows.push({
          key, productId: p.id, shopId: sh.id, shopName: sh.name,
          name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit, image: null, category: p.category,
          price, cost, stock: round(stock, 3), alert, alertFrom,
          status: flags.reduce((a, f) => (RANK[f] < RANK[a] ? f : a)), flags,
          perDay: round(perDay, 3), historyDays: round(days, 1), sold: round(used, 3), daysLeft: daysLeft === null ? null : round(daysLeft, 1),
          target: round(target, 2), suggestQty: 0, onOrder: 0,
          supplier: null, lastCost: cost, lastPurchasedAt: null, orderValue: 0,
          outDays: outDays === null ? null : Math.round(outDays), lostPerDay: round(lostPerDay), lostSales: round(lostPerDay * (outDays ?? 0)),
          expiry: exp, made, devices,
          group: ap?.categoryType ?? ep?.categoryType ?? (ag ? ag.category : null),
          detail: [ap?.modelNumber ?? ep?.modelNumber, ap?.capacity, pack].filter(Boolean).join(' · ') || null,
          agri: ag ? { season: ag.season, seasonNow, reg } : null,
          ignored: ignored.has(key),
        });
      }
    }

    // The line no longer needs attention: forget the "ignore" so the next drop shows again.
    const live = new Set(rows.map((r) => r.key));
    const stale = ignores.filter((x) => !live.has(`${x.shopId}:${x.productId}`));
    if (stale.length) await this.prisma.reorderSuggestion.deleteMany({ where: { id: { in: stale.map((x) => x.id) } } });

    await this.enrich(tenantId, rows, mainId, scope);
    return rows;
  }

  /** Last supplier and cost, open orders, and the order each line needs. */
  private async enrich(tenantId: string, rows: LowStockRow[], mainId: string, scope: ShopScope) {
    const ids = [...new Set(rows.map((r) => r.productId))];
    if (!ids.length) return;
    const [bought, open, variants] = await Promise.all([
      this.prisma.purchaseItem.findMany({
        where: { productId: { in: ids }, purchase: { tenantId, status: { not: 'CANCELLED' } } },
        orderBy: { createdAt: 'desc' },
        select: { productId: true, costPrice: true, conversionRate: true, purchase: { select: { supplierId: true, purchasedAt: true } } },
      }),
      this.prisma.purchaseItem.findMany({
        where: {
          productId: { in: ids },
          purchase: { tenantId, status: { in: ['PENDING', 'PARTIAL'] }, ...(scope.shopId && { OR: [{ shopId: scope.shopId }, { shopId: null }] }) },
        },
        select: { productId: true, quantity: true, conversionRate: true, baseQuantity: true, receivedQty: true, purchase: { select: { shopId: true } } },
      }),
      this.prisma.productVariant.findMany({
        where: { productId: { in: rows.filter((r) => r.devices?.variants.length).map((r) => r.productId) } },
        select: { id: true, name: true },
      }),
    ]);

    const last = new Map<string, { cost: number; supplierId: string; at: Date }>();
    for (const b of bought) {
      if (b.productId && !last.has(b.productId)) {
        last.set(b.productId, { cost: n(b.costPrice) / (b.conversionRate || 1), supplierId: b.purchase.supplierId, at: b.purchase.purchasedAt });
      }
    }
    const onOrder = new Map<string, number>();
    for (const o of open) {
      const ordered = n(o.baseQuantity) || n(o.quantity) * (o.conversionRate || 1);
      const left = Math.max(0, ordered - n(o.receivedQty));
      const k = `${o.purchase.shopId ?? mainId}:${o.productId}`;
      onOrder.set(k, (onOrder.get(k) ?? 0) + left);
    }
    const supplierIds = [...new Set([...last.values()].map((x) => x.supplierId))];
    const suppliers = supplierIds.length
      ? await this.prisma.supplier.findMany({ where: { tenantId, id: { in: supplierIds } }, select: { id: true, name: true, phone: true } })
      : [];
    const supplier = new Map(suppliers.map((x) => [x.id, x]));
    const variantName = new Map(variants.map((v) => [v.id, v.name]));

    for (const r of rows) {
      const lp = last.get(r.productId);
      if (lp) {
        r.supplier = supplier.get(lp.supplierId) ?? null;
        r.lastPurchasedAt = lp.at;
        if (lp.cost > 0) r.lastCost = round(lp.cost);
      }
      r.onOrder = round(onOrder.get(r.key) ?? 0, 3);
      const needsStock = r.status === 'out' || r.status === 'low' || r.status === 'soon' || r.flags.includes('season');
      r.suggestQty = needsStock ? Math.max(0, Math.ceil(r.target - Math.max(0, r.stock) - r.onOrder)) : 0;
      r.orderValue = round(r.suggestQty * r.lastCost);
      if (r.devices) r.devices.variants = r.devices.variants.map((v) => ({ name: v.name ? variantName.get(v.name) ?? '' : '', count: v.count })).filter((v) => v.name);
    }
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: ListLowStockDto) {
    const s = this.settings(q);
    const all = await this.rows(user, scope, s);
    const status = q.status ?? 'all';
    const term = q.search?.trim().toLowerCase();
    const reorder = q.view === 'reorder';

    const matches = (r: LowStockRow) =>
      (!q.categoryId || (q.categoryId === 'none' ? !r.category : r.category?.id === q.categoryId))
      && (!q.supplierId || (q.supplierId === 'none' ? !r.supplier : r.supplier?.id === q.supplierId))
      && (!q.group || r.group === q.group)
      && (!term || [r.name, r.sku, r.barcode, r.supplier?.name, r.category?.name, r.detail].some((v) => v?.toLowerCase().includes(term)));
    const byStatus = (r: LowStockRow) => {
      if (status === 'ignored') return r.ignored;
      if (r.ignored) return false;
      if (status === 'all') return true;
      if (status === 'ordered') return r.onOrder > 0;
      return r.flags.includes(status);
    };
    const base = all.filter(matches);
    const filtered = base.filter((r) => byStatus(r) && (!reorder || (r.suggestQty > 0 && !r.made)));

    const urgency = (a: LowStockRow, b: LowStockRow) =>
      RANK[a.status] - RANK[b.status]
      || b.lostPerDay - a.lostPerDay
      || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)
      || (a.expiry?.date.getTime() ?? 0) - (b.expiry?.date.getTime() ?? 0)
      || a.name.localeCompare(b.name);
    const sorts: Record<NonNullable<ListLowStockDto['sort']>, (a: LowStockRow, b: LowStockRow) => number> = {
      urgency,
      daysLeft: (a, b) => (a.daysLeft ?? (a.stock <= 0 ? -1 : 1e9)) - (b.daysLeft ?? (b.stock <= 0 ? -1 : 1e9)),
      value: (a, b) => b.orderValue - a.orderValue,
      lost: (a, b) => b.lostSales - a.lostSales || b.lostPerDay - a.lostPerDay,
      name: (a, b) => a.name.localeCompare(b.name),
      stock: (a, b) => a.stock - b.stock,
    };
    const cmp = sorts[q.sort ?? 'urgency'];
    filtered.sort(reorder
      ? (a, b) => (a.supplier?.name ?? '￿').localeCompare(b.supplier?.name ?? '￿') || cmp(a, b) || urgency(a, b)
      : (a, b) => cmp(a, b) || urgency(a, b));

    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const items = filtered.slice((page - 1) * limit, page * limit);
    const images = items.length
      ? await this.prisma.productImage.findMany({
        where: { productId: { in: [...new Set(items.map((r) => r.productId))] } },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        select: { productId: true, url: true },
      })
      : [];
    const image = new Map<string, string>();
    for (const im of images) if (!image.has(im.productId)) image.set(im.productId, im.url);
    for (const r of items) r.image = image.get(r.productId) ?? null;

    // Counts and totals follow every filter except the status, so the cards show what each would return.
    const live = base.filter((r) => !r.ignored);
    const has = (st: LowStatus) => live.filter((r) => r.flags.includes(st));
    const toOrder = live.filter((r) => r.suggestQty > 0 && !r.made);
    const tally = <K extends string>(list: LowStockRow[], key: (r: LowStockRow) => K | null, label: (r: LowStockRow) => Record<string, unknown>) => {
      const m = new Map<K, Record<string, unknown> & { count: number; value: number }>();
      for (const r of list) {
        const k = key(r);
        if (k === null) continue;
        const cur = m.get(k) ?? { ...label(r), count: 0, value: 0 };
        cur.count += 1; cur.value += r.orderValue;
        m.set(k, cur);
      }
      return [...m.values()].sort((a, b) => b.count - a.count);
    };

    return {
      items, total: filtered.length, page, pages: Math.max(1, Math.ceil(filtered.length / limit)),
      settings: s,
      counts: {
        all: live.length, out: has('out').length, low: has('low').length, soon: has('soon').length,
        expiry: has('expiry').length, registration: has('registration').length, season: has('season').length,
        ordered: live.filter((r) => r.onOrder > 0).length, ignored: base.length - live.length,
      },
      totals: {
        orderValue: round(toOrder.reduce((a, r) => a + r.orderValue, 0)),
        orderLines: toOrder.length,
        madeLines: live.filter((r) => r.made && r.suggestQty > 0).length,
        lostPerDay: round(live.reduce((a, r) => a + r.lostPerDay, 0)),
        lostSales: round(live.reduce((a, r) => a + r.lostSales, 0)),
        expiryValue: round(live.reduce((a, r) => a + (r.expiry?.qty ?? 0) * r.cost, 0)),
        noSupplier: toOrder.filter((r) => !r.supplier).length,
      },
      facets: {
        categories: tally(live, (r) => r.category?.id ?? 'none', (r) => ({ id: r.category?.id ?? 'none', name: r.category?.name ?? 'Baghair category', color: r.category?.color ?? null })),
        suppliers: tally(live, (r) => r.supplier?.id ?? 'none', (r) => ({ id: r.supplier?.id ?? 'none', name: r.supplier?.name ?? 'Supplier nahi', phone: r.supplier?.phone ?? null })),
        groups: tally(live, (r) => r.group, (r) => ({ id: r.group })),
        shops: tally(live, (r) => r.shopId, (r) => ({ id: r.shopId, name: r.shopName })),
      },
    };
  }

  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListLowStockDto) {
    const s = this.settings(q);
    const term = q.search?.trim().toLowerCase();
    const rows = (await this.rows(user, scope, s)).filter((r) => !r.ignored
      && (!q.categoryId || (q.categoryId === 'none' ? !r.category : r.category?.id === q.categoryId))
      && (!q.supplierId || (q.supplierId === 'none' ? !r.supplier : r.supplier?.id === q.supplierId))
      && (!q.group || r.group === q.group)
      && (!term || [r.name, r.sku, r.barcode, r.supplier?.name].some((v) => v?.toLowerCase().includes(term))));

    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const now = new Date();
    const since = addDaysTz(startOfBusinessDayTz(now, tz, dayStartHour), -(s.days - 1), tz);
    // Times a branch shelf hit zero: from the stock ledger, only moves that carry a branch.
    const hits = await this.prisma.stockMovement.findMany({
      where: {
        tenantId: user.tenantId, createdAt: { gte: since }, quantity: { lt: 0 }, balanceAfter: { lte: 0 },
        type: { in: ['SALE_OUT', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'TRANSFER_OUT'] },
        ...(scope.shopId ? { shopId: scope.shopId } : { shopId: { not: null } }),
      },
      select: { productId: true, createdAt: true },
    });
    const days = new Map<string, Set<string>>();
    for (let i = 0; i < s.days; i++) days.set(businessDayKey(addDaysTz(since, i, tz), tz, dayStartHour), new Set());
    for (const h of hits) days.get(businessDayKey(h.createdAt, tz, dayStartHour))?.add(h.productId);

    const cover = [
      { key: 'out', label: 'Khatam', test: (r: LowStockRow) => r.stock <= 0 },
      { key: 'd3', label: '0–3 din', test: (r: LowStockRow) => r.stock > 0 && r.daysLeft !== null && r.daysLeft <= 3 },
      { key: 'd7', label: '4–7 din', test: (r: LowStockRow) => r.daysLeft !== null && r.daysLeft > 3 && r.daysLeft <= 7 },
      { key: 'd14', label: '8–14 din', test: (r: LowStockRow) => r.daysLeft !== null && r.daysLeft > 7 && r.daysLeft <= 14 },
      { key: 'd15', label: '15+ din', test: (r: LowStockRow) => r.daysLeft !== null && r.daysLeft > 14 },
      { key: 'none', label: 'Sale nahi', test: (r: LowStockRow) => r.stock > 0 && r.daysLeft === null },
    ];
    const group = (key: (r: LowStockRow) => string, label: (r: LowStockRow) => string) => {
      const m = new Map<string, { key: string; name: string; count: number; value: number; lost: number }>();
      for (const r of rows) {
        const k = key(r);
        const cur = m.get(k) ?? { key: k, name: label(r), count: 0, value: 0, lost: 0 };
        cur.count += 1; cur.value += r.made ? 0 : r.orderValue; cur.lost += r.lostPerDay;
        m.set(k, cur);
      }
      return [...m.values()].map((x) => ({ ...x, value: round(x.value), lost: round(x.lost) }));
    };
    const brief = (r: LowStockRow) => ({
      key: r.key, productId: r.productId, name: r.name, unit: r.unit, shopName: r.shopName, stock: r.stock, perDay: r.perDay,
      daysLeft: r.daysLeft, outDays: r.outDays, lostPerDay: r.lostPerDay, lostSales: r.lostSales, orderValue: r.orderValue, suggestQty: r.suggestQty,
    });

    return {
      settings: s,
      totals: {
        lines: rows.length,
        out: rows.filter((r) => r.flags.includes('out')).length,
        orderValue: round(rows.reduce((a, r) => a + (r.made ? 0 : r.orderValue), 0)),
        lostPerDay: round(rows.reduce((a, r) => a + r.lostPerDay, 0)),
        lostSales: round(rows.reduce((a, r) => a + r.lostSales, 0)),
        expiryValue: round(rows.reduce((a, r) => a + (r.expiry?.qty ?? 0) * r.cost, 0)),
        onOrderValue: round(rows.reduce((a, r) => a + r.onOrder * r.lastCost, 0)),
        stockouts: hits.length,
      },
      byStatus: (['out', 'low', 'soon', 'expiry', 'registration', 'season'] as LowStatus[])
        .map((k) => ({ key: k, count: rows.filter((r) => r.flags.includes(k)).length })),
      cover: cover.map((c) => ({ key: c.key, label: c.label, count: rows.filter(c.test).length })),
      trend: [...days.entries()].map(([key, set]) => ({ key, count: set.size })),
      topLost: rows.filter((r) => r.lostPerDay > 0).sort((a, b) => b.lostSales - a.lostSales || b.lostPerDay - a.lostPerDay).slice(0, 10).map(brief),
      runningOut: rows.filter((r) => r.stock > 0 && r.daysLeft !== null).sort((a, b) => a.daysLeft! - b.daysLeft!).slice(0, 10).map(brief),
      bySupplier: group((r) => r.supplier?.id ?? 'none', (r) => r.supplier?.name ?? 'Supplier nahi').sort((a, b) => b.value - a.value).slice(0, 8),
      byCategory: group((r) => r.category?.id ?? 'none', (r) => r.category?.name ?? 'Baghair category').sort((a, b) => b.count - a.count).slice(0, 10),
    };
  }

  /** Branch the write lands on: the given one (checked) or the active one. */
  private async writeShop(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const id = shopId || scope.require('Alert level badalna');
    if (scope.shopId && id !== scope.shopId) throw new ForbiddenException('Sirf khuli branch ka alert badal sakte hain');
    const shop = await this.prisma.shop.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
    return shop.id;
  }

  /** Sets the alert level of one product in one branch (and the agri level when the product has one). */
  async setAlert(user: AuthenticatedUser, scope: ShopScope, productId: string, dto: SetAlertDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (!Number.isFinite(dto.alert) || dto.alert < 0) throw new BadRequestException('Alert level sahi likhein');
    const shopId = await this.writeShop(user, scope, dto.shopId);
    const alert = round(dto.alert, 3);

    await this.prisma.$transaction(async (tx) => {
      // Without a branch row the product's own level applies; a new row would also set stock.
      const row = await tx.shopStock.findFirst({ where: { shopId, productId, variantId: null }, select: { id: true } });
      if (row) await tx.shopStock.update({ where: { id: row.id }, data: { lowStockAlert: alert } });
      else await tx.product.update({ where: { id: productId }, data: { lowStockAlert: alert } });
      // The agri level wins over the branch level on this page, so keep them the same.
      await tx.agriProductProfile.updateMany({
        where: { productId, tenantId: user.tenantId, OR: [{ reorderLevel: { not: null } }, { minStockAlert: { not: null } }] },
        data: { reorderLevel: alert },
      });
    });
    return { productId, shopId, alert };
  }

  /** Hides a line until its stock goes back above the level, or shows it again. */
  async ignore(user: AuthenticatedUser, scope: ShopScope, productId: string, dto: IgnoreDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, stock: true, lowStockAlert: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    const shopId = await this.writeShop(user, scope, dto.shopId);
    await this.prisma.reorderSuggestion.deleteMany({ where: { tenantId: user.tenantId, shopId, productId, status: 'IGNORED' } });
    if (dto.ignore) {
      await this.prisma.reorderSuggestion.create({
        data: { tenantId: user.tenantId, shopId, productId, status: 'IGNORED', currentStock: n(product.stock), reorderPoint: n(product.lowStockAlert) },
      });
    }
    return { productId, shopId, ignored: dto.ignore };
  }
}
