/**
 * The showroom catalog (same idea as the web modules/catalog): every industry
 * turns its own data into `CatalogEntry` rows through a source, so one screen
 * can show, filter, share and print them. Entries never carry cost or
 * wholesale prices. Industry packs add their config with
 * registerCatalogConfig(); the rest use the shop catalog built from the
 * products on this phone (works offline).
 */

import { msg } from '@/core/i18n';
import { kv } from '@/core/storage/kv';
import { offline } from '@/core/offline';
import type { StatusTone } from '@/design';

export interface CatalogEntry {
  id: string;
  productId?: string;
  name: string;
  price: number;
  per?: string;
  oldPrice?: number | null;
  priceNote?: string;
  image?: string | null;
  description?: string | null;
  category?: { id: string; name: string; color?: string | null } | null;
  brand?: string | null;
  featured: boolean;
  /** null when stock does not apply (services, plans). */
  inStock: boolean | null;
  stockNote?: string;
  chips?: Array<{ label: string; tone: StatusTone }>;
  specs?: Array<[string, string]>;
  keywords?: string;
}

export interface CatalogConfig {
  /** Page title (raw text), e.g. "Catalog", "Menu". */
  title: string;
  /** What one entry is called, e.g. "cheezein", "dishes". */
  noun: string;
  load: () => Promise<CatalogEntry[]>;
  /** Price range chips (upper bounds exclusive). */
  priceBands?: Array<[number, number]>;
  /** False hides stock lines and the "in stock" filter. */
  stock?: boolean;
  /** Label of the customer pick list. */
  listLabel?: string;
}

/** The shop catalog from the products on this phone. */
export async function productEntries(): Promise<CatalogEntry[]> {
  const rows = await offline.products.search({ limit: 10_000 });
  return rows.map((p) => ({
    id: p.id, productId: p.id, name: p.name, price: Number(p.price) || 0, per: p.unit || undefined, image: p.imageUrl,
    category: p.categoryId ? { id: p.categoryId, name: p.categoryName ?? '', color: p.categoryColor } : null,
    brand: p.brandName, featured: p.isFeatured, inStock: p.stock === null ? null : p.stock > 0,
    stockNote: p.stock !== null && p.stock > 0 && p.stock <= 2 ? `Sirf ${p.stock} baqi` : undefined,
    keywords: [p.sku, p.barcode].filter(Boolean).join(' '),
  }));
}

export const SHOP_CATALOG: CatalogConfig = {
  title: msg('Catalog'), noun: msg('cheezein'), listLabel: msg('Pasand list'), stock: true, load: productEntries,
  priceBands: [[0, 1000], [1000, 5000], [5000, 20000], [20000, 100000], [100000, Infinity]],
};

const CONFIGS = new Map<string, CatalogConfig>();

/** Adds an industry's catalog (its own source, title and filters). */
export function registerCatalogConfig(industryId: string, config: CatalogConfig) {
  CONFIGS.set(industryId, config);
}

export const catalogConfigFor = (industryId: string | null | undefined) => (industryId && CONFIGS.get(industryId)) || SHOP_CATALOG;

/* ───────────── pick list (kept on this phone) ───────────── */

export interface PickItem { id: string; productId: string; name: string; price: number; unit: string; quantity: number; image?: string | null }
export interface PickList { items: PickItem[]; customerName: string; customerPhone: string; notes: string }

const STORE = 'nafaa.inv.catalog-list';
export const EMPTY_LIST: PickList = { items: [], customerName: '', customerPhone: '', notes: '' };
export const loadPickList = (): PickList => ({ ...EMPTY_LIST, ...kv.get<Partial<PickList>>(STORE, {}) });
export const savePickList = (l: PickList) => kv.set(STORE, l);
