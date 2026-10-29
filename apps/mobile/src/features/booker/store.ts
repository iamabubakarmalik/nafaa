/**
 * Booker session state shared by the booker screens: the open database,
 * the manifest, download progress, sync status and queue counts. Screens
 * re-read the database whenever `version` moves.
 */

import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { HttpError } from './core/api';
import { downloadDay, KV, type DownloadProgress, type DownloadResult } from './core/bootstrap';
import { kvGet, type Db } from './core/db';
import { dayKeyIn } from './core/day';
import { getManifest, issueCount, pendingCount } from './core/repo';
import { syncNow, type SyncRun } from './core/sync';
import type { Manifest } from './core/types';
import { http } from './native/device';
import { AppUpdateNeeded, openBookerDb } from './native/sqlite';

interface BookerState {
  db: Db | null;
  owner: string | null;
  openError: string | null;
  manifest: Manifest | null;
  today: string;
  lastFullDay: string | null;
  lastDownloadAt: string | null;
  lastSyncAt: string | null;
  downloading: boolean;
  progress: DownloadProgress | null;
  downloadError: string | null;
  syncing: boolean;
  syncError: string | null;
  offline: boolean;
  pending: number;
  issues: number;
  version: number;

  open: (tenantId: string, userId: string) => Promise<void>;
  download: (force?: boolean) => Promise<DownloadResult | null>;
  sync: (opts?: { quiet?: boolean }) => Promise<SyncRun | null>;
  refreshCounts: () => Promise<void>;
  bump: () => void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Kuch ghalat ho gaya');

export const useBookerStore = create<BookerState>((set, get) => ({
  db: null,
  owner: null,
  openError: null,
  manifest: null,
  today: dayKeyIn(null),
  lastFullDay: null,
  lastDownloadAt: null,
  lastSyncAt: null,
  downloading: false,
  progress: null,
  downloadError: null,
  syncing: false,
  syncError: null,
  offline: false,
  pending: 0,
  issues: 0,
  version: 0,

  open: async (tenantId, userId) => {
    const owner = `${tenantId}:${userId}`;
    if (get().owner === owner && get().db) return;
    try {
      const db = await openBookerDb(tenantId, userId);
      const [manifest, lastFullDay, lastDownloadAt, lastSyncAt] = await Promise.all([
        getManifest(db), kvGet<string>(db, KV.lastFullDay), kvGet<string>(db, KV.lastDownloadAt), kvGet<string>(db, KV.lastSyncAt),
      ]);
      set({ db, owner, openError: null, manifest, today: dayKeyIn(manifest?.timezone), lastFullDay, lastDownloadAt, lastSyncAt });
      await get().refreshCounts();
    } catch (e) {
      set({ openError: e instanceof AppUpdateNeeded ? e.message : `Phone ka data nahi khula: ${message(e)}` });
    }
  },

  download: async (force) => {
    const { db, downloading } = get();
    if (!db || downloading) return null;
    set({ downloading: true, downloadError: null, progress: { step: 'manifest', done: 0, total: 1 } });
    try {
      const res = await downloadDay(db, http, { force, onProgress: (progress) => set({ progress }) });
      const [lastFullDay, lastDownloadAt] = await Promise.all([kvGet<string>(db, KV.lastFullDay), kvGet<string>(db, KV.lastDownloadAt)]);
      set({ manifest: res.manifest, today: dayKeyIn(res.manifest.timezone), lastFullDay, lastDownloadAt, offline: false });
      return res;
    } catch (e) {
      const offline = e instanceof HttpError && e.status === 0;
      set({ downloadError: offline ? 'Internet nahi hai — purana data chal raha hai' : message(e), offline });
      return null;
    } finally {
      set((s) => ({ downloading: false, progress: null, version: s.version + 1 }));
    }
  },

  sync: async (opts) => {
    const { db } = get();
    if (!db) return null;
    set({ syncing: true, syncError: null });
    try {
      const run = await syncNow(db, http);
      set({ offline: run.offline, lastSyncAt: run.requests ? new Date().toISOString() : get().lastSyncAt });
      return run;
    } catch (e) {
      if (!opts?.quiet) set({ syncError: message(e) });
      return null;
    } finally {
      set((s) => ({ syncing: false, version: s.version + 1 }));
      await get().refreshCounts();
    }
  },

  refreshCounts: async () => {
    const { db } = get();
    if (!db) return;
    const [pending, issues] = await Promise.all([pendingCount(db), issueCount(db)]);
    set({ pending, issues, today: dayKeyIn(get().manifest?.timezone) });
  },

  bump: () => set((s) => ({ version: s.version + 1 })),
}));

/** Runs `load` against the database now and whenever the booker data changes. */
export function useDbQuery<T>(load: (db: Db) => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; reload: () => void } {
  const db = useBookerStore((s) => s.db);
  const version = useBookerStore((s) => s.version);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  useEffect(() => {
    if (!db) return;
    let alive = true;
    setLoading(true);
    run(db).then((d) => { if (alive) { setData(d); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [db, version, tick, run]);
  return { data, loading, reload: () => setTick((t) => t + 1) };
}
