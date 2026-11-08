/**
 * Small order helpers shared by the online store pages: order number,
 * phone, closed and COD checks, status tabs, the board status list and the
 * invoice print link.
 */

import {
  AlertOctagon, Ban, BadgeCheck, CalendarClock, CalendarDays, CircleDollarSign, CircleHelp, Clock3, Hourglass, Inbox, Layers, PackageCheck,
  PackageX, PauseCircle, Repeat, ShieldAlert, Tag, Trash2, Truck, Undo2, Wallet, type LucideIcon,
} from 'lucide-react';
import type { OnlineOrder, OnlineOrderStatus } from '../api/online-orders.api';
import type { BoardStatus, CustomStage } from '../api/order-board.api';
import { STATUS_LABEL, sourceOf } from './labels';
import { t as tr } from '@core/i18n';

export type OrderTab = 'PENDING' | 'ACTIVE' | 'DELIVERED' | 'COD_DUE' | 'CLOSED' | 'ALL';

/** Status pipeline tabs. Queue tabs (new, in progress, COD due) ignore the date filter so nothing old hides. */
export const ORDER_TABS: Array<{ id: OrderTab; label: string; hint: string; queue: boolean }> = [
  { id: 'PENDING', label: tr('Naye'), hint: tr('Accept karne hain'), queue: true },
  { id: 'ACTIVE', label: tr('Chal rahe'), hint: tr('Pack ya raste me'), queue: true },
  { id: 'DELIVERED', label: tr('Delivered'), hint: tr('Mil gaye'), queue: false },
  { id: 'COD_DUE', label: tr('COD baqi'), hint: tr('Paisa aana hai'), queue: true },
  { id: 'CLOSED', label: tr('Cancel / wapas'), hint: tr('Cancel, reject, RTO'), queue: false },
  { id: 'ALL', label: tr('Sab'), hint: tr('Har order'), queue: false },
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

/** Header + one row per order for the Excel (CSV) export. */
export function ordersCsvRows(items: OnlineOrder[]): unknown[][] {
  return [
    [tr('Order'), tr('Date'), tr('Customer'), tr('Phone'), tr('Shehar'), tr('Address'), tr('Channel'), tr('Cheezein'), tr('Qty'), tr('Total'), 'COD', tr('Payment'), tr('Halat'), tr('Stage'), tr('Courier'), 'CN', tr('Tags'), tr('Test')],
    ...items.map((o) => [
      orderNo(o), new Date(o.receivedAt).toLocaleString('en-PK'), o.customerName, o.customerPhone ?? '', o.customerCity ?? '', o.customerAddress ?? '',
      o.integration?.displayName ?? sourceOf(o).label, o.items.map((i) => `${Number(i.quantity)} x ${i.name}${i.variant ? ` (${i.variant})` : ''}`).join('; '), itemQty(o),
      Number(o.total || 0).toFixed(2), o.isCod ? tr('Haan') : tr('Nahi'), o.paymentStatus, statusShort(o.orderStatus), o.stage ?? '',
      o.courierLabel ?? '', o.trackingNumber ?? '', (o.metadata?.tags ?? []).join(', '), o.isTest ? tr('Haan') : '',
    ]),
  ];
}

export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// ─── Orders board ───────────────────────────────────────────────────────────

export type BoardGroup = 'work' | 'shipping' | 'done' | 'other';

export interface BoardEntry {
  key: string;
  label: string;
  /** Shorter text for chips and menus. */
  short: string;
  hint: string;
  color: string;
  icon: LucideIcon;
  group: BoardGroup;
  /** Open-work tiles ignore the date filter, so nothing old hides. */
  queue: boolean;
  /** Can be picked in the Status menu / bulk move. */
  move: boolean;
}

export const BOARD_GROUPS: Array<{ id: BoardGroup; label: string }> = [
  { id: 'work', label: tr('Kaam') },
  { id: 'shipping', label: tr('Shipping') },
  { id: 'done', label: tr('Mukammal') },
  { id: 'other', label: tr('Doosre') },
];

const b = (key: string, label: string, short: string, hint: string, color: string, icon: LucideIcon, group: BoardGroup, queue: boolean, move: boolean): BoardEntry =>
  ({ key, label, short, hint, color, icon, group, queue, move });

/** Every board status and tile, in the order the tiles show. */
export const BOARD: BoardEntry[] = [
  b('TODAY', tr('Aaj'), tr('Aaj'), tr('Aaj aaye orders'), '#0f766e', CalendarDays, 'work', false, false),
  b('ALL', tr('Sab'), tr('Sab'), tr('Har order'), '#475569', Layers, 'work', false, false),
  b('NEW', tr('New'), tr('New'), tr('Abhi dekhna hai'), '#d97706', Inbox, 'work', true, true),
  b('PAY_PENDING', tr('Pay pending'), tr('Pay pending'), tr('Advance ka intezar'), '#ea580c', CircleDollarSign, 'work', true, true),
  b('ON_HOLD', tr('On hold'), tr('On hold'), tr('Abhi rok diya'), '#a16207', PauseCircle, 'work', true, true),
  b('NO_STOCK', tr('No stock'), tr('No stock'), tr('Maal khatam'), '#b45309', PackageX, 'work', true, true),
  b('CUSTOMER_QUERY', tr('Customer query'), tr('Query'), tr('Customer ka sawal'), '#7c3aed', CircleHelp, 'work', true, true),
  b('CONFIRMED', tr('Confirmed'), tr('Confirmed'), tr('Bill ban gaya, pack karna hai'), '#0284c7', BadgeCheck, 'work', true, true),
  b('FOLLOW_UP', tr('Follow-up'), tr('Follow-up'), tr('Aaj dobara rabta'), '#db2777', CalendarClock, 'work', true, false),
  b('PACKED', tr('Packed'), tr('Packed'), tr('Pack ho gaya'), '#7c3aed', PackageCheck, 'shipping', true, true),
  b('PACKED_NOT_SENT', tr('Packed not sent'), tr('Not sent'), tr('Pack hai, gaya nahi'), '#9333ea', Hourglass, 'shipping', true, true),
  b('DISPATCHED', tr('Dispatched'), tr('Dispatched'), tr('Courier ko de diya'), '#ea580c', Truck, 'shipping', true, true),
  b('OUT_FOR_DELIVERY', tr('Out for delivery'), tr('OFD'), tr('Aaj pohanchna hai'), '#f97316', Truck, 'shipping', true, false),
  b('STUCK', tr('Stuck 5+ din'), tr('Stuck'), tr('5 din se raste me'), '#dc2626', Clock3, 'shipping', true, false),
  b('ISSUES', tr('Issues'), tr('Issues'), tr('Courier ya order me masla'), '#e11d48', AlertOctagon, 'shipping', true, false),
  b('RETURNING', tr('Returning'), tr('Returning'), tr('Wapas aa raha'), '#c026d3', Undo2, 'shipping', true, false),
  b('DELIVERED', tr('Delivered'), tr('Delivered'), tr('Mil gaya'), '#16a34a', PackageCheck, 'done', false, true),
  b('COD_DUE', tr('COD baqi'), tr('COD baqi'), tr('Courier se paisa aana hai'), '#ea580c', Wallet, 'done', true, false),
  b('RETURNED', tr('Returned'), tr('Returned'), tr('Wapas mil gaya (RTO)'), '#a21caf', Undo2, 'done', false, true),
  b('CANCELLED', tr('Cancelled'), tr('Cancelled'), tr('Cancel ya reject'), '#e11d48', Ban, 'done', false, true),
  b('REPLACEMENT', tr('Replacement'), tr('Replacement'), tr('Badle me bheja'), '#0891b2', Repeat, 'other', false, false),
  b('CLAIM', tr('Claim'), tr('Claim'), tr('Courier se claim'), '#be123c', ShieldAlert, 'other', true, true),
  b('ISSUE', tr('Issue'), tr('Issue'), tr('Masla hai'), '#e11d48', AlertOctagon, 'other', true, true),
  b('DELETED', tr('Deleted'), tr('Deleted'), tr('Mitaye gaye'), '#64748b', Trash2, 'other', false, false),
];

/** The ISSUE stage is a move target only; its orders show under the Issues tile. */
export const TILE_KEYS = BOARD.filter((x) => x.key !== 'ISSUE').map((x) => x.key);

const STAGE_KEYS = ['PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'PACKED_NOT_SENT', 'CLAIM', 'ISSUE'];

/** Board entry for a key, including custom stages (`custom:<key>`). */
export function boardEntry(key: string, custom: CustomStage[] = []): BoardEntry | undefined {
  const known = BOARD.find((x) => x.key === key);
  if (known) return known;
  if (!key.startsWith('custom:')) return undefined;
  const c = custom.find((s) => `custom:${s.key}` === key);
  const label = c?.label ?? key.slice(7);
  return b(key, label, label, tr('Apna status'), c?.color ?? '#64748b', Tag, 'other', true, true);
}

/** Entries for custom stages, shown after the built-in ones. */
export const customEntries = (custom: CustomStage[]) => custom.map((c) => boardEntry(`custom:${c.key}`, custom)!);

/** Statuses an order can be moved to, built-in first. */
export const moveTargets = (custom: CustomStage[] = []) => [...BOARD.filter((x) => x.move), ...customEntries(custom)];

/** Where an order sits on the board right now: its stage if any, else its lifecycle status. */
export function boardOf(o: Pick<OnlineOrder, 'orderStatus'> & { stage?: string | null; deletedAt?: string | null }): BoardStatus | 'DELETED' {
  if (o.deletedAt) return 'DELETED';
  if (o.stage && (STAGE_KEYS.includes(o.stage) || o.stage.startsWith('custom:'))) return o.stage as BoardStatus;
  switch (o.orderStatus) {
    case 'PENDING': case 'ACCEPTING': return 'NEW';
    case 'CONFIRMED': case 'PREPARING': return 'CONFIRMED';
    case 'READY': return 'PACKED';
    case 'OUT_FOR_DELIVERY': return 'DISPATCHED';
    case 'DELIVERED': return 'DELIVERED';
    case 'RETURNED': return 'RETURNED';
    default: return 'CANCELLED';
  }
}

/** Stage chip label for a stored stage, or null. */
export const stageEntry = (stage: string | null | undefined, custom: CustomStage[] = []) => (stage ? boardEntry(stage, custom) ?? null : null);

/** Tile color tint for chips. */
export const tint = (hex: string) => ({ backgroundColor: `${hex}1a`, color: hex });
