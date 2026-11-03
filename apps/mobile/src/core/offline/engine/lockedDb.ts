/**
 * Wraps a plain SQLite connection so transactions are safe with async code.
 *
 * One connection is shared by the whole app. While a transaction is open,
 * other callers wait (their statements would otherwise land inside it and
 * be rolled back with it). Inside the transaction, the handle passed to the
 * callback goes straight to the connection.
 */

import type { Db, SqlValue } from './types';

export interface RawDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  many(sql: string, rows: SqlValue[][]): Promise<void>;
}

export function lockedDb(raw: RawDb): Db {
  let chain: Promise<unknown> = Promise.resolve();
  const lock = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn);
    chain = p.then(() => undefined, () => undefined);
    return p;
  };
  // Inside a transaction: direct access; a nested tx just runs in the open one.
  const inner: Db = {
    exec: (sql) => raw.exec(sql),
    run: (sql, params) => raw.run(sql, params),
    all: (sql, params) => raw.all(sql, params),
    first: (sql, params) => raw.first(sql, params),
    many: (sql, rows) => raw.many(sql, rows),
    tx: (fn) => fn(inner),
  };
  return {
    exec: (sql) => lock(() => raw.exec(sql)),
    run: (sql, params) => lock(() => raw.run(sql, params)),
    all: (sql, params) => lock(() => raw.all(sql, params)),
    first: (sql, params) => lock(() => raw.first(sql, params)),
    many: (sql, rows) => lock(async () => {
      await raw.exec('BEGIN');
      try {
        await raw.many(sql, rows);
        await raw.exec('COMMIT');
      } catch (e) {
        await raw.exec('ROLLBACK');
        throw e;
      }
    }),
    tx: (fn) => lock(async () => {
      await raw.exec('BEGIN');
      try {
        await fn(inner);
        await raw.exec('COMMIT');
      } catch (e) {
        await raw.exec('ROLLBACK').catch(() => undefined);
        throw e;
      }
    }),
  };
}
