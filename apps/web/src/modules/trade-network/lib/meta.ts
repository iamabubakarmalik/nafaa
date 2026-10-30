/** Labels and tones for the trade network screens. */

import type { Tone } from '@modules/distribution/lib/meta';
import type { LinkStatus, MoneyMethod, PaymentStatus, ReceiveState, TradeStatus } from '../api/trade.api';

export const LINK_STATUS: Record<LinkStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Request bheji', tone: 'amber' },
  ACTIVE: { label: 'Jura hua', tone: 'green' },
  PAUSED: { label: 'Ruka hua', tone: 'orange' },
  REJECTED: { label: 'Reject', tone: 'rose' },
  UNLINKED: { label: 'Link khatam', tone: 'slate' },
  CANCELLED: { label: 'Wapas li', tone: 'slate' },
};

export const ORDER_STATUS: Record<TradeStatus, { label: string; tone: Tone }> = {
  BOOKED: { label: 'Bheja gaya', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'blue' },
  INVOICED: { label: 'Invoice bani', tone: 'violet' },
  LOADED: { label: 'Raste me', tone: 'orange' },
  DELIVERED: { label: 'Delivered', tone: 'green' },
  PARTIAL: { label: 'Kuch wapas', tone: 'teal' },
  RETURNED: { label: 'Sab wapas', tone: 'rose' },
  CANCELLED: { label: 'Cancel', tone: 'slate' },
};

export const RECEIVE_STATE: Record<ReceiveState, { label: string; tone: Tone }> = {
  NONE: { label: '—', tone: 'slate' },
  PREPARING: { label: 'Tayyar ho raha', tone: 'blue' },
  NEEDS_MAP: { label: 'Item milayein', tone: 'amber' },
  DRAFT: { label: 'Receive baqi', tone: 'amber' },
  RECEIVING: { label: 'Receive ho raha', tone: 'blue' },
  RECEIVED: { label: 'Stock me aa gaya', tone: 'green' },
  NOTHING: { label: 'Kuch nahi aaya', tone: 'slate' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Confirm baqi', tone: 'amber' },
  CONFIRMED: { label: 'Dono taraf', tone: 'green' },
  DISPUTED: { label: 'Ikhtilaf', tone: 'rose' },
  CANCELLED: { label: 'Wapas li', tone: 'slate' },
};

export const METHOD_LABEL: Record<MoneyMethod, string> = { CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa' };
export const METHODS = Object.keys(METHOD_LABEL) as MoneyMethod[];

/** The order journey shown as steps on the buyer's side. */
export const STEPS: { key: TradeStatus; label: string }[] = [
  { key: 'BOOKED', label: 'Bheja' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'INVOICED', label: 'Invoice' },
  { key: 'LOADED', label: 'Raste me' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function stepIndex(s: TradeStatus) {
  if (s === 'PARTIAL' || s === 'RETURNED') return 4;
  return Math.max(0, STEPS.findIndex((x) => x.key === s));
}

/** "2 Carton + 5 pcs" from base units and a pack size. */
export function packText(baseQty: number, baseUnit: string, packName?: string | null, packSize?: number | null) {
  const size = Number(packSize) || 0;
  if (!packName || size <= 1) return `${round(baseQty)} ${baseUnit}`;
  const packs = Math.floor(baseQty / size + 1e-9);
  const loose = round(baseQty - packs * size);
  if (!packs) return `${loose} ${baseUnit}`;
  return loose > 0 ? `${packs} ${packName} + ${loose} ${baseUnit}` : `${packs} ${packName}`;
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Two letters for a business avatar. */
export const initials = (name?: string | null) => (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
