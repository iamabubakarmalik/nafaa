/**
 * Labels, colours and text helpers shared by the stock list, analytics,
 * branch and period views and the print-outs.
 */

import {
  AlertTriangle, Ban, CalendarClock, CheckCircle2, Croissant, EyeOff, Hourglass, ListChecks, Minus, PackageX,
  ShieldAlert, Snail, Wheat, Zap, type LucideIcon,
} from 'lucide-react';
import type { StockFlag, StockLine, StockStatusFilter } from '../api/stock-report.api';
import { t } from '@core/i18n';

export const STATUS_META: Record<StockStatusFilter, { label: string; hint?: string; icon: LucideIcon; color: string }> = {
  all: { label: t('Sab'), icon: ListChecks, color: '#475569' },
  in: { label: t('Stock me'), hint: t('Jo dukaan me para hai'), icon: CheckCircle2, color: '#16a34a' },
  low: { label: t('Kam'), hint: t('Alert level se neeche'), icon: AlertTriangle, color: '#d97706' },
  out: { label: t('Khatam'), icon: PackageX, color: '#e11d48' },
  dead: { label: t('Dead stock'), hint: t('Bahut din se nahi bika'), icon: Hourglass, color: '#7c3aed' },
  slow: { label: t('Dheere bikne wala'), hint: t('Maal bahut din chalega'), icon: Snail, color: '#0891b2' },
  fast: { label: t('Tez bikne wala'), hint: t('Maal jaldi khatam hoga'), icon: Zap, color: '#ea580c' },
  expiry: { label: t('Expiry'), hint: t('Expire ya qareeb'), icon: CalendarClock, color: '#be185d' },
  blocked: { label: t('Registration'), hint: t('Khatam ya qareeb — bechna mana'), icon: ShieldAlert, color: '#be123c' },
  raw: { label: t('Kacha maal'), hint: t('Banane me lagta hai'), icon: Wheat, color: '#a16207' },
  made: { label: t('Khud banaya'), hint: t('Dukaan me banta hai'), icon: Croissant, color: '#d97706' },
  noCost: { label: t('Cost nahi likhi'), hint: t('Value ghalat aayegi'), icon: Ban, color: '#64748b' },
  negative: { label: t('Minus stock'), hint: t('Ginti theek karni hai'), icon: Minus, color: '#dc2626' },
  inactive: { label: t('Band products'), hint: t('Product band hai, maal para hai'), icon: EyeOff, color: '#94a3b8' },
};

/** Statuses every shop gets; industries add theirs through config. */
export const BASE_STATUSES: StockStatusFilter[] = ['in', 'low', 'out', 'dead', 'slow', 'fast', 'expiry', 'noCost', 'negative', 'inactive'];

export const FLAG_META: Partial<Record<StockFlag, { label: string; tone: string }>> = {
  dead: { label: t('Dead'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  slow: { label: t('Dheema'), tone: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  fast: { label: t('Tez'), tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  expiry: { label: t('Expiry qareeb'), tone: 'bg-pink-50 text-pink-700 ring-pink-200' },
  expired: { label: t('Expire'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  blocked: { label: t('Registration khatam'), tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  regSoon: { label: t('Registration'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  raw: { label: t('Kacha maal'), tone: 'bg-yellow-50 text-yellow-800 ring-yellow-200' },
  made: { label: t('Khud banaya'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  fridge: { label: t('Fridge'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  noCost: { label: t('Cost nahi'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  negative: { label: t('Minus'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  inactive: { label: t('Band'), tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export const LINE_STATUS: Record<StockLine['status'], { label: string; tone: string }> = {
  ok: { label: t('Theek'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  low: { label: t('Kam'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  out: { label: t('Khatam'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Stock ledger kinds, in the order they print. */
export const KINDS: Array<{ key: string; label: string; dir: 'in' | 'out' }> = [
  { key: 'buy', label: t('Purchase'), dir: 'in' },
  { key: 'returnIn', label: t('Customer return'), dir: 'in' },
  { key: 'transferIn', label: t('Branch se aaya'), dir: 'in' },
  { key: 'adjustIn', label: t('Ginti / opening (+)'), dir: 'in' },
  { key: 'made', label: t('Banaya (Production)'), dir: 'in' },
  { key: 'sale', label: t('Sale'), dir: 'out' },
  { key: 'transferOut', label: t('Branch ko gaya'), dir: 'out' },
  { key: 'damage', label: t('Kharab / gum'), dir: 'out' },
  { key: 'adjustOut', label: t('Ginti (−)'), dir: 'out' },
  { key: 'supplier', label: t('Supplier ko wapas'), dir: 'out' },
  { key: 'used', label: t('Raw maal production me laga'), dir: 'out' },
];

export const MOVE_LABEL: Record<string, string> = {
  PURCHASE_IN: t('Purchase'), SALE_OUT: t('Sale'), ADJUSTMENT_IN: t('Ginti (+)'), ADJUSTMENT_OUT: t('Ginti (−)'), RETURN_IN: t('Customer return'),
  OPENING_BALANCE: t('Opening'), DAMAGE: t('Kharab'), LOSS: t('Gum'), TRANSFER_IN: t('Branch se aaya'), TRANSFER_OUT: t('Branch ko gaya'), PURCHASE_RETURN: t('Supplier ko wapas'),
  PRODUCTION_IN: t('Banaya'), PRODUCTION_OUT: t('Production me laga'),
};

export const DEAD_OPTIONS = [30, 60, 90, 180];

/** Up to two decimals, grouped. */
export const qty = (v: number) => Number((v ?? 0).toFixed(2)).toLocaleString('en-PK');

/** "aaj", "12 din", "kabhi nahi". */
export function ageText(days: number | null, never = t('kabhi nahi')) {
  if (days === null) return never;
  if (days < 1) return 'aaj';
  if (days < 60) return t('{{days}} din', { days });
  if (days < 730) return t('{{value}} mahine', { value: Math.round(days / 30) });
  return t('{{value}} saal', { value: Math.round(days / 365) });
}

export const coverText = (d: number | null) => (d === null ? '—' : d < 1 ? t('aaj khatam') : t('{{d}} din', { d }));

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
