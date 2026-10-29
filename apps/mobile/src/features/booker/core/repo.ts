/**
 * Reads and writes on the offline database for the booker screens: routes
 * and customers with today's status, product search, the pricing inputs
 * for one customer, and the queues of orders, visits and recoveries.
 */

import { kvGet, type Db } from './db';
import { dayKeyIn, weekdayOfKey } from './day';
import { KV } from './bootstrap';
import type { PricingCatalog, PricingList, PricingProduct, PricingUnit, PricingVariant, Tier } from '../../../lib/distribution/pricing';
import type { SchemeRule } from '../../../lib/distribution/scheme-resolver';
import type {
  BootVariant, CheckInRow, CollectionPayload, CustomerRow, Manifest, OrderPayload, QueuedCollectionRow, QueuedOrderRow,
  QueuedVisitRow, SyncIssueRow, VisitPayload,
} from './types';

export const getManifest = (db: Db) => kvGet<Manifest>(db, KV.manifest);

/** Today's business day in the shop's time zone. */
export async function todayKey(db: Db): Promise<string> {
  const m = await getManifest(db);
  return dayKeyIn(m?.timezone);
}

export interface RouteRow {
  id: string;
  name: string;
  code: string | null;
  area: string | null;
  shopId: string | null;
  visitDays: number[];
  dueToday: boolean;
  customers: number;
}

export async function listRoutes(db: Db, dayKey: string): Promise<RouteRow[]> {
  const weekday = weekdayOfKey(dayKey);
  const rows = await db.all<Omit<RouteRow, 'visitDays' | 'dueToday'> & { visitDays: string }>(
    `SELECT r.id, r.name, r.code, r.area, r.shopId, r.visitDays,
       (SELECT COUNT(*) FROM customers c WHERE c.routeId = r.id) AS customers
     FROM routes r ORDER BY r.sortIndex`,
  );
  return rows.map((r) => {
    const days = safeJson<number[]>(r.visitDays, []);
    return { ...r, visitDays: days, dueToday: days.includes(weekday) };
  });
}

export interface RouteCustomer extends CustomerRow {
  orders: number;
  orderValue: number;
  noOrders: number;
  visits: number;
  collected: number;
  pending: number;
  checkedIn: number;
}

export type CustomerFilter = 'all' | 'left' | 'ordered' | 'noOrder' | 'pending';

export async function routeCustomers(
  db: Db,
  q: { dayKey: string; routeIds: string[] | null; search?: string; filter?: CustomerFilter },
): Promise<RouteCustomer[]> {
  const where: string[] = [];
  const params: (string | number)[] = [q.dayKey, q.dayKey, q.dayKey, q.dayKey, q.dayKey, q.dayKey];
  if (q.routeIds) {
    if (!q.routeIds.length) return [];
    where.push(`c.routeId IN (${q.routeIds.map(() => '?').join(',')})`);
    params.push(...q.routeIds);
  }
  const s = q.search?.trim().toLowerCase();
  if (s) {
    where.push('c.search LIKE ?');
    params.push(`%${s}%`);
  }
  const rows = await db.all<RouteCustomer>(
    `SELECT c.id, c.name, c.businessName, c.phone, c.address, c.area, c.city, c.routeId, c.routeSeq, c.priceListId, c.priceTier,
       c.latitude, c.longitude, c.balance, c.creditLimit, c.creditDays, c.oldestDueAt,
       (SELECT COUNT(*) FROM q_orders o WHERE o.customerId = c.id AND o.dayKey = ? AND o.status <> 'CONFLICT') AS orders,
       (SELECT COALESCE(SUM(COALESCE(o.serverTotal, o.localTotal)), 0) FROM q_orders o WHERE o.customerId = c.id AND o.dayKey = ? AND o.status <> 'CONFLICT') AS orderValue,
       (SELECT COUNT(*) FROM q_visits v WHERE v.customerId = c.id AND v.dayKey = ? AND v.outcome IN ('NO_ORDER', 'CLOSED')) AS noOrders,
       (SELECT COUNT(*) FROM q_visits v WHERE v.customerId = c.id AND v.dayKey = ?) AS visits,
       (SELECT COALESCE(SUM(k.amount), 0) FROM q_collections k WHERE k.customerId = c.id AND k.dayKey = ? AND k.status <> 'CONFLICT') AS collected,
       ((SELECT COUNT(*) FROM q_orders o WHERE o.customerId = c.id AND o.status = 'PENDING')
        + (SELECT COUNT(*) FROM q_visits v WHERE v.customerId = c.id AND v.status = 'PENDING')
        + (SELECT COUNT(*) FROM q_collections k WHERE k.customerId = c.id AND k.status = 'PENDING')) AS pending,
       (SELECT COUNT(*) FROM checkins h WHERE h.customerId = c.id AND h.dayKey = ?) AS checkedIn
     FROM customers c
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY CASE WHEN c.routeSeq IS NULL THEN 1 ELSE 0 END, c.routeSeq, c.name`,
    params,
  );
  const visited = (c: RouteCustomer) => c.orders > 0 || c.visits > 0;
  switch (q.filter) {
    case 'left': return rows.filter((c) => !visited(c));
    case 'ordered': return rows.filter((c) => c.orders > 0);
    case 'noOrder': return rows.filter((c) => c.noOrders > 0 && c.orders === 0);
    case 'pending': return rows.filter((c) => c.pending > 0);
    default: return rows;
  }
}

export const getCustomer = (db: Db, id: string) =>
  db.first<CustomerRow>(
    `SELECT id, name, businessName, phone, address, area, city, routeId, routeSeq, priceListId, priceTier, latitude, longitude,
       balance, creditLimit, creditDays, oldestDueAt FROM customers WHERE id = ?`,
    [id],
  );

/* ───────────── products ───────────── */

export interface ProductHit {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  price: number;
  wholesalePrice: number | null;
  brandName: string | null;
  variants: BootVariant[];
  stockQty: number;
  packs: { id: string; variantId: string | null; unitName: string; conversionRate: number; isDefault: boolean }[];
}

type ProductDbRow = { id: string; name: string; sku: string | null; unit: string | null; price: number; wholesalePrice: number | null; brandName: string | null; variants: string; stock: string };
const PRODUCT_COLS = 'id, name, sku, unit, price, wholesalePrice, brandName, variants, stock';

async function hydrate(db: Db, rows: ProductDbRow[]): Promise<ProductHit[]> {
  if (!rows.length) return [];
  const packs = await db.all<{ id: string; productId: string; variantId: string | null; unitName: string; conversionRate: number; isDefault: number }>(
    `SELECT id, productId, variantId, unitName, conversionRate, isDefault FROM packs WHERE productId IN (${rows.map(() => '?').join(',')})
     ORDER BY conversionRate`,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, sku: r.sku, unit: r.unit, price: r.price, wholesalePrice: r.wholesalePrice, brandName: r.brandName,
    variants: safeJson<BootVariant[]>(r.variants, []),
    stockQty: safeJson<{ qty: number }[]>(r.stock, []).reduce((s, x) => s + (Number(x.qty) || 0), 0),
    packs: packs.filter((p) => p.productId === r.id).map((p) => ({ id: p.id, variantId: p.variantId, unitName: p.unitName, conversionRate: p.conversionRate, isDefault: !!p.isDefault })),
  }));
}

/** Name, SKU, brand or barcode search; every word must match. */
export async function searchProducts(db: Db, text: string, limit = 40): Promise<ProductHit[]> {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);
  const where = words.map(() => 'search LIKE ?').join(' AND ');
  const rows = await db.all<ProductDbRow>(
    `SELECT ${PRODUCT_COLS} FROM products ${where ? `WHERE ${where}` : ''} ORDER BY name LIMIT ?`,
    [...words.map((w) => `%${w}%`), limit],
  );
  return hydrate(db, rows);
}

export async function productsByIds(db: Db, ids: string[]): Promise<ProductHit[]> {
  const list = [...new Set(ids)];
  if (!list.length) return [];
  const rows = await db.all<ProductDbRow>(`SELECT ${PRODUCT_COLS} FROM products WHERE id IN (${list.map(() => '?').join(',')})`, list);
  return hydrate(db, rows);
}

/* ───────────── pricing inputs ───────────── */

export interface CustomerPricing {
  list: PricingList | null;
  listName: string | null;
  tier: Tier;
  schemes: SchemeRule[];
  catalog: PricingCatalog;
}

const TIERS: Tier[] = ['RETAIL', 'WHOLESALE', 'CREDIT'];

/** Same choice as the server: customer's list, then the settings default, then the list marked default. */
async function customerListId(db: Db, customer: CustomerRow, manifest: Manifest | null): Promise<string | null> {
  const known = new Set((await db.all<{ id: string }>('SELECT id FROM price_lists')).map((r) => r.id));
  for (const id of [customer.priceListId, manifest?.settings.defaultPriceListId]) if (id && known.has(id)) return id;
  return (await db.first<{ id: string }>('SELECT id FROM price_lists WHERE isDefault = 1 LIMIT 1'))?.id ?? null;
}

export async function pricingFor(db: Db, customer: CustomerRow, productIds: string[]): Promise<CustomerPricing> {
  const manifest = await getManifest(db);
  const ids = [...new Set(productIds)];
  const listId = await customerListId(db, customer, manifest);
  const marks = ids.map(() => '?').join(',');

  const [products, packs, header, items, schemes] = await Promise.all([
    ids.length
      ? db.all<{ id: string; name: string; price: number; wholesalePrice: number | null; creditPrice: number | null; brandId: string | null; categoryId: string | null; unit: string | null; taxRate: number | null; variants: string }>(
          `SELECT id, name, price, wholesalePrice, creditPrice, brandId, categoryId, unit, taxRate, variants FROM products WHERE id IN (${marks})`, ids)
      : Promise.resolve([]),
    ids.length
      ? db.all<PricingUnit>(`SELECT id, productId, variantId, unitName, conversionRate, price, wholesalePrice, creditPrice FROM packs WHERE productId IN (${marks})`, ids)
      : Promise.resolve([]),
    listId ? db.first<{ id: string; name: string; basedOn: string; adjustPct: number }>('SELECT id, name, basedOn, adjustPct FROM price_lists WHERE id = ?', [listId]) : Promise.resolve(null),
    listId && ids.length
      ? db.all<{ productId: string; variantId: string | null; unitId: string | null; price: number; minQty: number | null }>(
          `SELECT productId, variantId, unitId, price, minQty FROM price_list_items WHERE priceListId = ? AND productId IN (${marks})`, [listId, ...ids])
      : Promise.resolve([]),
    db.all<{ data: string }>('SELECT data FROM schemes'),
  ]);

  const catalog: PricingCatalog = { products: new Map(), variants: new Map(), units: new Map(), unitsByProduct: new Map() };
  for (const p of products) {
    const { variants, ...rest } = p;
    catalog.products.set(p.id, rest as PricingProduct);
    for (const v of safeJson<BootVariant[]>(variants, [])) catalog.variants.set(v.id, { ...v, productId: p.id } as PricingVariant);
  }
  for (const u of packs) {
    catalog.units.set(u.id, u);
    catalog.unitsByProduct.set(u.productId, [...(catalog.unitsByProduct.get(u.productId) ?? []), u]);
  }
  const tier = TIERS.includes(customer.priceTier as Tier) ? (customer.priceTier as Tier) : 'WHOLESALE';
  return {
    list: header ? { id: header.id, name: header.name, basedOn: header.basedOn, adjustPct: Number(header.adjustPct) || 0, items } : null,
    listName: header?.name ?? null,
    tier,
    schemes: schemes.map((s) => safeJson<SchemeRule | null>(s.data, null)).filter((s): s is SchemeRule => !!s),
    catalog,
  };
}

/* ───────────── check-in ───────────── */

export const getCheckIn = (db: Db, customerId: string, dayKey: string) =>
  db.first<CheckInRow>('SELECT * FROM checkins WHERE customerId = ? AND dayKey = ?', [customerId, dayKey]);

export async function saveCheckIn(db: Db, row: CheckInRow) {
  await db.run(
    `INSERT OR REPLACE INTO checkins (customerId, dayKey, at, latitude, longitude, accuracyM, distanceM, far) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.customerId, row.dayKey, row.at, row.latitude, row.longitude, row.accuracyM, row.distanceM, row.far],
  );
}

/* ───────────── queues ───────────── */

export async function queueOrder(db: Db, o: { payload: OrderPayload; dayKey: string; localTotal: number; visit?: VisitPayload | null; distanceM?: number | null; replaces?: string | null }) {
  const now = new Date().toISOString();
  await db.tx(async () => {
    await db.run(
      `INSERT INTO q_orders (clientRef, customerId, dayKey, payload, localTotal, lineCount, status, attempts, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
      [o.payload.clientRef, o.payload.customerId, o.dayKey, JSON.stringify(o.payload), o.localTotal, o.payload.items.length, now],
    );
    if (o.visit) await insertVisit(db, o.visit, o.dayKey, o.distanceM ?? null, now);
    if (o.replaces) await db.run(`UPDATE sync_issues SET resolvedAt = ? WHERE kind = 'order' AND clientRef = ?`, [now, o.replaces]);
  });
}

async function insertVisit(db: Db, v: VisitPayload, dayKey: string, distanceM: number | null, now: string) {
  await db.run(
    `INSERT INTO q_visits (clientRef, customerId, dayKey, outcome, noOrderReason, orderClientRef, distanceM, payload, status, attempts, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
    [v.clientRef, v.customerId, dayKey, v.outcome, v.noOrderReason ?? null, v.salesOrderClientRef ?? null, distanceM, JSON.stringify(v), now],
  );
}

export async function queueVisit(db: Db, v: VisitPayload, dayKey: string, distanceM: number | null) {
  await insertVisit(db, v, dayKey, distanceM, new Date().toISOString());
}

export async function queueCollection(db: Db, c: CollectionPayload, dayKey: string, visit?: { payload: VisitPayload; distanceM: number | null } | null) {
  const now = new Date().toISOString();
  await db.tx(async () => {
    await db.run(
      `INSERT INTO q_collections (clientRef, customerId, dayKey, amount, method, payload, status, attempts, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
      [c.clientRef, c.customerId, dayKey, c.amount, c.method ?? 'CASH', JSON.stringify(c), now],
    );
    if (visit) await insertVisit(db, visit.payload, dayKey, visit.distanceM, now);
  });
}

export async function customerDay(db: Db, customerId: string, dayKey: string) {
  const [orders, visits, collections] = await Promise.all([
    db.all<QueuedOrderRow>('SELECT * FROM q_orders WHERE customerId = ? AND dayKey = ? ORDER BY createdAt DESC', [customerId, dayKey]),
    db.all<QueuedVisitRow>('SELECT * FROM q_visits WHERE customerId = ? AND dayKey = ? ORDER BY createdAt DESC', [customerId, dayKey]),
    db.all<QueuedCollectionRow>('SELECT * FROM q_collections WHERE customerId = ? AND dayKey = ? ORDER BY createdAt DESC', [customerId, dayKey]),
  ]);
  return { orders, visits, collections };
}

export const getQueuedOrder = (db: Db, clientRef: string) =>
  db.first<QueuedOrderRow>('SELECT * FROM q_orders WHERE clientRef = ?', [clientRef]);

export const dayOrders = (db: Db, dayKey: string) =>
  db.all<QueuedOrderRow & { customerName: string; businessName: string | null }>(
    `SELECT o.*, COALESCE(c.name, '') AS customerName, c.businessName FROM q_orders o LEFT JOIN customers c ON c.id = o.customerId
     WHERE o.dayKey = ? ORDER BY o.createdAt DESC`,
    [dayKey],
  );

export async function pendingCount(db: Db): Promise<number> {
  const row = await db.first<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM q_orders WHERE status = 'PENDING') + (SELECT COUNT(*) FROM q_visits WHERE status = 'PENDING')
       + (SELECT COUNT(*) FROM q_collections WHERE status = 'PENDING') AS n`,
  );
  return Number(row?.n ?? 0);
}

export const openIssues = (db: Db) =>
  db.all<SyncIssueRow & { customerName: string | null }>(
    `SELECT i.id, i.kind, i.clientRef, i.customerId, i.title, i.reason, i.createdAt, c.name AS customerName
     FROM sync_issues i LEFT JOIN customers c ON c.id = i.customerId WHERE i.resolvedAt IS NULL ORDER BY i.createdAt DESC`,
  );

export async function issueCount(db: Db): Promise<number> {
  return Number((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_issues WHERE resolvedAt IS NULL'))?.n ?? 0);
}

export async function dismissIssue(db: Db, id: number) {
  await db.run('UPDATE sync_issues SET resolvedAt = ? WHERE id = ?', [new Date().toISOString(), id]);
}

/** Local totals for the day, shown before the server summary loads or while offline. */
export async function localDayStats(db: Db, dayKey: string) {
  const row = await db.first<{ orders: number; value: number; visits: number; collected: number }>(
    `SELECT
       (SELECT COUNT(*) FROM q_orders WHERE dayKey = ? AND status <> 'CONFLICT') AS orders,
       (SELECT COALESCE(SUM(COALESCE(serverTotal, localTotal)), 0) FROM q_orders WHERE dayKey = ? AND status <> 'CONFLICT') AS value,
       (SELECT COUNT(DISTINCT customerId) FROM (
          SELECT customerId FROM q_visits WHERE dayKey = ? UNION SELECT customerId FROM q_orders WHERE dayKey = ? AND status <> 'CONFLICT')) AS visits,
       (SELECT COALESCE(SUM(amount), 0) FROM q_collections WHERE dayKey = ? AND status <> 'CONFLICT') AS collected`,
    [dayKey, dayKey, dayKey, dayKey, dayKey],
  );
  return { orders: Number(row?.orders ?? 0), value: Number(row?.value ?? 0), visits: Number(row?.visits ?? 0), collected: Number(row?.collected ?? 0) };
}

export function safeJson<T>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
