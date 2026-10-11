/**
 * Product catalog API for the products page. Search, filters, sort and totals
 * run on the server over the whole catalog. Without internet the page falls
 * back to the products saved on this device, with the same shape.
 */

import { apiClient } from '@core/api/client';

export type CatalogStock = 'all' | 'in' | 'low' | 'out' | 'dead' | 'expiring';
export type CatalogSort =
  | 'name' | 'new' | 'old' | 'priceHigh' | 'priceLow' | 'stockLow' | 'stockHigh'
  | 'bestSelling' | 'slow' | 'value' | 'margin' | 'warranty';

export interface CatalogFilters {
  search?: string;
  categoryId?: string;
  brandId?: string;
  stock: CatalogStock;
  active: 'all' | 'active' | 'inactive';
  featured?: boolean;
  sort: CatalogSort;
  /** Industry filters; the server ignores the ones a business has no data for. */
  tagId?: string;
  condition?: string;
  etype?: string;
  serial?: 'tracked' | 'mismatch';
  kind?: 'made' | 'bought';
}

export interface ElectronicsFacts {
  condition: string; categoryType: string | null; warrantyMonths: number; mrp: number | null;
  model: string | null; brandId: string | null; tracked: boolean; serials: number;
}

export interface BakeryFacts {
  kind: 'made' | 'bought'; category: string; shelfLifeDays: number | null; shelfLifeHours: number | null; fridge: boolean;
}

export interface CatalogItem {
  id: string; name: string; sku: string | null; barcode: string | null; unit: string; productType: string | null;
  price: number; costPrice: number; wholesalePrice: number | null; taxRate: number;
  stock: number; lowStockAlert: number; isActive: boolean; isFeatured: boolean;
  hasVariants: boolean; expiryTracked: boolean; createdAt: string;
  category: { id: string; name: string; color: string } | null;
  brand: { id: string; name: string } | null;
  image: string | null;
  variants: Array<{ id: string; name: string; price: number; stock: number; colorHex: string | null }>;
  counts: { variants: number; batches: number; imeis: number };
  status: 'in' | 'low' | 'out';
  /** Net quantity sold in the last `windowDays` days. */
  sold30: number;
  revenue30: number;
  lastSoldAt: string | null;
  /** Days the current stock lasts at the recent selling rate; null when it is not selling. */
  daysLeft: number | null;
  expiry: string | null;
  expiringQty: number;
  tagIds: string[];
  electronics: ElectronicsFacts | null;
  bakery: BakeryFacts | null;
}

export interface CatalogStats {
  products: number; inactive: number; inStock: number; low: number; out: number; dead: number; expiring: number;
  units: number; costValue: number; saleValue: number; sold30: number; revenue30: number; deadValue: number;
  noCost: number; noShelfLife: number;
  windowDays: number; expiryDays: number;
}

type Facet = { id: string; count: number };

export interface CatalogPage {
  page: number; limit: number; count: number; hasMore: boolean;
  items: CatalogItem[];
  tabs: Record<CatalogStock, number>;
  categories: Array<{ id: string; name: string; color: string; count: number }>;
  brands: Array<{ id: string; name: string; count: number }>;
  tags: Array<{ id: string; name: string; color: string; count: number }>;
  tagNames: Record<string, { name: string; color: string }>;
  facets: { conditions: Facet[]; etypes: Facet[]; kinds: Facet[]; serial: { tracked: number; mismatch: number } };
  alerts: {
    low: Array<{ id: string; name: string; stock: number; unit: string; alert: number }>;
    mismatch: Array<{ id: string; name: string; stock: number; serials: number }>;
    overMrp: Array<{ id: string; name: string; price: number; mrp: number }>;
  };
  stats: CatalogStats;
  /** True when the data came from this device because the server was unreachable. */
  offline?: boolean;
}

const params = (f: CatalogFilters, page: number, limit: number) => ({
  search: f.search?.trim() || undefined, categoryId: f.categoryId, brandId: f.brandId, stock: f.stock,
  active: f.active, featured: f.featured ? 'true' : undefined, sort: f.sort, page, limit,
  tagId: f.tagId, condition: f.condition, etype: f.etype, serial: f.serial, kind: f.kind,
});

type Brief = { id: string; name: string; unit: string; stock: number; price: number; costPrice: number };

export interface CatalogAnalytics {
  windowDays: number;
  categories: Array<{ id: string; name: string; color: string; products: number; units: number; costValue: number; saleValue: number; sold30: number; revenue30: number }>;
  health: { in: number; low: number; out: number; dead: number; expiring: number };
  margins: Array<{ id: string; label: string; count: number }>;
  topValue: Array<Brief & { costValue: number; saleValue: number }>;
  topSellers: Array<Brief & { sold: number; revenue: number; daysLeft: number }>;
  deadStock: Array<Brief & { costValue: number; lastSoldAt: string | null }>;
  runningOut: Array<Brief & { daysLeft: number; perDay: number }>;
  expiring: Array<Brief & { expiry: string; expiringQty: number }>;
  fix: { noCost: number; noBarcode: number; noCategory: number; noImage: number; belowCost: number };
}

const isNetFail = (e: unknown) => {
  const err = e as { response?: unknown; code?: string; message?: string };
  return !err?.response || err.code === 'ERR_NETWORK' || /network/i.test(err.message ?? '');
};

/** Same answer from the products saved on this device (no sales or expiry data offline). */
async function localCatalog(f: CatalogFilters, page: number, limit: number): Promise<CatalogPage> {
  const { db } = await import('@core/lib/offline/db');
  type Local = Record<string, any>;
  const all = (await db.products.toArray() as Local[]).filter((p) => !p._localDeleted);
  const term = f.search?.trim().toLowerCase();
  const stockOf = (p: Local) => Number(p.stock ?? 0);
  const alertOf = (p: Local) => Number(p.lowStockAlert ?? 5);
  const base = all.filter((p) => (!term || [p.name, p.sku, p.barcode].some((v) => String(v ?? '').toLowerCase().includes(term)))
    && (!f.categoryId || (f.categoryId === 'none' ? !p.categoryId : p.categoryId === f.categoryId))
    && (!f.brandId || p.brandId === f.brandId)
    && (f.active === 'all' || (f.active === 'inactive' ? !p.isActive : p.isActive))
    && (!f.featured || p.isFeatured));
  const test: Record<CatalogStock, (p: Local) => boolean> = {
    all: () => true, in: (p) => stockOf(p) > 0, low: (p) => stockOf(p) > 0 && stockOf(p) <= alertOf(p),
    out: (p) => stockOf(p) <= 0, dead: () => false, expiring: () => false,
  };
  const rows = base.filter(test[f.stock]);
  const by: Partial<Record<CatalogSort, (a: Local, b: Local) => number>> = {
    new: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
    old: (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)),
    priceHigh: (a, b) => b.price - a.price, priceLow: (a, b) => a.price - b.price,
    stockLow: (a, b) => stockOf(a) - stockOf(b), stockHigh: (a, b) => stockOf(b) - stockOf(a),
  };
  rows.sort(by[f.sort] ?? ((a, b) => String(a.name).localeCompare(String(b.name))));
  const live = all.filter((p) => p.isActive);
  const items: CatalogItem[] = rows.slice((page - 1) * limit, page * limit).map((p) => ({
    id: p.id, name: p.name, sku: p.sku ?? null, barcode: p.barcode ?? null, unit: p.unit ?? 'pcs', productType: p.productType ?? null,
    price: Number(p.price ?? 0), costPrice: Number(p.costPrice ?? 0), wholesalePrice: p.wholesalePrice ?? null, taxRate: Number(p.taxRate ?? 0),
    stock: stockOf(p), lowStockAlert: alertOf(p), isActive: !!p.isActive, isFeatured: !!p.isFeatured,
    hasVariants: !!p.hasVariants, expiryTracked: !!p.expiryTracked, createdAt: p.createdAt ?? '',
    category: p.category ? { id: p.category.id, name: p.category.name, color: p.category.color ?? '#94a3b8' } : null,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
    image: p.images?.[0]?.url ?? null, variants: [], counts: { variants: p._count?.variants ?? 0, batches: 0, imeis: 0 },
    status: stockOf(p) <= 0 ? 'out' : stockOf(p) <= alertOf(p) ? 'low' : 'in',
    sold30: 0, revenue30: 0, lastSoldAt: null, daysLeft: null, expiry: null, expiringQty: 0,
    tagIds: [], electronics: null, bakery: null,
  }));
  const units = live.reduce((s, p) => s + Math.max(0, stockOf(p)), 0);
  return {
    page, limit, count: rows.length, hasMore: page * limit < rows.length, items, offline: true,
    tabs: { all: base.length, in: base.filter(test.in).length, low: base.filter(test.low).length, out: base.filter(test.out).length, dead: 0, expiring: 0 },
    categories: [], brands: [], tags: [], tagNames: {},
    facets: { conditions: [], etypes: [], kinds: [], serial: { tracked: 0, mismatch: 0 } },
    alerts: { low: [], mismatch: [], overMrp: [] },
    stats: {
      products: live.length, inactive: all.length - live.length, inStock: live.filter(test.in).length,
      low: live.filter(test.low).length, out: live.filter(test.out).length, dead: 0, expiring: 0, units,
      costValue: live.reduce((s, p) => s + Math.max(0, stockOf(p)) * Number(p.costPrice ?? 0), 0),
      saleValue: live.reduce((s, p) => s + Math.max(0, stockOf(p)) * Number(p.price ?? 0), 0),
      sold30: 0, revenue30: 0, deadValue: 0, noCost: 0, noShelfLife: 0, windowDays: 30, expiryDays: 7,
    },
  };
}

export const catalogApi = {
  list: async (f: CatalogFilters, page = 1, limit = 40): Promise<CatalogPage> => {
    try {
      return await apiClient.get<{ data: CatalogPage }>('/products/catalog', { params: params(f, page, limit) }).then((r) => r.data.data);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localCatalog(f, page, limit);
    }
  },
  analytics: () => apiClient.get<{ data: CatalogAnalytics }>('/products/catalog/analytics').then((r) => r.data.data),
};
