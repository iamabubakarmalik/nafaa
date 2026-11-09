/**
 * Ad rules engine (pure). A rule looks at one campaign's numbers over the last
 * N days and proposes one change: pause, lower or raise the daily budget.
 * ROAS and cost per order come from Nafaa's own delivered orders (marketing
 * attribution), not from Meta's purchase count, because a COD order only
 * counts once it is delivered.
 *
 * Rules run in "suggest" mode by default: the change waits for the shop to
 * apply it. In "auto" mode the change is applied within the shop's daily
 * caps (total budget change % per campaign and number of changes per day).
 * Every applied change records its before/after state so it can be undone.
 */

export const RULE_KINDS = ['ROAS_PAUSE', 'CPA_LOWER', 'ROAS_RAISE', 'SPEND_CAP'] as const;
export type RuleKind = (typeof RULE_KINDS)[number];
export type RuleMode = 'SUGGEST' | 'AUTO';

export interface AdRule {
  id: string;
  name: string;
  kind: RuleKind;
  /** ROAS (x) for ROAS rules, Rs per delivered order for CPA, Rs per day for SPEND_CAP. */
  threshold: number;
  /** Look-back window in days (ignored by SPEND_CAP, which reads today). */
  days: number;
  /** Budget change in % for CPA_LOWER / ROAS_RAISE. */
  pct: number;
  /** Least spend in the window before the rule may act (Rs). */
  minSpend: number;
  /** Meta campaign ids; empty = every campaign. */
  campaignIds: string[];
  mode: RuleMode;
  enabled: boolean;
}

export interface CampaignStat {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | string;
  /** Daily budget in the ad account's currency when the campaign holds it. */
  dailyBudget: number | null;
  currency: string;
  /** Spend over the rule window, Rs. */
  spend: number;
  delivered: number;
  deliveredSales: number;
  /** Delivered sale ÷ spend (Nafaa's attribution); null with no spend. */
  roas: number | null;
  /** Spend ÷ delivered orders, Rs; null with none delivered. */
  cpa: number | null;
  /** Meta's own purchase ROAS, shown next to ours. */
  metaRoas: number | null;
  /** Spend so far today, Rs. */
  todaySpend: number;
}

export type ActionKind = 'PAUSE' | 'RESUME' | 'BUDGET' | 'DUPLICATE' | 'CREATE';

export interface ObjectState {
  status?: string;
  dailyBudget?: number | null;
  /** Ids created by a duplicate or the Boost wizard (undo deletes them). */
  createdIds?: string[];
}

export interface RuleReason {
  kind: RuleKind;
  /** The measured value (ROAS, Rs per order, or Rs spent today). */
  value: number | null;
  threshold: number;
  days: number;
  spend: number;
  delivered: number;
}

export interface ProposedAction {
  ruleId: string;
  ruleName: string;
  mode: RuleMode;
  campaignId: string;
  campaignName: string;
  action: ActionKind;
  before: ObjectState;
  after: ObjectState;
  /** Signed budget change in %, for BUDGET. */
  changePct: number;
  reason: RuleReason;
}

const PRIORITY: Record<RuleKind, number> = { SPEND_CAP: 0, ROAS_PAUSE: 1, CPA_LOWER: 2, ROAS_RAISE: 3 };

const clampNum = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

export const RULE_DEFAULTS: Record<RuleKind, { threshold: number; days: number; pct: number; minSpend: number }> = {
  ROAS_PAUSE: { threshold: 1, days: 3, pct: 0, minSpend: 2000 },
  CPA_LOWER: { threshold: 800, days: 3, pct: 20, minSpend: 2000 },
  ROAS_RAISE: { threshold: 3, days: 3, pct: 20, minSpend: 2000 },
  SPEND_CAP: { threshold: 5000, days: 1, pct: 0, minSpend: 0 },
};

/** Cleans a posted rule; throws a short reason key on bad input. */
export function normalizeRule(raw: any, id = ''): AdRule {
  const kind = RULE_KINDS.includes(raw?.kind) ? (raw.kind as RuleKind) : null;
  if (!kind) throw new Error('KIND');
  const d = RULE_DEFAULTS[kind];
  const threshold = Number(raw?.threshold ?? d.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 10_000_000) throw new Error('THRESHOLD');
  return {
    id,
    name: String(raw?.name ?? '').trim().slice(0, 80),
    kind,
    threshold: Math.round(threshold * 100) / 100,
    days: Math.round(clampNum(raw?.days, 1, 30, d.days)),
    pct: kind === 'CPA_LOWER' || kind === 'ROAS_RAISE' ? Math.round(clampNum(raw?.pct, 5, 100, d.pct)) : 0,
    minSpend: Math.round(clampNum(raw?.minSpend, 0, 10_000_000, d.minSpend)),
    campaignIds: [...new Set((Array.isArray(raw?.campaignIds) ? raw.campaignIds : []).map(String).filter((x: string) => /^\d+$/.test(x)))].slice(0, 100) as string[],
    mode: raw?.mode === 'AUTO' ? 'AUTO' : 'SUGGEST',
    enabled: raw?.enabled !== false,
  };
}

/** The change one rule wants for one campaign, or null. */
export function ruleAction(rule: AdRule, c: CampaignStat): ProposedAction | null {
  if (!rule.enabled) return null;
  if (rule.campaignIds.length && !rule.campaignIds.includes(c.id)) return null;
  if (c.status !== 'ACTIVE') return null;
  const reason = (value: number | null): RuleReason => ({ kind: rule.kind, value, threshold: rule.threshold, days: rule.days, spend: c.spend, delivered: c.delivered });
  const base = { ruleId: rule.id, ruleName: rule.name, mode: rule.mode, campaignId: c.id, campaignName: c.name };
  const pause = (value: number | null): ProposedAction => ({ ...base, action: 'PAUSE', before: { status: 'ACTIVE' }, after: { status: 'PAUSED' }, changePct: 0, reason: reason(value) });
  const budget = (pct: number, value: number | null): ProposedAction | null => {
    if (c.dailyBudget === null || c.dailyBudget <= 0) return null;
    const next = Math.max(1, Math.round(c.dailyBudget * (1 + pct / 100)));
    if (next === c.dailyBudget) return null;
    return { ...base, action: 'BUDGET', before: { dailyBudget: c.dailyBudget }, after: { dailyBudget: next }, changePct: pct, reason: reason(value) };
  };

  switch (rule.kind) {
    case 'SPEND_CAP':
      return c.todaySpend >= rule.threshold ? pause(c.todaySpend) : null;
    case 'ROAS_PAUSE':
      if (c.spend < rule.minSpend) return null;
      // No delivered sale at all after the minimum spend counts as ROAS 0.
      return (c.roas ?? 0) < rule.threshold ? pause(c.roas ?? 0) : null;
    case 'CPA_LOWER':
      if (c.spend < rule.minSpend) return null;
      // With nothing delivered the cost per order is at least the whole spend.
      return (c.cpa ?? c.spend) > rule.threshold ? budget(-rule.pct, c.cpa) : null;
    case 'ROAS_RAISE':
      if (c.spend < rule.minSpend || c.roas === null) return null;
      return c.roas > rule.threshold ? budget(rule.pct, c.roas) : null;
  }
}

/**
 * Every rule against every campaign; one action per campaign, the most
 * protective first (spend cap, then pause, then lower, then raise).
 */
export function evaluateRules(rules: AdRule[], stats: CampaignStat[]): ProposedAction[] {
  const ordered = [...rules].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]);
  const out: ProposedAction[] = [];
  for (const c of stats) {
    for (const r of ordered) {
      const a = ruleAction(r, c);
      if (a) { out.push(a); break; }
    }
  }
  return out;
}

export interface Caps {
  /** Largest total budget change per campaign per day, % (absolute). */
  maxChangePct: number;
  /** Largest number of automatic changes per day for the shop. */
  maxActions: number;
}

export const DEFAULT_CAPS: Caps = { maxChangePct: 30, maxActions: 10 };

export interface HeldAction extends ProposedAction { held: 'CAP_PCT' | 'CAP_COUNT' }

/**
 * Splits automatic actions into those allowed today and those held by the
 * caps. A budget change bigger than what is left of the day's % is cut down
 * to what is left. `usedPct` is the absolute % already changed today per
 * campaign; `usedCount` the automatic changes already made today.
 */
export function applyCaps(actions: ProposedAction[], caps: Caps, usedPct: Map<string, number>, usedCount: number): { allowed: ProposedAction[]; held: HeldAction[] } {
  const allowed: ProposedAction[] = [];
  const held: HeldAction[] = [];
  let count = usedCount;
  const used = new Map(usedPct);
  for (const a of actions) {
    if (count >= caps.maxActions) { held.push({ ...a, held: 'CAP_COUNT' }); continue; }
    if (a.action === 'BUDGET') {
      const left = caps.maxChangePct - (used.get(a.campaignId) ?? 0);
      if (left < 1) { held.push({ ...a, held: 'CAP_PCT' }); continue; }
      const pct = Math.sign(a.changePct) * Math.min(Math.abs(a.changePct), left);
      const before = a.before.dailyBudget as number;
      const next = Math.max(1, Math.round(before * (1 + pct / 100)));
      used.set(a.campaignId, (used.get(a.campaignId) ?? 0) + Math.abs(pct));
      allowed.push({ ...a, changePct: pct, after: { dailyBudget: next } });
    } else {
      allowed.push(a);
    }
    count++;
  }
  return { allowed, held };
}

/** The change that puts an applied action back. */
export function undoOf(a: { action: ActionKind; before: ObjectState; after: ObjectState }): { action: 'SET_STATUS' | 'SET_BUDGET' | 'DELETE'; status?: string; dailyBudget?: number; ids?: string[] } {
  switch (a.action) {
    case 'PAUSE':
    case 'RESUME':
      return { action: 'SET_STATUS', status: a.before.status ?? (a.action === 'PAUSE' ? 'ACTIVE' : 'PAUSED') };
    case 'BUDGET':
      if (typeof a.before.dailyBudget !== 'number') throw new Error('NO_BEFORE');
      return { action: 'SET_BUDGET', dailyBudget: a.before.dailyBudget };
    case 'DUPLICATE':
    case 'CREATE':
      return { action: 'DELETE', ids: a.after.createdIds ?? [] };
  }
}
