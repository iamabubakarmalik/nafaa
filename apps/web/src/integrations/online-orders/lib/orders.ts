/**
 * Small order helpers shared by the online store pages: order number,
 * phone, closed and COD checks, status tabs and the invoice print link.
 */

import type { OnlineOrder, OnlineOrderStatus } from '../api/online-orders.api';
import { STATUS_LABEL } from './labels';

export type OrderTab = 'PENDING' | 'ACTIVE' | 'DELIVERED' | 'COD_DUE' | 'CLOSED' | 'ALL';

/** Status pipeline tabs. Queue tabs (new, in progress, COD due) ignore the date filter so nothing old hides. */
export const ORDER_TABS: Array<{ id: OrderTab; label: string; hint: string; queue: boolean }> = [
  { id: 'PENDING', label: 'Naye', hint: 'Accept karne hain', queue: true },
  { id: 'ACTIVE', label: 'Chal rahe', hint: 'Pack ya raste me', queue: true },
  { id: 'DELIVERED', label: 'Delivered', hint: 'Mil gaye', queue: false },
  { id: 'COD_DUE', label: 'COD baqi', hint: 'Paisa aana hai', queue: true },
  { id: 'CLOSED', label: 'Cancel / wapas', hint: 'Cancel, reject, RTO', queue: false },
  { id: 'ALL', label: 'Sab', hint: 'Har order', queue: false },
];

export const ACTIVE_STATUSES: OnlineOrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
export const CLOSED_STATUSES: OnlineOrderStatus[] = ['CANCELLED', 'REJECTED', 'RETURNED'];

export const orderNo = (o: Pick<OnlineOrder, 'externalOrderNumber' | 'externalOrderId'>) => String(o.externalOrderNumber ?? o.externalOrderId ?? '');
export const isClosed = (o: Pick<OnlineOrder, 'orderStatus'>) => CLOSED_STATUSES.includes(o.orderStatus);
export const isCodDue = (o: OnlineOrder) => o.isCod && o.paymentStatus !== 'PAID' && !isClosed(o);
export const statusShort = (s: string) => STATUS_LABEL[s as OnlineOrderStatus]?.short ?? s;
export const waitMinutes = (iso: string, now: number) => Math.floor((now - new Date(iso).getTime()) / 60_000);
export const itemQty = (o: OnlineOrder) => o.items.reduce((a, i) => a + Number(i.quantity || 0), 0);

/** Invoice / packing slip page for these orders, opened in a new tab. */
export const openInvoices = (ids: string[]) => window.open(`/online-orders/print?auto=1&ids=${ids.join(',')}`, '_blank');

/** Counts for each tab from the server's status counts. */
export function tabCount(tab: OrderTab, all: Record<string, number>, ranged: Record<string, number> | null, codDue: number) {
  const pick = ORDER_TABS.find((t) => t.id === tab)?.queue ? all : ranged ?? all;
  const sum = (keys: string[]) => keys.reduce((a, k) => a + (pick[k] ?? 0), 0);
  if (tab === 'PENDING') return pick.PENDING ?? 0;
  if (tab === 'ACTIVE') return sum(ACTIVE_STATUSES);
  if (tab === 'DELIVERED') return pick.DELIVERED ?? 0;
  if (tab === 'CLOSED') return sum(CLOSED_STATUSES);
  if (tab === 'COD_DUE') return codDue;
  return Object.values(pick).reduce((a, n) => a + n, 0);
}

/** CSV text with a BOM so Excel reads Urdu and Roman text; guards against formula injection. */
export function toCsv(rows: unknown[][]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
