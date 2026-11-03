/**
 * Taking the money: full payment with change, part payment with the rest on
 * khata, full khata, and split payments (cash + card …). Change can only
 * come from cash.
 */

import type { PaymentMethod, PosCheckoutMode, SalePaymentPart, TenderMethod } from './types';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'JAZZCASH', 'EASYPAISA', 'CARD', 'BANK_TRANSFER'];

/** Pakistani notes for the quick cash buttons. */
export const CASH_NOTES = [100, 500, 1000, 5000] as const;

/** One payment method: what was handed, the change and what goes on khata. */
export function tenderSummary(mode: PosCheckoutMode, total: number, tendered: number) {
  const entered = Math.max(Number(tendered) || 0, 0);
  const paid = mode === 'credit' ? 0 : mode === 'full' ? Math.max(entered, total) : entered;
  const change = r2(Math.max(paid - total, 0));
  const credit = r2(Math.max(total - paid, 0));
  return { paid: r2(paid), change, credit };
}

export interface SplitRow {
  method: TenderMethod;
  /** As typed, so an empty box stays empty. */
  amount: string;
  reference?: string;
  note?: string;
}

const amountOf = (r: SplitRow) => Number(r.amount) || 0;

export type SplitProblem = 'change_not_cash' | 'trade_in_missing';

/** Split rows against the bill, and what stops them from going through. */
export function splitSummary(rows: SplitRow[], total: number) {
  const paid = r2(rows.reduce((s, r) => s + amountOf(r), 0));
  const cash = r2(rows.filter((r) => r.method === 'CASH').reduce((s, r) => s + amountOf(r), 0));
  const change = r2(Math.max(paid - total, 0));
  const remaining = r2(Math.max(total - paid, 0));
  const problem: SplitProblem | null = change > cash + 0.005
    ? 'change_not_cash'
    : rows.some((r) => r.method === 'TRADE_IN' && amountOf(r) > 0 && !r.reference)
      ? 'trade_in_missing'
      : null;
  return { paid, cash, change, remaining, problem };
}

/** Rows with an amount, as the sale API takes them. */
export function splitParts(rows: SplitRow[]): SalePaymentPart[] {
  return rows.filter((r) => amountOf(r) > 0).map((r) => ({
    method: r.method, amount: amountOf(r),
    ...(r.reference && { reference: r.reference }),
    ...(r.note && { note: r.note }),
  }));
}

/** The largest money part stands for the bill's main method. */
export function mainMethod(parts: SalePaymentPart[]): PaymentMethod {
  return (parts.filter((p) => p.method !== 'TRADE_IN').sort((a, b) => b.amount - a.amount)[0]?.method as PaymentMethod | undefined) ?? 'CASH';
}

/** The next method a new split row starts with: one not used yet. */
export function nextSplitMethod(rows: SplitRow[]): PaymentMethod {
  return PAYMENT_METHODS.find((m) => !rows.some((r) => r.method === m)) ?? 'CASH';
}

/**
 * Split parts brought to exactly `total`, for flows that settle a fixed
 * bill: change comes off the cash, and a small difference goes on the
 * largest part.
 */
export function partsForTotal(parts: SalePaymentPart[], total: number): SalePaymentPart[] {
  const out = parts.map((p) => ({ ...p }));
  let over = r2(out.reduce((s, p) => s + p.amount, 0) - total);
  for (const p of out) {
    if (over <= 0) break;
    if (p.method !== 'CASH') continue;
    const cut = Math.min(p.amount, over);
    p.amount = r2(p.amount - cut);
    over = r2(over - cut);
  }
  if (over !== 0) {
    const big = out.reduce((a, b) => (b.amount > a.amount ? b : a), out[0]);
    if (big) big.amount = r2(big.amount - over);
  }
  return out.filter((p) => p.amount > 0);
}

export interface CheckoutResult {
  paymentMethod: PaymentMethod;
  /** Amount recorded on the sale; above the total means change was given. */
  paidAmount: number;
  isCredit: boolean;
  /** Keep the extra (paid − total) in the customer's khata instead of giving change. */
  depositExtra: boolean;
  payments?: SalePaymentPart[];
}

/** Payment fields of the sale. An advance kept in khata is not change: the sale records the bill total. */
export function salePayment(d: CheckoutResult, total: number) {
  return {
    paymentMethod: d.paymentMethod,
    paidAmount: d.depositExtra ? Math.min(d.paidAmount, total) : d.paidAmount,
    ...(d.payments && { payments: d.payments }),
  };
}

/** Rupees to keep as an advance in khata (0 when not asked or nothing extra). */
export const advanceOf = (d: CheckoutResult, total: number, hasCustomer: boolean) =>
  d.depositExtra && hasCustomer && d.paidAmount > total ? r2(d.paidAmount - total) : 0;

/** Typing on the amount keypad: digits, "00" and backspace, at most nine characters. */
export function keypad(value: string, key: string): string {
  if (key === '⌫' || key === 'back') return value.slice(0, -1);
  if (key === '.' && value.includes('.')) return value;
  return (value === '0' && key !== '.' ? key : value + key).slice(0, 9);
}
