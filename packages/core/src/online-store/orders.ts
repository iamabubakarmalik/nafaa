/**
 * Online order rules shared by every screen that shows orders: status
 * groups and tabs, what an order can do next, counts per tab, the order
 * number and the waiting time. Labels are not here; each app keeps the
 * source text for its catalog (status keys map to labels there).
 */

import type { OnlineOrder, OnlineOrderStatus } from './types';

export type OrderTab = 'PENDING' | 'ACTIVE' | 'DELIVERED' | 'COD_DUE' | 'CLOSED' | 'ALL';

/** Status pipeline tabs. Queue tabs (new, in progress, COD due) ignore the date filter so nothing old hides. */
export const ORDER_TAB_IDS: ReadonlyArray<{ id: OrderTab; queue: boolean }> = [
  { id: 'PENDING', queue: true },
  { id: 'ACTIVE', queue: true },
  { id: 'DELIVERED', queue: false },
  { id: 'COD_DUE', queue: true },
  { id: 'CLOSED', queue: false },
  { id: 'ALL', queue: false },
];

export const ORDER_STATUSES: OnlineOrderStatus[] = [
  'PENDING', 'ACCEPTING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED',
];
export const ACTIVE_STATUSES: OnlineOrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
export const CLOSED_STATUSES: OnlineOrderStatus[] = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** Colour family of each status, for pills and dots. */
export type StatusTone = 'warning' | 'neutral' | 'info' | 'accent' | 'brand' | 'success' | 'danger';
export const STATUS_TONE: Record<OnlineOrderStatus, StatusTone> = {
  PENDING: 'warning',
  ACCEPTING: 'neutral',
  CONFIRMED: 'info',
  PREPARING: 'accent',
  READY: 'accent',
  OUT_FOR_DELIVERY: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  RETURNED: 'danger',
};

export const isQueueTab = (tab: OrderTab) => ORDER_TAB_IDS.find((t) => t.id === tab)?.queue ?? false;
export const orderNo = (o: Pick<OnlineOrder, 'externalOrderNumber' | 'externalOrderId'>) => String(o.externalOrderNumber ?? o.externalOrderId ?? '');
export const isClosed = (o: Pick<OnlineOrder, 'orderStatus'>) => CLOSED_STATUSES.includes(o.orderStatus);
export const isCodDue = (o: OnlineOrder) => o.isCod && o.paymentStatus !== 'PAID' && !isClosed(o);
export const waitMinutes = (iso: string, now: number) => Math.floor((now - new Date(iso).getTime()) / 60_000);
export const itemQty = (o: Pick<OnlineOrder, 'items'>) => o.items.reduce((a, i) => a + Number(i.quantity || 0), 0);
/** 2.50 → "2.5", 3 → "3". */
export const qtyText = (n: number) => String(Number(Number(n || 0).toFixed(2)));

/** Server status filter and payment filter for a tab. */
export function tabQuery(tab: OrderTab): { status?: string; payment?: 'COD_DUE' } {
  if (tab === 'ALL') return {};
  if (tab === 'COD_DUE') return { payment: 'COD_DUE' };
  return { status: tab };
}

/** Counts for each tab from the server's status counts. */
export function tabCount(tab: OrderTab, all: Record<string, number>, ranged: Record<string, number> | null, codDue: number) {
  const pick = isQueueTab(tab) ? all : ranged ?? all;
  const sum = (keys: string[]) => keys.reduce((a, k) => a + (pick[k] ?? 0), 0);
  if (tab === 'PENDING') return pick.PENDING ?? 0;
  if (tab === 'ACTIVE') return sum(ACTIVE_STATUSES);
  if (tab === 'DELIVERED') return pick.DELIVERED ?? 0;
  if (tab === 'CLOSED') return sum(CLOSED_STATUSES);
  if (tab === 'COD_DUE') return codDue;
  return Object.values(pick).reduce((a, n) => a + n, 0);
}

/** The order's "next step" button applies to these statuses. */
export const NEXT_STEP_FROM: OnlineOrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

/** What one order can offer right now (same rules as the web list and drawer). */
export function orderOptions(o: OnlineOrder) {
  const closed = isClosed(o);
  return {
    accept: o.orderStatus === 'PENDING',
    confirm: o.isCod && o.paymentStatus !== 'PAID' && !closed && !o.dispatchedAt && o.confirmation?.result !== 'CONFIRMED' && o.orderStatus !== 'PENDING',
    // Handing over without a courier booking needs the courier and CN form.
    next: !!o.nextStatus && !!o.nafaaSaleId && !(o.nextStatus === 'OUT_FOR_DELIVERY' && !o.courierBooked),
    book: !!o.nafaaSaleId && ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus) && !o.courierBooked && !o.dispatchedAt && o.integration?.type !== 'DARAZ',
    label: !!o.courierBooked && o.orderStatus !== 'RETURNED',
    invoice: !!o.nafaaSaleId,
    cancel: !closed && o.orderStatus !== 'DELIVERED' && !o.dispatchedAt,
    rto: !!o.nafaaSaleId && !!o.dispatchedAt && !closed && !o.codSettledAt,
  };
}

/** How many of the picked orders each bulk action applies to. */
export function bulkCounts(sel: OnlineOrder[]) {
  return {
    accept: sel.filter((o) => o.orderStatus === 'PENDING').length,
    next: sel.filter((o) => !!o.nextStatus && o.nafaaSaleId).length,
    confirm: sel.filter((o) => o.isCod && o.paymentStatus !== 'PAID' && !isClosed(o) && !o.dispatchedAt && o.confirmation?.result !== 'CONFIRMED').length,
    book: sel.filter((o) => o.nafaaSaleId && ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus) && !o.courierBooked && !o.dispatchedAt).length,
    cancel: sel.filter((o) => !isClosed(o) && o.orderStatus !== 'DELIVERED' && !o.dispatchedAt).length,
  };
}

/** Late new order: waiting longer than the shop's limit (test orders never count). */
export const isLate = (o: OnlineOrder, now: number, staleMinutes: number) =>
  o.orderStatus === 'PENDING' && !o.isTest && waitMinutes(o.receivedAt, now) >= staleMinutes;

/** Business-day key shifted by whole days ("2026-11-03", -1 → "2026-11-02"). */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Map link for an order: exact pin when the shop has it, else an address search. */
export function mapsUrl(o: Pick<OnlineOrder, 'customerLat' | 'customerLng' | 'customerAddress' | 'customerCity'>): string | null {
  if (o.customerLat && o.customerLng) return `https://www.google.com/maps?q=${o.customerLat},${o.customerLng}`;
  if (o.customerAddress) return `https://www.google.com/maps/search/${encodeURIComponent(`${o.customerAddress} ${o.customerCity ?? ''}`)}`;
  return null;
}

/** Stock of a matched line, never a raw negative: { kind, n }. */
export function stockState(n: number): { kind: 'ok' | 'out' | 'oversold'; n: number } {
  return n > 0 ? { kind: 'ok', n } : n === 0 ? { kind: 'out', n: 0 } : { kind: 'oversold', n: Math.abs(n) };
}
