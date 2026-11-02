/** Labels and tones for the trade network screens. */

import type { Tone } from '@modules/distribution/lib/meta';
import type { LinkStatus, MoneyMethod, PaymentStatus, ReceiveState, TradeStatus } from '../api/trade.api';
import { t } from '@core/i18n';

export const LINK_STATUS: Record<LinkStatus, { label: string; tone: Tone }> = {
  PENDING: { label: t('Request bheji'), tone: 'amber' },
  ACTIVE: { label: t('Jura hua'), tone: 'green' },
  PAUSED: { label: t('Ruka hua'), tone: 'orange' },
  REJECTED: { label: t('Reject'), tone: 'rose' },
  UNLINKED: { label: t('Link khatam'), tone: 'slate' },
  CANCELLED: { label: t('Wapas li'), tone: 'slate' },
};

export const ORDER_STATUS: Record<TradeStatus, { label: string; tone: Tone }> = {
  BOOKED: { label: t('Bheja gaya'), tone: 'amber' },
  APPROVED: { label: t('Approved'), tone: 'blue' },
  INVOICED: { label: t('Invoice bani'), tone: 'violet' },
  LOADED: { label: t('Raste me'), tone: 'orange' },
  DELIVERED: { label: t('Delivered'), tone: 'green' },
  PARTIAL: { label: t('Kuch wapas'), tone: 'teal' },
  RETURNED: { label: t('Sab wapas'), tone: 'rose' },
  CANCELLED: { label: t('Cancel'), tone: 'slate' },
};

export const RECEIVE_STATE: Record<ReceiveState, { label: string; tone: Tone }> = {
  NONE: { label: '—', tone: 'slate' },
  PREPARING: { label: t('Tayyar ho raha'), tone: 'blue' },
  NEEDS_MAP: { label: t('Item milayein'), tone: 'amber' },
  DRAFT: { label: t('Receive baqi'), tone: 'amber' },
  RECEIVING: { label: t('Receive ho raha'), tone: 'blue' },
  RECEIVED: { label: t('Stock me aa gaya'), tone: 'green' },
  NOTHING: { label: t('Kuch nahi aaya'), tone: 'slate' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: t('Confirm baqi'), tone: 'amber' },
  CONFIRMED: { label: t('Dono taraf'), tone: 'green' },
  DISPUTED: { label: t('Ikhtilaf'), tone: 'rose' },
  CANCELLED: { label: t('Wapas li'), tone: 'slate' },
};

export const METHOD_LABEL: Record<MoneyMethod, string> = { CASH: t('Cash'), CARD: t('Card'), BANK_TRANSFER: t('Bank'), JAZZCASH: t('JazzCash'), EASYPAISA: t('Easypaisa') };
export const METHODS = Object.keys(METHOD_LABEL) as MoneyMethod[];

/** The order journey shown as steps on the buyer's side. */
export const STEPS: { key: TradeStatus; label: string }[] = [
  { key: 'BOOKED', label: t('Bheja') },
  { key: 'APPROVED', label: t('Approved') },
  { key: 'INVOICED', label: t('Invoice') },
  { key: 'LOADED', label: t('Raste me') },
  { key: 'DELIVERED', label: t('Delivered') },
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
