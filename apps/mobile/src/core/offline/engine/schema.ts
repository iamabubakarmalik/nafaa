/**
 * Tables of the offline database (one file per business and user).
 *
 * Mirror tables hold what the server last sent. Work done offline never
 * edits those numbers directly: pending sales and payments are `effects`
 * (stock and balance deltas) laid over the mirror on every read, and dropped
 * once a download taken after the work reached the server includes it. So a
 * delta download can never wipe out a sale that has not synced yet.
 */

import type { Db } from './types';

export const SCHEMA_VERSION = 1;

const V1 = `
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, sku TEXT, barcode TEXT, unit TEXT NOT NULL DEFAULT 'pcs',
  productType TEXT, price REAL NOT NULL DEFAULT 0, costPrice REAL, wholesalePrice REAL, creditPrice REAL,
  taxRate REAL NOT NULL DEFAULT 0, lowStockAlert REAL NOT NULL DEFAULT 0, hasVariants INTEGER NOT NULL DEFAULT 0,
  isRawMaterial INTEGER NOT NULL DEFAULT 0, expiryTracked INTEGER NOT NULL DEFAULT 0, isActive INTEGER NOT NULL DEFAULT 1,
  isFeatured INTEGER NOT NULL DEFAULT 0, categoryId TEXT, categoryName TEXT, categoryColor TEXT, brandId TEXT, brandName TEXT,
  imageUrl TEXT, updatedAt TEXT,
  search TEXT NOT NULL DEFAULT '', skel TEXT NOT NULL DEFAULT '',
  local INTEGER NOT NULL DEFAULT 0, dirty INTEGER NOT NULL DEFAULT 0, gen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS products_category ON products (categoryId);
CREATE INDEX IF NOT EXISTS products_name ON products (name COLLATE NOCASE);
-- Covering index for search: scanning it reads a fraction of the table's pages.
CREATE INDEX IF NOT EXISTS products_find ON products (isActive, isRawMaterial, categoryId, brandId, isFeatured, search, skel, name, id);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY NOT NULL, productId TEXT NOT NULL, name TEXT NOT NULL, sku TEXT, barcode TEXT, color TEXT, size TEXT,
  unit TEXT, price REAL NOT NULL DEFAULT 0, costPrice REAL, wholesalePrice REAL, creditPrice REAL, lowStockAlert REAL,
  imageUrl TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS variants_product ON variants (productId);

CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY NOT NULL, productId TEXT NOT NULL, variantId TEXT, unitName TEXT NOT NULL, unitLabel TEXT,
  conversionRate REAL NOT NULL DEFAULT 1, isBase INTEGER NOT NULL DEFAULT 0, isDefault INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0, costPrice REAL, wholesalePrice REAL, creditPrice REAL, mrpPrice REAL,
  barcode TEXT, sku TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS packs_product ON packs (productId);

-- Every scannable code: product barcode and SKU, variant barcode and SKU, pack barcode and SKU.
CREATE TABLE IF NOT EXISTS codes (
  code TEXT NOT NULL, productId TEXT NOT NULL, variantId TEXT NOT NULL DEFAULT '', packId TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL, PRIMARY KEY (code, productId, variantId, packId)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS codes_product ON codes (productId);

CREATE TABLE IF NOT EXISTS stock (
  shopId TEXT NOT NULL, productId TEXT NOT NULL, variantId TEXT NOT NULL DEFAULT '',
  qty REAL NOT NULL DEFAULT 0, reserved REAL NOT NULL DEFAULT 0, lowStockAlert REAL, shopPrice REAL, updatedAt TEXT,
  gen INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (shopId, productId, variantId)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS stock_product ON stock (productId);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, businessName TEXT, phone TEXT, phoneDigits TEXT, email TEXT, cnic TEXT,
  address TEXT, city TEXT, area TEXT, shopId TEXT, priceTier TEXT, priceListId TEXT,
  creditLimit REAL, creditDays INTEGER, balance REAL, loyaltyPoints INTEGER NOT NULL DEFAULT 0, totalSpent REAL NOT NULL DEFAULT 0,
  isVip INTEGER NOT NULL DEFAULT 0, isActive INTEGER NOT NULL DEFAULT 1, oldestDueAt TEXT, updatedAt TEXT,
  search TEXT NOT NULL DEFAULT '', skel TEXT NOT NULL DEFAULT '',
  local INTEGER NOT NULL DEFAULT 0, dirty INTEGER NOT NULL DEFAULT 0, gen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS customers_phone ON customers (phoneDigits);
CREATE INDEX IF NOT EXISTS customers_name ON customers (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS customers_find ON customers (isActive, search, skel, phoneDigits, name, id);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY NOT NULL, saleNumber TEXT NOT NULL, shopId TEXT, customerId TEXT, customerName TEXT,
  total REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, soldAt TEXT NOT NULL, pending INTEGER NOT NULL DEFAULT 0,
  opId TEXT, note TEXT, data TEXT NOT NULL, updatedAt TEXT
);
CREATE INDEX IF NOT EXISTS sales_soldAt ON sales (soldAt);
CREATE INDEX IF NOT EXISTS sales_customer ON sales (customerId);
CREATE INDEX IF NOT EXISTS sales_op ON sales (opId);

-- Small lists that come whole with the manifest: shops, categories, brands, staff, sellers ...
CREATE TABLE IF NOT EXISTS lookups (
  type TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, data TEXT, sort INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (type, id)
) WITHOUT ROWID;

-- Work waiting for the server. ikey is the Idempotency-Key (new when the user edits the body).
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY NOT NULL, ikey TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL,
  body TEXT, title TEXT NOT NULL, amount REAL, shopId TEXT,
  status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, nextAttemptAt INTEGER NOT NULL DEFAULT 0,
  lastStatus INTEGER, issue TEXT, serverMessage TEXT, dependsOn TEXT NOT NULL DEFAULT '[]',
  tempId TEXT, entity TEXT, meta TEXT, result TEXT,
  tenantId TEXT, userId TEXT, createdAt INTEGER NOT NULL, doneAt INTEGER
);
CREATE INDEX IF NOT EXISTS outbox_status ON outbox (status, seq);
CREATE INDEX IF NOT EXISTS outbox_temp ON outbox (tempId);

-- Temp ids given to things made offline, and the server ids they got.
CREATE TABLE IF NOT EXISTS idmap (tempId TEXT PRIMARY KEY NOT NULL, serverId TEXT NOT NULL, entity TEXT NOT NULL) WITHOUT ROWID;

-- Offline work laid over the mirror: stock and khata deltas per outbox operation.
CREATE TABLE IF NOT EXISTS effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, opId TEXT NOT NULL, kind TEXT NOT NULL,
  k1 TEXT NOT NULL, k2 TEXT NOT NULL DEFAULT '', k3 TEXT NOT NULL DEFAULT '', delta REAL NOT NULL, doneAt INTEGER
);
CREATE INDEX IF NOT EXISTS effects_key ON effects (kind, k1, k2, k3);
CREATE INDEX IF NOT EXISTS effects_op ON effects (opId);

-- Small notes after sync, e.g. the server's total differed from the phone's.
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, opId TEXT NOT NULL, text TEXT NOT NULL, createdAt INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0
);

-- Bills put on hold at the counter.
CREATE TABLE IF NOT EXISTS held_bills (
  id TEXT PRIMARY KEY NOT NULL, label TEXT, shopId TEXT, data TEXT NOT NULL, createdAt INTEGER NOT NULL
);

-- React Query cache rows (last data of every screen, for offline reading).
CREATE TABLE IF NOT EXISTS query_cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updatedAt INTEGER NOT NULL);
`;

/** Creates or upgrades the tables. Safe to call on every open. */
export async function migrate(db: Db): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const version = Number(row?.user_version ?? 0);
  if (version >= SCHEMA_VERSION) return;
  await db.exec(V1);
  await db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** Mirror tables cleared on logout or a full reset; the outbox is kept unless asked. */
export const MIRROR_TABLES = ['products', 'variants', 'packs', 'codes', 'stock', 'customers', 'sales', 'lookups', 'query_cache'] as const;
