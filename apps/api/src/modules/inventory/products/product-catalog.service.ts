/**
 * Product catalog for the products page: search, filters and sort run on the
 * server over the whole catalog, so counts, totals and paging always agree.
 * Each product carries its 30-day sales, days of stock left and nearest
 * expiry, which the page uses for "best selling", "slow" and "expiring" views.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { extensionFacets, itemExtensions, loadExtensions, matchesExtensions, type ExtensionQuery } from './catalog-extensions';

export type CatalogStock = 'all' | 'in' | 'low' | 'out' | 'dead' | 'expiring';
export type CatalogSort =
  | 'name' | 'new' | 'old' | 'priceHigh' | 'priceLow' | 'stockLow' | 'stockHigh'
  | 'bestSelling' | 'slow' | 'value' | 'margin' | 'warranty';

export interface CatalogQuery extends ExtensionQuery {
  search?: string;
  categoryId?: string;
  brandId?: string;
  stock?: CatalogStock;
  active?: 'all' | 'active' | 'inactive';
  featured?: string;
  sort?: CatalogSort;
  page?: string | number;
  limit?: string | number;
}

const STOCKS: CatalogStock[] = ['all', 'in', 'low', 'out', 'dead', 'expiring'];
const SORTS: CatalogSort[] = ['name', 'new', 'old', 'priceHigh', 'priceLow', 'stockLow', 'stockHigh', 'bestSelling', 'slow', 'value', 'margin', 'warranty'];
const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const DAY = 86_400_000;
/** Sales window for velocity, slow movers and days of cover. */
const WINDOW_DAYS = 30;
/** Batches expiring within this many days count as "expiring". */
const EXPIRY_DAYS = 7;

const n = (v: unknown) => Number(v ?? 0);

interface Row {
  id: string; name: string; sku: string | null; barcode: string | null; description: string | null;
  unit: string; price: number; costPrice: number; stock: number; lowStockAlert: number;
  categoryId: string | null; brandId: string | null; isActive: boolean; isFeatured: boolean;
  hasVariants: boolean; expiryTracked: boolean; productType: string | null; createdAt: Date;
  sold: number; revenue: number; lastSoldAt: Date | null; expiry: Date | null; expiringQty: number;
}

const isOut = (r: Row) => r.stock <= 0;
const isLow = (r: Row) => r.stock > 0 && r.stock <= r.lowStockAlert;
const isDead = (r: Row) => r.stock > 0 && r.sold <= 0;
const isExpiring = (r: Row) => r.expiringQty > 0;

@Injectable()
export class ProductCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every product with branch stock, 30-day sales, nearest expiry and industry details. */
  private async load(tenantId: string, shopId?: string) {
    const now = Date.now();
    const since = new Date(now - WINDOW_DAYS * DAY);

    const [products, shopRows, soldGroups, lastSold, batches, ext] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, sku: true, barcode: true, description: true, unit: true, price: true, costPrice: true,
          stock: true, lowStockAlert: true, categoryId: true, brandId: true, isActive: true, isFeatured: true,
          hasVariants: true, expiryTracked: true, productType: true, createdAt: true,
        },
      }),
      shopId
        ? this.prisma.shopStock.findMany({ where: { tenantId, shopId }, select: { productId: true, stock: true, lowStockAlert: true, shopPrice: true, shopCostPrice: true } })
        : Promise.resolve([]),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          productId: { not: null },
          sale: { tenantId, status: { in: [...LIVE] }, soldAt: { gte: since }, ...(shopId && { shopId }) },
        },
        _sum: { quantity: true, returnedQty: true, total: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        // Last sale within a year is enough to tell "slow" from "never"; older history would only slow this down.
        where: { productId: { not: null }, sale: { tenantId, status: { in: [...LIVE] }, soldAt: { gte: new Date(now - 365 * DAY) }, ...(shopId && { shopId }) } },
        _max: { createdAt: true },
      }),
      this.prisma.productBatch.findMany({
        where: { tenantId, isActive: true, quantity: { gt: 0 }, expiryDate: { not: null } },
        select: { productId: true, expiryDate: true, quantity: true },
      }),
      loadExtensions(this.prisma, tenantId, shopId),
    ]);

    // On a branch, stock and prices are that shelf's own numbers.
    const branch = new Map<string, { stock: number; alert: number | null; price: number | null; cost: number | null }>();
    for (const r of shopRows) {
      const cur = branch.get(r.productId);
      if (cur) { cur.stock += n(r.stock); cur.alert = null; }
      else branch.set(r.productId, { stock: n(r.stock), alert: n(r.lowStockAlert), price: r.shopPrice, cost: r.shopCostPrice });
    }
    const sold = new Map(soldGroups.map((g) => [g.productId!, g]));
    const last = new Map(lastSold.map((g) => [g.productId!, g._max.createdAt]));
    const expiry = new Map<string, { date: Date; soonQty: number }>();
    const soonLimit = now + EXPIRY_DAYS * DAY;
    for (const b of batches) {
      const cur = expiry.get(b.productId) ?? { date: b.expiryDate!, soonQty: 0 };
      if (b.expiryDate! < cur.date) cur.date = b.expiryDate!;
      if (b.expiryDate!.getTime() <= soonLimit) cur.soonQty += n(b.quantity);
      expiry.set(b.productId, cur);
    }

    const rows: Row[] = products.map((p) => {
      const b = shopId ? branch.get(p.id) : undefined;
      const s = sold.get(p.id);
      return {
        ...p,
        stock: shopId ? (b?.stock ?? 0) : n(p.stock),
        lowStockAlert: b?.alert ?? n(p.lowStockAlert),
        price: b?.price ?? n(p.price),
        costPrice: b?.cost ?? n(p.costPrice),
        sold: s ? n(s._sum.quantity) - n(s._sum.returnedQty) : 0,
        revenue: s ? n(s._sum.total) : 0,
        lastSoldAt: last.get(p.id) ?? null,
        expiry: expiry.get(p.id)?.date ?? null,
        expiringQty: expiry.get(p.id)?.soonQty ?? 0,
      };
    });

    // The editor saves made/bought on the product; trust it over the profile guess.
    for (const r of rows) {
      const b = ext.bakery.get(r.id);
      if (b && (r.productType === 'MADE' || r.productType === 'BOUGHT')) b.kind = r.productType === 'MADE' ? 'made' : 'bought';
    }
    return { rows, ext };

  }

  async list(user: AuthenticatedUser, q: CatalogQuery, shopId?: string) {
    const stock = q.stock ?? 'all';
    const sort = q.sort ?? 'name';
    if (!STOCKS.includes(stock)) throw new BadRequestException('Ghalat stock filter');
    if (!SORTS.includes(sort)) throw new BadRequestException('Ghalat tarteeb');
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 40));
    const tenantId = user.tenantId;
    const { rows, ext } = await this.load(tenantId, shopId);

    // Search also matches variant barcodes and SKUs.
    const term = q.search?.trim().toLowerCase();
    let variantHits = new Set<string>();
    if (term) {
      const vs = await this.prisma.productVariant.findMany({
        where: {
          product: { tenantId },
          OR: [{ barcode: { contains: term, mode: 'insensitive' } }, { sku: { contains: term, mode: 'insensitive' } }, { name: { contains: term, mode: 'insensitive' } }],
        },
        select: { productId: true },
      });
      variantHits = new Set(vs.map((v) => v.productId));
    }
    const matchesText = (r: Row) => !term || variantHits.has(r.id)
      || [r.name, r.sku, r.barcode, r.description, ext.electronics.get(r.id)?.model].some((v) => v?.toLowerCase().includes(term));
    const matchesActive = (r: Row) => (q.active === 'inactive' ? !r.isActive : q.active === 'all' ? true : r.isActive);

    // Everything except the stock filter, so the stock tabs can show their counts.
    const base = rows.filter((r) => matchesText(r)
      && (!q.categoryId || (q.categoryId === 'none' ? !r.categoryId : r.categoryId === q.categoryId))
      && (!q.brandId || r.brandId === q.brandId)
      && matchesActive(r)
      && (q.featured !== 'true' || r.isFeatured)
      && matchesExtensions(ext, r.id, r.stock, q));

    const byStock: Record<CatalogStock, (r: Row) => boolean> = {
      all: () => true, in: (r) => r.stock > 0, low: isLow, out: isOut, dead: isDead, expiring: isExpiring,
    };
    const filtered = base.filter(byStock[stock]);

    const margin = (r: Row) => (r.price > 0 ? (r.price - r.costPrice) / r.price : 0);
    const cmp: Record<CatalogSort, (a: Row, b: Row) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      new: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      old: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      priceHigh: (a, b) => b.price - a.price,
      priceLow: (a, b) => a.price - b.price,
      stockLow: (a, b) => a.stock - b.stock,
      stockHigh: (a, b) => b.stock - a.stock,
      bestSelling: (a, b) => b.sold - a.sold || b.revenue - a.revenue,
      slow: (a, b) => a.sold - b.sold || b.stock * b.costPrice - a.stock * a.costPrice,
      value: (a, b) => b.stock * b.costPrice - a.stock * a.costPrice,
      margin: (a, b) => margin(b) - margin(a),
      warranty: (a, b) => (ext.electronics.get(b.id)?.warrantyMonths ?? 0) - (ext.electronics.get(a.id)?.warrantyMonths ?? 0),
    };
    filtered.sort((a, b) => cmp[sort](a, b) || a.name.localeCompare(b.name));

    const pageRows = filtered.slice((page - 1) * limit, page * limit);
    const ids = pageRows.map((r) => r.id);
    const [details, categories, brands, tagRows] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: ids } },
        select: {
          id: true, slug: true, wholesalePrice: true, taxRate: true,
          category: { select: { id: true, name: true, color: true } },
          brand: { select: { id: true, name: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
          variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, price: true, stock: true, colorHex: true } },
          _count: { select: { variants: true, batches: true, productImeis: true } },
        },
      }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, color: true } }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.tag.findMany({ where: { tenantId }, select: { id: true, name: true, color: true } }),
    ]);
    const detail = new Map(details.map((d) => [d.id, d]));

    const items = pageRows.map((r) => {
      const d = detail.get(r.id);
      const perDay = r.sold / WINDOW_DAYS;
      return {
        id: r.id, name: r.name, sku: r.sku, barcode: r.barcode, unit: r.unit, productType: r.productType,
        price: r.price, costPrice: r.costPrice, wholesalePrice: d?.wholesalePrice ?? null, taxRate: d?.taxRate ?? 0,
        stock: r.stock, lowStockAlert: r.lowStockAlert, isActive: r.isActive, isFeatured: r.isFeatured,
        hasVariants: r.hasVariants, expiryTracked: r.expiryTracked, createdAt: r.createdAt,
        category: d?.category ?? null, brand: d?.brand ?? null, image: d?.images[0]?.url ?? null,
        variants: d?.variants ?? [], counts: { variants: d?._count.variants ?? 0, batches: d?._count.batches ?? 0, imeis: d?._count.productImeis ?? 0 },
        status: isOut(r) ? 'out' : isLow(r) ? 'low' : 'in',
        sold30: r.sold, revenue30: r.revenue, lastSoldAt: r.lastSoldAt,
        daysLeft: perDay > 0 && r.stock > 0 ? Math.round(r.stock / perDay) : null,
        expiry: r.expiry, expiringQty: r.expiringQty,
        ...itemExtensions(ext, r.id),
      };
    });

    // Facet counts follow the other filters, so each option shows what it would return.
    const count = <K extends string | null>(key: (r: Row) => K) => {
      const m = new Map<K, number>();
      for (const r of rows.filter((x) => matchesText(x) && matchesActive(x))) {
        m.set(key(r), (m.get(key(r)) ?? 0) + 1);
      }
      return m;
    };
    const catCounts = count((r) => r.categoryId);
    const brandCounts = count((r) => r.brandId);
    const facets = extensionFacets(ext, rows.filter((x) => matchesText(x) && matchesActive(x)));
    const tagName = new Map(tagRows.map((t) => [t.id, t]));

    const live = rows.filter((r) => r.isActive);
    const positive = (r: Row) => Math.max(0, r.stock);
    return {
      page, limit, count: filtered.length, hasMore: page * limit < filtered.length,
      items,
      tabs: {
        all: base.length, in: base.filter(byStock.in).length, low: base.filter(isLow).length, out: base.filter(isOut).length,
        dead: base.filter(isDead).length, expiring: base.filter(isExpiring).length,
      },
      categories: categories
        .map((c) => ({ ...c, count: catCounts.get(c.id) ?? 0 }))
        .concat(catCounts.get(null) ? [{ id: 'none', name: 'Baghair category', color: '#94a3b8', count: catCounts.get(null)! }] : [])
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
      brands: brands.map((b) => ({ ...b, count: brandCounts.get(b.id) ?? 0 })).filter((b) => b.count > 0).sort((a, b) => b.count - a.count),
      tags: facets.tags.filter((t) => tagName.has(t.id)).map((t) => ({ ...tagName.get(t.id)!, count: t.count })),
      tagNames: Object.fromEntries(tagRows.map((t) => [t.id, { name: t.name, color: t.color }])),
      facets: { conditions: facets.conditions, etypes: facets.etypes, kinds: facets.kinds, serial: facets.serial },
      alerts: {
        low: live.filter(isLow).sort((a, b) => a.stock - b.stock).slice(0, 8).map((r) => ({ id: r.id, name: r.name, stock: r.stock, unit: r.unit, alert: r.lowStockAlert })),
        mismatch: live.filter((r) => { const e = ext.electronics.get(r.id); return e?.tracked && Math.round(r.stock) !== e.serials; })
          .slice(0, 8).map((r) => ({ id: r.id, name: r.name, stock: r.stock, serials: ext.electronics.get(r.id)!.serials })),
        overMrp: live.filter((r) => { const m = ext.electronics.get(r.id)?.mrp; return !!m && r.price > m; })
          .slice(0, 8).map((r) => ({ id: r.id, name: r.name, price: r.price, mrp: ext.electronics.get(r.id)!.mrp! })),
      },
      stats: {
        products: live.length,
        inactive: rows.length - live.length,
        inStock: live.filter((r) => r.stock > 0).length,
        low: live.filter(isLow).length,
        out: live.filter(isOut).length,
        dead: live.filter(isDead).length,
        expiring: live.filter(isExpiring).length,
        units: live.reduce((s, r) => s + positive(r), 0),
        costValue: live.reduce((s, r) => s + positive(r) * r.costPrice, 0),
        saleValue: live.reduce((s, r) => s + positive(r) * r.price, 0),
        sold30: live.reduce((s, r) => s + r.sold, 0),
        revenue30: live.reduce((s, r) => s + r.revenue, 0),
        /** Cost of stock that has not sold in the window — money sitting idle. */
        deadValue: live.filter(isDead).reduce((s, r) => s + positive(r) * r.costPrice, 0),
        noCost: live.filter((r) => r.costPrice <= 0).length,
        noShelfLife: live.filter((r) => { const b = ext.bakery.get(r.id); return b?.kind === 'made' && !b.shelfLifeDays && !b.shelfLifeHours; }).length,
        windowDays: WINDOW_DAYS,
        expiryDays: EXPIRY_DAYS,
      },
    };
  }

  /** Whole-catalog analytics for active products: value, movement, margins and what needs fixing. */
  async analytics(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;
    const [{ rows }, categories, noImage] = await Promise.all([
      this.load(tenantId, shopId),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, color: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true, images: { none: {} } } }),
    ]);
    const live = rows.filter((r) => r.isActive);
    const units = (r: Row) => Math.max(0, r.stock);
    const perDay = (r: Row) => r.sold / WINDOW_DAYS;

    const catName = new Map(categories.map((c) => [c.id, c]));
    const cats = new Map<string, { id: string; name: string; color: string; products: number; units: number; costValue: number; saleValue: number; sold30: number; revenue30: number }>();
    for (const r of live) {
      const key = r.categoryId ?? 'none';
      const c = r.categoryId ? catName.get(r.categoryId) : undefined;
      const row = cats.get(key) ?? { id: key, name: c?.name ?? 'Baghair category', color: c?.color ?? '#94a3b8', products: 0, units: 0, costValue: 0, saleValue: 0, sold30: 0, revenue30: 0 };
      row.products += 1; row.units += units(r); row.costValue += units(r) * r.costPrice; row.saleValue += units(r) * r.price;
      row.sold30 += r.sold; row.revenue30 += r.revenue;
      cats.set(key, row);
    }

    const margins = [
      { id: 'none', label: 'Cost nahi likhi', count: 0 },
      { id: 'loss', label: 'Ghatay mein', count: 0 },
      { id: 'low', label: '0–10%', count: 0 },
      { id: 'mid', label: '10–25%', count: 0 },
      { id: 'good', label: '25–40%', count: 0 },
      { id: 'high', label: '40%+', count: 0 },
    ];
    for (const r of live) {
      if (r.costPrice <= 0 || r.price <= 0) { margins[0].count += 1; continue; }
      const m = (r.price - r.costPrice) / r.price;
      margins[m < 0 ? 1 : m < 0.1 ? 2 : m < 0.25 ? 3 : m < 0.4 ? 4 : 5].count += 1;
    }

    const brief = (r: Row) => ({ id: r.id, name: r.name, unit: r.unit, stock: r.stock, price: r.price, costPrice: r.costPrice });
    return {
      windowDays: WINDOW_DAYS,
      categories: [...cats.values()].sort((a, b) => b.costValue - a.costValue),
      health: {
        in: live.filter((r) => r.stock > 0 && !isLow(r)).length, low: live.filter(isLow).length, out: live.filter(isOut).length,
        dead: live.filter(isDead).length, expiring: live.filter(isExpiring).length,
      },
      margins,
      topValue: [...live].sort((a, b) => units(b) * b.costPrice - units(a) * a.costPrice).slice(0, 10)
        .map((r) => ({ ...brief(r), costValue: units(r) * r.costPrice, saleValue: units(r) * r.price })),
      topSellers: live.filter((r) => r.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 10)
        .map((r) => ({ ...brief(r), sold: r.sold, revenue: r.revenue, daysLeft: r.stock > 0 ? Math.round(r.stock / perDay(r)) : 0 })),
      deadStock: live.filter(isDead).sort((a, b) => units(b) * b.costPrice - units(a) * a.costPrice).slice(0, 10)
        .map((r) => ({ ...brief(r), costValue: units(r) * r.costPrice, lastSoldAt: r.lastSoldAt })),
      runningOut: live.filter((r) => r.sold > 0 && r.stock > 0 && r.stock / perDay(r) <= 7).sort((a, b) => a.stock / perDay(a) - b.stock / perDay(b)).slice(0, 10)
        .map((r) => ({ ...brief(r), daysLeft: Math.max(0, Math.round(r.stock / perDay(r))), perDay: perDay(r) })),
      expiring: live.filter((r) => r.expiry).sort((a, b) => a.expiry!.getTime() - b.expiry!.getTime()).slice(0, 10)
        .map((r) => ({ ...brief(r), expiry: r.expiry, expiringQty: r.expiringQty })),
      fix: {
        noCost: live.filter((r) => r.costPrice <= 0).length,
        noBarcode: live.filter((r) => !r.barcode && !r.sku).length,
        noCategory: live.filter((r) => !r.categoryId).length,
        noImage,
        belowCost: live.filter((r) => r.costPrice > 0 && r.price < r.costPrice).length,
      },
    };
  }
}
