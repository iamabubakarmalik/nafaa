/** Shared labels, reasons and helpers for the returns page and the return form. */

import type { QueryClient } from '@tanstack/react-query';
import { PAYMENT_COLORS, PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';

export const RETURNS_KEY = 'returns';

/** Quick reasons on the return form; the filter offers the same list. */
export const REASONS = [
  'Cheez kharab nikli', 'Ghalat cheez de di', 'Pasand nahi aayi',
  'Naap/size theek nahi', 'Tareekh guzar chuki thi', 'Zyada de di thi',
];

export const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

export const methodLabel = (m: string) => PAYMENT_LABELS[m] ?? m;
export const methodColor = (m: string) => PAYMENT_COLORS[m] ?? '#64748b';

export const qtyText = (n: number) => String(Number(n.toFixed(3)));

export const when = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));

/** Everything a return changes: bills, stock, khata, drawer and reports. */
export function refreshAfterReturn(qc: QueryClient) {
  [RETURNS_KEY, 'sales-list', 'sales-history', 'sales-summary', 'sale-receipt', 'products', 'product-catalog', 'products-for-pos',
    'customers', 'customer-directory', 'customers-for-pos', 'dashboard-overview', 'cash-register', 'money', 'carpet-rolls', 'carpet-cut-pieces', 'carpet-product-summary']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
