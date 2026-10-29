/**
 * expo-sqlite adapter for the booker database (and the delivery app's), one
 * file per user and business. The native module is loaded lazily: an app binary built before
 * expo-sqlite was added keeps working everywhere else and the booker area
 * asks for an app update instead of crashing at start-up.
 */

import { migrate, type Db, type SqlValue } from '../core/db';

export class AppUpdateNeeded extends Error {}

type SQLiteDatabase = import('expo-sqlite').SQLiteDatabase;

const open = new Map<string, Promise<Db>>();

export function openBookerDb(tenantId: string, userId: string): Promise<Db> {
  return openSqlite(`booker-${tenantId.slice(0, 8)}-${userId.slice(0, 8)}.db`, migrate);
}

/** Opens (once) a database file and runs its schema migration. */
export function openSqlite(name: string, schema: (db: Db) => Promise<void>): Promise<Db> {
  let p = open.get(name);
  if (!p) {
    p = connect(name, schema).catch((e) => {
      open.delete(name);
      throw e;
    });
    open.set(name, p);
  }
  return p;
}

async function connect(name: string, schema: (db: Db) => Promise<void>): Promise<Db> {
  let SQLite: typeof import('expo-sqlite');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SQLite = require('expo-sqlite');
  } catch {
    throw new AppUpdateNeeded('Is kaam ke liye app update karein');
  }
  let raw: SQLiteDatabase;
  try {
    raw = await SQLite.openDatabaseAsync(name);
  } catch (e) {
    if (/native module|cannot find|undefined is not/i.test(String((e as Error)?.message))) {
      throw new AppUpdateNeeded('Is kaam ke liye app update karein');
    }
    throw e;
  }
  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF;').catch(() => undefined);
  const db: Db = {
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => { await raw.runAsync(sql, params); },
    all: <T,>(sql: string, params: SqlValue[] = []) => raw.getAllAsync<T>(sql, params),
    first: <T,>(sql: string, params: SqlValue[] = []) => raw.getFirstAsync<T>(sql, params),
    tx: (fn) => raw.withTransactionAsync(fn),
  };
  await schema(db);
  return db;
}
