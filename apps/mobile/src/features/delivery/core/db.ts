/**
 * The delivery man's offline database: today's load sheets as last
 * downloaded, the queue of invoice reports and trip recoveries, and the
 * entries the server refused.
 */

import type { Db } from '../../booker/core/db';

const SCHEMA_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);

CREATE TABLE IF NOT EXISTS sheets (id TEXT PRIMARY KEY NOT NULL, sortIndex INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS q_reports (
  clientRef TEXT PRIMARY KEY NOT NULL, orderId TEXT NOT NULL, sheetId TEXT NOT NULL, customerId TEXT, payload TEXT NOT NULL,
  status TEXT NOT NULL, reason TEXT, attempts INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, syncedAt TEXT
);
CREATE INDEX IF NOT EXISTS q_reports_order ON q_reports (orderId, createdAt);
CREATE INDEX IF NOT EXISTS q_reports_status ON q_reports (status, createdAt);

CREATE TABLE IF NOT EXISTS q_recoveries (
  clientRef TEXT PRIMARY KEY NOT NULL, sheetId TEXT NOT NULL, customerId TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL,
  payload TEXT NOT NULL, status TEXT NOT NULL, serverId TEXT, reason TEXT, attempts INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS q_recoveries_status ON q_recoveries (status, createdAt);

CREATE TABLE IF NOT EXISTS sync_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, clientRef TEXT NOT NULL, orderId TEXT,
  title TEXT NOT NULL, reason TEXT NOT NULL, createdAt TEXT NOT NULL, resolvedAt TEXT
);
`;

export async function migrateDelivery(db: Db): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  if (Number(row?.user_version ?? 0) >= SCHEMA_VERSION) return;
  await db.exec(SCHEMA_V1);
  await db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export const DKV = { lastDownloadAt: 'lastDownloadAt', lastSyncAt: 'lastSyncAt', me: 'me', today: 'today' } as const;
