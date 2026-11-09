/**
 * Product Radar math without a database: which products are rising or
 * falling (recent units against the period before), where margin can be
 * improved, and which products to bundle (co-purchase counted from bills).
 * Co-purchase ranking comes from the conversion helpers so the storefront
 * "bought together" and the radar agree.
 */

import { PairCount, topPairs } from '../conversion/conversion-math';

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/* ───────────── trend ───────────── */

export type Trend = 'rising' | 'falling' | 'new' | 'stopped' | 'steady';

export interface TrendRule {
  /** Fewest units in a period for it to count as real demand. */
  minUnits: number;
  /** Change (0.3 = 30%) from which a product is rising or falling. */
  change: number;
}
export const TREND_DEFAULTS: TrendRule = { minUnits: 3, change: 0.3 };

export interface TrendResult {
  trend: Trend;
  /** Percent change against the earlier period; null when the earlier period had no sales. */
  changePct: number | null;
  /** Units gained (positive) or lost (negative). */
  delta: number;
}

/**
 * `recent` and `prior` are units sold in two equal back-to-back periods.
 * Small numbers are noise, so a change only counts when either period
 * reaches `minUnits`.
 */
export function classifyTrend(recent: number, prior: number, rule: TrendRule = TREND_DEFAULTS): TrendResult {
  const delta = r1(recent - prior);
  const changePct = prior > 0 ? r1(((recent - prior) / prior) * 100) : null;
  let trend: Trend = 'steady';
  if (prior <= 0 && recent >= rule.minUnits) trend = 'new';
  else if (recent <= 0 && prior >= rule.minUnits) trend = 'stopped';
  else if (prior > 0 && Math.max(recent, prior) >= rule.minUnits) {
    const ch = (recent - prior) / prior;
    if (ch >= rule.change) trend = 'rising';
    else if (ch <= -rule.change) trend = 'falling';
  }
  return { trend, changePct, delta };
}

/** Pairs of back-to-back windows ending at `now`. */
export function windows(now: Date, days: number) {
  const day = 86_400_000;
  const recentFrom = new Date(now.getTime() - days * day);
  const priorFrom = new Date(now.getTime() - 2 * days * day);
  return { recentFrom, priorFrom, now };
}

/* ───────────── margin ───────────── */

/** Margin as a percent of the price; null when cost or price is unknown. */
export function marginPct(price: number, cost: number): number | null {
  if (!(price > 0) || !(cost > 0)) return null;
  return r1(((price - cost) / price) * 100);
}

export interface MarginRow {
  productId: string;
  name: string;
  price: number;
  cost: number;
  /** Units sold in the period looked at. */
  units: number;
  stock: number;
}

export type MarginKind = 'raise_price' | 'push' | 'loss';

export interface MarginOpportunity {
  kind: MarginKind;
  productId: string;
  name: string;
  price: number;
  cost: number;
  marginPct: number;
  units: number;
  stock: number;
  /** For raise_price and loss: the price to try. */
  suggestedPrice: number | null;
  /** Rupees: extra profit over the period (raise_price, loss) or profit sitting in stock (push). */
  gain: number;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Value at the given share (0..1) of the sorted list. */
function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const v = [...values].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(q * v.length))];
}

const friendlyPrice = (v: number) => Math.ceil(r2(v));

/**
 * Margin opportunities against the shop's own median margin. Products
 * without a cost are left out: a guess would mislead.
 *  - loss: sells below cost.
 *  - raise_price: among the best sellers but thinner margin than the median; try
 *    the median margin, at most +10% in one step.
 *  - push: margin well above the median but sells slowly with stock in hand.
 */
export function marginOpportunities(rows: MarginRow[], limit = 30): { medianMargin: number; list: MarginOpportunity[] } {
  const known = rows.filter((r) => marginPct(r.price, r.cost) !== null);
  const sellers = known.filter((r) => r.units > 0);
  const medianMargin = r1(median(sellers.map((r) => marginPct(r.price, r.cost)!)));
  const topUnits = quantile(sellers.map((r) => r.units), 0.75);
  const midUnits = median(sellers.map((r) => r.units));
  const out: MarginOpportunity[] = [];

  for (const r of known) {
    const m = marginPct(r.price, r.cost)!;
    const base = { productId: r.productId, name: r.name, price: r.price, cost: r.cost, marginPct: m, units: r.units, stock: r.stock };
    if (m < 0 && r.units > 0) {
      const target = friendlyPrice(r.cost / (1 - Math.max(10, medianMargin) / 100));
      out.push({ ...base, kind: 'loss', suggestedPrice: target, gain: r2((target - r.price) * r.units) });
    } else if (r.units >= Math.max(3, topUnits) && m < medianMargin - 5 && sellers.length >= 5) {
      const needed = r.cost / (1 - medianMargin / 100);
      const target = friendlyPrice(Math.min(r.price * 1.1, needed));
      if (target > r.price * 1.01) out.push({ ...base, kind: 'raise_price', suggestedPrice: target, gain: r2((target - r.price) * r.units) });
    } else if (m >= medianMargin + 10 && r.stock > 0 && r.units <= midUnits && sellers.length >= 5) {
      out.push({ ...base, kind: 'push', suggestedPrice: null, gain: r2((r.price - r.cost) * r.stock) });
    }
  }
  const order: Record<MarginKind, number> = { loss: 0, raise_price: 1, push: 2 };
  out.sort((a, b) => order[a.kind] - order[b.kind] || b.gain - a.gain);
  return { medianMargin, list: out.slice(0, limit) };
}

/* ───────────── bundles ───────────── */

/** Counts, per product, the bills it was on and, per pair, the bills with both. Huge bills are skipped. */
export function countPairs(bills: string[][], maxLines = 12) {
  const counts = new Map<string, number>();
  const pairMap = new Map<string, PairCount>();
  let n = 0;
  for (const raw of bills) {
    const set = [...new Set(raw)].sort();
    if (!set.length) continue;
    n++;
    for (const id of set) counts.set(id, (counts.get(id) ?? 0) + 1);
    if (set.length < 2 || set.length > maxLines) continue;
    for (let i = 0; i < set.length; i++) {
      for (let j = i + 1; j < set.length; j++) {
        const key = `${set[i]}|${set[j]}`;
        const cur = pairMap.get(key);
        if (cur) cur.together++;
        else pairMap.set(key, { a: set[i], b: set[j], together: 1 });
      }
    }
  }
  return { pairs: [...pairMap.values()], counts, bills: n };
}

export interface BundleInfo { name: string; price: number; cost: number }

export interface BundleIdea {
  a: string;
  b: string;
  aName: string;
  bName: string;
  together: number;
  lift: number;
  confidence: number;
  regularPrice: number;
  bundlePrice: number;
  discountPct: number;
  /** Margin of the bundle at that price; null when a cost is unknown. */
  marginPct: number | null;
}

/**
 * Bundle ideas from the strongest pairs. The offer discount is small: at
 * most `maxDiscount` percent and never more than a third of the pair's
 * margin, so a bundle does not eat the profit. Without costs it offers 5%.
 */
export function bundleIdeas(pairs: PairCount[], counts: Map<string, number>, bills: number, info: Map<string, BundleInfo>, maxDiscount = 10, limit = 12): BundleIdea[] {
  const out: BundleIdea[] = [];
  for (const p of topPairs(pairs, counts, bills, limit * 3)) {
    const a = info.get(p.a);
    const b = info.get(p.b);
    if (!a || !b || a.price <= 0 || b.price <= 0) continue;
    const regular = a.price + b.price;
    const cost = a.cost > 0 && b.cost > 0 ? a.cost + b.cost : 0;
    const margin = cost > 0 ? ((regular - cost) / regular) * 100 : null;
    const discountPct = margin === null ? Math.min(5, maxDiscount) : Math.max(0, Math.min(maxDiscount, Math.floor(margin / 3)));
    const bundlePrice = discountPct > 0 ? Math.floor((regular * (1 - discountPct / 100)) / 10) * 10 : regular;
    out.push({
      a: p.a, b: p.b, aName: a.name, bName: b.name, together: p.together, lift: p.lift, confidence: p.confidence,
      regularPrice: regular, bundlePrice, discountPct,
      marginPct: cost > 0 ? r1(((bundlePrice - cost) / bundlePrice) * 100) : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
