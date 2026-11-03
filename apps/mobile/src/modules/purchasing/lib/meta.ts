/**
 * Labels and small helpers shared by the purchasing screens: purchase
 * status, payment methods, landed cost kinds, date ranges (Pakistan time)
 * and supplier phone links. Labels are raw source text; translate at render.
 */

import { Linking } from 'react-native';
import type { LandedKind, LandedMethod } from '@nafaa/core/inventory';
import { formatDate, pkParts } from '@/core/format';
import { msg, t } from '@/core/i18n';
import type { PaymentMethod } from '@/core/offline';
import type { StatusTone } from '@/design';
import type { PurchaseStatus, PurchaseStatusFilter } from '../api/purchases';

export const STATUS: Record<PurchaseStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: msg('Order — maal nahi aaya'), tone: 'info' },
  PARTIAL: { label: msg('Aadha aaya'), tone: 'warning' },
  RECEIVED: { label: msg('Aa gaya'), tone: 'success' },
  CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};

export const STATUS_FILTERS: Array<{ value: PurchaseStatusFilter; label: string }> = [
  { value: 'all', label: msg('Sab') }, { value: 'PENDING', label: msg('Khule orders') }, { value: 'PARTIAL', label: msg('Aadha aaya') },
  { value: 'RECEIVED', label: msg('Aa gaya') }, { value: 'credit', label: msg('Udhaar par liya') }, { value: 'returned', label: msg('Return hui') },
  { value: 'CANCELLED', label: msg('Cancel') },
];

export const PAY_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: msg('Cash') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('Easypaisa') },
  { value: 'CARD', label: msg('Card') }, { value: 'BANK_TRANSFER', label: msg('Bank') },
];

export const payLabel = (m?: string | null) => t(PAY_METHODS.find((x) => x.value === m)?.label ?? m ?? '');

export const LANDED_KINDS: Array<{ value: LandedKind; label: string }> = [
  { value: 'FREIGHT', label: msg('Freight (shipping / cargo)') },
  { value: 'CUSTOMS', label: msg('Customs / duty') },
  { value: 'CLEARING', label: msg('Clearing agent') },
  { value: 'TRANSPORT', label: msg('Local transport') },
  { value: 'OTHER', label: msg('Doosra') },
];
export const kindLabel = (k: LandedKind) => t(LANDED_KINDS.find((x) => x.value === k)?.label ?? k);

export const LANDED_METHODS: Array<{ value: LandedMethod; label: string }> = [
  { value: 'VALUE', label: msg('Value se') }, { value: 'QTY', label: msg('Quantity se') }, { value: 'WEIGHT', label: msg('Wazan se') },
];

/** "2 Nov 2026", or "—". */
export const day = (v?: string | null) => (v ? formatDate(v) : '—');

const ymd = (y: number, m: number, d: number) => {
  const x = new Date(Date.UTC(y, m, d));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
};

/** Today in Pakistan as YYYY-MM-DD. */
export const todayPk = () => { const p = pkParts(Date.now()); return ymd(p.year, p.month, p.day); };

export type RangePreset = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'all';

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: msg('Aaj') }, { value: 'week', label: msg('7 din') }, { value: 'month', label: msg('Is mahine') },
  { value: 'lastMonth', label: msg('Pichla mahina') }, { value: 'year', label: msg('Is saal') }, { value: 'all', label: msg('Sab') },
];

/** Date range (YYYY-MM-DD, Pakistan calendar) for a preset; null = all dates. */
export function rangeOf(preset: RangePreset): { from: string; to: string } | null {
  const p = pkParts(Date.now());
  const today = ymd(p.year, p.month, p.day);
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'week': return { from: ymd(p.year, p.month, p.day - 6), to: today };
    case 'month': return { from: ymd(p.year, p.month, 1), to: today };
    case 'lastMonth': return { from: ymd(p.year, p.month - 1, 1), to: ymd(p.year, p.month, 0) };
    case 'year': return { from: ymd(p.year, 0, 1), to: today };
    default: return null;
  }
}

export const daysAgo = (v?: string | null) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000) : null);

/** 0300… → 92300… for wa.me */
export const waPhone = (phone?: string | null) => (phone ?? '').replace(/\D/g, '').replace(/^0/, '92');

export const callPhone = (phone?: string | null) => { if (phone) void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`); };

export const openWhatsApp = (phone: string | null | undefined, text = '') => {
  const n = waPhone(phone);
  void Linking.openURL(`https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
};
