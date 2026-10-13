/**
 * Query keys, month helpers, labels and small formatters shared by the
 * commission page, its tabs, the statement and the print-outs.
 */

import { CheckCircle2, CircleDashed, Clock, TriangleAlert, type LucideIcon } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { CommissionBasis, CommissionRule, CommissionValueType, PayStatus } from '../api/commission.api';

/** Every query of this page lives under this key. */
export const COMMISSION_KEY = 'commission';

export function shiftPeriod(p: string, by: number) {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-10" → "October 2026"; short → "Oct 26". */
export function periodLabel(p: string, short = false) {
  const [y, m] = (p ?? '').split('-').map(Number);
  if (!y || !m) return p;
  return new Date(y, m - 1, 1).toLocaleDateString('en-PK', short ? { month: 'short', year: '2-digit' } : { month: 'long', year: 'numeric' });
}

/** The last `n` months up to `upTo`, newest first. */
export function recentPeriods(upTo: string, n = 24) {
  return Array.from({ length: n }, (_, i) => shiftPeriod(upTo, -i));
}

export const BASIS: Record<CommissionBasis, { label: string; hint: string }> = {
  SALE: { label: 'Bikri par', hint: 'Jitna becha us par. Samajhne me sab se aasaan.' },
  PROFIT: { label: 'Munafa par', hint: 'Bikri me se cost nikaal kar jo bacha us par. Banda chhoot kam deta hai.' },
  PER_BILL: { label: 'Har bill par', hint: 'Har bill ki fixed raqam. Chhoti raqam, zyada bill.' },
};

/** "Bikri par 2.5%", "Har cheez par Rs 20", "Har bill par Rs 10". */
export function rateText(r: { basis: CommissionBasis; valueType: CommissionValueType; value: number }) {
  if (r.basis === 'PER_BILL') return `${formatPKR(r.value)} har bill`;
  if (r.valueType === 'FIXED') return `${formatPKR(r.value)} har cheez`;
  return `${r.value}% ${r.basis === 'PROFIT' ? 'munafa' : 'bikri'}`;
}

export function ruleName(r: Pick<CommissionRule, 'name' | 'basis' | 'valueType'>) {
  if (r.name) return r.name;
  if (r.basis === 'PER_BILL') return 'Har bill par';
  if (r.valueType === 'FIXED') return 'Har cheez par';
  return BASIS[r.basis].label;
}

export const PAY: Record<PayStatus, { label: string; icon: LucideIcon; tone: string }> = {
  none: { label: 'Baqi', icon: Clock, tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  partial: { label: 'Kuch ada', icon: CircleDashed, tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  full: { label: 'Ada ho gayi', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  over: { label: 'Zyada ada', icon: TriangleAlert, tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const day = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const dayTime = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/** Signed rupees for lines that can go below zero after returns. */
export const signed = (n: number) => (n < 0 ? `−${formatPKR(Math.abs(n))}` : formatPKR(n));

export const qtyText = (n: number) => String(Number(n.toFixed(3)));

export function apiError(e: unknown, fallback: string) {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(msg) ? msg[0] : msg) || fallback;
}

/** CSV download with a BOM so Excel reads Urdu names correctly. */
export function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
