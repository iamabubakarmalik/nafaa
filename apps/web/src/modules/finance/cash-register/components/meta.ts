/**
 * Notes, statuses, reasons and small helpers shared by the cash register
 * page, its dialogs, analytics and the print-outs.
 */

import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, CircleDot, Lock, PlayCircle, RotateCcw, StopCircle, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { CashBreakdown, CashRegister, CashTxType, Denominations, ShiftStatus } from '../api/cash-register.api';
import { t } from '@core/i18n';

export const CASH_KEY = 'cash-register';

/** PKR notes, then coins. Rs 10 comes as both; it is counted once. */
export const NOTES = [5000, 1000, 500, 100, 50, 20, 10] as const;
export const COINS = [5, 2, 1] as const;

/** A difference smaller than this counts as a match (same rule as the server). */
const TOLERANCE = 0.5;

export const sumDenoms = (d: Record<string, string | number>) =>
  Object.entries(d).reduce((s, [k, v]) => s + Number(k) * (Math.max(0, Math.floor(Number(v) || 0))), 0);

/** Counts as whole numbers, zero rows dropped; undefined when nothing was counted. */
export function cleanDenoms(d: Record<string, string>): Denominations | undefined {
  const out: Denominations = {};
  for (const [k, v] of Object.entries(d)) {
    const c = Math.floor(Number(v) || 0);
    if (c > 0) out[k] = c;
  }
  return Object.keys(out).length ? out : undefined;
}

type DiffKind = 'match' | 'short' | 'over';
export const diffKind = (diff: number): DiffKind => (diff < -TOLERANCE ? 'short' : diff > TOLERANCE ? 'over' : 'match');

export const DIFF: Record<DiffKind, { label: string; icon: LucideIcon; tone: string; color: string }> = {
  match: { label: t('Barabar'), icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a' },
  short: { label: t('Kam (short)'), icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48' },
  over: { label: t('Zyada (over)'), icon: TrendingUp, tone: 'bg-sky-50 text-sky-700 ring-sky-200', color: '#0284c7' },
};

export const STATUS_FILTERS: Array<{ value: ShiftStatus; label: string; hint: string; icon: LucideIcon; color: string }> = [
  { value: 'OPEN', label: t('Khuli'), hint: t('Abhi chal rahi hain'), icon: CircleDot, color: '#16a34a' },
  { value: 'CLOSED', label: t('Band'), hint: t('Ginti ho chuki'), icon: Lock, color: '#475569' },
  { value: 'SHORT', label: t('Paise kam nikle'), hint: t('Short'), icon: AlertTriangle, color: '#e11d48' },
  { value: 'OVER', label: t('Paise zyada nikle'), hint: t('Over'), icon: TrendingUp, color: '#0284c7' },
  { value: 'MATCHED', label: t('Barabar'), hint: t('Koi farak nahi'), icon: CheckCircle2, color: '#16a34a' },
];

export const TX: Record<CashTxType, { label: string; icon: LucideIcon; sign: 1 | -1 | 0; color: string }> = {
  OPENING: { label: t('Shift khuli'), icon: PlayCircle, sign: 0, color: '#475569' },
  SALE: { label: t('Sale'), icon: ArrowDownToLine, sign: 1, color: '#16a34a' },
  CASH_IN: { label: t('Cash daala'), icon: ArrowDownToLine, sign: 1, color: '#16a34a' },
  CASH_OUT: { label: t('Cash nikala'), icon: ArrowUpFromLine, sign: -1, color: '#e11d48' },
  EXPENSE: { label: t('Kharch'), icon: ArrowUpFromLine, sign: -1, color: '#d97706' },
  REFUND: { label: t('Return'), icon: RotateCcw, sign: -1, color: '#ea580c' },
  CLOSING: { label: t('Shift band'), icon: StopCircle, sign: 0, color: '#475569' },
};

/** Quick reasons in the cash in / out dialog. */
export const REASONS: Record<'CASH_IN' | 'CASH_OUT', string[]> = {
  CASH_IN: [t('Khula paisa (change) daala'), t('Malik ne paise diye'), t('Bank se nikal kar laye'), t('Doosri branch se aaya')],
  CASH_OUT: [t('Malik ne paise liye'), t('Bank me jama karwaye'), t('Doosri branch ko diye'), t('Khula paisa (change) liya')],
};

/** Each step of the drawer count, in order; zero rows are hidden except the first and last. */
export function ledgerRows(c: CashBreakdown): Array<{ label: string; value: number; sign: '+' | '−' | '='; note?: string; keep?: boolean }> {
  return [
    { label: t('Shift kholte waqt'), value: c.openingBalance, sign: '+', keep: true },
    { label: t('Cash sale'), value: c.cashSales, sign: '+', note: t('{{cashSalesCount}} bill', { cashSalesCount: c.cashSalesCount }), keep: true },
    { label: t('Booking ki amount'), value: c.bookingReceived, sign: '+', note: t('{{bookingReceivedCount}} payment', { bookingReceivedCount: c.bookingReceivedCount }) },
    { label: t('Khata receiving'), value: c.khataReceived, sign: '+', note: t('{{khataCount}} receiving', { khataCount: c.khataCount }) },
    { label: t('Doosri aamdani'), value: c.otherIncome ?? 0, sign: '+', note: t('{{value}} dafa', { value: c.otherIncomeCount ?? 0 }) },
    { label: t('Haath se daala'), value: c.cashIn, sign: '+', note: t('{{cashInCount}} dafa', { cashInCount: c.cashInCount }) },
    { label: t('Haath se nikala'), value: c.cashOut, sign: '−', note: t('{{cashOutCount}} dafa', { cashOutCount: c.cashOutCount }) },
    { label: t('Cash kharch'), value: c.expenses, sign: '−', note: t('{{expenseCount}} kharch', { expenseCount: c.expenseCount }) },
    { label: t('Return me diya'), value: c.returns, sign: '−', note: t('{{returnCount}} return', { returnCount: c.returnCount }) },
    { label: t('Booking return'), value: c.bookingRefunds, sign: '−', note: t('{{bookingRefundCount}} booking', { bookingRefundCount: c.bookingRefundCount }) },
    { label: t('Maal khareeda (cash)'), value: c.purchases, sign: '−', note: t('{{purchaseCount}} purchase', { purchaseCount: c.purchaseCount }) },
    { label: t('Supplier ko diya'), value: c.supplierPaid, sign: '−', note: t('{{supplierPaidCount}} payment', { supplierPaidCount: c.supplierPaidCount }) },
  ];
}

/** Total that left the drawer besides manual cash out. */
export const paidOut = (c: CashBreakdown) => c.expenses + c.returns + c.bookingRefunds + c.purchases + c.supplierPaid;

export const when = (v: string | Date) =>
  new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const clock = (v: string | Date) => new Date(v).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

export function duration(from: string | Date, to?: string | Date | null) {
  const mins = Math.max(0, Math.round(((to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h ? t('{{h}} ghante {{value}} min', { h, value: mins % 60 }) : t('{{mins}} min', { mins });
}

export const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatPKR(Math.abs(v))}`;

/** Short label for a register: branch name, else its number. */
export const tillName = (r: Pick<CashRegister, 'shop' | 'registerNumber'>) => r.shop?.name ?? r.registerNumber;

/** Fresh key for one cash entry, so a double click or retry posts once. */
export const requestKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
