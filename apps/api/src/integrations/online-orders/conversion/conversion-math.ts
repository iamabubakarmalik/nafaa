/**
 * Website conversion math without a database: products bought together
 * (co-purchase), the free-shipping threshold advice from the order value
 * spread, and coupon codes.
 */

import * as crypto from 'crypto';

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/* ───────────── bought together ───────────── */

export interface PairCount { a: string; b: string; together: number }
export interface Together {
  productId: string;
  /** Bills that had both products. */
  together: number;
  /** Of the bills with the base product, % that also had this one. */
  confidence: number;
  /** How much more often than by chance (1 = no link). */
  lift: number;
}

/** Fewest shared bills for a pair to count. */
export const MIN_TOGETHER = 2;

/**
 * Products bought with `base`, best first. `counts` holds how many bills had
 * each product, `bills` the number of bills looked at. A pair needs
 * MIN_TOGETHER shared bills and a lift above 1; ties go to the pair seen
 * more often.
 */
export function boughtWith(base: string, pairs: PairCount[], counts: Map<string, number>, bills: number, limit = 6): Together[] {
  const baseCount = counts.get(base) ?? 0;
  if (!baseCount || !bills) return [];
  const out: Together[] = [];
  for (const p of pairs) {
    const other = p.a === base ? p.b : p.b === base ? p.a : null;
    if (!other || p.together < MIN_TOGETHER) continue;
    const otherCount = counts.get(other) ?? 0;
    if (!otherCount) continue;
    const confidence = p.together / baseCount;
    const lift = confidence / (otherCount / bills);
    if (lift <= 1) continue;
    out.push({ productId: other, together: p.together, confidence: r1(confidence * 100), lift: r2(lift) });
  }
  // Confidence weighted by how sure we are (more shared bills = surer).
  const rank = (t: Together) => (t.confidence / 100) * Math.min(1, t.together / 5) * Math.min(3, t.lift);
  return out.sort((x, y) => rank(y) - rank(x) || y.together - x.together).slice(0, limit);
}

/** Strongest pairs of the shop for the overview list. */
export function topPairs(pairs: PairCount[], counts: Map<string, number>, bills: number, limit = 20) {
  return pairs
    .filter((p) => p.together >= MIN_TOGETHER)
    .map((p) => {
      const ca = counts.get(p.a) ?? 0;
      const cb = counts.get(p.b) ?? 0;
      const lift = ca && cb && bills ? (p.together * bills) / (ca * cb) : 0;
      return { a: p.a, b: p.b, together: p.together, lift: r2(lift), confidence: r1((p.together / Math.max(1, Math.min(ca, cb))) * 100) };
    })
    .filter((p) => p.lift > 1)
    .sort((x, y) => y.together * Math.min(3, y.lift) - x.together * Math.min(3, x.lift))
    .slice(0, limit);
}

/* ───────────── free shipping threshold ───────────── */

export interface ShippingAdvice {
  orders: number;
  median: number;
  average: number;
  /** Suggested "free delivery above" amount (rounded), or null with too few orders. */
  threshold: number | null;
  /** % of orders already at or above the threshold. */
  alreadyAbove: number;
  /** % of orders within 25% below it: the ones a nudge can lift. */
  nearBelow: number;
  /** Extra basket value expected if half of the near orders top up to the threshold. */
  liftPerOrder: number;
  /** Delivery cost the shop then pays on the orders above (per month at the current rate). */
  shippingCostAbove: number;
  bands: Array<{ from: number; to: number | null; orders: number }>;
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

/** Rounds to a friendly price step (Rs 100 / 500 / 1,000). */
export function friendlyAmount(v: number): number {
  const step = v < 2_000 ? 100 : v < 10_000 ? 500 : 1_000;
  return Math.ceil(v / step) * step;
}

/**
 * The threshold sits a little above the typical basket (about the 65th
 * percentile): most customers are near it and some add one more item to
 * reach it, while the shop does not give free delivery to most orders.
 * `shippingCost` is the average delivery cost per order to the shop.
 */
export function freeShippingAdvice(values: number[], shippingCost: number, minOrders = 20): ShippingAdvice {
  const v = values.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  const n = v.length;
  const median = r2(quantile(v, 0.5));
  const average = n ? r2(v.reduce((s, x) => s + x, 0) / n) : 0;
  const threshold = n >= minOrders ? friendlyAmount(Math.max(quantile(v, 0.65), median * 1.15)) : null;
  const above = threshold ? v.filter((x) => x >= threshold).length : 0;
  const near = threshold ? v.filter((x) => x < threshold && x >= threshold * 0.75) : [];
  const gap = near.reduce((s, x) => s + (threshold! - x), 0);
  const top = v.length ? v[v.length - 1] : 0;
  const step = top > 0 ? friendlyAmount(Math.max(100, top / 6)) : 0;
  const bands: ShippingAdvice['bands'] = [];
  if (step) {
    for (let from = 0; from < top && bands.length < 6; from += step) {
      const to = bands.length === 5 ? null : from + step;
      bands.push({ from, to, orders: v.filter((x) => x >= from && (to === null || x < to)).length });
    }
  }
  return {
    orders: n, median, average, threshold,
    alreadyAbove: n ? r1((above / n) * 100) : 0,
    nearBelow: n ? r1((near.length / n) * 100) : 0,
    liftPerOrder: n ? r2((gap * 0.5) / n) : 0,
    shippingCostAbove: r2(above * Math.max(0, shippingCost)),
    bands,
  };
}

/* ───────────── coupons ───────────── */

/** Letters and digits that are not mixed up when read aloud or typed (no 0/O, 1/I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** PREFIX + 5 random characters, letters and digits only (the order form strips other characters). */
export function couponCode(prefix: string, length = 5): string {
  const bytes = crypto.randomBytes(length);
  let s = '';
  for (let i = 0; i < length; i += 1) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}${s}`;
}

export const cleanCouponCode = (c: unknown) => String(c ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40);

export interface CouponRow {
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  shared: boolean;
  phoneKey: string | null;
  expiresAt: Date | null;
  usedAt: Date | null;
}

/** Discount the coupon gives on `subtotal`, or why it does not apply. */
export function couponApplies(c: CouponRow, subtotal: number, phone: string | null, now: Date): { discount: number } | { error: string } {
  if (c.usedAt && !c.shared) return { error: 'Ye code pehle istemal ho chuka hai' };
  if (c.expiresAt && c.expiresAt.getTime() < now.getTime()) return { error: 'Is code ki muddat khatam ho gayi' };
  if (subtotal < c.minSubtotal) return { error: `Ye code Rs ${Math.round(c.minSubtotal)} ya zyada ke order par chalta hai` };
  if (c.phoneKey && phone && c.phoneKey !== phone) return { error: 'Ye code kisi aur customer ke liye hai' };
  const d = c.type === 'PERCENT' ? (subtotal * c.value) / 100 : c.value;
  return { discount: r2(Math.max(0, Math.min(subtotal, d))) };
}
