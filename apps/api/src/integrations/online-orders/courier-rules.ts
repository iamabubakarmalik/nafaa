/**
 * Courier auto-booking rules and courier suggestions. Pure functions.
 *
 * Rules run top to bottom; the first that fits the order decides: book on a
 * courier, or stop and let the shop decide ("ASK"). When none fits, the
 * fallback courier is used (or the shop decides when there is none). A
 * customer with a HIGH or BLOCKED risk is never booked by itself when
 * `holdRisky` is on.
 *
 * Suggestions rank couriers on the shop's own history for the customer's
 * city (all cities when the city has too few parcels): delivered share,
 * smoothed so a courier with 2 parcels does not beat one with 200, then the
 * average charge.
 */

export const RULE_TRIGGERS = ['OFF', 'ACCEPT', 'READY'] as const;
export type RuleTrigger = (typeof RULE_TRIGGERS)[number];
const RISKS = ['NEW', 'TRUSTED', 'OK', 'WATCH', 'HIGH', 'BLOCKED'] as const;
type Risk = (typeof RISKS)[number];

export interface CourierRule {
  id: string;
  /** Customer city is one of these (empty = any city). */
  cities: string[];
  /** COD at least / at most (null = no limit). */
  codMin: number | null;
  codMax: number | null;
  /** Customer risk is one of these (empty = any). */
  risks: Risk[];
  /** Order came from one of these channels (empty = any). */
  channelIds: string[];
  action: 'BOOK' | 'ASK';
  /** Courier code when `action` is BOOK. */
  courier: string | null;
}

export interface CourierRules {
  trigger: RuleTrigger;
  rules: CourierRule[];
  /** Courier when no rule fits; null = let the shop decide. */
  fallback: string | null;
  holdRisky: boolean;
}

export const emptyRules = (): CourierRules => ({ trigger: 'OFF', rules: [], fallback: null, holdRisky: true });

const cityKey = (s?: string | null) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');
const money = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Math.round(Number(v)));
const code = (v: unknown) => (typeof v === 'string' && /^[A-Z_]{2,20}$/.test(v) ? v : null);

/** Cleans saved or posted rules; unknown couriers are dropped when `known` is given. */
export function normalizeRules(raw: unknown, known?: string[]): CourierRules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const ok = (c: string | null) => (c && (!known || known.includes(c)) ? c : null);
  const rules: CourierRule[] = (Array.isArray(r.rules) ? r.rules : []).slice(0, 30).map((x: any, i: number) => {
    const action: CourierRule['action'] = x?.action === 'ASK' ? 'ASK' : 'BOOK';
    return {
      id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 40) : `r${i + 1}`,
      cities: (Array.isArray(x?.cities) ? x.cities : []).map((c: unknown) => String(c ?? '').trim().slice(0, 60)).filter(Boolean).slice(0, 50),
      codMin: money(x?.codMin),
      codMax: money(x?.codMax),
      risks: (Array.isArray(x?.risks) ? x.risks : []).filter((k: unknown): k is Risk => RISKS.includes(k as Risk)),
      channelIds: (Array.isArray(x?.channelIds) ? x.channelIds : []).filter((k: unknown) => typeof k === 'string' && k.length <= 64).slice(0, 20),
      action,
      courier: action === 'BOOK' ? ok(code(x?.courier)) : null,
    };
  }).filter((x: CourierRule) => x.action === 'ASK' || x.courier);
  return {
    trigger: RULE_TRIGGERS.includes(r.trigger) ? r.trigger : 'OFF',
    rules,
    fallback: ok(code(r.fallback)),
    holdRisky: r.holdRisky !== false,
  };
}

export interface RuleOrder {
  city: string | null;
  cod: number;
  risk: string | null;
  integrationId: string;
}

export type RuleDecision =
  | { action: 'BOOK'; courier: string; ruleId: string | null; reason: string }
  | { action: 'ASK'; ruleId: string | null; reason: string };

export function ruleFits(rule: CourierRule, o: RuleOrder): boolean {
  if (rule.cities.length && !rule.cities.some((c) => cityKey(c) === cityKey(o.city))) return false;
  if (rule.codMin !== null && o.cod < rule.codMin) return false;
  if (rule.codMax !== null && o.cod > rule.codMax) return false;
  if (rule.risks.length && !rule.risks.includes((o.risk ?? '') as Risk)) return false;
  if (rule.channelIds.length && !rule.channelIds.includes(o.integrationId)) return false;
  return true;
}

export function pickCourier(cfg: CourierRules, o: RuleOrder): RuleDecision {
  if (cfg.holdRisky && (o.risk === 'HIGH' || o.risk === 'BLOCKED')) {
    return { action: 'ASK', ruleId: null, reason: o.risk === 'BLOCKED' ? 'Customer block list me hai' : 'Customer ka RTO khatra zyada hai' };
  }
  for (const [i, rule] of cfg.rules.entries()) {
    if (!ruleFits(rule, o)) continue;
    return rule.action === 'ASK'
      ? { action: 'ASK', ruleId: rule.id, reason: `Rule ${i + 1}: khud dekh kar book karein` }
      : { action: 'BOOK', courier: rule.courier!, ruleId: rule.id, reason: `Rule ${i + 1}` };
  }
  return cfg.fallback
    ? { action: 'BOOK', courier: cfg.fallback, ruleId: null, reason: 'Baqi sab' }
    : { action: 'ASK', ruleId: null, reason: 'Koi rule fit nahi hua' };
}

export interface CourierHistory {
  code: string;
  sent: number;
  delivered: number;
  returned: number;
  /** Sum and count of known charges. */
  chargeSum: number;
  chargeCount: number;
}

export interface CourierSuggestion {
  code: string;
  sent: number;
  delivered: number;
  returned: number;
  /** Delivered out of finished parcels, %. */
  successRate: number | null;
  avgCharge: number | null;
  score: number;
  best: boolean;
}

/**
 * Ranks couriers by delivered share of finished parcels (smoothed towards the
 * shop's overall share with `prior` parcels), with a small pull for a lower
 * average charge. Couriers with fewer than `minSent` finished parcels stay in
 * the list, below the others, and are never marked best.
 */
export function rankCouriers(stats: CourierHistory[], o: { minSent?: number; prior?: number } = {}): CourierSuggestion[] {
  const minSent = o.minSent ?? 3;
  const prior = o.prior ?? 5;
  const done = (s: CourierHistory) => s.delivered + s.returned;
  const allDone = stats.reduce((t, s) => t + done(s), 0);
  const base = allDone ? stats.reduce((t, s) => t + s.delivered, 0) / allDone : 0.85;
  const avgs = stats.map((s) => (s.chargeCount ? s.chargeSum / s.chargeCount : null)).filter((v): v is number => v !== null);
  const cheapest = avgs.length ? Math.min(...avgs) : null;
  const rows = stats.map((s) => {
    const avg = s.chargeCount ? Math.round(s.chargeSum / s.chargeCount) : null;
    const share = (s.delivered + prior * base) / (done(s) + prior);
    // Each 10% above the cheapest average charge costs one point of success.
    const pricePull = avg !== null && cheapest ? Math.min(0.05, ((avg - cheapest) / cheapest) * 0.1) : 0;
    return {
      code: s.code, sent: s.sent, delivered: s.delivered, returned: s.returned,
      successRate: done(s) ? Math.round((s.delivered / done(s)) * 1000) / 10 : null,
      avgCharge: avg,
      score: Math.round((share - pricePull) * 1000) / 1000,
      best: false,
    };
  });
  const enough = (r: { delivered: number; returned: number }) => r.delivered + r.returned >= minSent;
  rows.sort((a, b) => Number(enough(b)) - Number(enough(a)) || b.score - a.score || (a.avgCharge ?? Infinity) - (b.avgCharge ?? Infinity));
  if (rows[0] && enough(rows[0])) rows[0].best = true;
  return rows;
}
