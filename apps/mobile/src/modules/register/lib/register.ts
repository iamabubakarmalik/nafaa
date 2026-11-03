/** Cash register shapes from the API and the drawer count steps (same as the web cash register page). */

import { msg, t } from '@/core/i18n';

/** What came into and left the drawer during a shift. */
export interface CashBreakdown {
  openingBalance: number;
  cashSales: number;
  cashSalesCount: number;
  bookingReceived: number;
  khataReceived: number;
  otherIncome?: number;
  cashIn: number;
  cashOut: number;
  expenses: number;
  returns: number;
  bookingRefunds: number;
  purchases: number;
  supplierPaid: number;
  expected: number;
  creditGiven: number;
  billCount: number;
  byMethod: Array<{ method: string; total: number; paid: number; count: number }>;
}

export interface CurrentRegister {
  id: string;
  registerNumber: string;
  status: 'OPEN' | 'CLOSED';
  openingBalance: number;
  openedAt: string;
  live?: CashBreakdown;
}

export interface DayReport {
  sales: { total: number; bills: number; credit: number; refunds: number; refundCount: number };
  cashCollected: number;
  onlineCollected: number;
  expenses: { total: number; cash: number };
  cash: { expectedClosing: number; countedClosing: number | null; difference: number | null; allClosed: boolean };
  profit?: { netProfit: number };
}

/** PKR notes, then coins. */
export const NOTES = [5000, 1000, 500, 100, 50, 20, 10] as const;
export const COINS = [5, 2, 1] as const;

/** A difference smaller than this counts as a match (same rule as the server). */
export const TOLERANCE = 0.5;

export const sumDenoms = (d: Record<string, string | number>) =>
  Object.entries(d).reduce((s, [k, v]) => s + Number(k) * Math.max(0, Math.floor(Number(v) || 0)), 0);

/** Counts as whole numbers, zero rows dropped; undefined when nothing was counted. */
export function cleanDenoms(d: Record<string, string | number>): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(d)) {
    const c = Math.floor(Number(v) || 0);
    if (c > 0) out[k] = c;
  }
  return Object.keys(out).length ? out : undefined;
}

export const diffKind = (diff: number) => (diff < -TOLERANCE ? 'short' : diff > TOLERANCE ? 'over' : 'match') as 'short' | 'over' | 'match';

/** Quick reasons in the cash in / out sheet; saved as written (same list as the web) and translated where shown. */
export const REASONS: Record<'CASH_IN' | 'CASH_OUT', string[]> = {
  CASH_IN: [msg('Khula paisa (change) daala'), msg('Malik ne paise diye'), msg('Bank se nikal kar laye'), msg('Doosri branch se aaya')],
  CASH_OUT: [msg('Malik ne paise liye'), msg('Bank me jama karwaye'), msg('Doosri branch ko diye'), msg('Khula paisa (change) liya')],
};

/** Each step of the drawer count, in order. */
export function ledgerRows(c: CashBreakdown): Array<{ label: string; value: number; sign: '+' | '−'; keep?: boolean }> {
  return [
    { label: t('Opening cash'), value: c.openingBalance, sign: '+', keep: true },
    { label: t('Cash sale'), value: c.cashSales, sign: '+', keep: true },
    { label: t('Booking money'), value: c.bookingReceived, sign: '+' },
    { label: t('Khata received'), value: c.khataReceived, sign: '+' },
    { label: t('Other income'), value: c.otherIncome ?? 0, sign: '+' },
    { label: t('Cash put in'), value: c.cashIn, sign: '+' },
    { label: t('Cash taken out'), value: c.cashOut, sign: '−' },
    { label: t('Cash expense'), value: c.expenses, sign: '−' },
    { label: t('Paid for returns'), value: c.returns, sign: '−' },
    { label: t('Booking returns'), value: c.bookingRefunds, sign: '−' },
    { label: t('Cash purchases'), value: c.purchases, sign: '−' },
    { label: t('Paid to suppliers'), value: c.supplierPaid, sign: '−' },
  ];
}
