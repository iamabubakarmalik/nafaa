/**
 * Stock forecast math, kept pure so it can be tested on its own.
 *
 * - Velocity: units per day over the last 7, 30 and 90 days, weighted toward
 *   the recent windows. Windows longer than the product's history are left
 *   out, so a new product is not diluted by days it did not exist.
 * - Seasonality: last year's sales over the coming days compared with the
 *   30 days before that date last year. Used only when last year has enough
 *   sales to mean something.
 * - Festivals: when there is no last-year history, the big sale days ahead
 *   (Ramadan, Eid, 11.11 ...) add a fixed bump over their days.
 * - Safety stock: z × daily standard deviation × √lead days.
 * - Reorder point: demand over the lead time plus safety stock. The order
 *   tops stock up to cover lead time + cover days, then rounds up to the
 *   supplier's minimum and pack size.
 */

export const DAY_MS = 86_400_000;

export interface ForecastSettings {
  /** Days of stock an order should cover after it arrives. */
  coverDays: number;
  /** Lead days used when the supplier has none. */
  defaultLeadDays: number;
  /** Service level factor (1.65 ≈ 95% of lead times without a stock-out). */
  z: number;
  /** No sale for this many days with stock on the shelf = dead stock. */
  deadDays: number;
  /** More than this many days of cover = overstock. */
  overstockDays: number;
  /** Apply festival bumps when there is no last-year history. */
  festivals: boolean;
}

export const FORECAST_DEFAULTS: ForecastSettings = {
  coverDays: 30, defaultLeadDays: 7, z: 1.65, deadDays: 90, overstockDays: 120, festivals: true,
};

export type ForecastClass = 'fast' | 'normal' | 'slow' | 'dead' | 'overstock' | 'new' | 'none';

const round = (v: number, d = 3) => Number((Number.isFinite(v) ? v : 0).toFixed(d));

/**
 * Weighted daily velocity. `ageDays` is how long the product has existed;
 * windows longer than that are skipped and the rest re-weighted. A product
 * younger than 7 days spreads its sales over at least 7 days.
 */
export function weightedVelocity(sold: { d7: number; d30: number; d90: number }, ageDays: number): number {
  const age = Math.max(0, ageDays);
  const parts: Array<[number, number]> = [];
  const w = { d7: 0.5, d30: 0.3, d90: 0.2 };
  if (age < 7) return Math.max(0, sold.d7) / 7;
  parts.push([Math.max(0, sold.d7) / 7, w.d7]);
  if (age >= 30) parts.push([Math.max(0, sold.d30) / 30, w.d30]);
  else parts.push([Math.max(0, sold.d30) / Math.max(7, age), w.d30]);
  if (age >= 90) parts.push([Math.max(0, sold.d90) / 90, w.d90]);
  const weight = parts.reduce((s, [, x]) => s + x, 0);
  return round(parts.reduce((s, [v, x]) => s + v * x, 0) / weight, 4);
}

/**
 * Last-year factor: sales per day over the coming `aheadDays` last year
 * divided by the 30 days before that date last year. Null when last year
 * has fewer than `minUnits` units in the base window. Clamped to 0.5–2.5.
 */
export function seasonalFactor(lastYear: { prev30: number; ahead: number; aheadDays: number }, minUnits = 5): number | null {
  if (!(lastYear.prev30 >= minUnits) || !(lastYear.aheadDays > 0)) return null;
  const base = lastYear.prev30 / 30;
  const ahead = Math.max(0, lastYear.ahead) / lastYear.aheadDays;
  return round(Math.min(2.5, Math.max(0.5, ahead / base)), 3);
}

/** Festival bumps by festival key: extra demand factor and the days it covers. */
export const FESTIVAL_LIFT: Record<string, { lift: number; before: number; after: number }> = {
  'ramadan': { lift: 1.3, before: 7, after: 29 },
  'chand-raat-fitr': { lift: 1.5, before: 3, after: 0 },
  'eid-ul-fitr': { lift: 1.5, before: 15, after: 1 },
  'eid-ul-adha': { lift: 1.3, before: 12, after: 2 },
  '11-11': { lift: 1.25, before: 3, after: 1 },
  'white-friday': { lift: 1.25, before: 5, after: 2 },
  '12-12': { lift: 1.2, before: 3, after: 1 },
  'independence-day': { lift: 1.15, before: 7, after: 0 },
  'winter-sale': { lift: 1.1, before: 0, after: 14 },
};

/**
 * Average festival factor over the horizon: each day inside a festival's
 * window uses that festival's lift (the biggest when two overlap), other
 * days count as 1. `festivals` are { key, date (YYYY-MM-DD) }.
 */
export function festivalFactor(festivals: Array<{ key: string; date: string }>, from: Date, horizonDays: number): { factor: number; names: string[] } {
  if (horizonDays <= 0) return { factor: 1, names: [] };
  const days = Math.ceil(horizonDays);
  const lift = new Array<number>(days).fill(1);
  const names = new Set<string>();
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (const f of festivals) {
    const info = FESTIVAL_LIFT[f.key];
    if (!info) continue;
    const at = Date.parse(`${f.date}T00:00:00Z`);
    const a = Math.floor((at - info.before * DAY_MS - start) / DAY_MS);
    const b = Math.floor((at + info.after * DAY_MS - start) / DAY_MS);
    let hit = false;
    for (let i = Math.max(0, a); i <= Math.min(days - 1, b); i++) { lift[i] = Math.max(lift[i], info.lift); hit = true; }
    if (hit) names.add(f.key);
  }
  return { factor: round(lift.reduce((s, x) => s + x, 0) / days, 3), names: [...names] };
}

/** Population standard deviation of daily sales. */
export function dailyStdDev(series: number[]): number {
  if (!series.length) return 0;
  const mean = series.reduce((s, x) => s + x, 0) / series.length;
  return round(Math.sqrt(series.reduce((s, x) => s + (x - mean) ** 2, 0) / series.length), 4);
}

/** Safety stock: z × σ(daily) × √lead days. */
export function safetyStock(stdDev: number, leadDays: number, z: number): number {
  if (!(stdDev > 0) || !(leadDays > 0)) return 0;
  return round(z * stdDev * Math.sqrt(leadDays), 3);
}

/** Rounds an order up to the supplier's minimum, then to whole packs. */
export function roundToPack(qty: number, pack: number | null | undefined, minOrder: number | null | undefined): number {
  if (!(qty > 0)) return 0;
  let q = Math.max(qty, minOrder && minOrder > 0 ? minOrder : 0);
  const p = pack && pack > 1 ? pack : 1;
  q = Math.ceil(round(q / p, 6)) * p;
  return round(q, 3);
}

export interface ReorderInput {
  demand: number; stock: number; onOrder: number; stdDev: number;
  leadDays: number; coverDays: number; z: number; pack?: number | null; minOrder?: number | null;
}

export interface ReorderResult {
  safety: number;
  reorderPoint: number;
  /** Stock the order should bring the shelf (plus open orders) up to. */
  target: number;
  /** Rounded order quantity; 0 when stock + open orders are above the reorder point. */
  suggestQty: number;
  /** Days from today until stock + open orders reach the reorder point (0 = order now). */
  orderInDays: number | null;
}

export function reorderPlan(i: ReorderInput): ReorderResult {
  const safety = safetyStock(i.stdDev, i.leadDays, i.z);
  const reorderPoint = round(i.demand * i.leadDays + safety);
  const target = round(i.demand * (i.leadDays + i.coverDays) + safety);
  const position = Math.max(0, i.stock) + Math.max(0, i.onOrder);
  if (!(i.demand > 0)) return { safety, reorderPoint, target, suggestQty: 0, orderInDays: null };
  if (position > reorderPoint) {
    return { safety, reorderPoint, target, suggestQty: 0, orderInDays: Math.floor((position - reorderPoint) / i.demand) };
  }
  return { safety, reorderPoint, target, suggestQty: roundToPack(target - position, i.pack, i.minOrder), orderInDays: 0 };
}

/** Days the stock lasts at the forecast demand; null when nothing sells. */
export function daysOfCover(stock: number, demand: number): number | null {
  if (!(demand > 0)) return null;
  return round(Math.max(0, stock) / demand, 1);
}

/** Business day (YYYY-MM-DD) the stock runs out, counted from `today`. */
export function stockOutDate(today: string, cover: number | null): string | null {
  if (cover === null) return null;
  const at = Date.parse(`${today}T00:00:00Z`) + Math.floor(cover) * DAY_MS;
  return new Date(at).toISOString().slice(0, 10);
}

/** Value at the given percentile (0–1) of a list. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1));
  return s[idx];
}

/**
 * Class of a line. `fastAt`/`slowAt` are the demand percentiles of the
 * selling lines in the same run.
 */
export function classify(i: {
  stock: number; demand: number; cover: number | null; ageDays: number; daysSinceSale: number | null;
  fastAt: number; slowAt: number; deadDays: number; overstockDays: number;
}): ForecastClass {
  const neverSoldInWindow = i.daysSinceSale === null || i.daysSinceSale >= i.deadDays;
  if (i.stock > 0 && neverSoldInWindow && i.ageDays >= i.deadDays) return 'dead';
  if (i.ageDays < 14 && !(i.demand > 0)) return 'new';
  if (!(i.demand > 0)) return i.stock > 0 ? 'slow' : 'none';
  if (i.cover !== null && i.cover > i.overstockDays) return 'overstock';
  if (i.demand >= i.fastAt && i.fastAt > 0) return 'fast';
  if (i.demand <= i.slowAt) return 'slow';
  return 'normal';
}

/** Sums a daily series (oldest first) into `weeks` weekly totals ending today. */
export function weeklyTotals(daily: number[], weeks = 12): number[] {
  const out: number[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = daily.length - w * 7;
    const start = Math.max(0, end - 7);
    out.push(round(daily.slice(start, Math.max(start, end)).reduce((s, x) => s + x, 0), 2));
  }
  return out;
}
