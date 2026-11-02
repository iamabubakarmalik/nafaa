/** Labels, tones and small helpers shared by the agri pages. */

import type { OrderStatus } from '../api/bulk-orders.api';
import { t as tr } from '@core/i18n';

export const CROPS = ['Gandum', 'Kapas', 'Chawal', 'Makai', 'Ganna', 'Aloo', 'Chana', 'Sarson', 'Chara', 'Pyaz', 'Tamatar', 'Mirch', 'Sabzi', 'Baagh'];

export const SEASON_LABEL: Record<string, string> = {
  RABI: tr('Rabi'), KHARIF: tr('Kharif'), ZAID: tr('Zaid'), ALL_SEASON: tr('Har season'), SPRING: tr('Bahar'), SUMMER: tr('Garmi'), MONSOON: tr('Barsaat'), WINTER: tr('Sardi'),
};
export const seasonLabel = (s?: string | null) => (s ? SEASON_LABEL[s] ?? s : '—');

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  DRAFT: { label: tr('Draft'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  PENDING: { label: tr('Baqi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CONFIRMED: { label: tr('Pakka'), tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  PROCESSING: { label: tr('Tayyari'), tone: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  READY: { label: tr('Tayyar'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  OUT_FOR_DELIVERY: { label: tr('Raste me'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  DELIVERED: { label: tr('Pahunch gaya'), tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  RETURNED: { label: tr('Wapas'), tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

/** Next step offered for an open order. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: 'CONFIRMED', PENDING: 'CONFIRMED', CONFIRMED: 'PROCESSING', PROCESSING: 'READY', READY: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED',
};
export const OPEN_STATUSES: OrderStatus[] = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY'];

export const CLAIM_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: tr('Baqi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { label: tr('Manzoor'), tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  DISBURSED: { label: tr('Paisa mil gaya'), tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  REJECTED: { label: tr('Radd'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') }, { value: 'BANK_TRANSFER', label: tr('Bank') }, { value: 'JAZZCASH', label: tr('JazzCash') },
  { value: 'EASYPAISA', label: tr('Easypaisa') }, { value: 'CARD', label: tr('Card') }, { value: 'CHEQUE', label: tr('Cheque') },
];

/** API error message or the fallback. */
export function errorText(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || (e instanceof Error && e.message) || fallback;
}

export const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** `yyyy-mm-dd` of a stored moment on the shop's calendar (a UTC slice is a day early for PKT midnight). */
export const isoDay = (iso?: string | null) => (iso ? dayKey(new Date(iso)) : '');

/** Whole days from today to `iso` (negative when past), on the device's calendar. */
export function daysTo(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(t); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
export function dayPhrase(d: number | null): string {
  if (d === null) return '—';
  if (d === 0) return 'aaj';
  if (d === 1) return 'kal';
  if (d === -1) return tr('kal guzra');
  return d > 0 ? tr('{{d}} din me', { d }) : tr('{{value}} din pehle', { value: -d });
}

export const qty = (n: number) => String(Number((Number(n) || 0).toFixed(2)));
/** Keeps digits and one dot while typing an amount. */
export const amountInput = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
export const phoneOk = (v: string) => v.replace(/\D/g, '').length >= 10;
export const cnicOk = (v: string) => !v.trim() || v.replace(/\D/g, '').length === 13;
/** 3520212345671 → 35202-1234567-1 */
export function formatCnic(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join('-');
}
