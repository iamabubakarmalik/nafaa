/**
 * Labels, tones and small formatters shared by the distribution screens:
 * order, load sheet and collection states, payment methods, money, dates
 * and pack quantities ("3 Carton + 5 pcs").
 */

import { formatPKR } from '@core/lib/format';
import type { CollectionStatus, DeliveryOutcome, LoadSheetStatus, MoneyMethod, OrderStatus } from '../api/distribution.api';
import { msg, t } from '@core/i18n';

export type Tone = 'slate' | 'blue' | 'amber' | 'violet' | 'green' | 'rose' | 'teal' | 'orange';

export const TONE_CLASS: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-800',
  violet: 'bg-violet-50 text-violet-700',
  green: 'bg-success-50 text-success-700',
  rose: 'bg-rose-50 text-rose-700',
  teal: 'bg-teal-50 text-teal-700',
  orange: 'bg-orange-50 text-orange-700',
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  BOOKED: { label: t('Booked'), tone: 'amber' },
  APPROVED: { label: t('Approved'), tone: 'blue' },
  INVOICING: { label: t('Invoice ban raha'), tone: 'blue' },
  INVOICED: { label: t('Invoiced'), tone: 'violet' },
  LOADED: { label: t('Gaari par'), tone: 'orange' },
  DELIVERED: { label: t('Delivered'), tone: 'green' },
  PARTIAL: { label: t('Kuch wapas'), tone: 'teal' },
  RETURNED: { label: t('Wapas'), tone: 'rose' },
  CANCELLED: { label: t('Cancel'), tone: 'slate' },
};

export const SHEET_STATUS: Record<LoadSheetStatus, { label: string; tone: Tone }> = {
  OPEN: { label: t('Tayyar ho rahi'), tone: 'amber' },
  DISPATCHED: { label: t('Gaari nikal gayi'), tone: 'orange' },
  SETTLED: { label: t('Settle'), tone: 'green' },
  CANCELLED: { label: t('Cancel'), tone: 'slate' },
};

export const OUTCOME: Record<DeliveryOutcome, { label: string; tone: Tone }> = {
  DELIVERED: { label: t('Poora deliver'), tone: 'green' },
  PARTIAL: { label: t('Kuch wapas'), tone: 'teal' },
  RETURNED: { label: t('Sab wapas'), tone: 'rose' },
};

export const COLLECTION_STATUS: Record<CollectionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: t('Verify baqi'), tone: 'amber' },
  VERIFIED: { label: t('Verified'), tone: 'green' },
  REJECTED: { label: t('Reject'), tone: 'rose' },
};

export const METHOD_LABEL: Record<MoneyMethod, string> = {
  CASH: t('Cash'), CARD: t('Card'), BANK_TRANSFER: t('Bank'), JAZZCASH: t('JazzCash'), EASYPAISA: t('Easypaisa'),
};
export const METHODS = Object.keys(METHOD_LABEL) as MoneyMethod[];

/** Stored as written; translate with t() where shown. */
export const RETURN_REASONS: string[] = [msg('Dukaan band thi'), msg('Customer ne inkaar kiya'), msg('Paise nahi the'), msg('Maal kharab / toota'), msg('Ghalat maal gaya'), msg('Gaari me jagah nahi thi')];

/** Whole rupees, "Rs 12,500". */
export const rs = (n: number | null | undefined) => formatPKR(n ?? 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Short form for tight tiles: Rs 4.9 lakh, Rs 1.2 crore. */
export function rsShort(n: number | null | undefined) {
  const v = n ?? 0;
  const a = Math.abs(v);
  if (a >= 10_000_000) return t('Rs {{value}} crore', { value: (v / 10_000_000).toFixed(a >= 100_000_000 ? 0 : 1) });
  if (a >= 100_000) return t('Rs {{value}} lakh', { value: (v / 100_000).toFixed(a >= 10_000_000 ? 0 : 1) });
  return rs(v);
}

const DAY = new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' });
const DAY_Y = new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' });

export const dayLabel = (iso: string | null | undefined) => (iso ? DAY.format(new Date(iso)) : '—');
export const dayYearLabel = (iso: string | null | undefined) => (iso ? DAY_Y.format(new Date(iso)) : '—');
export const dayTime = (iso: string | null | undefined) => (iso ? `${DAY.format(new Date(iso))}, ${TIME.format(new Date(iso))}` : '—');
export const timeLabel = (iso: string | null | undefined) => (iso ? TIME.format(new Date(iso)) : '—');

/** A day key ("2026-10-29") shown as "29 Oct". */
export function dayKeyLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return DAY.format(new Date(y, m - 1, d));
}

/** Base quantity as packs and loose pieces: "3 Carton + 5 pcs". */
export function packText(baseQty: number, packSize: number | null | undefined, packName: string | null | undefined, baseUnit = 'pcs') {
  const q = Math.round(baseQty * 10_000) / 10_000;
  if (!packSize || packSize <= 1 || !packName) return `${trim(q)} ${baseUnit}`;
  const packs = Math.floor(q / packSize + 1e-9);
  const loose = Math.round((q - packs * packSize) * 10_000) / 10_000;
  if (!packs) return `${trim(loose)} ${baseUnit}`;
  return loose ? `${packs} ${packName} + ${trim(loose)} ${baseUnit}` : `${packs} ${packName}`;
}

export const trim = (n: number) => String(Number(n.toFixed(3)));

/** The customer's shop name first, then the person. */
export function partyName(c: { name: string; businessName?: string | null } | null | undefined) {
  if (!c) return '—';
  return c.businessName ? c.businessName : c.name;
}
export function partySub(c: { name: string; businessName?: string | null; area?: string | null } | null | undefined) {
  if (!c) return '';
  return [c.businessName ? c.name : null, c.area].filter(Boolean).join(' · ');
}

/** Page shortcuts stay on while a row checkbox has focus; only text fields block them. */
export function typingInField(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return false;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}
