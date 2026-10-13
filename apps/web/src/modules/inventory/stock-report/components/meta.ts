/**
 * Labels, colours and text helpers shared by the stock list, analytics,
 * branch and period views and the print-outs.
 */

import {
  AlertTriangle, Ban, CalendarClock, CheckCircle2, Croissant, EyeOff, Hourglass, ListChecks, Minus, PackageX,
  ShieldAlert, Snail, Wheat, Zap, type LucideIcon,
} from 'lucide-react';
import type { StockFlag, StockLine, StockStatusFilter } from '../api/stock-report.api';

export const STATUS_META: Record<StockStatusFilter, { label: string; hint?: string; icon: LucideIcon; color: string }> = {
  all: { label: 'Sab', icon: ListChecks, color: '#475569' },
  in: { label: 'Stock me', hint: 'Jo dukaan me para hai', icon: CheckCircle2, color: '#16a34a' },
  low: { label: 'Kam', hint: 'Alert level se neeche', icon: AlertTriangle, color: '#d97706' },
  out: { label: 'Khatam', icon: PackageX, color: '#e11d48' },
  dead: { label: 'Dead stock', hint: 'Bahut din se nahi bika', icon: Hourglass, color: '#7c3aed' },
  slow: { label: 'Dheere bikne wala', hint: 'Maal bahut din chalega', icon: Snail, color: '#0891b2' },
  fast: { label: 'Tez bikne wala', hint: 'Maal jaldi khatam hoga', icon: Zap, color: '#ea580c' },
  expiry: { label: 'Expiry', hint: 'Expire ya qareeb', icon: CalendarClock, color: '#be185d' },
  blocked: { label: 'Registration', hint: 'Khatam ya qareeb — bechna mana', icon: ShieldAlert, color: '#be123c' },
  raw: { label: 'Kacha maal', hint: 'Banane me lagta hai', icon: Wheat, color: '#a16207' },
  made: { label: 'Khud banaya', hint: 'Dukaan me banta hai', icon: Croissant, color: '#d97706' },
  noCost: { label: 'Cost nahi likhi', hint: 'Value ghalat aayegi', icon: Ban, color: '#64748b' },
  negative: { label: 'Minus stock', hint: 'Ginti theek karni hai', icon: Minus, color: '#dc2626' },
  inactive: { label: 'Band products', hint: 'Product band hai, maal para hai', icon: EyeOff, color: '#94a3b8' },
};

/** Statuses every shop gets; industries add theirs through config. */
export const BASE_STATUSES: StockStatusFilter[] = ['in', 'low', 'out', 'dead', 'slow', 'fast', 'expiry', 'noCost', 'negative', 'inactive'];

export const FLAG_META: Partial<Record<StockFlag, { label: string; tone: string }>> = {
  dead: { label: 'Dead', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  slow: { label: 'Dheema', tone: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  fast: { label: 'Tez', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  expiry: { label: 'Expiry qareeb', tone: 'bg-pink-50 text-pink-700 ring-pink-200' },
  expired: { label: 'Expire', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  blocked: { label: 'Registration khatam', tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  regSoon: { label: 'Registration', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  raw: { label: 'Kacha maal', tone: 'bg-yellow-50 text-yellow-800 ring-yellow-200' },
  made: { label: 'Khud banaya', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  fridge: { label: 'Fridge', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  noCost: { label: 'Cost nahi', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  negative: { label: 'Minus', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  inactive: { label: 'Band', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export const LINE_STATUS: Record<StockLine['status'], { label: string; tone: string }> = {
  ok: { label: 'Theek', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  low: { label: 'Kam', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  out: { label: 'Khatam', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Stock ledger kinds, in the order they print. */
export const KINDS: Array<{ key: string; label: string; dir: 'in' | 'out' }> = [
  { key: 'buy', label: 'Purchase', dir: 'in' },
  { key: 'returnIn', label: 'Customer return', dir: 'in' },
  { key: 'transferIn', label: 'Branch se aaya', dir: 'in' },
  { key: 'adjustIn', label: 'Ginti / opening (+)', dir: 'in' },
  { key: 'sale', label: 'Sale', dir: 'out' },
  { key: 'transferOut', label: 'Branch ko gaya', dir: 'out' },
  { key: 'damage', label: 'Kharab / gum', dir: 'out' },
  { key: 'adjustOut', label: 'Ginti (−)', dir: 'out' },
  { key: 'supplier', label: 'Supplier ko wapas', dir: 'out' },
];

export const MOVE_LABEL: Record<string, string> = {
  PURCHASE_IN: 'Purchase', SALE_OUT: 'Sale', ADJUSTMENT_IN: 'Ginti (+)', ADJUSTMENT_OUT: 'Ginti (−)', RETURN_IN: 'Customer return',
  OPENING_BALANCE: 'Opening', DAMAGE: 'Kharab', LOSS: 'Gum', TRANSFER_IN: 'Branch se aaya', TRANSFER_OUT: 'Branch ko gaya', PURCHASE_RETURN: 'Supplier ko wapas',
};

export const DEAD_OPTIONS = [30, 60, 90, 180];

/** Up to two decimals, grouped. */
export const qty = (v: number) => Number((v ?? 0).toFixed(2)).toLocaleString('en-PK');

/** "aaj", "12 din", "kabhi nahi". */
export function ageText(days: number | null, never = 'kabhi nahi') {
  if (days === null) return never;
  if (days < 1) return 'aaj';
  if (days < 60) return `${days} din`;
  if (days < 730) return `${Math.round(days / 30)} mahine`;
  return `${Math.round(days / 365)} saal`;
}

export const coverText = (d: number | null) => (d === null ? '—' : d < 1 ? 'aaj khatam' : `${d} din`);

export const dateText = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Percent change against the previous period; null when there was nothing before. */
export function change(now: number, before: number) {
  if (!before) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

/** Downloads rows as a UTF-8 CSV that Excel opens with Urdu names intact. */
export function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
