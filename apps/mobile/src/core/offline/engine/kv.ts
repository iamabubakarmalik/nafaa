import type { Db } from './types';

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

export async function kvDel(db: Db, key: string): Promise<void> {
  await db.run('DELETE FROM kv WHERE key = ?', [key]);
}
