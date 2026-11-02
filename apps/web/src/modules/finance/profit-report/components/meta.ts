/** Small shared helpers for the profit report: quantities, changes and labels. */

import type { FilterOption } from '@/design-system/components';
import type { BillCharges, Figures, ProfitSort, ProfitView } from '../api';
import { t as tr } from '@core/i18n';

export const qty = (n: number) => Number((n || 0).toFixed(2)).toLocaleString('en-PK');
export const pct = (n: number | undefined) => `${(n ?? 0).toFixed(1)}%`;

/** Percent change against the previous period; null when there was nothing before. */
export function change(now: number | undefined, before: number | undefined): number | null {
  const a = now ?? 0;
  const b = before ?? 0;
  if (!b) return a ? null : 0;
  return ((a - b) / Math.abs(b)) * 100;
}

/**
 * Splits bill totals into what the product lines earned and the bill's own
 * service charges and cost, so line figures plus charges equal the totals.
 */
export function chargeSplit(t: Figures & { charges?: BillCharges }) {
  const c = t.charges;
  const revenue = c?.revenue ?? 0;
  const cost = c?.cost ?? 0;
  return {
    shown: !!c && (revenue !== 0 || cost !== 0),
    revenue,
    cost,
    profit: c?.profit ?? 0,
    bills: c?.bills ?? 0,
    lineRevenue: Math.round((t.revenue - revenue) * 100) / 100,
    lineCost: Math.round(((t.cost ?? 0) - cost) * 100) / 100,
    lineProfit: Math.round(((t.profit ?? 0) - (c?.profit ?? 0)) * 100) / 100,
  };
}

export const changeText = (c: number | null) => (c === null ? 'naya' : `${c >= 0 ? '+' : ''}${c.toFixed(0)}%`);

export const dayLabel = (key: string) => {
  if (key.length === 7) return new Intl.DateTimeFormat('en-PK', { month: 'short', year: '2-digit' }).format(new Date(`${key}-15T12:00:00`));
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00`));
};

export const WEEKDAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];

export const SORTS: Array<FilterOption<ProfitSort>> = [
  { value: 'profit', label: tr('Zyada profit pehle') },
  { value: 'revenue', label: tr('Zyada sale pehle') },
  { value: 'margin', label: tr('Zyada margin pehle') },
  { value: 'qty', label: tr('Zyada biki (quantity)') },
  { value: 'loss', label: tr('Sab se kam profit pehle') },
  { value: 'discount', label: tr('Zyada discount pehle') },
  { value: 'returns', label: tr('Zyada return pehle') },
  { value: 'name', label: tr('Naam (A–Z)') },
];

/** Sorts that need cost; hidden while cost is locked. */
export const COST_SORTS: ProfitSort[] = ['profit', 'margin', 'loss'];

export const VIEWS: Array<FilterOption<ProfitView> & { cost?: boolean }> = [
  { value: 'all', label: tr('Sab cheezein') },
  { value: 'loss', label: tr('Nuqsan wali'), hint: tr('Cost se sasti biki'), color: '#e11d48', cost: true },
  { value: 'discount', label: tr('Discount wali'), hint: tr('Jin par discount di'), color: '#db2777' },
  { value: 'returns', label: tr('Return wali'), hint: tr('Jo wapas aayin'), color: '#ea580c' },
  { value: 'fallback', label: tr('Aaj ki cost se'), hint: tr('Bill par cost save nahi thi'), color: '#d97706', cost: true },
  { value: 'nocost', label: tr('Bina cost'), hint: tr('Cost bhari hi nahi — profit poora dikh raha hai'), color: '#64748b', cost: true },
];

export const UNIT_KIND_LABEL: Record<string, string> = {
  IMEI: tr('Naya phone'), USED: tr('Used phone'), SERIAL: tr('Serial wala'), REPAIR: tr('Repair'), OTHER: tr('Baqi maal'),
};
