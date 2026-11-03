/**
 * Orders taken on this phone without internet. The kitchen ticket prints
 * from the phone straight away; the order waits here and is sent to the
 * server (same body as online, with an Idempotency-Key so a resend never
 * makes a second order) as soon as the connection is back. Paying a counter
 * order offline goes through the offline engine as a normal bill instead
 * (see payOffline in the composer). Other phones and the kitchen screen see
 * a queued order only after it is sent.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage, isNetworkError } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { useNetworkStore } from '@/core/net';
import { kv } from '@/core/storage/kv';
import type { NewOrder, RestaurantOrder } from './api';
import { refreshOrders } from './meta';

export interface QueuedOrder {
  id: string;
  at: string;
  title: string;
  total: number;
  body: NewOrder;
  /** Server refusal (4xx); the order stays until retried or removed. */
  error?: string;
}

const keyOf = () => {
  const s = useAuthStore.getState();
  return `nafaa.restaurant.queue.${s.tenant?.id ?? 'x'}.${s.user?.id ?? 'x'}`;
};

interface QueueState { items: QueuedOrder[]; sending: boolean }
export const useOrderQueue = create<QueueState>(() => ({ items: [], sending: false }));

const load = () => useOrderQueue.setState({ items: kv.get<QueuedOrder[]>(keyOf(), []) });
const save = (items: QueuedOrder[]) => { kv.set(keyOf(), items); useOrderQueue.setState({ items }); };

const uid = () => `rq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export function queueOrder(body: NewOrder, title: string, total: number): QueuedOrder {
  load();
  const q: QueuedOrder = { id: uid(), at: new Date().toISOString(), title, total, body };
  save([...useOrderQueue.getState().items, q]);
  return q;
}

export function removeQueued(id: string) {
  save(useOrderQueue.getState().items.filter((x) => x.id !== id));
}

/** Sends waiting orders in the order they were taken. Stops at the first network failure. */
export async function flushOrderQueue(): Promise<RestaurantOrder[]> {
  if (useOrderQueue.getState().sending) return [];
  load();
  const sent: RestaurantOrder[] = [];
  useOrderQueue.setState({ sending: true });
  try {
    for (const q of useOrderQueue.getState().items) {
      try {
        const order = await apiClient.post<RestaurantOrder>('/restaurant/orders', q.body, { headers: { 'Idempotency-Key': q.id } }).then((r) => r.data);
        sent.push(order);
        save(useOrderQueue.getState().items.filter((x) => x.id !== q.id));
      } catch (e) {
        if (isNetworkError(e)) break;
        save(useOrderQueue.getState().items.map((x) => (x.id === q.id ? { ...x, error: apiErrorMessage(e) } : x)));
      }
    }
  } finally {
    useOrderQueue.setState({ sending: false });
  }
  if (sent.length) refreshOrders();
  return sent;
}

/** Loads this user's queue and sends it whenever the phone is online. */
export function useOrderQueueSync() {
  const online = useNetworkStore((s) => s.online);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (online && useOrderQueue.getState().items.some((x) => !x.error)) void flushOrderQueue();
  }, [online]);
  return useOrderQueue();
}
