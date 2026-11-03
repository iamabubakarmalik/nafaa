/**
 * Query keys, refresh helpers and the "needs internet" guard for the online
 * store. Everything here talks to the server; screens show the last saved
 * data offline (saved screen data) and block actions with a friendly note.
 */

import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText, type OnlineFeature } from '@/core/offline';
import { haptic } from '@/core/device/haptics';
import { toast } from '@/design';

export const KEYS = {
  orders: ['online-orders'] as const,
  order: (id: string) => ['online-order', id] as const,
  live: ['online-orders', 'live'] as const,
  report: ['online-report'] as const,
  couriers: ['courier-accounts'] as const,
  codSummary: ['cod-summary'] as const,
  codHistory: ['cod-history'] as const,
  profit: ['online-profit'] as const,
  products: ['online-products'] as const,
  channels: ['online-channels'] as const,
  customers: ['online-customers'] as const,
  blocklist: ['blocklist'] as const,
  rules: ['courier-rules'] as const,
  costs: ['order-cost-settings'] as const,
  payments: ['payment-accounts'] as const,
  shops: ['online-shops'] as const,
};

/** Everything an order change can move: lists, the order, counts, COD, couriers, profit. */
export function refreshOrders(qc: QueryClient, id?: string) {
  qc.invalidateQueries({ queryKey: KEYS.orders });
  if (id) qc.invalidateQueries({ queryKey: KEYS.order(id) });
  for (const k of [KEYS.report, KEYS.couriers, KEYS.codSummary, KEYS.codHistory, KEYS.profit, KEYS.customers]) qc.invalidateQueries({ queryKey: k });
}

/**
 * Online-only actions: `guard(fn)` runs fn when online, otherwise shows
 * the friendly "needs internet" note and does nothing.
 */
export function useOnlineGuard(feature: OnlineFeature = 'onlineOrders') {
  const online = useOnlineStatus();
  const guard = useCallback(<A extends unknown[]>(fn: (...args: A) => unknown) => (...args: A) => {
    if (!online) {
      haptic('warning');
      toast.warning(onlineNeededText(feature));
      return;
    }
    fn(...args);
  }, [online, feature]);
  return { online, guard };
}
