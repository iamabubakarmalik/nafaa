/**
 * The admin app's connection to the live-support socket (namespace
 * /realtime on the API, same access token as REST). One shared socket;
 * it reconnects with the new token after a refresh.
 */

import { io, type Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000/api';
const origin = apiBase.replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let tokenInUse: string | null = null;

export function supportSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (socket && tokenInUse === token) return socket;
  if (socket) {
    socket.auth = { token };
    tokenInUse = token;
    socket.disconnect().connect();
    return socket;
  }
  tokenInUse = token;
  socket = io(`${origin}/realtime`, { auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 10_000 });
  return socket;
}

export function closeSupportSocket() {
  socket?.disconnect();
  socket = null;
  tokenInUse = null;
}

/** Emit with an ack; resolves { ok: false } after 8 seconds without an answer. */
export function emitAck<T = { ok: boolean; error?: string }>(event: string, data: unknown): Promise<T> {
  const s = supportSocket();
  if (!s) return Promise.resolve({ ok: false, error: 'offline' } as T);
  return new Promise((resolve) => {
    s.timeout(8_000).emit(event, data, (err: unknown, res: T) => resolve(err ? ({ ok: false, error: 'timeout' } as T) : res));
  });
}

/** Subscribes to a socket event for the life of the component. */
export function useSupportEvent<T>(event: string, handler: (data: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  const token = useAuthStore((s) => s.accessToken);
  useEffect(() => {
    const s = supportSocket();
    if (!s) return;
    const fn = (d: T) => ref.current(d);
    s.on(event, fn);
    return () => { s.off(event, fn); };
  }, [event, token]);
}
