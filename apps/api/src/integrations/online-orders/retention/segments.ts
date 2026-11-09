/**
 * Segment rules for online buyers: who is new, repeat, VIP, at risk, lost or
 * returns too many parcels, plus an RFM score and a 12-month value estimate
 * (CLV). Pure functions over per-phone order totals, so the customers list,
 * campaigns and the mobile app all count the same way.
 */

const DAY = 86_400_000;

/** No order for this many days: at risk. */
export const AT_RISK_DAYS = 60;
/** No order for this many days: lost. */
export const LOST_DAYS = 120;
/** First order within this many days: new. */
export const NEW_DAYS = 30;

/** One buyer's order totals across every channel (matched by phone). */
export interface BuyerStats {
  orders: number;
  delivered: number;
  returned: number;
  cancelled: number;
  /** Value of delivered orders. */
  spent: number;
  firstAt: Date;
  lastAt: Date;
  blocked: boolean;
}

/** Segment keys. The last four are the older list, still used by older app builds. */
export const SEGMENT_KEYS = [
  'vip', 'repeat', 'new', 'at_risk', 'lost', 'high_rto', 'blocked',
  'inactive30', 'inactive60', 'inactive90', 'risky',
] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export type RfmLabel = 'CHAMPION' | 'LOYAL' | 'PROMISING' | 'NEW' | 'NEED_ATTENTION' | 'AT_RISK' | 'LOST' | 'NO_BUY';
export const RFM_LABELS: RfmLabel[] = ['CHAMPION', 'LOYAL', 'PROMISING', 'NEW', 'NEED_ATTENTION', 'AT_RISK', 'LOST', 'NO_BUY'];

export interface Rfm { r: number; f: number; m: number; score: string; label: RfmLabel }

export const daysSince = (d: Date, now: number) => Math.max(0, Math.floor((now - d.getTime()) / DAY));

/** Recency 1–5: days since the last order. */
export function recencyScore(days: number): number {
  if (days <= 14) return 5;
  if (days <= 30) return 4;
  if (days <= AT_RISK_DAYS) return 3;
  if (days <= LOST_DAYS) return 2;
  return 1;
}

/** Frequency 1–5: delivered orders. */
export function frequencyScore(delivered: number): number {
  if (delivered >= 6) return 5;
  if (delivered >= 4) return 4;
  if (delivered >= 3) return 3;
  if (delivered >= 2) return 2;
  return delivered >= 1 ? 1 : 0;
}

/** Spend at the 20th, 40th, 60th and 80th percentile of buyers with a delivered order. */
export function monetaryCuts(spends: number[]): number[] {
  const s = spends.filter((v) => v > 0).sort((a, b) => a - b);
  if (!s.length) return [0, 0, 0, 0];
  return [0.2, 0.4, 0.6, 0.8].map((p) => s[Math.min(s.length - 1, Math.floor(s.length * p))]);
}

/** Monetary 1–5 against the shop's own spread of spend. */
export function monetaryScore(spent: number, cuts: number[]): number {
  if (!(spent > 0)) return 0;
  let score = 1;
  for (const c of cuts) if (spent >= c && c > 0) score++;
  return Math.min(5, score);
}

export function rfmOf(c: BuyerStats, now: number, cuts: number[]): Rfm {
  const days = daysSince(c.lastAt, now);
  const r = recencyScore(days);
  const f = frequencyScore(c.delivered);
  const m = monetaryScore(c.spent, cuts);
  return { r, f, m, score: `${r}${f}${m}`, label: rfmLabel(c, r, f, now) };
}

function rfmLabel(c: BuyerStats, r: number, f: number, now: number): RfmLabel {
  if (c.delivered === 0) return 'NO_BUY';
  if (r === 1) return 'LOST';
  if (r === 2) return 'AT_RISK';
  if (r >= 4 && f >= 4) return 'CHAMPION';
  if (r >= 3 && f >= 3) return 'LOYAL';
  if (r >= 4 && c.delivered === 1 && daysSince(c.firstAt, now) <= NEW_DAYS) return 'NEW';
  if (r >= 4) return 'PROMISING';
  return 'NEED_ATTENTION';
}

/**
 * Expected value of the next 12 months: average order × orders a year at the
 * buyer's own pace (counted over at least 6 months, at most 24 a year),
 * scaled down when the buyer has gone quiet.
 */
export function clvOf(c: BuyerStats, now: number): number {
  if (c.delivered === 0) return 0;
  const aov = c.spent / c.delivered;
  const months = Math.max(6, (now - c.firstAt.getTime()) / (30 * DAY));
  const perYear = Math.min(24, (c.delivered / months) * 12);
  const days = daysSince(c.lastAt, now);
  const alive = days <= AT_RISK_DAYS ? 1 : days <= LOST_DAYS ? 0.5 : 0.15;
  return Math.round(aov * perYear * alive);
}

/** Lowest spend that still counts as VIP: the top 10% of buyers with 2+ delivered orders. */
export function vipCutOf(all: BuyerStats[]): number {
  const s = all.filter((c) => c.delivered >= 2).map((c) => c.spent).sort((a, b) => b - a);
  return s.length ? s[Math.max(0, Math.ceil(s.length * 0.1) - 1)] : Infinity;
}

/** High RTO: two or more parcels returned, or at least half of the parcels that reached them. */
export const isHighRto = (c: BuyerStats) => c.returned >= 2 || (c.returned >= 1 && c.returned >= c.delivered);

export function segmentsOf(c: BuyerStats, now: number, vipCut: number): Record<SegmentKey, boolean> {
  const days = daysSince(c.lastAt, now);
  const bought = c.delivered > 0;
  return {
    vip: c.delivered >= 2 && c.spent >= vipCut,
    repeat: c.delivered >= 2,
    new: c.orders === 1 && daysSince(c.firstAt, now) <= NEW_DAYS && c.returned === 0 && !c.blocked,
    at_risk: bought && days >= AT_RISK_DAYS && days < LOST_DAYS,
    lost: bought && days >= LOST_DAYS,
    high_rto: isHighRto(c),
    blocked: c.blocked,
    inactive30: bought && days >= 30,
    inactive60: bought && days >= 60,
    inactive90: bought && days >= 90,
    risky: c.returned > 0,
  };
}

/** Share of buyers with a delivered order who came back for a second one. */
export function repeatRateOf(all: BuyerStats[]): number {
  const buyers = all.filter((c) => c.delivered > 0).length;
  const repeat = all.filter((c) => c.delivered >= 2).length;
  return buyers ? Math.round((repeat / buyers) * 1000) / 10 : 0;
}
