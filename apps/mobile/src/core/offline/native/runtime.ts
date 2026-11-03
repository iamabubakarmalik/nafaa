/**
 * Runs the offline engine for whoever is signed in.
 *
 * - Sign-in: opens that business-and-user database, restores the saved
 *   screen data, downloads (full the first time, with progress; changes
 *   only afterwards) and warms the important screens.
 * - Syncs on app start and resume, when the connection returns, every
 *   3 minutes while online and in front, and soon after any offline change.
 * - Sign-out: clears the copy of the server data. Work not sent yet stays
 *   in that user's database and goes when they sign in again (see
 *   beforeLogout() for the warning).
 */

import * as Crypto from 'expo-crypto';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import { useAuthStore } from '@/core/auth/store';
import { on } from '@/core/events';
import { t } from '@/core/i18n';
import { useNetworkStore } from '@/core/net/network';
import { queryClient } from '@/core/query/client';
import { OfflineEngine, type EngineStatus } from '../engine/engine';
import type { ChangeKind } from '../engine/types';
import { axiosHttp } from './http';
import { openOfflineDb } from './sqlite';
import { startQueryPersistence, stopQueryPersistence } from './queryPersist';
import { prewarm } from './prewarm';

const SYNC_EVERY_MS = 3 * 60_000;
const FIRST_SCREEN_MAX_WAIT_MS = 2500;

/** Runs once the screen has settled (no running animations), or after a short cap. */
function afterFirstScreen(run: () => void) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    run();
  };
  const cap = setTimeout(go, FIRST_SCREEN_MAX_WAIT_MS);
  InteractionManager.runAfterInteractions(() => {
    clearTimeout(cap);
    go();
  });
}
const UPLOAD_EVERY_MS = 30_000;
const RESUME_GAP_MS = 30_000;

const idle: EngineStatus = {
  state: 'online', online: true, syncing: false, pending: 0, issues: 0, lastSyncedAt: null, lastPullAt: null,
  ready: false, progress: null, halted: null, lastError: null,
};

/** Engine status for React (useSyncStatus reads it). */
export const useEngineStatus = create<EngineStatus>(() => idle);

let engine: OfflineEngine | null = null;
let engineKey: string | null = null;
let engineReady: Promise<OfflineEngine | null> = Promise.resolve(null);
let unsubs: Array<() => void> = [];
let started = false;
let lastSyncStart = 0;

/** The engine of the signed-in user (null when signed out). */
export function currentEngine(): OfflineEngine | null {
  return engine;
}

/** Waits for the signed-in user's engine to be open. */
export function whenEngine(): Promise<OfflineEngine | null> {
  return engineReady;
}

/** The engine, or an error a screen can show when nobody is signed in. */
export async function requireEngine(): Promise<OfflineEngine> {
  const e = await engineReady;
  if (!e) throw new Error(t('Sign in first.'));
  return e;
}

function session() {
  const s = useAuthStore.getState();
  const tenantId = s.tenant?.id ?? s.user?.tenantId;
  if (!s.isAuthenticated || !s.user || !tenantId) return null;
  return { tenantId, userId: s.user.id, shopId: s.currentShopId, role: s.user.role, permissions: s.user.permissions ?? [] };
}

/** React Query keys under ['offline', kind] refresh when the engine changes that data. */
function onEngineChange(what: ChangeKind) {
  const keys: Record<ChangeKind, string[]> = {
    products: ['products'], stock: ['products'], customers: ['customers'], sales: ['sales'],
    outbox: ['outbox'], issues: ['outbox', 'issues'], meta: ['meta', 'products', 'customers'], status: [], synced: [],
  };
  for (const k of keys[what]) void queryClient.invalidateQueries({ queryKey: ['offline', k] });
  // Server-side lists (returns, reports) show what just synced.
  if (what === 'synced') void queryClient.invalidateQueries({ queryKey: ['api'] });
}

async function openFor(s: NonNullable<ReturnType<typeof session>>): Promise<OfflineEngine> {
  const db = await openOfflineDb(s.tenantId, s.userId);
  const e = new OfflineEngine({
    db,
    http: axiosHttp(),
    uuid: () => Crypto.randomUUID(),
    t: (text, params) => t(text, params),
    session,
    onChange: onEngineChange,
    log: __DEV__ ? (m, extra) => console.log(m, extra ?? '') : undefined,
  });
  await e.init();
  return e;
}

async function switchUser() {
  const s = session();
  const key = s ? `${s.tenantId}:${s.userId}` : null;
  if (key === engineKey) return;
  // Signed out or another user: close the old engine (its unsent work stays in its own file).
  if (engine) {
    unsubs.forEach((u) => u());
    unsubs = [];
    stopQueryPersistence();
    const old = engine;
    engine = null;
    if (!s) await old.wipe().catch(() => undefined);
  }
  engineKey = key;
  if (!s) {
    useEngineStatus.setState(idle);
    engineReady = Promise.resolve(null);
    return;
  }
  engineReady = openFor(s).then((e) => {
    if (engineKey !== key) return null;
    engine = e;
    e.setOnline(useNetworkStore.getState().online);
    useEngineStatus.setState(e.status);
    unsubs.push(e.subscribe((st) => useEngineStatus.setState(st)));
    void startQueryPersistence(e.ctx.db);
    // The first sync is heavy JS work; it waits until the first screen is up.
    afterFirstScreen(() => {
      if (e !== engine) return;
      void (async () => {
        await e.syncNow();
        if (e === engine) void prewarm(e);
      })();
    });
    return e;
  }).catch((err) => {
    if (__DEV__) console.warn('[offline] engine failed to open', err);
    return null;
  });
  await engineReady;
}

/**
 * A failed request marks the engine offline even when the phone has a
 * network (server unreachable); the timers give it another try with the
 * phone's own connection state.
 */
function recheckOnline(e: OfflineEngine) {
  const net = useNetworkStore.getState().online;
  if (net !== e.status.online) e.setOnline(net);
}

function syncIfDue(force = false) {
  const e = engine;
  if (!e) return;
  recheckOnline(e);
  if (!e.status.online) return;
  if (!force && Date.now() - lastSyncStart < RESUME_GAP_MS) return;
  lastSyncStart = Date.now();
  void e.syncNow();
}

/** Starts the offline engine and its timers. Safe to call more than once. */
export function startOfflineEngine(): void {
  if (started) return;
  started = true;
  void switchUser();
  useAuthStore.subscribe((s, prev) => {
    if (s.isAuthenticated !== prev.isAuthenticated || s.user?.id !== prev.user?.id || s.tenant?.id !== prev.tenant?.id) void switchUser();
  });
  useNetworkStore.subscribe((s, prev) => {
    if (s.online === prev.online) return;
    engine?.setOnline(s.online);
    if (s.online) syncIfDue(true);
  });
  on('network:changed', ({ online }) => engine?.setOnline(online));
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') syncIfDue();
  });
  setInterval(() => {
    if (AppState.currentState !== 'active') return;
    syncIfDue(true);
  }, SYNC_EVERY_MS);
  setInterval(() => {
    const e = engine;
    if (!e) return;
    recheckOnline(e);
    if (e.status.online && e.status.pending > 0 && !e.status.syncing) void e.upload();
  }, UPLOAD_EVERY_MS);
}

/** Pull-to-refresh and the "Sync now" button. */
export async function syncNow(opts: { full?: boolean } = {}): Promise<void> {
  const e = await engineReady;
  if (!e) return;
  lastSyncStart = Date.now();
  await e.syncNow(opts);
}

/**
 * Before signing out: how much work has not reached the server. When it is
 * not zero, warn the user; signing out keeps it on this phone for this user
 * unless `dropUnsentAndWipe()` is called after they confirm.
 */
export async function beforeLogout(): Promise<{ pending: number; issues: number }> {
  const e = await engineReady;
  if (!e) return { pending: 0, issues: 0 };
  await e.refreshCounts();
  if (e.status.online && e.status.pending) await e.upload().catch(() => undefined);
  return { pending: e.status.pending, issues: e.status.issues };
}

/** Deletes everything on this phone for the signed-in user, unsent work included. Call before logout, after the user confirmed. */
export async function dropUnsentAndWipe(): Promise<void> {
  const e = await engineReady;
  await e?.wipe({ dropUnsent: true });
}
