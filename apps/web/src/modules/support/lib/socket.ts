/**
 * One socket.io connection to the API's `/realtime` namespace, shared by the
 * support chat and calls. It signs in with the merchant's access token (read
 * fresh on every connect, so a refreshed token is used after a reconnect).
 *
 * The API URL comes from VITE_API_URL ("https://host/api"); socket.io lives at
 * the host root, so the "/api" path is dropped. When the server refuses an
 * expired token, one cheap API call lets the axios interceptor refresh it,
 * then the socket connects again.
 */

import { io, type Socket } from 'socket.io-client';
import { apiClient } from '@core/api/client';
import { useAuthStore } from '@core/stores/auth.store';

function socketOrigin(): string {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  try {
    return new URL(api, window.location.origin).origin;
  } catch {
    return 'http://localhost:4000';
  }
}

let socket: Socket | null = null;
let refreshing = false;
let unsubscribeAuth: (() => void) | null = null;

async function refreshAndReconnect() {
  if (refreshing || !socket) return;
  refreshing = true;
  try {
    // Any authenticated call refreshes an expired token through the interceptor.
    await apiClient.get('/auth/me');
  } catch {
    /* signed out or offline: the auth subscription below handles it */
  } finally {
    refreshing = false;
  }
  if (socket && !socket.connected && useAuthStore.getState().accessToken) socket.connect();
}

/** The shared socket; connects on first use while signed in. */
export function getSupportSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;
  if (!useAuthStore.getState().accessToken) return null;

  socket = io(`${socketOrigin()}/realtime`, {
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '' }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 15_000,
  });

  socket.on('unauthorized', () => { void refreshAndReconnect(); });
  socket.on('disconnect', (reason) => {
    // The server closes the socket itself after a failed sign-in; socket.io does not retry that.
    if (reason === 'io server disconnect') window.setTimeout(() => { void refreshAndReconnect(); }, 1000);
  });

  // Sign-out closes the socket; a new token reconnects a dropped one.
  unsubscribeAuth = useAuthStore.subscribe((s, prev) => {
    if (!s.accessToken) { closeSupportSocket(); return; }
    if (s.accessToken !== prev.accessToken && socket && !socket.connected) socket.connect();
  });

  return socket;
}

export function closeSupportSocket() {
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

/** Emits with an acknowledgement; resolves with the server's reply, or null after `timeoutMs`. */
export function emitWithAck<T = unknown>(event: string, payload: unknown, timeoutMs = 8000): Promise<T | null> {
  const s = getSupportSocket();
  if (!s) return Promise.resolve(null);
  return new Promise((resolve) => {
    s.timeout(timeoutMs).emit(event, payload, (err: unknown, reply: T) => resolve(err ? null : reply));
  });
}
