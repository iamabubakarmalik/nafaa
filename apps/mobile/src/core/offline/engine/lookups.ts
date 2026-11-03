/**
 * Reads from the offline database for screens: product search and barcode
 * lookup, branch stock, customers, recent sales and the small lists.
 *
 * Every stock and balance figure has the pending offline work applied
 * (see effects in schema.ts), so the counter sees what is really left.
 */

import { digits, fold, likeEscape, skeleton } from './text';
import type { BarcodeHit, CustomerRow, Db, PackRow, PriceTier, ProductDetail, ProductRow, SaleRow, SqlValue, VariantRow } from './types';

/* ───────────── stock ───────────── */

/** SQL for a product's free stock in one branch, pending work applied. Params: shopId twice. */
const STOCK_SQL = `(
  SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE SUM(s.qty - s.reserved) END FROM stock s
  WHERE s.shopId = ? AND s.productId = p.id AND (CASE WHEN p.hasVariants = 1 THEN s.variantId <> '' ELSE s.variantId = '' END)
) + COALESCE((
  SELECT SUM(e.delta) FROM effects e
  WHERE e.kind = 'stock' AND e.k1 = ? AND e.k2 = p.id AND (CASE WHEN p.hasVariants = 1 THEN e.k3 <> '' ELSE e.k3 = '' END)
), 0)`;

/** Free stock of one item in one branch with pending work applied; null when the branch has no stock row. */
export async function stockOf(db: Db, shopId: string, productId: string, variantId?: string | null): Promise<number | null> {
  const v = variantId ?? '';
  const row = await db.first<{ qty: number | null; local: number }>(
    `SELECT (SELECT qty - reserved FROM stock WHERE shopId = ? AND productId = ? AND variantId = ?) AS qty,
            COALESCE((SELECT SUM(delta) FROM effects WHERE kind = 'stock' AND k1 = ? AND k2 = ? AND k3 = ?), 0) AS local`,
    [shopId, productId, v, shopId, productId, v],
  );
  if (!row) return null;
  if (row.qty === null) return row.local ? row.local : null;
  return round(row.qty + row.local);
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/* ───────────── products ───────────── */

interface ProductSqlRow {
  id: string; name: string; sku: string | null; barcode: string | null; unit: string; productType: string | null;
  price: number; costPrice: number | null; wholesalePrice: number | null; creditPrice: number | null; taxRate: number;
  lowStockAlert: number; hasVariants: number; isRawMaterial: number; expiryTracked: number; isActive: number; isFeatured: number;
  categoryId: string | null; categoryName: string | null; categoryColor: string | null; brandId: string | null; brandName: string | null;
  imageUrl: string | null; updatedAt: string | null; local: number; dirty: number; stock: number | null;
}

const PRODUCT_COLS = `p.id, p.name, p.sku, p.barcode, p.unit, p.productType, p.price, p.costPrice, p.wholesalePrice, p.creditPrice, p.taxRate,
  p.lowStockAlert, p.hasVariants, p.isRawMaterial, p.expiryTracked, p.isActive, p.isFeatured, p.categoryId, p.categoryName, p.categoryColor,
  p.brandId, p.brandName, p.imageUrl, p.updatedAt, p.local, p.dirty`;

function toProduct(r: ProductSqlRow): ProductRow {
  return {
    id: r.id, name: r.name, sku: r.sku, barcode: r.barcode, unit: r.unit, productType: r.productType,
    price: r.price, costPrice: r.costPrice, wholesalePrice: r.wholesalePrice, creditPrice: r.creditPrice, taxRate: r.taxRate,
    lowStockAlert: r.lowStockAlert, hasVariants: !!r.hasVariants, isRawMaterial: !!r.isRawMaterial, expiryTracked: !!r.expiryTracked,
    isActive: !!r.isActive, isFeatured: !!r.isFeatured, categoryId: r.categoryId, categoryName: r.categoryName, categoryColor: r.categoryColor,
    brandId: r.brandId, brandName: r.brandName, imageUrl: r.imageUrl, updatedAt: r.updatedAt,
    pendingCreate: !!r.local, pendingEdit: r.dirty > 0, stock: r.stock === null || r.stock === undefined ? null : round(r.stock),
  };
}

export interface ProductSearch {
  query?: string;
  shopId?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  /** in: above the low-stock mark, low: at or under it, out: none left. Needs shopId. */
  stock?: 'all' | 'in' | 'low' | 'out';
  /** Raw materials are hidden from the counter unless asked for. */
  includeRaw?: boolean;
  featuredFirst?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Product search for the counter and lists. Exact barcode/SKU first, then
 * names that start with the words, then names that contain them, then
 * loose Roman Urdu matches (chawal ~ chaawal).
 */
export async function searchProducts(db: Db, q: ProductSearch = {}): Promise<ProductRow[]> {
  const where: string[] = ['p.isActive = 1'];
  const params: SqlValue[] = [];
  const order: string[] = [];
  const orderParams: SqlValue[] = [];
  const shopId = q.shopId ?? null;
  if (!q.includeRaw) where.push('p.isRawMaterial = 0');
  if (q.categoryId) { where.push('p.categoryId = ?'); params.push(q.categoryId); }
  if (q.brandId) { where.push('p.brandId = ?'); params.push(q.brandId); }

  const text = fold(q.query);
  if (text) {
    const scanned = (q.query ?? '').trim().toLowerCase();
    const words = text.split(' ').slice(0, 6);
    const parts: string[] = [];
    const wordParams: SqlValue[] = [];
    for (const w of words) {
      const sk = skeleton(w);
      if (w.length >= 3 && sk.length >= 2 && /[a-z]/.test(w)) {
        parts.push("(p.search LIKE ? ESCAPE '\\' OR p.skel LIKE ? ESCAPE '\\')");
        // Loose matches only at the start of a word (chaawal ~ chawal), so short skeletons stay precise.
        wordParams.push(`%${likeEscape(w)}%`, `% ${likeEscape(sk)}%`);
      } else {
        parts.push("p.search LIKE ? ESCAPE '\\'");
        wordParams.push(`%${likeEscape(w)}%`);
      }
    }
    where.push(`(p.id IN (SELECT productId FROM codes WHERE code = ?) OR (${parts.join(' AND ')}))`);
    params.push(scanned, ...wordParams);
    order.push(`CASE WHEN p.id IN (SELECT productId FROM codes WHERE code = ?) THEN 0
      WHEN p.search LIKE ? ESCAPE '\\' THEN 1 WHEN p.search LIKE ? ESCAPE '\\' THEN 2 WHEN p.search LIKE ? ESCAPE '\\' THEN 3 ELSE 4 END`);
    orderParams.push(scanned, ` ${likeEscape(text)}%`, `% ${likeEscape(words[0])}%`, `%${likeEscape(text)}%`);
  }
  if (q.featuredFirst) order.push('p.isFeatured DESC');
  order.push('p.name COLLATE NOCASE');

  const stockExpr = shopId ? STOCK_SQL : 'NULL';
  const limit = q.limit ?? 50;
  const offset = q.offset ?? 0;
  if (shopId && q.stock && q.stock !== 'all') {
    // Stock filter: stock is needed in the WHERE, so one query.
    const cond = q.stock === 'out' ? 'COALESCE(p.stock, 0) <= 0' : q.stock === 'low' ? 'p.stock > 0 AND p.stock <= p.lowStockAlert' : 'p.stock > p.lowStockAlert';
    const sql = `SELECT * FROM (SELECT ${PRODUCT_COLS}, p.search, ${stockExpr} AS stock FROM products p WHERE ${where.join(' AND ')}) p
      WHERE ${cond} ORDER BY ${order.join(', ')} LIMIT ? OFFSET ?`;
    const rows = await db.all<ProductSqlRow>(sql, [shopId, shopId, ...params, ...orderParams, limit, offset]);
    return rows.map(toProduct);
  }
  // Rank and page on the narrow columns first; read full rows and stock for the page only.
  const ids = await db.all<{ id: string }>(
    `SELECT p.id FROM products p WHERE ${where.join(' AND ')} ORDER BY ${order.join(', ')} LIMIT ? OFFSET ?`,
    [...params, ...orderParams, limit, offset],
  );
  if (!ids.length) return [];
  const rows = await db.all<ProductSqlRow>(
    `SELECT ${PRODUCT_COLS}, ${stockExpr} AS stock FROM products p WHERE p.id IN (${ids.map(() => '?').join(',')})`,
    [...(shopId ? [shopId, shopId] : []), ...ids.map((r) => r.id)],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((r) => byId.get(r.id)).filter((r): r is ProductSqlRow => !!r).map(toProduct);
}

export async function countProducts(db: Db): Promise<number> {
  return (await db.first<{ c: number }>('SELECT COUNT(*) AS c FROM products WHERE isActive = 1'))?.c ?? 0;
}

/** Active products per category (null key = no category), for counter chips. */
export async function countProductsByCategory(db: Db): Promise<Record<string, number>> {
  const rows = await db.all<{ k: string | null; c: number }>('SELECT categoryId AS k, COUNT(*) AS c FROM products WHERE isActive = 1 GROUP BY categoryId');
  return Object.fromEntries(rows.map((r) => [r.k ?? '', r.c]));
}

export async function getProduct(db: Db, id: string, shopId?: string | null): Promise<ProductDetail | null> {
  const stockExpr = shopId ? STOCK_SQL : 'NULL';
  const row = await db.first<ProductSqlRow>(
    `SELECT ${PRODUCT_COLS}, ${stockExpr} AS stock FROM products p WHERE p.id = ?`,
    [...(shopId ? [shopId, shopId] : []), id],
  );
  if (!row) return null;
  const [variants, packs] = await Promise.all([
    db.all<VariantRow>('SELECT * FROM variants WHERE productId = ? ORDER BY sort', [id]),
    db.all<Omit<PackRow, 'isBase' | 'isDefault'> & { isBase: number; isDefault: number }>('SELECT * FROM packs WHERE productId = ? ORDER BY sort', [id]),
  ]);
  const withStock = await Promise.all(variants.map(async (v) => ({ ...v, stock: shopId ? await stockOf(db, shopId, id, v.id) : null })));
  return {
    ...toProduct(row),
    variants: withStock,
    packs: packs.map((p) => ({ ...p, isBase: !!p.isBase, isDefault: !!p.isDefault })),
  };
}

/** Barcode or SKU scan: product, variant or pack. Exact match on the code, any case. */
export async function findByCode(db: Db, scanned: string, shopId?: string | null): Promise<BarcodeHit | null> {
  const c = scanned.trim().toLowerCase();
  if (!c) return null;
  const hit = await db.first<{ productId: string; variantId: string; packId: string; kind: 'product' | 'variant' | 'pack' }>(
    `SELECT c.productId, c.variantId, c.packId, c.kind FROM codes c JOIN products p ON p.id = c.productId
     WHERE c.code = ? AND p.isActive = 1 ORDER BY CASE c.kind WHEN 'product' THEN 0 WHEN 'variant' THEN 1 ELSE 2 END LIMIT 1`,
    [c],
  );
  if (!hit) return null;
  const product = await getProduct(db, hit.productId, shopId);
  if (!product) return null;
  return {
    product,
    variantId: hit.variantId || null,
    pack: hit.packId ? product.packs.find((p) => p.id === hit.packId) ?? null : null,
    via: hit.kind,
  };
}

/** List price of a product, variant or pack for a price tier (empty tier prices fall back to retail). */
export function tierPrice(
  item: { price: number; wholesalePrice: number | null; creditPrice: number | null },
  tier: PriceTier | null | undefined,
): number {
  if (tier === 'WHOLESALE' && item.wholesalePrice != null) return item.wholesalePrice;
  if (tier === 'CREDIT' && item.creditPrice != null) return item.creditPrice;
  return item.price;
}

/* ───────────── customers ───────────── */

interface CustomerSqlRow {
  id: string; name: string; businessName: string | null; phone: string | null; email: string | null; cnic: string | null;
  address: string | null; city: string | null; area: string | null; shopId: string | null; priceTier: string | null;
  creditLimit: number | null; creditDays: number | null; balance: number | null; local_delta: number;
  loyaltyPoints: number; loyalty_delta: number; totalSpent: number; isVip: number; isActive: number; oldestDueAt: string | null; local: number; dirty: number;
}

const CUSTOMER_SQL = `SELECT c.*,
  COALESCE((SELECT SUM(delta) FROM effects e WHERE e.kind = 'balance' AND e.k1 = c.id), 0) AS local_delta,
  COALESCE((SELECT SUM(delta) FROM effects e WHERE e.kind = 'loyalty' AND e.k1 = c.id), 0) AS loyalty_delta
  FROM customers c`;

function toCustomer(r: CustomerSqlRow): CustomerRow {
  const known = r.balance !== null || r.local_delta !== 0;
  return {
    id: r.id, name: r.name, businessName: r.businessName, phone: r.phone, email: r.email, cnic: r.cnic, address: r.address,
    city: r.city, area: r.area, shopId: r.shopId, priceTier: (r.priceTier as PriceTier | null) ?? null,
    creditLimit: r.creditLimit, creditDays: r.creditDays,
    balance: known ? Math.round(((r.balance ?? 0) + r.local_delta) * 100) / 100 : null,
    serverBalance: r.balance,
    loyaltyPoints: Math.max(0, (r.loyaltyPoints ?? 0) + (r.loyalty_delta ?? 0)), totalSpent: r.totalSpent,
    isVip: !!r.isVip, isActive: !!r.isActive, oldestDueAt: r.oldestDueAt, pendingCreate: !!r.local, pendingEdit: r.dirty > 0,
  };
}

export interface CustomerSearch {
  query?: string;
  /** Only customers who owe money (khata list). */
  owing?: boolean;
  limit?: number;
  offset?: number;
}

/** Customer search by name (any script, loose Roman Urdu), phone (any format) or CNIC. */
export async function searchCustomers(db: Db, q: CustomerSearch = {}): Promise<CustomerRow[]> {
  const where: string[] = ['c.isActive = 1'];
  const params: SqlValue[] = [];
  let order = 'c.name COLLATE NOCASE';
  const orderParams: SqlValue[] = [];
  const text = fold(q.query);
  const num = digits(q.query);
  if (num.length >= 3 && num.length >= text.replace(/\s/g, '').length - 1) {
    where.push("(c.phoneDigits LIKE ? ESCAPE '\\' OR c.search LIKE ? ESCAPE '\\')");
    params.push(`%${likeEscape(num)}%`, `%${likeEscape(text)}%`);
    order = 'CASE WHEN c.phoneDigits = ? THEN 0 WHEN c.phoneDigits LIKE ? THEN 1 ELSE 2 END, c.name COLLATE NOCASE';
    orderParams.push(num, `${num}%`);
  } else if (text) {
    for (const w of text.split(' ').slice(0, 5)) {
      const sk = skeleton(w);
      if (w.length >= 3 && sk.length >= 2 && /[a-z]/.test(w)) {
        where.push("(c.search LIKE ? ESCAPE '\\' OR c.skel LIKE ? ESCAPE '\\')");
        params.push(`%${likeEscape(w)}%`, `% ${likeEscape(sk)}%`);
      } else {
        where.push("c.search LIKE ? ESCAPE '\\'");
        params.push(`%${likeEscape(w)}%`);
      }
    }
    order = "CASE WHEN c.search LIKE ? ESCAPE '\\' THEN 0 WHEN c.search LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END, c.name COLLATE NOCASE";
    orderParams.push(` ${likeEscape(text)}%`, `%${likeEscape(text)}%`);
  }
  let sql = `${CUSTOMER_SQL} WHERE ${where.join(' AND ')}`;
  if (q.owing) {
    sql = `SELECT * FROM (${sql}) c WHERE COALESCE(c.balance, 0) + c.local_delta > 0.005`;
    order = order.replace(/c\.name COLLATE NOCASE/, '(COALESCE(c.balance, 0) + c.local_delta) DESC');
  }
  sql += ` ORDER BY ${order} LIMIT ? OFFSET ?`;
  const rows = await db.all<CustomerSqlRow>(sql, [...params, ...orderParams, q.limit ?? 50, q.offset ?? 0]);
  return rows.map(toCustomer);
}

export async function getCustomer(db: Db, id: string): Promise<CustomerRow | null> {
  const row = await db.first<CustomerSqlRow>(`${CUSTOMER_SQL} WHERE c.id = ?`, [id]);
  return row ? toCustomer(row) : null;
}

/* ───────────── sales ───────────── */

interface SaleSqlRow { id: string; pending: number; opId: string | null; note: string | null; data: string }

function toSale(r: SaleSqlRow): SaleRow {
  const d = JSON.parse(r.data) as Record<string, unknown>;
  const items = (d.items as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    id: r.id,
    saleNumber: String(d.saleNumber ?? ''),
    shopId: (d.shopId as string) ?? null,
    customerId: (d.customerId as string) ?? null,
    customerName: (d.customerName as string) ?? null,
    subtotal: Number(d.subtotal) || 0,
    discount: Number(d.discount) || 0,
    total: Number(d.total) || 0,
    paidAmount: Number(d.paidAmount) || 0,
    changeAmount: Number(d.changeAmount) || 0,
    creditAmount: Number(d.creditAmount) || 0,
    paymentMethod: String(d.paymentMethod ?? 'CASH'),
    payments: (d.payments as SaleRow['payments']) ?? [],
    status: String(d.status ?? 'COMPLETED'),
    soldAt: String(d.soldAt ?? ''),
    items: items.map((it) => ({
      id: it.id as string | undefined,
      productId: (it.productId as string) ?? null,
      variantId: (it.variantId as string) ?? null,
      name: String(it.name ?? ''),
      variantName: (it.variantName as string) ?? null,
      unit: (it.unit as string) ?? null,
      unitName: (it.unitName as string) ?? null,
      unitQty: (it.unitQty as number) ?? null,
      quantity: Number(it.quantity) || 0,
      returnedQty: Number(it.returnedQty) || 0,
      price: Number(it.price) || 0,
      total: Number(it.total) || 0,
    })),
    pending: !!r.pending,
    opId: r.opId,
    note: r.note,
  };
}

export interface SalesQuery {
  shopId?: string | null;
  customerId?: string | null;
  /** Bill number or customer name. */
  query?: string;
  pendingOnly?: boolean;
  limit?: number;
  offset?: number;
}

/** Recent bills (last 30 days from the server plus every bill still waiting to sync), newest first. */
export async function listSales(db: Db, q: SalesQuery = {}): Promise<SaleRow[]> {
  const where: string[] = ["status <> 'CANCELLED_LOCAL'"];
  const params: SqlValue[] = [];
  if (q.shopId) { where.push('shopId = ?'); params.push(q.shopId); }
  if (q.customerId) { where.push('customerId = ?'); params.push(q.customerId); }
  if (q.pendingOnly) where.push('pending = 1');
  const text = (q.query ?? '').trim().toLowerCase();
  if (text) {
    where.push("(LOWER(saleNumber) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(customerName, '')) LIKE ? ESCAPE '\\')");
    params.push(`%${likeEscape(text)}%`, `%${likeEscape(text)}%`);
  }
  const rows = await db.all<SaleSqlRow>(
    `SELECT id, pending, opId, note, data FROM sales WHERE ${where.join(' AND ')} ORDER BY soldAt DESC LIMIT ? OFFSET ?`,
    [...params, q.limit ?? 50, q.offset ?? 0],
  );
  return rows.map(toSale);
}

export async function getSale(db: Db, id: string): Promise<SaleRow | null> {
  // The local id keeps working after sync (it maps to the server id).
  const row = await db.first<SaleSqlRow>(
    'SELECT id, pending, opId, note, data FROM sales WHERE id = ? OR opId = ? OR id = (SELECT serverId FROM idmap WHERE tempId = ?)', [id, id, id]);
  return row ? toSale(row) : null;
}

/* ───────────── small lists ───────────── */

export type LookupType = 'shop' | 'category' | 'brand' | 'expenseCategory' | 'incomeCategory' | 'seller' | 'staff' | 'register';

export async function lookups<T = Record<string, unknown>>(db: Db, type: LookupType): Promise<T[]> {
  const rows = await db.all<{ data: string }>('SELECT data FROM lookups WHERE type = ? ORDER BY sort', [type]);
  return rows.map((r) => JSON.parse(r.data) as T);
}
