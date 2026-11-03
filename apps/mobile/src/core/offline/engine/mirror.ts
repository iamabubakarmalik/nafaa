/**
 * Download of the server data the phone keeps offline (GET /sync/pull).
 *
 * The first run is a full download (with progress). Later runs ask only for
 * rows changed since the server time of the previous run; switched-off rows
 * come back and are dropped. Once a day the live ids are compared to find
 * rows removed for good, and once a week the whole mirror is refreshed.
 *
 * Rows with edits still waiting in the outbox (dirty) are not overwritten;
 * rows made offline (local) are never removed by a refresh.
 */

import { fold, skeleton, digits } from './text';
import { kvGet, kvSet } from './kv';
import type { Db, Http, SqlValue, SyncProgress } from './types';

export const PULL_PAGE = 1000;
const FULL_EVERY_MS = 7 * 86_400_000;
const IDS_EVERY_MS = 86_400_000;
const SALES_KEEP_DAYS = 30;

export const KV = {
  manifest: 'manifest',
  lastPullAt: 'lastPullAt',
  lastFullAt: 'lastFullAt',
  lastIdsAt: 'lastIdsAt',
  since: (e: string) => `since:${e}`,
  pulledAt: (e: string) => `pulledAt:${e}`,
} as const;

export interface Manifest {
  serverTime: string;
  today: string;
  timezone: string;
  dayStartHour: number;
  me: {
    id: string; role: string; shopId: string | null;
    canSell: boolean; canSeeProducts: boolean; canSeeCustomers: boolean; canSeeKhata: boolean;
    canSeeSales: boolean; canSeeCost: boolean; canSeeStaff: boolean; canSeeRegister: boolean;
  };
  currentShopId: string | null;
  settings: Record<string, unknown> & {
    allowNegativeStock?: boolean; requireCustomerForSale?: boolean; allowDiscount?: boolean; maxDiscountPercent?: number;
    allowCredit?: boolean; requirePinForVoid?: boolean; requirePinForDiscount?: boolean; requirePinForRefund?: boolean;
    hasManagerPin?: boolean; currencySymbol?: string; manufacturingEnabled?: boolean;
  } | null;
  shops: Array<{ id: string; name: string; address: string | null; phone: string | null; isMain: boolean; type: string; isActive: boolean }>;
  categories: Array<{ id: string; name: string; color: string; isActive: boolean }>;
  brands: Array<{ id: string; name: string; isActive: boolean }>;
  expenseCategories: Array<{ id: string; name: string; color?: string; icon?: string | null }>;
  incomeCategories: Array<{ id: string; name: string; color?: string }>;
  sellers: Array<{ userId: string; name: string }>;
  staff: Array<{ id: string; userId: string | null; fullName: string; designation: string; shopId: string | null; status: string; avatarUrl: string | null }>;
  registers: Array<{ id: string; shopId: string | null; registerNumber: string; openingBalance: number; openedAt: string; openedById: string }>;
  counts: { products: number; customers: number };
  pageSize: number;
}

interface Page<T> {
  serverTime: string;
  items: T[];
  nextCursor: string | null;
}

export interface PullOptions {
  /** Download everything again (also removes rows the server no longer has). */
  full?: boolean;
  onProgress?: (p: SyncProgress) => void;
  now?: () => number;
  pageSize?: number;
}

export interface PullResult {
  full: boolean;
  products: number;
  stock: number;
  customers: number;
  sales: number;
  removed: number;
  manifest: Manifest;
}

const b = (v: unknown) => (v ? 1 : 0);
const n = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const yieldUi = () => new Promise<void>((r) => setTimeout(r, 0));

/* ───────────── savers ───────────── */

type ServerProduct = {
  id: string; name: string; sku: string | null; barcode: string | null; unit: string; productType: string | null;
  price: number; costPrice?: number; wholesalePrice: number | null; creditPrice: number | null; taxRate: number;
  lowStockAlert: number; hasVariants: boolean; isRawMaterial: boolean; expiryTracked: boolean; isActive: boolean; isFeatured: boolean;
  categoryId: string | null; categoryName: string | null; categoryColor: string | null; brandId: string | null; brandName: string | null;
  imageUrl: string | null; updatedAt: string;
  variants: Array<{ id: string; name: string; sku: string | null; barcode: string | null; color: string | null; size: string | null; unit: string | null;
    price: number; costPrice?: number; wholesalePrice: number | null; creditPrice: number | null; lowStockAlert: number | null; imageUrl: string | null }>;
  units: Array<{ id: string; variantId: string | null; unitName: string; unitLabel: string | null; conversionRate: number; isBase: boolean; isDefault: boolean;
    price: number; costPrice?: number; wholesalePrice: number | null; creditPrice: number | null; mrpPrice: number | null; barcode: string | null; sku: string | null }>;
};

const code = (c: string | null | undefined) => (c ? c.trim().toLowerCase() : '');

/** Search text of a product: names, codes, brand, category, variant and pack names. */
export function productSearchText(p: Pick<ServerProduct, 'name' | 'sku' | 'barcode' | 'brandName' | 'categoryName'> & { variants?: Array<{ name: string }>; units?: Array<{ unitName: string }> }) {
  const words = [p.name, p.sku, p.barcode, p.brandName, p.categoryName, ...(p.variants ?? []).map((v) => v.name), ...(p.units ?? []).map((u) => u.unitName)];
  return {
    search: ` ${fold(words.filter(Boolean).join(' '))} `,
    skel: ` ${skeleton([p.name, p.brandName, ...(p.variants ?? []).map((v) => v.name)].filter(Boolean).join(' '))} `,
  };
}

export async function saveProducts(db: Db, rows: ServerProduct[], gen: number): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  const dirty = new Set(
    (await db.all<{ id: string }>(`SELECT id FROM products WHERE dirty > 0 AND id IN (${ids.map(() => '?').join(',')})`, ids)).map((r) => r.id),
  );
  const live = rows.filter((p) => p.isActive && !dirty.has(p.id));
  const gone = rows.filter((p) => !p.isActive && !dirty.has(p.id)).map((p) => p.id);
  const touched = [...live.map((p) => p.id), ...gone];
  await db.tx(async (db) => {
    if (touched.length) {
      const marks = touched.map(() => '?').join(',');
      await db.run(`DELETE FROM variants WHERE productId IN (${marks})`, touched);
      await db.run(`DELETE FROM packs WHERE productId IN (${marks})`, touched);
      await db.run(`DELETE FROM codes WHERE productId IN (${marks})`, touched);
    }
    if (gone.length) await db.run(`DELETE FROM products WHERE id IN (${gone.map(() => '?').join(',')})`, gone);
    // Products still dirty keep their local row but follow the server's generation, so a full refresh keeps them.
    if (dirty.size) await db.run(`UPDATE products SET gen = ? WHERE id IN (${[...dirty].map(() => '?').join(',')})`, [gen, ...dirty]);

    const productRows: SqlValue[][] = [];
    const variantRows: SqlValue[][] = [];
    const packRows: SqlValue[][] = [];
    const codeRows: SqlValue[][] = [];
    for (const p of live) {
      const { search, skel } = productSearchText(p);
      productRows.push([
        p.id, p.name, p.sku, p.barcode, p.unit || 'pcs', p.productType, Number(p.price) || 0, n(p.costPrice), n(p.wholesalePrice), n(p.creditPrice),
        Number(p.taxRate) || 0, Number(p.lowStockAlert) || 0, b(p.hasVariants), b(p.isRawMaterial), b(p.expiryTracked), 1, b(p.isFeatured),
        p.categoryId, p.categoryName, p.categoryColor, p.brandId, p.brandName, p.imageUrl, p.updatedAt, search, skel, gen,
      ]);
      const seen = new Set<string>();
      const addCode = (c: string | null | undefined, variantId: string | null, packId: string | null, kind: string) => {
        const k = code(c);
        const key = `${k}|${variantId ?? ''}|${packId ?? ''}`;
        if (!k || seen.has(key)) return;
        seen.add(key);
        codeRows.push([k, p.id, variantId ?? '', packId ?? '', kind]);
      };
      addCode(p.barcode, null, null, 'product');
      addCode(p.sku, null, null, 'product');
      p.variants.forEach((v, i) => {
        variantRows.push([v.id, p.id, v.name, v.sku, v.barcode, v.color, v.size, v.unit, Number(v.price) || 0, n(v.costPrice), n(v.wholesalePrice), n(v.creditPrice), n(v.lowStockAlert), v.imageUrl, i]);
        addCode(v.barcode, v.id, null, 'variant');
        addCode(v.sku, v.id, null, 'variant');
      });
      p.units.forEach((u, i) => {
        packRows.push([u.id, p.id, u.variantId, u.unitName, u.unitLabel, Number(u.conversionRate) || 1, b(u.isBase), b(u.isDefault), Number(u.price) || 0,
          n(u.costPrice), n(u.wholesalePrice), n(u.creditPrice), n(u.mrpPrice), u.barcode, u.sku, i]);
        addCode(u.barcode, u.variantId, u.id, 'pack');
        addCode(u.sku, u.variantId, u.id, 'pack');
      });
    }
    await db.many(
      `INSERT OR REPLACE INTO products (id, name, sku, barcode, unit, productType, price, costPrice, wholesalePrice, creditPrice,
         taxRate, lowStockAlert, hasVariants, isRawMaterial, expiryTracked, isActive, isFeatured, categoryId, categoryName, categoryColor,
         brandId, brandName, imageUrl, updatedAt, search, skel, gen, local, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      productRows,
    );
    await db.many(
      `INSERT OR REPLACE INTO variants (id, productId, name, sku, barcode, color, size, unit, price, costPrice, wholesalePrice, creditPrice, lowStockAlert, imageUrl, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      variantRows,
    );
    await db.many(
      `INSERT OR REPLACE INTO packs (id, productId, variantId, unitName, unitLabel, conversionRate, isBase, isDefault, price, costPrice, wholesalePrice, creditPrice, mrpPrice, barcode, sku, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      packRows,
    );
    await db.many('INSERT OR IGNORE INTO codes (code, productId, variantId, packId, kind) VALUES (?, ?, ?, ?, ?)', codeRows);
  });
}

type ServerStock = { shopId: string; productId: string; variantId: string | null; stock: number; reserved: number; lowStockAlert: number | null; shopPrice: number | null; isActive: boolean; updatedAt: string };

export async function saveStock(db: Db, rows: ServerStock[], gen: number): Promise<void> {
  if (!rows.length) return;
  await db.tx(async (db) => {
    const gone = rows.filter((s) => !s.isActive);
    for (const s of gone) await db.run('DELETE FROM stock WHERE shopId = ? AND productId = ? AND variantId = ?', [s.shopId, s.productId, s.variantId ?? '']);
    await db.many(
      `INSERT OR REPLACE INTO stock (shopId, productId, variantId, qty, reserved, lowStockAlert, shopPrice, updatedAt, gen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      rows.filter((s) => s.isActive).map((s) => [s.shopId, s.productId, s.variantId ?? '', Number(s.stock) || 0, Math.max(Number(s.reserved) || 0, 0), n(s.lowStockAlert), n(s.shopPrice), s.updatedAt, gen]),
    );
  });
}

type ServerCustomer = {
  id: string; name: string; businessName: string | null; phone: string | null; email: string | null; cnic: string | null; address: string | null;
  city: string | null; area: string | null; shopId: string | null; priceTier: string | null; priceListId: string | null;
  creditLimit?: number; creditDays?: number | null; balance?: number; loyaltyPoints: number; totalSpent: number; isVip: boolean; isActive: boolean;
  oldestDueAt?: string | null; updatedAt: string;
};

export function customerSearchText(c: { name: string; businessName?: string | null; phone?: string | null; cnic?: string | null; area?: string | null; city?: string | null }) {
  return {
    search: ` ${fold([c.name, c.businessName, c.phone, c.cnic, c.area, c.city].filter(Boolean).join(' '))} `,
    skel: ` ${skeleton([c.name, c.businessName].filter(Boolean).join(' '))} `,
  };
}

export async function saveCustomers(db: Db, rows: ServerCustomer[], gen: number): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  const dirty = new Set(
    (await db.all<{ id: string }>(`SELECT id FROM customers WHERE dirty > 0 AND id IN (${ids.map(() => '?').join(',')})`, ids)).map((r) => r.id),
  );
  await db.tx(async (db) => {
    const gone = rows.filter((c) => !c.isActive && !dirty.has(c.id)).map((c) => c.id);
    if (gone.length) await db.run(`DELETE FROM customers WHERE id IN (${gone.map(() => '?').join(',')})`, gone);
    // A dirty row keeps its pending edit but takes the server's balance and the new generation.
    for (const c of rows.filter((x) => dirty.has(x.id))) {
      await db.run('UPDATE customers SET balance = ?, oldestDueAt = ?, loyaltyPoints = ?, gen = ? WHERE id = ?', [n(c.balance), c.oldestDueAt ?? null, c.loyaltyPoints ?? 0, gen, c.id]);
    }
    await db.many(
      `INSERT OR REPLACE INTO customers (id, name, businessName, phone, phoneDigits, email, cnic, address, city, area, shopId, priceTier, priceListId,
         creditLimit, creditDays, balance, loyaltyPoints, totalSpent, isVip, isActive, oldestDueAt, updatedAt, search, skel, gen, local, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 0, 0)`,
      rows.filter((c) => c.isActive && !dirty.has(c.id)).map((c) => {
        const { search, skel } = customerSearchText(c);
        return [
          c.id, c.name, c.businessName, c.phone, digits(c.phone), c.email, c.cnic, c.address, c.city, c.area, c.shopId, c.priceTier, c.priceListId,
          n(c.creditLimit), n(c.creditDays), n(c.balance), Number(c.loyaltyPoints) || 0, Number(c.totalSpent) || 0, b(c.isVip),
          c.oldestDueAt ?? null, c.updatedAt, search, skel, gen,
        ];
      }),
    );
  });
}

type ServerSale = {
  id: string; saleNumber: string; shopId: string | null; customerId: string | null; customerName: string | null; total: number; status: string;
  soldAt: string; updatedAt: string; [k: string]: unknown;
};

export async function saveSales(db: Db, rows: ServerSale[]): Promise<void> {
  if (!rows.length) return;
  await db.tx(async (db) => {
    await db.many(
      `INSERT INTO sales (id, saleNumber, shopId, customerId, customerName, total, status, soldAt, pending, opId, note, data, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET saleNumber = excluded.saleNumber, shopId = excluded.shopId, customerId = excluded.customerId,
         customerName = excluded.customerName, total = excluded.total, status = excluded.status, soldAt = excluded.soldAt,
         pending = 0, data = excluded.data, updatedAt = excluded.updatedAt`,
      rows.map((s) => [s.id, s.saleNumber, s.shopId, s.customerId, s.customerName, Number(s.total) || 0, s.status, s.soldAt, JSON.stringify(s), s.updatedAt]),
    );
  });
}

async function saveManifest(db: Db, m: Manifest): Promise<void> {
  await db.tx(async (db) => {
    await kvSet(db, KV.manifest, m);
    await db.run('DELETE FROM lookups');
    const rows: SqlValue[][] = [];
    const add = (type: string, list: Array<{ id: string; name: string }>) =>
      list.forEach((x, i) => rows.push([type, x.id, x.name, JSON.stringify(x), i]));
    add('shop', m.shops);
    add('category', m.categories);
    add('brand', m.brands);
    add('expenseCategory', m.expenseCategories);
    add('incomeCategory', m.incomeCategories);
    add('seller', m.sellers.map((s) => ({ ...s, id: s.userId })));
    add('staff', m.staff.map((s) => ({ ...s, name: s.fullName })));
    add('register', m.registers.map((r) => ({ ...r, name: r.registerNumber })));
    await db.many('INSERT OR REPLACE INTO lookups (type, id, name, data, sort) VALUES (?, ?, ?, ?, ?)', rows);
  });
}

/* ───────────── the download ───────────── */

/** A page that failed with server trouble or a rate limit is asked again (2 s, 6 s, 18 s) instead of restarting the download. */
async function getWithRetry<T>(http: Http, params: Record<string, string | number | undefined>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await http.request<T>({ method: 'GET', path: '/sync/pull', params });
    } catch (e) {
      const status = (e as { status?: number })?.status ?? 0;
      const retryable = status === 429 || status === 408 || status >= 500;
      if (!retryable || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 3 ** attempt));
    }
  }
}

async function pages<T>(
  http: Http,
  entity: string,
  params: Record<string, string | number | undefined>,
  onPage: (page: Page<T>) => Promise<void>,
): Promise<{ count: number; startedServerTime: string | null }> {
  let cursor: string | undefined;
  let count = 0;
  let startedServerTime: string | null = null;
  do {
    const res = await getWithRetry<Page<T>>(http, { entity, ...params, cursor });
    const page = res.data;
    startedServerTime ??= page.serverTime;
    await onPage(page);
    count += page.items.length;
    cursor = page.nextCursor ?? undefined;
    await yieldUi();
  } while (cursor);
  return { count, startedServerTime };
}

export async function pullAll(db: Db, http: Http, opts: PullOptions = {}): Promise<PullResult> {
  const now = opts.now ?? Date.now;
  const report = opts.onProgress ?? (() => undefined);
  const limit = Math.min(opts.pageSize ?? PULL_PAGE, PULL_PAGE);
  report({ step: 'manifest', done: 0, total: 1 });

  const manifest = (await getWithRetry<Manifest>(http, { entity: 'manifest' })).data;
  await saveManifest(db, manifest);

  const lastFullAt = (await kvGet<number>(db, KV.lastFullAt)) ?? 0;
  const full = !!opts.full || now() - lastFullAt > FULL_EVERY_MS;
  const gen = now();
  const out: PullResult = { full, products: 0, stock: 0, customers: 0, sales: 0, removed: 0, manifest };
  const me = manifest.me;

  const run = async <T>(entity: string, enabled: boolean, total: number, save: (items: T[]) => Promise<void>, extra: Record<string, string | number | undefined> = {}) => {
    if (!enabled) return 0;
    const since = full ? undefined : (await kvGet<string>(db, KV.since(entity))) ?? undefined;
    const startedAt = now();
    let done = 0;
    const res = await pages<T>(http, entity, { updatedSince: since, limit, ...extra }, async (page) => {
      await save(page.items);
      done += page.items.length;
      report({ step: entity as SyncProgress['step'], done, total: since ? done : Math.max(total, done) });
    });
    if (res.startedServerTime) await kvSet(db, KV.since(entity), res.startedServerTime);
    await kvSet(db, KV.pulledAt(entity), startedAt);
    return res.count;
  };

  out.products = await run('products', me.canSeeProducts, manifest.counts.products, (items) => saveProducts(db, items as ServerProduct[], gen));
  out.stock = await run('stock', me.canSeeProducts, manifest.counts.products, (items) => saveStock(db, items as ServerStock[], gen));
  out.customers = await run('customers', me.canSeeCustomers, manifest.counts.customers, (items) => saveCustomers(db, items as ServerCustomer[], gen));
  out.sales = await run('sales', me.canSeeSales, 0, (items) => saveSales(db, items as ServerSale[]), full ? { days: 14 } : {});

  report({ step: 'cleanup', done: 0, total: 1 });
  if (full) {
    // Everything the server still has was stamped with this generation.
    if (me.canSeeProducts) {
      const old = await db.all<{ id: string }>('SELECT id FROM products WHERE gen <> ? AND local = 0 AND dirty = 0', [gen]);
      out.removed += await removeProducts(db, old.map((r) => r.id));
      await db.run('DELETE FROM stock WHERE gen <> ?', [gen]);
    }
    if (me.canSeeCustomers) {
      const r = await db.first<{ c: number }>('SELECT COUNT(*) AS c FROM customers WHERE gen <> ? AND local = 0 AND dirty = 0', [gen]);
      await db.run('DELETE FROM customers WHERE gen <> ? AND local = 0 AND dirty = 0', [gen]);
      out.removed += r?.c ?? 0;
    }
    await kvSet(db, KV.lastFullAt, now());
    await kvSet(db, KV.lastIdsAt, now());
  } else if (now() - ((await kvGet<number>(db, KV.lastIdsAt)) ?? 0) > IDS_EVERY_MS) {
    out.removed += await reconcileIds(db, http, me);
    await kvSet(db, KV.lastIdsAt, now());
  }
  const keepFrom = new Date(now() - SALES_KEEP_DAYS * 86_400_000).toISOString();
  await db.run('DELETE FROM sales WHERE pending = 0 AND soldAt < ?', [keepFrom]);
  await settleEffects(db);

  await kvSet(db, KV.lastPullAt, now());
  report({ step: 'done', done: 1, total: 1 });
  return out;
}

async function removeProducts(db: Db, ids: string[]): Promise<number> {
  for (let i = 0; i < ids.length; i += 500) {
    const part = ids.slice(i, i + 500);
    const marks = part.map(() => '?').join(',');
    await db.tx(async (db) => {
      for (const t of ['variants', 'packs', 'codes']) await db.run(`DELETE FROM ${t} WHERE productId IN (${marks})`, part);
      await db.run(`DELETE FROM products WHERE id IN (${marks})`, part);
    });
  }
  return ids.length;
}

/** Drops products and customers the server no longer has (deleted for good). */
async function reconcileIds(db: Db, http: Http, me: Manifest['me']): Promise<number> {
  let removed = 0;
  for (const of of ['products', 'customers'] as const) {
    if (of === 'products' ? !me.canSeeProducts : !me.canSeeCustomers) continue;
    const live = new Set<string>();
    await pages<string>(http, 'ids', { of, limit: 5000 }, async (page) => { page.items.forEach((id) => live.add(id)); });
    const table = of === 'products' ? 'products' : 'customers';
    const local = await db.all<{ id: string }>(`SELECT id FROM ${table} WHERE local = 0 AND dirty = 0`);
    const gone = local.map((r) => r.id).filter((id) => !live.has(id));
    if (!gone.length) continue;
    if (of === 'products') removed += await removeProducts(db, gone);
    else {
      for (let i = 0; i < gone.length; i += 500) {
        const part = gone.slice(i, i + 500);
        await db.run(`DELETE FROM customers WHERE id IN (${part.map(() => '?').join(',')})`, part);
      }
      removed += gone.length;
    }
  }
  return removed;
}

/**
 * Effects of work that reached the server before the last download of that
 * data started are now inside the mirror, so they are removed.
 */
export async function settleEffects(db: Db): Promise<void> {
  const stockAt = (await kvGet<number>(db, KV.pulledAt('stock'))) ?? 0;
  const custAt = (await kvGet<number>(db, KV.pulledAt('customers'))) ?? 0;
  await db.run("DELETE FROM effects WHERE kind = 'stock' AND doneAt IS NOT NULL AND doneAt < ?", [stockAt]);
  await db.run("DELETE FROM effects WHERE kind IN ('balance', 'loyalty') AND doneAt IS NOT NULL AND doneAt < ?", [custAt]);
  // Data this person cannot download never settles; finished work older than three days is in any later download.
  await db.run('DELETE FROM effects WHERE doneAt IS NOT NULL AND doneAt < ?', [Date.now() - 3 * 86_400_000]);
}

export const getManifest = (db: Db) => kvGet<Manifest>(db, KV.manifest);
