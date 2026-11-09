/**
 * Multi-courier scorecard. Pure math over the shop's own parcels, so the
 * screen, the "best courier per city" feed to auto booking and the tests
 * share one set of numbers.
 *
 * Rates are over finished parcels (delivered + returned). First-attempt
 * success counts only parcels whose courier sent step events, since a
 * failed attempt is only known from those. COD timing compares the days
 * from delivery to payment with the courier's usual cycle.
 */

import { CourierHistory, rankCouriers } from './courier-rules';

export interface ScoreParcel {
  courier: string;
  /** Canonical city name (pk-cities), else the raw text, else null. */
  city: string | null;
  outcome: 'DELIVERED' | 'RETURNED' | 'OPEN';
  sentAt: Date;
  deliveredAt: Date | null;
  /** Failed delivery attempts in the courier's events; null when the courier sent no events. */
  attempts: number | null;
  stuck: boolean;
  /** COD the courier collects (0 for prepaid). */
  cod: number;
  codSettledAt: Date | null;
  /** Courier cost of this parcel (forward + COD fee + return charge); null when unknown. */
  cost: number | null;
  claim: boolean;
}

export interface Score {
  sent: number;
  delivered: number;
  returned: number;
  open: number;
  deliveryRate: number | null;
  rtoRate: number | null;
  avgDays: number | null;
  firstAttemptRate: number | null;
  firstAttemptSample: number;
  stuck: number;
  codOnTimeRate: number | null;
  avgPayDelay: number | null;
  codSample: number;
  costPerParcel: number | null;
  claims: number;
}

const DAY = 86_400_000;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
const avg1 = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/**
 * One set of numbers for a group of parcels. `cycleDays` is the courier's
 * usual days from delivery to COD payment; a delivered COD parcel unpaid
 * past it counts as late.
 */
export function scoreOf(rows: ScoreParcel[], cycleDays: number, now = Date.now()): Score {
  const delivered = rows.filter((r) => r.outcome === 'DELIVERED');
  const returned = rows.filter((r) => r.outcome === 'RETURNED').length;
  const done = delivered.length + returned;
  const days = delivered.filter((r) => r.deliveredAt).map((r) => Math.max(0, (r.deliveredAt!.getTime() - r.sentAt.getTime()) / DAY));
  const tracked = delivered.filter((r) => r.attempts !== null);
  const codRows = delivered.filter((r) => r.cod > 0 && r.deliveredAt);
  const delays: number[] = [];
  let onTime = 0;
  let judged = 0;
  for (const r of codRows) {
    if (r.codSettledAt) {
      const d = Math.max(0, (r.codSettledAt.getTime() - r.deliveredAt!.getTime()) / DAY);
      delays.push(d);
      judged++;
      if (d <= cycleDays) onTime++;
    } else if (now - r.deliveredAt!.getTime() > cycleDays * DAY) {
      judged++;
    }
  }
  const costs = rows.map((r) => r.cost).filter((c): c is number => c !== null && c > 0);
  return {
    sent: rows.length,
    delivered: delivered.length,
    returned,
    open: rows.filter((r) => r.outcome === 'OPEN').length,
    deliveryRate: pct(delivered.length, done),
    rtoRate: pct(returned, done),
    avgDays: avg1(days),
    firstAttemptRate: pct(tracked.filter((r) => r.attempts === 0).length, tracked.length),
    firstAttemptSample: tracked.length,
    stuck: rows.filter((r) => r.stuck).length,
    codOnTimeRate: pct(onTime, judged),
    avgPayDelay: avg1(delays),
    codSample: judged,
    costPerParcel: costs.length ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null,
    claims: rows.filter((r) => r.claim).length,
  };
}

const historyOf = (code: string, rows: ScoreParcel[]): CourierHistory => {
  const costs = rows.map((r) => r.cost).filter((c): c is number => c !== null && c > 0);
  return {
    code,
    sent: rows.length,
    delivered: rows.filter((r) => r.outcome === 'DELIVERED').length,
    returned: rows.filter((r) => r.outcome === 'RETURNED').length,
    chargeSum: costs.reduce((a, b) => a + b, 0),
    chargeCount: costs.length,
  };
};

const groupBy = <T>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r); else m.set(k, [r]);
  }
  return m;
};

export interface CityBest {
  city: string;
  parcels: number;
  best: string | null;
  bestRate: number | null;
  runnerUp: string | null;
  couriers: Array<{ code: string; sent: number; deliveryRate: number | null; avgDays: number | null; best: boolean }>;
}

/**
 * The scorecard: per courier overall, and per city with the best courier.
 * "Best" uses the same ranking as auto-booking suggestions (smoothed
 * delivered share with a small pull for cost); a city needs `minPerCourier`
 * finished parcels on a courier before it can be best there.
 */
export function scorecard(rows: ScoreParcel[], cycles: Record<string, number>, o: { now?: number; minPerCourier?: number; fallbackCycle?: number } = {}) {
  const now = o.now ?? Date.now();
  const cycle = (code: string) => cycles[code] ?? o.fallbackCycle ?? 7;
  const byCourier = groupBy(rows, (r) => r.courier);
  const couriers = [...byCourier.entries()]
    .map(([code, list]) => ({ code, ...scoreOf(list, cycle(code), now) }))
    .sort((a, b) => b.sent - a.sent);
  const overallRank = rankCouriers([...byCourier.entries()].map(([code, list]) => historyOf(code, list)), { minSent: o.minPerCourier ?? 3 });
  const bestOverall = overallRank.find((r) => r.best)?.code ?? null;

  const cities: CityBest[] = [];
  for (const [city, list] of groupBy(rows.filter((r) => r.city), (r) => r.city!)) {
    const per = groupBy(list, (r) => r.courier);
    const ranked = rankCouriers([...per.entries()].map(([code, l]) => historyOf(code, l)), { minSent: o.minPerCourier ?? 3 });
    const best = ranked.find((r) => r.best) ?? null;
    const runner = best ? ranked.find((r) => r.code !== best.code && r.delivered + r.returned >= (o.minPerCourier ?? 3)) ?? null : null;
    cities.push({
      city,
      parcels: list.length,
      best: best?.code ?? null,
      bestRate: best?.successRate ?? null,
      runnerUp: runner?.code ?? null,
      couriers: ranked.map((r) => {
        const s = scoreOf(per.get(r.code)!, cycle(r.code), now);
        return { code: r.code, sent: s.sent, deliveryRate: s.deliveryRate, avgDays: s.avgDays, best: r.best };
      }),
    });
  }
  cities.sort((a, b) => b.parcels - a.parcels);
  return { couriers, bestOverall, cities };
}

/** City → courier for every city with a best courier among `allowed` (connected, bookable) couriers. */
export function bestByCity(cities: CityBest[], allowed?: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cities) {
    const pick = allowed
      ? c.couriers.find((x) => x.best && allowed.includes(x.code))?.code ?? null
      : c.best;
    if (pick) out[c.city] = pick;
  }
  return out;
}
