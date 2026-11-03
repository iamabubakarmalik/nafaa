/**
 * Khata (customer credit) math shared by the web and mobile apps: balance
 * state, how long the oldest unpaid credit has been owed, ageing buckets,
 * the credit-limit check, payment bounds and the figures of a statement.
 *
 * A positive balance means the customer owes the shop; negative is an advance.
 */

/** Smaller than any real amount; balances inside it count as clear. */
export const KHATA_EPS = 0.009;
const DAY = 86_400_000;

export type BalanceState = 'owes' | 'advance' | 'clear';

export const balanceState = (balance: number | null | undefined): BalanceState => {
  const b = Number(balance) || 0;
  return b > KHATA_EPS ? 'owes' : b < -KHATA_EPS ? 'advance' : 'clear';
};

export interface LedgerLine {
  amount: number;
  createdAt: string;
  type?: string;
}

/**
 * Date of the oldest credit that is still unpaid. Payments settle the oldest
 * credit first; credit given while an advance exists is absorbed by it.
 */
export function oldestUnpaid(entries: ReadonlyArray<Pick<LedgerLine, 'amount' | 'createdAt'>>): string | null {
  const debts: Array<{ left: number; at: string }> = [];
  let credit = 0;
  for (const e of [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (e.amount > 0) {
      let left = e.amount;
      const use = Math.min(left, credit);
      left -= use;
      credit -= use;
      if (left > KHATA_EPS) debts.push({ left, at: e.createdAt });
    } else {
      let pay = -e.amount;
      while (pay > KHATA_EPS && debts.length) {
        const use = Math.min(pay, debts[0].left);
        debts[0].left -= use;
        pay -= use;
        if (debts[0].left <= KHATA_EPS) debts.shift();
      }
      credit += pay;
    }
  }
  return debts[0]?.at ?? null;
}

/** Whole days since a date; null when there is none. */
export const daysSince = (iso: string | null | undefined, now: number = Date.now()): number | null =>
  iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY)) : null;

export type AgingBucket = 'd0' | 'd7' | 'd30' | 'd90';

/** Buckets of the khata book: under 7 days, 7 to 30, 30 to 90, 90 and more. */
export const AGING_BUCKETS: ReadonlyArray<{ id: AgingBucket; from: number; to: number }> = [
  { id: 'd0', from: 0, to: 7 },
  { id: 'd7', from: 7, to: 30 },
  { id: 'd30', from: 30, to: 90 },
  { id: 'd90', from: 90, to: Infinity },
];

export const agingBucket = (days: number | null | undefined): AgingBucket | null => {
  if (days == null || days < 0) return null;
  return AGING_BUCKETS.find((b) => days >= b.from && days < b.to)?.id ?? 'd90';
};

export interface KhataCustomer {
  balance?: number | null;
  creditLimit?: number | null;
  isVip?: boolean;
  isActive?: boolean;
  oldestDueAt?: string | null;
}

/** Over the limit; a limit of 0 means no limit. */
export const isOverLimit = (c: KhataCustomer): boolean => (Number(c.creditLimit) || 0) > 0 && (Number(c.balance) || 0) > Number(c.creditLimit);

/** Share of the credit limit used (0 to 100), or null when the customer has no limit. */
export function limitUsedPercent(c: KhataCustomer): number | null {
  const limit = Number(c.creditLimit) || 0;
  if (limit <= 0) return null;
  return Math.min(100, (Math.max(0, Number(c.balance) || 0) / limit) * 100);
}

export type DirectoryType = 'all' | 'vip' | 'khata' | 'advance' | 'overLimit' | 'clear';

/** The customer list tabs, as the server counts them. */
export const directoryTest: Record<DirectoryType, (c: KhataCustomer) => boolean> = {
  all: () => true,
  vip: (c) => !!c.isVip,
  khata: (c) => balanceState(c.balance) === 'owes',
  advance: (c) => balanceState(c.balance) === 'advance',
  overLimit: isOverLimit,
  clear: (c) => balanceState(c.balance) === 'clear',
};

export type KhataAction = 'payment' | 'udhaar' | 'opening';

/** What a khata action leaves as the balance. */
export const balanceAfter = (balance: number, amount: number, action: KhataAction): number =>
  round2(action === 'payment' ? balance - amount : balance + amount);

/** A payment cannot be more than what is owed. */
export const paymentTooMuch = (balance: number, amount: number): boolean => amount > Math.max(0, balance) + KHATA_EPS;

/** Quick amount buttons: the full balance, half, then round figures that fit. */
export function quickAmounts(balance: number, action: KhataAction): number[] {
  if (action !== 'payment' || balance <= KHATA_EPS) return [500, 1000, 2000, 5000, 10000];
  const full = round2(balance);
  return [...new Set([full, Math.round(balance / 2), 500, 1000, 5000].filter((v) => v > 0 && v <= balance + KHATA_EPS))];
}

export interface StatementTotals {
  taken: number;
  paid: number;
  reduced: number;
  balance: number;
}

/**
 * Totals for a statement from ledger entries: credit given, payments received,
 * and what returns or voids took off. Opening balances count as credit.
 */
export function statementTotals(entries: ReadonlyArray<LedgerLine>, balance: number): StatementTotals {
  let taken = 0;
  let paid = 0;
  let reduced = 0;
  for (const e of entries) {
    if (e.type === 'PAYMENT_RECEIVED') paid += Math.abs(e.amount);
    else if (e.type === 'REFUND' || e.type === 'LOYALTY_REDEEMED') reduced += Math.abs(e.amount);
    else if (e.amount > 0) taken += e.amount;
    else paid += Math.abs(e.amount);
  }
  return { taken: round2(taken), paid: round2(paid), reduced: round2(reduced), balance: round2(balance) };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
