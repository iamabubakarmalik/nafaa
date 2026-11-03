/**
 * Delivery session state: the open database, today's sheets as last
 * downloaded, sync status and queue counts. Screens re-read the database
 * whenever `version` moves.
 */

import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { HttpError } from '../booker/core/api';
import { kvGet, type Db } from '../booker/core/db';
import { http } from '../booker/native/device';
import { AppUpdateNeeded, openSqlite } from '../booker/native/sqlite';
import { deliveryApi } from './core/api';
import { DKV, migrateDelivery } from './core/db';
import { issueCount, pendingCount, saveToday } from './core/repo';
import { syncDelivery } from './core/sync';
import type { Today } from './core/types';

interface DeliveryState {
  db: Db | null;
  owner: string | null;
  openError: string | null;
  me: Today['me'] | null;
  today: string | null;
  lastDownloadAt: string | null;
  lastSyncAt: string | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  offline: boolean;
  pending: number;
  issues: number;
  version: number;

  open: (tenantId: string, userId: string) => Promise<void>;
  /** Sends what waits, then downloads today's sheets again. */
  refresh: (opts?: { quiet?: boolean }) => Promise<void>;
  sync: (opts?: { quiet?: boolean }) => Promise<void>;
  refreshCounts: () => Promise<void>;
  bump: () => void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Kuch ghalat ho gaya');

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  db: null,
  owner: null,
  openError: null,
  me: null,
  today: null,
  lastDownloadAt: null,
  lastSyncAt: null,
  loading: false,
  syncing: false,
  error: null,
  offline: false,
  pending: 0,
  issues: 0,
  version: 0,

  open: async (tenantId, userId) => {
    const owner = `${tenantId}:${userId}`;
    if (get().owner === owner && get().db) return;
    try {
      const db = await openSqlite(`delivery-${tenantId.slice(0, 8)}-${userId.slice(0, 8)}.db`, migrateDelivery);
      const [me, today, lastDownloadAt, lastSyncAt] = await Promise.all([
        kvGet<Today['me']>(db, DKV.me), kvGet<string>(db, DKV.today), kvGet<string>(db, DKV.lastDownloadAt), kvGet<string>(db, DKV.lastSyncAt),
      ]);
      set({ db, owner, openError: null, me, today, lastDownloadAt, lastSyncAt });
      await get().refreshCounts();
    } catch (e) {
      set({ openError: e instanceof AppUpdateNeeded ? e.message : `Phone ka data nahi khula: ${message(e)}` });
    }
  },

  sync: async (opts) => {
    const { db } = get();
    if (!db) return;
    set({ syncing: true, ...(opts?.quiet ? {} : { error: null }) });
    try {
      const run = await syncDelivery(db, http);
      set({ offline: run.offline, ...(run.requests ? { lastSyncAt: new Date().toISOString() } : {}) });
    } catch (e) {
      if (!opts?.quiet) set({ error: message(e) });
    } finally {
      set((s) => ({ syncing: false, version: s.version + 1 }));
      await get().refreshCounts();
    }
  },

  refresh: async (opts) => {
    const { db, loading } = get();
    if (!db || loading) return;
    set({ loading: true, ...(opts?.quiet ? {} : { error: null }) });
    try {
      await get().sync({ quiet: true });
      const t = await deliveryApi(http).today();
      await saveToday(db, t);
      set({ me: t.me, today: t.today, lastDownloadAt: new Date().toISOString(), offline: false });
    } catch (e) {
      const offline = e instanceof HttpError && e.status === 0;
      set({ offline, ...(opts?.quiet && offline ? {} : { error: offline ? 'Internet nahi hai — phone par save ho raha hai' : message(e) }) });
    } finally {
      set((s) => ({ loading: false, version: s.version + 1 }));
      await get().refreshCounts();
    }
  },

  refreshCounts: async () => {
    const { db } = get();
    if (!db) return;
    const [pending, issues] = await Promise.all([pendingCount(db), issueCount(db)]);
    set({ pending, issues });
  },

  bump: () => set((s) => ({ version: s.version + 1 })),
}));

/** Runs `load` against the database now and whenever the delivery data changes. */
export function useDeliveryQuery<T>(load: (db: Db) => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean } {
  const db = useDeliveryStore((s) => s.db);
  const version = useDeliveryStore((s) => s.version);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  useEffect(() => {
    if (!db) return;
    let alive = true;
    setLoading(true);
    run(db).then((d) => { if (alive) { setData(d); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [db, version, run]);
  return { data, loading };
}
