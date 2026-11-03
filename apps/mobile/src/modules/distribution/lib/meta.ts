/**
 * Labels, tones and small formatters shared by the distribution screens:
 * order, load sheet and collection states, payment methods, money, dates
 * and pack quantities ("3 Carton + 5 pcs").
 */

import type { StatusTone } from '@/design';
import { formatMoney, formatDate, formatTime } from '@/core/format';
import type { CollectionStatus, DeliveryOutcome, LoadSheetStatus, MoneyMethod, OrderStatus } from '../api/distribution.api';
import { msg, t } from '@/core/i18n';

export type Tone = 'slate' | 'blue' | 'amber' | 'violet' | 'green' | 'rose' | 'teal' | 'orange';

/** Maps the web tone names onto the kit's status tones. */
export const TONE: Record<Tone, StatusTone> = {
  slate: 'neutral', blue: 'info', amber: 'warning', violet: 'accent', green: 'success', rose: 'danger', teal: 'brand', orange: 'warning',
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  BOOKED: { label: msg('Booked'), tone: 'amber' },
  APPROVED: { label: msg('Approved'), tone: 'blue' },
  INVOICING: { label: msg('Invoice ban raha'), tone: 'blue' },
  INVOICED: { label: msg('Invoiced'), tone: 'violet' },
  LOADED: { label: msg('Gaari par'), tone: 'orange' },
  DELIVERED: { label: msg('Delivered'), tone: 'green' },
  PARTIAL: { label: msg('Kuch wapas'), tone: 'teal' },
  RETURNED: { label: msg('Wapas'), tone: 'rose' },
  CANCELLED: { label: msg('Cancel'), tone: 'slate' },
};

export const SHEET_STATUS: Record<LoadSheetStatus, { label: string; tone: Tone }> = {
  OPEN: { label: msg('Tayyar ho rahi'), tone: 'amber' },
  DISPATCHED: { label: msg('Gaari nikal gayi'), tone: 'orange' },
  SETTLED: { label: msg('Settle'), tone: 'green' },
  CANCELLED: { label: msg('Cancel'), tone: 'slate' },
};

export const OUTCOME: Record<DeliveryOutcome, { label: string; tone: Tone }> = {
  DELIVERED: { label: msg('Poora deliver'), tone: 'green' },
  PARTIAL: { label: msg('Kuch wapas'), tone: 'teal' },
  RETURNED: { label: msg('Sab wapas'), tone: 'rose' },
};

export const COLLECTION_STATUS: Record<CollectionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: msg('Verify baqi'), tone: 'amber' },
  VERIFIED: { label: msg('Verified'), tone: 'green' },
  REJECTED: { label: msg('Reject'), tone: 'rose' },
};

export const METHOD_LABEL: Record<MoneyMethod, string> = {
  CASH: msg('Cash'), CARD: msg('Card'), BANK_TRANSFER: msg('Bank'), JAZZCASH: msg('JazzCash'), EASYPAISA: msg('Easypaisa'),
};
export const METHODS = Object.keys(METHOD_LABEL) as MoneyMethod[];

/** Stored as written; translate with t() where shown. */
export const RETURN_REASONS: string[] = [msg('Dukaan band thi'), msg('Customer ne inkaar kiya'), msg('Paise nahi the'), msg('Maal kharab / toota'), msg('Ghalat maal gaya'), msg('Gaari me jagah nahi thi')];

/** Whole rupees, "Rs 12,500". */
export const rs = (n: number | null | undefined) => formatMoney(n ?? 0, { decimals: 0 });

/** Short form for tight tiles: Rs 4.9 lakh, Rs 1.2 crore. */
export function rsShort(n: number | null | undefined) {
  const v = n ?? 0;
  const a = Math.abs(v);
  if (a >= 10_000_000) return t('Rs {{value}} crore', { value: (v / 10_000_000).toFixed(a >= 100_000_000 ? 0 : 1) });
  if (a >= 100_000) return t('Rs {{value}} lakh', { value: (v / 100_000).toFixed(a >= 10_000_000 ? 0 : 1) });
  return rs(v);
}

export const dayLabel = (iso: string | null | undefined) => (iso ? formatDate(iso) : '—');
export const dayYearLabel = (iso: string | null | undefined) => (iso ? formatDate(iso, { year: true }) : '—');
export const dayTime = (iso: string | null | undefined) => (iso ? `${formatDate(iso)}, ${formatTime(iso)}` : '—');
export const timeLabel = (iso: string | null | undefined) => (iso ? formatTime(iso) : '—');

/** A day key ("2026-10-29") shown as "29 Oct". */
export function dayKeyLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return formatDate(new Date(Date.UTC(y, m - 1, d, 7)));
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
