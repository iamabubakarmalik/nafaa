/**
 * One socket.io connection to the API's `/realtime` namespace for live
 * support. It signs in with the merchant's access token, read fresh on every
 * connect, so a refreshed token is used after a reconnect.
 *
 * API_URL is "https://host/api"; socket.io lives at the host root, so "/api"
 * is dropped. The server closes a socket whose token it refuses; one token
 * refresh is tried, then the socket connects again.
 *
 * The app disconnects while it is in the background (so the server sees the
 * shop as away and sends a push instead) and reconnects when it comes back
 * (see ../hooks/useSupportBoot.ts).
 */

import { io, type Socket } from 'socket.io-client';
import { API_URL, refreshAccessToken } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';

const socketOrigin = () => API_URL.replace(/\/+$/, '').replace(/\/api$/, '');

let socket: Socket | null = null;
let refreshing = false;
/** True while the app is in the background: nothing reconnects until it is resumed. */
let paused = false;
let unsubscribeAuth: (() => void) | null = null;

async function refreshAndReconnect() {
  if (refreshing || !socket) return;
  refreshing = true;
  try {
    await refreshAccessToken();
  } finally {
    refreshing = false;
  }
  if (socket && !socket.connected && !paused && useAuthStore.getState().accessToken) socket.connect();
}

/** The shared socket; created (and connected) on first use while signed in. */
export function getSupportSocket(): Socket | null {
  if (socket) return socket;
  if (!useAuthStore.getState().accessToken) return null;

  socket = io(`${socketOrigin()}/realtime`, {
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '' }),
    // React Native has WebSocket built in; long polling is only a fallback.
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 15_000,
  });

  socket.on('disconnect', (reason) => {
    // The server closes the socket itself after a refused sign-in; socket.io does not retry that.
    if (reason === 'io server disconnect') setTimeout(() => { void refreshAndReconnect(); }, 1000);
  });

  // Sign-out closes the socket; a new token reconnects a dropped one.
  unsubscribeAuth = useAuthStore.subscribe((s, prev) => {
    if (!s.accessToken) { closeSupportSocket(); return; }
    if (s.accessToken !== prev.accessToken && socket && !socket.connected && !socket.active && !paused) socket.connect();
  });

  return socket;
}

/** Drops the connection for a while (app in the background); `resumeSupportSocket` brings it back. */
export function pauseSupportSocket() {
  paused = true;
  socket?.disconnect();
}

export function resumeSupportSocket() {
  paused = false;
  const s = getSupportSocket();
  if (s && !s.connected) s.connect();
}

export function closeSupportSocket() {
  paused = false;
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

/** Emits without waiting; does nothing while disconnected. */
export function emitSupport(event: string, payload: unknown) {
  if (socket?.connected) socket.emit(event, payload);
}
