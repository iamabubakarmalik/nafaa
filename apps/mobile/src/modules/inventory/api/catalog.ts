/**
 * Products catalog (same endpoint and shape as the web products page):
 * server-side search, filters, sort, tab counts, facets and whole-catalog
 * totals. Without internet the list is answered from the phone's mirror with
 * the same shape (no sales or expiry figures offline).
 */

import { apiClient } from '@/core/api/client';
import { isNetworkError } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { offline, type ProductRow } from '@/core/offline';

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
  tagId?: string;
  condition?: string;
  etype?: string;
  serial?: 'tracked' | 'mismatch';
  kind?: 'made' | 'bought';
  kindOf?: 'raw' | 'sale';
  noCost?: boolean;
  /** A supplier id, or 'none' for products without one. */
  supplierId?: string;
  online?: 'listed' | 'unlisted';
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
  price: number; costPrice: number; wholesalePrice: number | null; creditPrice: number | null; taxRate: number;
  stock: number; lowStockAlert: number; isActive: boolean; isFeatured: boolean;
  hasVariants: boolean; expiryTracked: boolean; createdAt: string;
  category: { id: string; name: string; color: string; path?: string } | null;
  /** Preferred supplier. */
  supplier?: { id: string; name: string } | null;
  supplierCount?: number;
  online?: boolean;
  brand: { id: string; name: string } | null;
  image: string | null;
  variants: Array<{ id: string; name: string; price: number; stock: number; colorHex: string | null }>;
  counts: { variants: number; batches: number; imeis: number };
  status: 'in' | 'low' | 'out';
  sold30: number;
  revenue30: number;
  lastSoldAt: string | null;
  daysLeft: number | null;
  expiry: string | null;
  expiringQty: number;
  tagIds: string[];
  electronics: ElectronicsFacts | null;
  bakery: BakeryFacts | null;
  /** Made or changed on this phone and not sent yet (offline answers only). */
  pending?: boolean;
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
  categories: Array<{ id: string; name: string; color: string; count: number; parentId?: string | null; path?: string; own?: number }>;
  suppliers?: Array<{ id: string; name: string; count: number }>;
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
  /** True when the answer came from this phone because the server was unreachable. */
  offline?: boolean;
}

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

const params = (f: CatalogFilters, page: number, limit: number) => ({
  search: f.search?.trim() || undefined, categoryId: f.categoryId, brandId: f.brandId, stock: f.stock,
  active: f.active, featured: f.featured ? 'true' : undefined, kindOf: f.kindOf, noCost: f.noCost ? 'true' : undefined, sort: f.sort, page, limit,
  tagId: f.tagId, condition: f.condition, etype: f.etype, serial: f.serial, kind: f.kind, supplierId: f.supplierId, online: f.online,
});

/** A mirror row in the catalog shape. */
export function itemFromRow(p: ProductRow): CatalogItem {
  const stock = Number(p.stock ?? 0);
  const alert = Number(p.lowStockAlert ?? 0);
  return {
    id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit || 'pcs', productType: p.productType,
    price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0, wholesalePrice: p.wholesalePrice, creditPrice: p.creditPrice, taxRate: Number(p.taxRate) || 0,
    stock, lowStockAlert: alert, isActive: p.isActive, isFeatured: p.isFeatured, hasVariants: p.hasVariants, expiryTracked: p.expiryTracked,
    createdAt: p.updatedAt ?? '', category: p.categoryId ? { id: p.categoryId, name: p.categoryName ?? '', color: p.categoryColor ?? '#94a3b8' } : null,
    brand: p.brandId ? { id: p.brandId, name: p.brandName ?? '' } : null, image: p.imageUrl, variants: [], counts: { variants: 0, batches: 0, imeis: 0 },
    status: stock <= 0 ? 'out' : stock <= alert ? 'low' : 'in', sold30: 0, revenue30: 0, lastSoldAt: null, daysLeft: null, expiry: null, expiringQty: 0,
    tagIds: [], electronics: null, bakery: null, pending: p.pendingCreate || p.pendingEdit,
  };
}

/** Same answer from the phone's mirror. */
async function localCatalog(f: CatalogFilters, page: number, limit: number): Promise<CatalogPage> {
  const rows = await offline.products.search({
    shopId: useAuthStore.getState().currentShopId,
    query: f.search?.trim() || undefined, categoryId: f.categoryId && f.categoryId !== 'none' ? f.categoryId : undefined,
    brandId: f.brandId, includeRaw: f.kindOf !== 'sale', limit: 5000,
  });
  const base = rows.filter((r) => f.kindOf !== 'raw' || r.isRawMaterial).map(itemFromRow)
    .filter((p) => (!f.featured || p.isFeatured) && (!f.noCost || !(p.costPrice > 0)));
  const test: Record<CatalogStock, (p: CatalogItem) => boolean> = {
    all: () => true, in: (p) => p.stock > 0, low: (p) => p.status === 'low', out: (p) => p.stock <= 0, dead: () => false, expiring: () => false,
  };
  const list = base.filter(test[f.stock]);
  const by: Partial<Record<CatalogSort, (a: CatalogItem, b: CatalogItem) => number>> = {
    new: (a, b) => b.createdAt.localeCompare(a.createdAt), old: (a, b) => a.createdAt.localeCompare(b.createdAt),
    priceHigh: (a, b) => b.price - a.price, priceLow: (a, b) => a.price - b.price,
    stockLow: (a, b) => a.stock - b.stock, stockHigh: (a, b) => b.stock - a.stock,
    value: (a, b) => b.stock * b.costPrice - a.stock * a.costPrice,
  };
  if (!f.search?.trim() || by[f.sort]) list.sort(by[f.sort] ?? ((a, b) => a.name.localeCompare(b.name)));
  const units = base.reduce((s, p) => s + Math.max(0, p.stock), 0);
  return {
    page, limit, count: list.length, hasMore: page * limit < list.length, items: list.slice((page - 1) * limit, page * limit), offline: true,
    tabs: { all: base.length, in: base.filter(test.in).length, low: base.filter(test.low).length, out: base.filter(test.out).length, dead: 0, expiring: 0 },
    categories: [], brands: [], tags: [], tagNames: {},
    facets: { conditions: [], etypes: [], kinds: [], serial: { tracked: 0, mismatch: 0 } },
    alerts: { low: [], mismatch: [], overMrp: [] },
    stats: {
      products: base.length, inactive: 0, inStock: base.filter(test.in).length, low: base.filter(test.low).length, out: base.filter(test.out).length,
      dead: 0, expiring: 0, units,
      costValue: base.reduce((s, p) => s + Math.max(0, p.stock) * p.costPrice, 0),
      saleValue: base.reduce((s, p) => s + Math.max(0, p.stock) * p.price, 0),
      sold30: 0, revenue30: 0, deadValue: 0, noCost: base.filter((p) => !(p.costPrice > 0)).length, noShelfLife: 0, windowDays: 30, expiryDays: 7,
    },
  };
}

export const catalogApi = {
  list: async (f: CatalogFilters, page = 1, limit = 40): Promise<CatalogPage> => {
    try {
      const r = await apiClient.get<CatalogPage>('/products/catalog', { params: params(f, page, limit) });
      return r.data;
    } catch (e) {
      // Inactive products are not kept on the phone; the offline list shows active ones.
      if (!isNetworkError(e)) throw e;
      return localCatalog(f, page, limit);
    }
  },
  analytics: () => apiClient.get<CatalogAnalytics>('/products/catalog/analytics').then((r) => r.data),
};
