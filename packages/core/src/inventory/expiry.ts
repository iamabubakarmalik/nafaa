/**
 * Batches and expiry: which batches are expired or close to it, and the
 * first-expiry-first-out order for selling or taking stock off.
 */

export type ExpiryState = 'expired' | 'soon' | 'ok' | 'none';

const DAY = 86_400_000;

/** Whole days from `today` (YYYY-MM-DD) to `date`; negative when past. */
export function daysUntil(date: string | null | undefined, today: string): number | null {
  if (!date) return null;
  const a = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / DAY);
}

/** expired (before today), soon (within `soonDays`), ok, or none (no date). */
export function expiryState(date: string | null | undefined, today: string, soonDays = 30): ExpiryState {
  const d = daysUntil(date, today);
  if (d === null) return 'none';
  if (d < 0) return 'expired';
  if (d <= soonDays) return 'soon';
  return 'ok';
}

export interface BatchLike { id: string; expiryDate?: string | null; quantity: number; isActive?: boolean }

/** First expiry first out: batches with stock, the earliest date first, undated last. */
export function fefo<B extends BatchLike>(batches: ReadonlyArray<B>): B[] {
  return batches.filter((b) => b.isActive !== false && b.quantity > 0)
    .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
}

/** Which batches cover `qty` in FEFO order, and what is left uncovered. */
export function pickBatches<B extends BatchLike>(batches: ReadonlyArray<B>, qty: number) {
  const out: Array<{ batch: B; qty: number }> = [];
  let left = Math.max(0, Number(qty) || 0);
  for (const b of fefo(batches)) {
    if (left <= 0) break;
    const take = Math.min(left, b.quantity);
    out.push({ batch: b, qty: take });
    left = Math.round((left - take) * 1000) / 1000;
  }
  return { picks: out, short: left };
}

/** Expiry buckets for a dashboard: expired, this week, this month, later. */
export function expiryBuckets<B extends BatchLike>(batches: ReadonlyArray<B>, today: string) {
  const res = { expired: [] as B[], week: [] as B[], month: [] as B[], later: [] as B[] };
  for (const b of batches) {
    if (b.isActive === false || !(b.quantity > 0)) continue;
    const d = daysUntil(b.expiryDate, today);
    if (d === null) continue;
    if (d < 0) res.expired.push(b);
    else if (d <= 7) res.week.push(b);
    else if (d <= 30) res.month.push(b);
    else res.later.push(b);
  }
  return res;
}
