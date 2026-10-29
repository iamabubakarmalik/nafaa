/**
 * Credit checks and ageing for distribution customers.
 *
 * A customer is over the limit when their khata balance plus the new order
 * passes `creditLimit` (0 means no limit), and overdue when the oldest unpaid
 * credit is older than `creditDays` (0 or empty means no limit). Payments
 * settle the oldest credit first (FIFO), the same rule the customer
 * directory uses for its ageing.
 *
 * Pure functions; the booker app runs a copy to warn while offline.
 */

const EPS = 0.005;
const DAY = 86_400_000;
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Rupees as the rest of the app shows them ('en-PK' grouping): Rs 239,841.52,
 * Rs 150,000. Written out by hand so the server and the phone print the same
 * text whatever Intl support the runtime has.
 */
export function formatRs(v: number): string {
  const n = r2(v);
  const sign = n < 0 ? '-' : '';
  const [whole, frac] = Math.abs(n).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `Rs ${sign}${grouped}${frac === '00' ? '' : `.${frac}`}`;
}

export interface LedgerEntry {
  /** Positive adds to what the customer owes, negative pays it off. */
  amount: number;
  createdAt: Date;
}

export interface OpenDebt {
  left: number;
  at: Date;
}

/** Credit still unpaid, oldest first, after payments settle the oldest debts. */
export function openDebts(entries: LedgerEntry[]): OpenDebt[] {
  const debts: OpenDebt[] = [];
  let advance = 0;
  for (const e of [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const amount = Number(e.amount) || 0;
    if (amount > 0) {
      let left = amount;
      const use = Math.min(left, advance);
      left -= use; advance -= use;
      if (left > EPS) debts.push({ left, at: e.createdAt });
    } else {
      let pay = -amount;
      while (pay > EPS && debts.length) {
        const use = Math.min(pay, debts[0].left);
        debts[0].left -= use; pay -= use;
        if (debts[0].left <= EPS) debts.shift();
      }
      advance += pay;
    }
  }
  return debts.map((d) => ({ left: r2(d.left), at: d.at }));
}

export interface AgeingBuckets {
  /** 0–7 days, 8–15, 16–30, 31–60, over 60. */
  d0_7: number;
  d8_15: number;
  d16_30: number;
  d31_60: number;
  d60_plus: number;
}

export const EMPTY_AGEING: AgeingBuckets = { d0_7: 0, d8_15: 0, d16_30: 0, d31_60: 0, d60_plus: 0 };

/** Splits open debts into age buckets as of `now`. */
export function ageing(debts: OpenDebt[], now: Date = new Date()): AgeingBuckets {
  const out = { ...EMPTY_AGEING };
  for (const d of debts) {
    const days = Math.floor((now.getTime() - d.at.getTime()) / DAY);
    const key: keyof AgeingBuckets = days <= 7 ? 'd0_7' : days <= 15 ? 'd8_15' : days <= 30 ? 'd16_30' : days <= 60 ? 'd31_60' : 'd60_plus';
    out[key] = r2(out[key] + d.left);
  }
  return out;
}

export interface CreditInput {
  balance: number;
  creditLimit: number;
  creditDays?: number | null;
  /** Oldest unpaid credit, from openDebts()[0]. */
  oldestDueAt?: Date | null;
  /** Value of the order being booked or invoiced. */
  orderTotal: number;
  now?: Date;
}

export interface CreditStatus {
  overLimit: boolean;
  overdue: boolean;
  /** Days the oldest unpaid credit has been open. */
  dueDays: number | null;
  /** Roman Urdu warning, null when all is well. */
  message: string | null;
}

export function creditStatus(c: CreditInput): CreditStatus {
  const now = c.now ?? new Date();
  const limit = Number(c.creditLimit) || 0;
  const after = r2((Number(c.balance) || 0) + (Number(c.orderTotal) || 0));
  const overLimit = limit > 0 && after > limit + 0.01;
  const dueDays = c.oldestDueAt ? Math.floor((now.getTime() - c.oldestDueAt.getTime()) / DAY) : null;
  const days = Number(c.creditDays) || 0;
  const overdue = days > 0 && dueDays != null && dueDays > days;
  const parts: string[] = [];
  if (overLimit) parts.push(`Credit limit ${formatRs(limit)} se zyada (is Order ke baad ${formatRs(after)})`);
  if (overdue) parts.push(`Udhaar ${dueDays} din purana hai (had ${days} din)`);
  return { overLimit, overdue, dueDays, message: parts.length ? parts.join(' · ') : null };
}
