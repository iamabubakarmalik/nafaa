/**
 * The booker's offline database: a small async SQL interface and the schema.
 *
 * The app runs it on expo-sqlite (native/sqlite.ts); the verification
 * script runs the same code on node:sqlite. Nothing here imports React
 * Native, so the bootstrap and sync modules can be exercised from Node.
 */

export type SqlValue = string | number | null;

export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  /** Runs `fn` inside one transaction; rolls back when it throws. */
  tx(fn: () => Promise<void>): Promise<void>;
}

const SCHEMA_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, code TEXT, area TEXT, shopId TEXT,
  visitDays TEXT NOT NULL, sortIndex INTEGER NOT NULL DEFAULT 0, updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, businessName TEXT, phone TEXT, address TEXT, area TEXT, city TEXT,
  routeId TEXT, routeSeq INTEGER, priceListId TEXT, priceTier TEXT, latitude REAL, longitude REAL,
  balance REAL, creditLimit REAL, creditDays INTEGER, oldestDueAt TEXT,
  search TEXT NOT NULL, gen INTEGER NOT NULL DEFAULT 0, updatedAt TEXT
);
CREATE INDEX IF NOT EXISTS customers_route ON customers (routeId, routeSeq);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, sku TEXT, barcode TEXT, unit TEXT,
  price REAL NOT NULL DEFAULT 0, wholesalePrice REAL, creditPrice REAL, brandId TEXT, categoryId TEXT,
  brandName TEXT, categoryName TEXT, taxRate REAL, variants TEXT NOT NULL DEFAULT '[]', stock TEXT NOT NULL DEFAULT '[]',
  search TEXT NOT NULL, gen INTEGER NOT NULL DEFAULT 0, updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY NOT NULL, productId TEXT NOT NULL, variantId TEXT, unitName TEXT NOT NULL,
  conversionRate REAL NOT NULL, price REAL NOT NULL DEFAULT 0, wholesalePrice REAL, creditPrice REAL,
  barcode TEXT, isDefault INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS packs_product ON packs (productId);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, basedOn TEXT NOT NULL, adjustPct REAL NOT NULL DEFAULT 0,
  isDefault INTEGER NOT NULL DEFAULT 0, updatedAt TEXT, itemsUpdatedAt TEXT
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY NOT NULL, priceListId TEXT NOT NULL, productId TEXT NOT NULL, variantId TEXT, unitId TEXT,
  price REAL NOT NULL, minQty REAL
);
CREATE INDEX IF NOT EXISTS pli_list_product ON price_list_items (priceListId, productId);

CREATE TABLE IF NOT EXISTS schemes (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS checkins (
  customerId TEXT NOT NULL, dayKey TEXT NOT NULL, at TEXT NOT NULL, latitude REAL, longitude REAL,
  accuracyM REAL, distanceM REAL, far INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (customerId, dayKey)
);

CREATE TABLE IF NOT EXISTS q_orders (
  clientRef TEXT PRIMARY KEY NOT NULL, customerId TEXT NOT NULL, dayKey TEXT NOT NULL, payload TEXT NOT NULL,
  localTotal REAL NOT NULL, lineCount INTEGER NOT NULL, status TEXT NOT NULL, serverId TEXT, number TEXT,
  serverTotal REAL, orderStatus TEXT, warnings TEXT, reason TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, syncedAt TEXT
);
CREATE INDEX IF NOT EXISTS q_orders_status ON q_orders (status, createdAt);

CREATE TABLE IF NOT EXISTS q_visits (
  clientRef TEXT PRIMARY KEY NOT NULL, customerId TEXT NOT NULL, dayKey TEXT NOT NULL, outcome TEXT NOT NULL,
  noOrderReason TEXT, orderClientRef TEXT, distanceM REAL, payload TEXT NOT NULL, status TEXT NOT NULL,
  serverId TEXT, warnings TEXT, reason TEXT, attempts INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS q_visits_status ON q_visits (status, createdAt);

CREATE TABLE IF NOT EXISTS q_collections (
  clientRef TEXT PRIMARY KEY NOT NULL, customerId TEXT NOT NULL, dayKey TEXT NOT NULL, amount REAL NOT NULL,
  method TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, serverId TEXT, reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS q_collections_status ON q_collections (status, createdAt);

CREATE TABLE IF NOT EXISTS sync_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, clientRef TEXT NOT NULL, customerId TEXT,
  title TEXT NOT NULL, reason TEXT NOT NULL, createdAt TEXT NOT NULL, resolvedAt TEXT
);
`;

/** Creates or upgrades the tables. Safe to call on every open. */
export async function migrate(db: Db): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const version = Number(row?.user_version ?? 0);
  if (version >= SCHEMA_VERSION) return;
  await db.exec(SCHEMA_V1);
  await db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export async function kvGet<T>(db: Db, key: string): Promise<T | null> {
  const row = await db.first<{ value: string | null }>('SELECT value FROM kv WHERE key = ?', [key]);
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function kvSet(db: Db, key: string, value: unknown): Promise<void> {
  await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, JSON.stringify(value)]);
}
