/** Labels and tones for bills in the history and detail screens. */

import { BookOpen, Ban, CheckCircle2, ListChecks, RotateCcw } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { BillTier, HistorySale, HistorySort, HistoryStatus, SaleStatus } from '../api/history';

export const STATUS_FILTERS: Array<{ value: HistoryStatus; label: string; icon: typeof ListChecks }> = [
  { value: 'all', label: msg('Sab'), icon: ListChecks },
  { value: 'active', label: msg('Chalu bill'), icon: CheckCircle2 },
  { value: 'credit', label: msg('Udhaar wale'), icon: BookOpen },
  { value: 'returned', label: msg('Return wale'), icon: RotateCcw },
  { value: 'voided', label: msg('Void'), icon: Ban },
];

export const SORTS: Array<{ value: HistorySort; label: string }> = [
  { value: 'new', label: msg('Naye pehle') },
  { value: 'old', label: msg('Purane pehle') },
  { value: 'high', label: msg('Bari amount pehle') },
  { value: 'low', label: msg('Chhoti amount pehle') },
];

export const TIER_FILTERS: Array<{ value: BillTier | 'all'; label: string }> = [
  { value: 'all', label: msg('Sab') },
  { value: 'RETAIL', label: msg('Retail') },
  { value: 'WHOLESALE', label: msg('Wholesale') },
  { value: 'CREDIT', label: msg('Credit') },
  { value: 'MIXED', label: msg('Mixed') },
];

export const tierLabel = (tier: BillTier) => t(TIER_FILTERS.find((x) => x.value === tier)?.label ?? tier);

export const SALE_STATUS: Record<SaleStatus, { label: string; tone: StatusTone }> = {
  COMPLETED: { label: msg('Done'), tone: 'success' },
  PARTIALLY_RETURNED: { label: msg('Part return'), tone: 'warning' },
  FULLY_RETURNED: { label: msg('Returned'), tone: 'warning' },
  VOIDED: { label: msg('Void'), tone: 'danger' },
};

export const SOURCE_LABEL: Record<string, string> = {
  POS: msg('Counter'), WEBSITE: msg('Website'), DARAZ: msg('Daraz'), FOODPANDA: msg('Foodpanda'), SHOPIFY: msg('Shopify'), MARKETPLACE: msg('Marketplace'),
};

/** Items line for a row: "2 × Sugar, 1 × Tea +3". */
export function itemsLine(s: HistorySale, max = 2): string {
  const head = s.items.slice(0, max).map((i) => `${Number(i.quantity.toFixed(3))} × ${i.name}`).join(', ');
  return s.items.length > max ? `${head} +${s.items.length - max}` : head;
}
