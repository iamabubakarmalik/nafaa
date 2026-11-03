/**
 * Sync status shown by the shell (top-bar chip, sync sheet), filled in by
 * the offline engine (src/core/offline).
 *   state   'online' | 'offline' | 'syncing' | 'issues'
 *   pending work waiting to reach the server
 *   issues  work the server refused (needs a person to look)
 *
 * The first call starts the engine for the signed-in user, so the shell
 * gets it running without extra wiring.
 */

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { startOfflineEngine, syncNow as runSync, useEngineStatus } from '../offline/native/runtime';
import type { SyncProgress } from '../offline/engine/types';
import { useOnlineStatus } from './network';

export type SyncState = 'online' | 'offline' | 'syncing' | 'issues';

export interface SyncStatus {
  state: SyncState;
  pending: number;
  issues: number;
  /** Last successful sync (ms), when known. */
  lastSyncedAt?: number | null;
  /** Starts a sync now (sends waiting work, then downloads changes). */
  syncNow?: () => void;
  /** First download progress (products, customers ...), null when idle. */
  progress?: SyncProgress | null;
  /** The first full download has finished; lookups are complete. */
  ready?: boolean;
}

const syncNow = () => void runSync();

export function useSyncStatus(): SyncStatus {
  useEffect(() => startOfflineEngine(), []);
  const online = useOnlineStatus();
  const s = useEngineStatus(useShallow((x) => ({
    state: x.state, pending: x.pending, issues: x.issues, lastSyncedAt: x.lastSyncedAt, progress: x.progress, ready: x.ready, syncing: x.syncing,
  })));
  // Quiet background downloads keep the chip on "online"; sending work and the first download show "syncing".
  const state: SyncState = !online || s.state === 'offline' ? 'offline' : s.syncing && (s.pending > 0 || !s.ready) ? 'syncing' : s.issues > 0 ? 'issues' : 'online';
  return { state, pending: s.pending, issues: s.issues, lastSyncedAt: s.lastSyncedAt, syncNow, progress: s.progress, ready: s.ready };
}
