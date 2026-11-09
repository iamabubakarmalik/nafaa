/**
 * Ready-made product lists shipped with the API, one per industry, read from
 * `library/data` the first time they are asked for and kept in memory.
 *
 *  - pharmacy: `pharmacy-drap.json.gz`, the DRAP Pharmaceutical Product Price
 *    Index (official MRP list).
 *  - retail: the Pakistan grocery seed catalog, plus barcodes and pictures
 *    from Open Food Facts (`grocery-barcodes.json`) and its other Pakistani
 *    products (`grocery-off-extra.json`, no price yet).
 *  - every other industry: `<industry>.json` starter packs with estimated
 *    prices. Beauty rows of the Open Food Facts extra file join cosmetics.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { gunzipSync } from 'zlib';
import { Logger } from '@nestjs/common';
import { CATEGORY_META, PAKISTAN_CATALOG } from '../seed-catalog/pakistan-grocery-catalog';
import { formulaKey } from '../../../../industries/pharmacy/common/strength';

export type LibraryKind = 'pharmacy' | 'generic';

export interface LibraryItem {
  id: string;
  /** Product name the import uses. */
  name: string;
  /** Company (pharmacy manufacturer) or brand; becomes the product's brand. */
  company: string | null;
  /** Becomes the product's category (pharmacy: dosage form). */
  category: string | null;
  categoryColor?: string | null;
  unit: string;
  /** Sell price; pharmacy: MRP. 0 when `needsPrice`. */
  price: number;
  /** Cost from the file; null for pharmacy (it comes from the margin). */
  costPrice: number | null;
  wholesalePrice?: number | null;
  /** The shop has to type a price before this row can be imported. */
  needsPrice?: boolean;
  barcode?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  description?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  // Pharmacy
  formula?: string | null;
  salts?: Array<{ name: string; strength: string | null }>;
  formulaKey?: string | null;
  form?: string | null;
  pack?: string | null;
  packQty?: number | null;
  regNo?: string | null;
  license?: string | null;
  /** DRAP list: "Essential" or "Low price". */
  drapCategory?: string | null;
  effective?: string | null;
}

export interface LibraryBook {
  key: string;
  kind: LibraryKind;
  items: LibraryItem[];
  /** Lower-case search text per item, same order as `items`. */
  haystack: string[];
  byId: Map<string, LibraryItem>;
  byBarcode: Map<string, LibraryItem[]>;
  /** Prices are guesses for the shop to check. */
  estimates: boolean;
  source: string;
  /** Newest date in the file (pharmacy: DRAP effective date). */
  updated: string | null;
  /** Some rows carry Open Food Facts data (ODbL attribution). */
  openFoodFacts: boolean;
}

/** Files in `data/` that are not an industry starter pack. */
const RESERVED = new Set(['grocery-barcodes.json', 'grocery-off-extra.json', 'pharmacy-drap.json.gz']);

/** Business types whose library key is not just the lower-case type. */
const TYPE_TO_KEY: Record<string, string> = {
  GROCERY: 'retail', KIRYANA: 'retail', GENERAL: 'retail', OTHER: 'retail', DISTRIBUTOR: 'retail', RETAIL: 'retail',
  MOBILE_SHOP: 'mobile', CLOTHING: 'garments', GARMENTS: 'garments', STATIONERY: 'bookstore', BOOKSTORE: 'bookstore',
  AUTO_PARTS: 'autoparts', SERVICE: 'services-biz', GAMING_SHOP: 'gaming', CYBER_CAFE: 'gaming', ESPORTS: 'gaming',
  PET_SHOP: 'petshop', PET_STORE: 'petshop', SHOE_STORE: 'shoe', FOOTWEAR: 'shoe', TOY_STORE: 'toystore', TOYS: 'toystore',
  SPORTS_SHOP: 'sports', SPORTS_STORE: 'sports', FLOWER_SHOP: 'florist', FLOWERS: 'florist', FURNITURE_STORE: 'furniture',
  OPTICAL_STORE: 'optical', EYEWEAR: 'optical', HOME_APPLIANCES: 'appliances', APPLIANCE_STORE: 'appliances',
  ELECTRONICS_STORE: 'electronics', GADGETS: 'electronics', JEWELLERY: 'jewelry',
};

/** Library key for a tenant's business type: "GROCERY" gives "retail", "AUTO_PARTS" gives "autoparts". */
export function libraryKeyFor(businessType: string | null | undefined): string {
  const t = String(businessType ?? '').toUpperCase().trim();
  if (!t) return 'retail';
  return TYPE_TO_KEY[t] ?? t.toLowerCase().replace(/_/g, '');
}

/** Display names for library keys (English; the web translates). */
export const LIBRARY_LABELS: Record<string, string> = {
  pharmacy: 'Pharmacy', retail: 'Grocery', cosmetics: 'Cosmetics', mobile: 'Mobile', electronics: 'Electronics',
  hardware: 'Hardware', garments: 'Garments', shoe: 'Shoes', bookstore: 'Stationery', autoparts: 'Auto parts',
  bakery: 'Bakery', toystore: 'Toys', sports: 'Sports', petshop: 'Pet shop', optical: 'Optical', jewelry: 'Jewelry',
  furniture: 'Furniture', appliances: 'Appliances', florist: 'Florist', agri: 'Agri', dairy: 'Dairy', meat: 'Meat',
  gaming: 'Gaming', carpet: 'Carpet',
};

/** Search text: lower case, punctuation to spaces. */
export const searchText = (s: string) => s.toLowerCase().replace(/[^a-z0-9.%؀-ۿ]+/g, ' ').replace(/\s+/g, ' ').trim();

function dataDir(): string | null {
  const candidates = [
    join(__dirname, 'data'),
    join(process.cwd(), 'src/modules/inventory/products/library/data'),
    join(process.cwd(), 'apps/api/src/modules/inventory/products/library/data'),
  ];
  return candidates.find((d) => existsSync(d) && statSync(d).isDirectory()) ?? null;
}

function readJson<T>(dir: string, file: string): T | null {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path);
  return JSON.parse((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')) as T;
}

interface DrapRow {
  id: string; brand: string; formula: string | null; salts: Array<{ name: string; strength: string | null }> | null;
  regNo: string | null; manufacturer: string | null; license: string | null; category: string | null; form: string | null;
  pack: string | null; packQty: number | null; mrp: number | null; effective: string | null;
}

interface StarterRow {
  id: string; name: string; brand?: string | null; category?: string | null; unit?: string | null; price?: number | null;
  costPrice?: number | null; tags?: string[] | null; description?: string | null; barcode?: string | null; imageUrl?: string | null;
  needsPrice?: boolean; source?: string;
}

/** Selling unit of a medicine from its dosage form. */
function pharmacyUnit(form: string | null, packQty: number | null): string {
  const f = (form ?? '').toLowerCase();
  if (/syrup|suspension|solution|drops|lotion|elixir|liquid|mouthwash/.test(f)) return 'Bottle';
  if (/injection|vaccine|infusion/.test(f)) return packQty === 1 ? 'Vial' : 'Pack';
  if (/cream|gel|ointment/.test(f)) return 'Tube';
  if (/inhaler/.test(f)) return 'Inhaler';
  return 'Pack';
}

function finish(key: string, kind: LibraryKind, items: LibraryItem[], extra: Partial<LibraryBook>): LibraryBook {
  const byId = new Map<string, LibraryItem>();
  const byBarcode = new Map<string, LibraryItem[]>();
  const unique: LibraryItem[] = [];
  for (const it of items) {
    if (!it.id || byId.has(it.id)) continue;
    byId.set(it.id, it);
    unique.push(it);
    const code = it.barcode?.trim();
    if (code) byBarcode.set(code, [...(byBarcode.get(code) ?? []), it]);
  }
  const haystack = unique.map((it) => searchText([
    it.name, it.company, it.category, it.formula, ...(it.salts ?? []).map((s) => s.name), it.regNo, it.form, it.barcode, ...(it.tags ?? []),
  ].filter(Boolean).join(' ')));
  return {
    key, kind, items: unique, haystack, byId, byBarcode,
    estimates: extra.estimates ?? false, source: extra.source ?? '', updated: extra.updated ?? null, openFoodFacts: extra.openFoodFacts ?? false,
  };
}

function loadPharmacy(dir: string): LibraryBook | null {
  const rows = readJson<DrapRow[]>(dir, 'pharmacy-drap.json.gz');
  if (!rows?.length) return null;
  const clean = (s: string) => s.replace(/^\*+/, '').replace(/\s+/g, ' ').trim();
  // Brand names repeat across pack sizes; those get the pack in the name.
  const seen = new Map<string, number>();
  for (const r of rows) {
    const k = clean(r.brand ?? '').toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  let updated: string | null = null;
  const items: LibraryItem[] = [];
  for (const r of rows) {
    const brand = clean(r.brand ?? '');
    if (!brand) continue;
    if (r.effective && (!updated || r.effective > updated)) updated = r.effective;
    const salts = (r.salts ?? []).filter((s) => s?.name?.trim()).map((s) => ({ name: s.name.trim(), strength: s.strength?.trim() || null }));
    const repeated = (seen.get(brand.toLowerCase()) ?? 0) > 1 && r.pack;
    items.push({
      id: r.id,
      name: repeated ? `${brand} (${r.pack!.trim()})` : brand,
      company: r.manufacturer?.trim() || null,
      category: r.form?.trim() || 'Other',
      unit: pharmacyUnit(r.form, r.packQty),
      price: Number(r.mrp) || 0,
      costPrice: null,
      formula: r.formula?.trim() || null,
      salts,
      formulaKey: formulaKey(salts),
      form: r.form?.trim() || null,
      pack: r.pack?.trim() || null,
      packQty: r.packQty ?? null,
      regNo: r.regNo?.trim() || null,
      license: r.license?.trim() || null,
      drapCategory: r.category ?? null,
      effective: r.effective ?? null,
    });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return finish('pharmacy', 'pharmacy', items, { source: 'DRAP Price Index', updated });
}

function starterItem(key: string, r: StarterRow): LibraryItem | null {
  if (!r?.name?.trim()) return null;
  const price = Number(r.price) || 0;
  const needsPrice = !!r.needsPrice || price <= 0;
  return {
    id: r.id || `${key}-${r.name}`,
    name: r.name.trim(),
    company: r.brand?.trim() || null,
    category: r.category?.trim() || null,
    unit: r.unit?.trim() || 'pcs',
    price,
    costPrice: needsPrice || r.costPrice == null ? null : Number(r.costPrice) || 0,
    needsPrice: needsPrice || undefined,
    barcode: r.barcode?.trim() || null,
    imageUrl: r.imageUrl || null,
    tags: r.tags ?? [],
    description: r.description ?? null,
  };
}

function loadRetail(dir: string, offExtra: StarterRow[]): LibraryBook {
  const codes = readJson<Record<string, { barcode?: string | null; imageUrl?: string | null }>>(dir, 'grocery-barcodes.json') ?? {};
  const items: LibraryItem[] = PAKISTAN_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
    company: p.brand,
    category: p.category,
    categoryColor: CATEGORY_META[p.category]?.color ?? null,
    unit: p.unit,
    price: p.price,
    costPrice: p.costPrice,
    wholesalePrice: p.wholesalePrice ?? null,
    barcode: codes[p.id]?.barcode || p.barcode || null,
    imageUrl: codes[p.id]?.imageUrl || p.imageUrl || null,
    tags: p.tags,
    description: p.description ?? null,
    weight: p.weight ?? null,
    weightUnit: p.weightUnit ?? null,
  }));
  const food = offExtra.filter((r) => r.source !== 'beauty').map((r) => starterItem('retail', r)).filter(Boolean) as LibraryItem[];
  return finish('retail', 'generic', [...items, ...food], {
    estimates: true, source: 'Nafaa', openFoodFacts: Object.keys(codes).length > 0 || food.length > 0,
  });
}

/** Loads every library in the data folder. */
export function loadLibraries(logger?: Logger): Map<string, LibraryBook> {
  const books = new Map<string, LibraryBook>();
  const dir = dataDir();
  if (!dir) {
    logger?.warn('Product library data folder not found; only the grocery seed is available');
    books.set('retail', loadRetail('/nonexistent', []));
    return books;
  }
  const started = Date.now();
  const offExtra = readJson<StarterRow[]>(dir, 'grocery-off-extra.json') ?? [];
  books.set('retail', loadRetail(dir, offExtra));
  try {
    const pharmacy = loadPharmacy(dir);
    if (pharmacy) books.set('pharmacy', pharmacy);
  } catch (e: any) {
    logger?.error(`Pharmacy library failed to load: ${e?.message}`);
  }
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json') || RESERVED.has(file)) continue;
    const key = file.replace(/\.json$/, '');
    try {
      const rows = readJson<StarterRow[]>(dir, file) ?? [];
      const extra = key === 'cosmetics' ? offExtra.filter((r) => r.source === 'beauty') : [];
      const items = [...rows, ...extra].map((r) => starterItem(key, r)).filter(Boolean) as LibraryItem[];
      if (items.length) books.set(key, finish(key, 'generic', items, { estimates: true, source: 'Nafaa', openFoodFacts: extra.length > 0 }));
    } catch (e: any) {
      logger?.error(`Library ${file} failed to load: ${e?.message}`);
    }
  }
  logger?.log(`Product library loaded in ${Date.now() - started}ms: ${[...books.values()].map((b) => `${b.key} ${b.items.length}`).join(', ')}`);
  return books;
}
