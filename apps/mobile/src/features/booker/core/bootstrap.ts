/**
 * Start-of-day download: the manifest, then customers, products and the
 * price lists the booker's customers use, page by page.
 *
 * The first download of a business day is a full refresh (rows not seen
 * again are removed, which also catches pack changes that do not move a
 * product's updatedAt). Later downloads the same day only ask for rows
 * changed since the last manifest's serverTime; switched-off rows come back
 * and are dropped. A price list is fetched again whenever its updatedAt moved.
 */

import { bookerApi, type Http } from './api';
import { kvGet, kvSet, type Db } from './db';
import type { BootCustomer, BootProduct, Manifest } from './types';

export type DownloadStep = 'manifest' | 'customers' | 'products' | 'prices' | 'done';

export interface DownloadProgress {
  step: DownloadStep;
  done: number;
  total: number;
}

export interface DownloadResult {
  full: boolean;
  customers: number;
  products: number;
  priceItems: number;
  priceListsFetched: number;
  manifest: Manifest;
}

export const KV = {
  manifest: 'manifest',
  lastServerTime: 'lastServerTime',
  lastFullDay: 'lastFullDay',
  lastDownloadAt: 'lastDownloadAt',
  lastSyncAt: 'lastSyncAt',
} as const;

const lower = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase();

async function saveCustomers(db: Db, rows: BootCustomer[], gen: number) {
  await db.tx(async () => {
    for (const c of rows) {
      if (!c.isActive) {
        await db.run('DELETE FROM customers WHERE id = ?', [c.id]);
        continue;
      }
      await db.run(
        `INSERT OR REPLACE INTO customers (id, name, businessName, phone, address, area, city, routeId, routeSeq, priceListId, priceTier,
           latitude, longitude, balance, creditLimit, creditDays, oldestDueAt, search, gen, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id, c.name, c.businessName, c.phone, c.address, c.area, c.city, c.routeId, c.routeSeq, c.priceListId, c.priceTier,
          c.latitude, c.longitude, c.balance ?? null, c.creditLimit ?? null, c.creditDays, c.oldestDueAt ?? null,
          lower(c.name, c.businessName, c.phone, c.area, c.address), gen, c.updatedAt,
        ],
      );
    }
  });
}

async function saveProducts(db: Db, rows: BootProduct[], gen: number) {
  await db.tx(async () => {
    for (const p of rows) {
      await db.run('DELETE FROM packs WHERE productId = ?', [p.id]);
      if (!p.isActive) {
        await db.run('DELETE FROM products WHERE id = ?', [p.id]);
        continue;
      }
      await db.run(
        `INSERT OR REPLACE INTO products (id, name, sku, barcode, unit, price, wholesalePrice, creditPrice, brandId, categoryId,
           brandName, categoryName, taxRate, variants, stock, search, gen, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.name, p.sku, p.barcode, p.unit, Number(p.price) || 0, p.wholesalePrice, p.creditPrice, p.brandId, p.categoryId,
          p.brandName, p.categoryName, p.taxRate, JSON.stringify(p.variants ?? []), JSON.stringify(p.stock ?? []),
          lower(p.name, p.sku, p.barcode, p.brandName, ...(p.units ?? []).map((u) => u.barcode)), gen, p.updatedAt,
        ],
      );
      for (const u of p.units ?? []) {
        await db.run(
          `INSERT OR REPLACE INTO packs (id, productId, variantId, unitName, conversionRate, price, wholesalePrice, creditPrice, barcode, isDefault)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, p.id, u.variantId, u.unitName, Number(u.conversionRate) || 1, Number(u.price) || 0, u.wholesalePrice, u.creditPrice, u.barcode, u.isDefault ? 1 : 0],
        );
      }
    }
  });
}

async function saveManifest(db: Db, m: Manifest) {
  await db.tx(async () => {
    await kvSet(db, KV.manifest, m);
    await db.run('DELETE FROM routes');
    let i = 0;
    for (const r of m.routes) {
      await db.run('INSERT INTO routes (id, name, code, area, shopId, visitDays, sortIndex, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.code, r.area, r.shopId, JSON.stringify(r.visitDays ?? []), i++, r.updatedAt]);
    }
    await db.run('DELETE FROM schemes');
    for (const s of m.schemes) await db.run('INSERT INTO schemes (id, data) VALUES (?, ?)', [s.id, JSON.stringify(s)]);
  });
}

export async function downloadDay(
  db: Db,
  http: Http,
  opts: { force?: boolean; onProgress?: (p: DownloadProgress) => void; pageSize?: number } = {},
): Promise<DownloadResult> {
  const api = bookerApi(http);
  const report = opts.onProgress ?? (() => undefined);
  report({ step: 'manifest', done: 0, total: 1 });

  const manifest = await api.manifest();
  const [lastServerTime, lastFullDay] = await Promise.all([kvGet<string>(db, KV.lastServerTime), kvGet<string>(db, KV.lastFullDay)]);
  const full = !!opts.force || !lastServerTime || lastFullDay !== manifest.today;
  const since = full ? undefined : lastServerTime ?? undefined;
  const gen = Date.now();
  const limit = opts.pageSize ?? manifest.pageSize ?? 500;
  await saveManifest(db, manifest);

  // Customers on the booker's routes.
  let customers = 0;
  if (manifest.me.canSeeCustomers) {
    let cursor: string | undefined;
    do {
      const page = await api.customers({ updatedSince: since, cursor, limit });
      await saveCustomers(db, page.items, gen);
      customers += page.items.length;
      report({ step: 'customers', done: customers, total: full ? manifest.counts.customers : customers });
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    if (full) await db.run('DELETE FROM customers WHERE gen <> ?', [gen]);
  }

  // Products with packs and godown stock.
  let products = 0;
  if (manifest.me.canSeeProducts) {
    let cursor: string | undefined;
    do {
      const page = await api.products({ updatedSince: since, cursor, limit });
      await saveProducts(db, page.items, gen);
      products += page.items.length;
      report({ step: 'products', done: products, total: full ? manifest.counts.products : products });
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    if (full) {
      await db.run('DELETE FROM packs WHERE productId IN (SELECT id FROM products WHERE gen <> ?)', [gen]);
      await db.run('DELETE FROM products WHERE gen <> ?', [gen]);
    }
  }

  // Price lists: headers for every active list; rows for the lists that can price this booker's customers.
  const listIds = new Set(manifest.priceLists.map((l) => l.id));
  const used = new Set<string>();
  for (const r of await db.all<{ priceListId: string }>('SELECT DISTINCT priceListId FROM customers WHERE priceListId IS NOT NULL')) used.add(r.priceListId);
  if (manifest.settings.defaultPriceListId) used.add(manifest.settings.defaultPriceListId);
  for (const l of manifest.priceLists) if (l.isDefault) used.add(l.id);

  const stored = new Map(
    (await db.all<{ id: string; itemsUpdatedAt: string | null }>('SELECT id, itemsUpdatedAt FROM price_lists')).map((r) => [r.id, r.itemsUpdatedAt]),
  );
  for (const id of stored.keys()) {
    if (!listIds.has(id)) {
      await db.run('DELETE FROM price_list_items WHERE priceListId = ?', [id]);
      await db.run('DELETE FROM price_lists WHERE id = ?', [id]);
    }
  }
  const toFetch = manifest.priceLists.filter((l) => used.has(l.id) && (full || stored.get(l.id) !== l.updatedAt));
  const totalItems = toFetch.reduce((s, l) => s + (l.itemCount || 0), 0);
  let priceItems = 0;
  for (const l of manifest.priceLists) {
    await db.run(
      `INSERT INTO price_lists (id, name, basedOn, adjustPct, isDefault, updatedAt, itemsUpdatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, basedOn = excluded.basedOn, adjustPct = excluded.adjustPct,
         isDefault = excluded.isDefault, updatedAt = excluded.updatedAt`,
      [l.id, l.name, l.basedOn, Number(l.adjustPct) || 0, l.isDefault ? 1 : 0, l.updatedAt, null],
    );
  }
  for (const l of toFetch) {
    const rows: { id: string; productId: string; variantId: string | null; unitId: string | null; price: number; minQty: number | null }[] = [];
    let cursor: string | undefined;
    let listUpdatedAt = l.updatedAt;
    do {
      const page = await api.priceListItems({ priceListId: l.id, cursor, limit: Math.min(1000, Math.max(limit, 500)) });
      rows.push(...page.items);
      listUpdatedAt = page.listUpdatedAt ?? listUpdatedAt;
      priceItems += page.items.length;
      report({ step: 'prices', done: priceItems, total: Math.max(totalItems, priceItems) });
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    // Swap the whole list at once so a broken download never leaves half a list.
    await db.tx(async () => {
      await db.run('DELETE FROM price_list_items WHERE priceListId = ?', [l.id]);
      for (const it of rows) {
        await db.run('INSERT OR REPLACE INTO price_list_items (id, priceListId, productId, variantId, unitId, price, minQty) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [it.id, l.id, it.productId, it.variantId, it.unitId, Number(it.price) || 0, it.minQty]);
      }
      await db.run('UPDATE price_lists SET itemsUpdatedAt = ? WHERE id = ?', [listUpdatedAt, l.id]);
    });
  }
  await kvSet(db, KV.lastServerTime, manifest.serverTime);
  if (full) await kvSet(db, KV.lastFullDay, manifest.today);
  await kvSet(db, KV.lastDownloadAt, new Date().toISOString());
  report({ step: 'done', done: 1, total: 1 });
  return { full, customers, products, priceItems, priceListsFetched: toFetch.length, manifest };
}
