/** Small formatters shared by the report screens. */

import { formatDate, formatMoney, formatQty } from '@/core/format';
import { t } from '@/core/i18n';
import type { Fmt } from '../api/center';

export const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
export const weekday = (i: number) => t(WEEKDAYS[i] ?? String(i));

/** "2026-10-04" gives "4 Oct", "2026-10" gives "Oct 26". */
export const keyLabel = (k: string) => (k.length === 7
  ? new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
  : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }));

/** Short axis label of a trend key: day of month, or month name. */
export const axisLabel = (k: string) => (k.length === 7 ? keyLabel(k).split(' ')[0] : k.slice(8));

export const pct = (v: number | null | undefined, digits = 1) => (v == null ? '—' : `${v.toFixed(digits)}%`);

export const changePct = (now: number | null | undefined, before: number | null | undefined): number | null =>
  now == null || before == null || Math.abs(before) < 0.005 ? null : ((now - before) / Math.abs(before)) * 100;

/** Format by the report's value kind (industry tables and tiles). */
export function fmtValue(v: number | string | null | undefined, kind: Fmt): string {
  if (v == null || v === '') return '—';
  if (kind === 'text') return String(v);
  if (kind === 'date') return formatDate(String(v));
  const n = Number(v);
  switch (kind) {
    case 'money': case 'cost': return formatMoney(n);
    case 'pct': return `${n.toFixed(1)}%`;
    case 'kg': return `${formatQty(n)} kg`;
    case 'grams': return `${formatQty(n)} g`;
    case 'sqft': return `${formatQty(n)} sqft`;
    case 'litre': return `${formatQty(n)} L`;
    case 'min': return `${Math.round(n)} min`;
    default: return formatQty(n);
  }
}
