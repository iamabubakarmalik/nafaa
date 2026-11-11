/**
 * Visits waiting to be sent.
 *
 * A new visit is sent straight away; if the network fails it is stored here
 * (with its photo) and sent again when the phone comes back online, when the
 * app starts, and every minute while something is waiting. Each visit has a
 * clientId, so the server saves it once even if it arrives twice.
 */

import { create } from 'zustand';
import axios from 'axios';
import { errorText, isNetworkError, statusOf } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import type { VisitInput, VisitResult } from '@/api/types';
import { useAuthStore } from '@/store/auth.store';
import { idb } from './idb';

export interface QueuedVisit {
  clientId: string;
  /** Visit body without the photo link; the photo is uploaded first. */
  body: VisitInput;
  photo?: Blob | null;
  /** Shop name, for the waiting list. */
  label: string;
  createdAt: string;
  attempts: number;
  /** Set when the server refused the visit (not a network problem). */
  error?: string | null;
  /** True when the refusal came from the photo upload. */
  photoFailed?: boolean;
}

export function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  const rnd = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rnd()}-${rnd()}`;
}

/** Photo upload failed; `network` tells a lost connection from a refusal. */
export class UploadError extends Error {
  constructor(message: string, readonly network: boolean) { super(message); }
}

/** Uploads a photo through a presigned link and returns its public address. */
export async function uploadPhoto(photo: Blob): Promise<string> {
  const type = photo.type && /^image\/(jpeg|png|webp)$/.test(photo.type) ? photo.type : 'image/jpeg';
  let presign;
  try {
    presign = await partnerApi.presign({ fileName: `visit.${type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'}`, contentType: type, fileSize: photo.size });
  } catch (e) {
    throw new UploadError(errorText(e, 'Photo upload nahi hui'), isNetworkError(e));
  }
  try {
    await axios.put(presign.uploadUrl, photo, { headers: { 'Content-Type': type, ...(presign.headers ?? {}) }, timeout: 60_000 });
  } catch (e) {
    // The presign call just reached the server, so a PUT with no response is the
    // storage refusing it (CORS, missing bucket), not a lost connection, unless the phone went offline.
    throw new UploadError('Photo upload nahi hui', isNetworkError(e) && !navigator.onLine);
  }
  return presign.publicUrl;
}

/** Sends one visit (photo first). Throws on failure. */
export async function sendVisit(item: Pick<QueuedVisit, 'body' | 'photo'>): Promise<VisitResult> {
  const body = { ...item.body };
  if (item.photo && !body.photoUrl) body.photoUrl = await uploadPhoto(item.photo);
  return partnerApi.createVisit(body);
}

interface OutboxState {
  items: QueuedVisit[];
  syncing: boolean;
  online: boolean;
  /** Last visit sent from the queue, so screens can refresh their data. */
  lastSentAt: number;
  load: () => Promise<void>;
  add: (item: QueuedVisit) => Promise<void>;
  remove: (clientId: string) => Promise<void>;
  dropPhoto: (clientId: string) => Promise<void>;
  retry: (clientId: string) => Promise<void>;
  /** Sends every waiting visit that the server has not refused. */
  sync: () => Promise<void>;
}

export const useOutbox = create<OutboxState>()((set, get) => ({
  items: [],
  syncing: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastSentAt: 0,

  load: async () => {
    try {
      const items = await idb.all<QueuedVisit>();
      set({ items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) });
    } catch { /* storage not available (private mode); the queue stays empty */ }
  },

  add: async (item) => {
    await idb.put(item);
    await get().load();
  },

  remove: async (clientId) => {
    await idb.remove(clientId);
    await get().load();
  },

  dropPhoto: async (clientId) => {
    const item = await idb.get<QueuedVisit>(clientId);
    if (!item) return;
    await idb.put({ ...item, photo: null, photoFailed: false, error: null });
    await get().load();
    await get().sync();
  },

  retry: async (clientId) => {
    const item = await idb.get<QueuedVisit>(clientId);
    if (!item) return;
    await idb.put({ ...item, error: null, photoFailed: false });
    await get().load();
    await get().sync();
  },

  sync: async () => {
    if (get().syncing) return;
    set({ syncing: true });
    let sent = false;
    try {
      const items = await idb.all<QueuedVisit>();
      const waiting = items.filter((i) => !i.error).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (const item of waiting) {
        try {
          await sendVisit(item);
          await idb.remove(item.clientId);
          sent = true;
        } catch (e) {
          if (e instanceof UploadError) {
            if (e.network) break;
            await idb.put({ ...item, attempts: item.attempts + 1, error: e.message, photoFailed: true });
            continue;
          }
          // No internet, or the session needs a new sign-in: try again later.
          if (isNetworkError(e) || statusOf(e) === 401) break;
          const status = statusOf(e) ?? 0;
          // Server busy: keep it for the next round without marking it as refused.
          if (status >= 500 || status === 429) { await idb.put({ ...item, attempts: item.attempts + 1 }); break; }
          await idb.put({ ...item, attempts: item.attempts + 1, error: errorText(e), photoFailed: false });
        }
      }
    } catch { /* storage error: nothing to do until next round */ }
    await get().load();
    set((s) => ({ syncing: false, lastSentAt: sent ? Date.now() : s.lastSentAt }));
  },
}));

let started = false;

/** Starts the background sender. Call once when the app starts. */
export function startOutbox() {
  if (started) return;
  started = true;
  const { load, sync } = useOutbox.getState();
  const kick = () => { if (navigator.onLine && useAuthStore.getState().accessToken) void sync(); };
  window.addEventListener('online', () => { useOutbox.setState({ online: true }); kick(); });
  window.addEventListener('offline', () => useOutbox.setState({ online: false }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });
  setInterval(() => {
    const items = useOutbox.getState().items;
    if (items.some((i) => !i.error)) kick();
  }, 60_000);
  void load().then(kick);
}
