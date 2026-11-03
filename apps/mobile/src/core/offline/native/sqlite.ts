/**
 * expo-sqlite connection for the offline engine: one file per business and
 * user, WAL journal, and a statement cache for the hot paths.
 */

import * as SQLite from 'expo-sqlite';
import { lockedDb, type RawDb } from '../engine/lockedDb';
import type { Db, SqlValue } from '../engine/types';

const open = new Map<string, Promise<Db>>();

export function dbName(tenantId: string, userId: string) {
  return `nafaa-offline-${tenantId.slice(0, 8)}-${userId.slice(0, 8)}.db`;
}

export function openOfflineDb(tenantId: string, userId: string): Promise<Db> {
  const name = dbName(tenantId, userId);
  let p = open.get(name);
  if (!p) {
    p = connect(name).catch((e) => {
      open.delete(name);
      throw e;
    });
    open.set(name, p);
  }
  return p;
}

async function connect(name: string): Promise<Db> {
  const raw = await SQLite.openDatabaseAsync(name);
  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA temp_store = MEMORY; PRAGMA cache_size = -8000;');
  const conn: RawDb = {
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => { await raw.runAsync(sql, params); },
    all: <T,>(sql: string, params: SqlValue[] = []) => raw.getAllAsync<T>(sql, params),
    first: <T,>(sql: string, params: SqlValue[] = []) => raw.getFirstAsync<T>(sql, params),
    many: async (sql, rows) => {
      if (!rows.length) return;
      const stmt = await raw.prepareAsync(sql);
      try {
        for (const r of rows) await stmt.executeAsync(r);
      } finally {
        await stmt.finalizeAsync();
      }
    },
  };
  return lockedDb(conn);
}
