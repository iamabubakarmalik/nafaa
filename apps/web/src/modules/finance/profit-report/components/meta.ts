/** Small shared helpers for the profit report: quantities, changes and labels. */

import type { FilterOption } from '@/design-system/components';
import type { BillCharges, Figures, ProfitSort, ProfitView } from '../api';

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

export const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export const SORTS: Array<FilterOption<ProfitSort>> = [
  { value: 'profit', label: 'Zyada profit pehle' },
  { value: 'revenue', label: 'Zyada sale pehle' },
  { value: 'margin', label: 'Zyada margin pehle' },
  { value: 'qty', label: 'Zyada biki (quantity)' },
  { value: 'loss', label: 'Sab se kam profit pehle' },
  { value: 'discount', label: 'Zyada discount pehle' },
  { value: 'returns', label: 'Zyada return pehle' },
  { value: 'name', label: 'Naam (A–Z)' },
];

/** Sorts that need cost; hidden while cost is locked. */
export const COST_SORTS: ProfitSort[] = ['profit', 'margin', 'loss'];

export const VIEWS: Array<FilterOption<ProfitView> & { cost?: boolean }> = [
  { value: 'all', label: 'Sab cheezein' },
  { value: 'loss', label: 'Nuqsan wali', hint: 'Cost se sasti biki', color: '#e11d48', cost: true },
  { value: 'discount', label: 'Discount wali', hint: 'Jin par discount di', color: '#db2777' },
  { value: 'returns', label: 'Return wali', hint: 'Jo wapas aayin', color: '#ea580c' },
  { value: 'fallback', label: 'Aaj ki cost se', hint: 'Bill par cost save nahi thi', color: '#d97706', cost: true },
  { value: 'nocost', label: 'Bina cost', hint: 'Cost bhari hi nahi — profit poora dikh raha hai', color: '#64748b', cost: true },
];

export const UNIT_KIND_LABEL: Record<string, string> = {
  IMEI: 'Naya phone', USED: 'Used phone', SERIAL: 'Serial wala', REPAIR: 'Repair', OTHER: 'Baqi maal',
};
