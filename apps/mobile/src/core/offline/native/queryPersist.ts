/**
 * Keeps the last data of every screen on the phone, so a screen opened
 * offline shows what it showed last time (with its "last updated" time).
 *
 * Successful React Query results are written to the offline database (per
 * business and user), a second after they change. When a screen asks for a
 * query that has no data in memory, the saved copy is put in at once; the
 * fresh fetch replaces it when there is internet. Queries can opt out with
 * `meta: { persist: false }`; engine-backed ['offline', ...] queries are
 * skipped (their data is already on the phone).
 */

import { useEffect, useState } from 'react';
import type { Query, QueryCacheNotifyEvent } from '@tanstack/react-query';
import { queryClient } from '@/core/query/client';
import { useNetworkStore } from '@/core/net/network';
import type { Db } from '../engine/types';

const MAX_AGE_MS = 14 * 86_400_000;
const MAX_BYTES = 1_000_000;
const WRITE_DELAY_MS = 1000;

let db: Db | null = null;
let unsubscribe: (() => void) | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function persistable(q: Query): boolean {
  const key = q.queryKey;
  if (!Array.isArray(key) || key[0] === 'offline') return false;
  if ((q.meta as { persist?: boolean } | undefined)?.persist === false) return false;
  return q.state.status === 'success' && q.state.data !== undefined;
}

function scheduleWrite(q: Query) {
  const hash = q.queryHash;
  const prev = timers.get(hash);
  if (prev) clearTimeout(prev);
  timers.set(hash, setTimeout(() => {
    timers.delete(hash);
    const target = db;
    if (!target || !persistable(q)) return;
    let value: string;
    try {
      value = JSON.stringify({ queryKey: q.queryKey, data: q.state.data, dataUpdatedAt: q.state.dataUpdatedAt });
    } catch {
      return;
    }
    if (value.length > MAX_BYTES) return;
    void target.run(
      'INSERT INTO query_cache (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt',
      [hash, value, q.state.dataUpdatedAt || Date.now()],
    ).catch(() => undefined);
  }, WRITE_DELAY_MS));
}

async function restore(q: Query) {
  const target = db;
  if (!target || q.state.dataUpdatedAt > 0) return;
  if ((q.meta as { persist?: boolean } | undefined)?.persist === false) return;
  const row = await target.first<{ value: string }>('SELECT value FROM query_cache WHERE key = ?', [q.queryHash]).catch(() => null);
  if (!row || db !== target) return;
  // The fetch may have finished meanwhile; never put older data over it.
  if (q.state.dataUpdatedAt > 0) return;
  try {
    const saved = JSON.parse(row.value) as { data: unknown; dataUpdatedAt: number };
    queryClient.setQueryData(q.queryKey, saved.data, { updatedAt: saved.dataUpdatedAt });
  } catch {
    // Unreadable row: ignore; the next success rewrites it.
  }
}

export async function startQueryPersistence(target: Db): Promise<void> {
  stopQueryPersistence();
  db = target;
  await target.run('DELETE FROM query_cache WHERE updatedAt < ?', [Date.now() - MAX_AGE_MS]).catch(() => undefined);
  const cache = queryClient.getQueryCache();
  // Queries already on screen before the engine opened.
  for (const q of cache.getAll()) {
    if (q.state.dataUpdatedAt === 0) void restore(q);
  }
  unsubscribe = cache.subscribe((event: QueryCacheNotifyEvent) => {
    if (event.type === 'added') void restore(event.query);
    else if (event.type === 'updated' && event.action.type === 'success') scheduleWrite(event.query);
  });
}

export function stopQueryPersistence(): void {
  unsubscribe?.();
  unsubscribe = null;
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  db = null;
}

/**
 * For a screen's query: true when it shows saved data because there is no
 * internet, plus when that data was fetched. Show "Last updated {{time}}".
 */
export function useCachedNotice(query: { dataUpdatedAt: number; isFetching?: boolean; fetchStatus?: string }): { fromCache: boolean; updatedAt: number | null } {
  const online = useNetworkStore((s) => s.online);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const updatedAt = query.dataUpdatedAt || null;
  return { fromCache: !!updatedAt && (!online || query.fetchStatus === 'paused'), updatedAt };
}
