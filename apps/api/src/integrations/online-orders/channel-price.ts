/**
 * Channel price math. A channel can carry a rule on the Nafaa retail price
 * (percent or fixed rupees up or down, then rounding); a single link can
 * carry a manual price that wins over the rule.
 */

export type PriceRuleMode = 'NONE' | 'PERCENT' | 'FIXED';
export type PriceRounding = 'NONE' | 'NEAREST_10' | 'END_9';

export interface PriceRule {
  mode: PriceRuleMode;
  /** Positive raises the price, negative lowers it (percent or rupees). */
  value: number;
  rounding: PriceRounding;
}

export const NO_PRICE_RULE: PriceRule = { mode: 'NONE', value: 0, rounding: 'NONE' };

export function readPriceRule(raw: unknown): PriceRule {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<PriceRule>;
  const mode: PriceRuleMode = r.mode === 'PERCENT' || r.mode === 'FIXED' ? r.mode : 'NONE';
  const rounding: PriceRounding = r.rounding === 'NEAREST_10' || r.rounding === 'END_9' ? r.rounding : 'NONE';
  let value = Number(r.value);
  if (!Number.isFinite(value)) value = 0;
  // A percent cut of 100% or more would give the item away.
  if (mode === 'PERCENT') value = Math.min(500, Math.max(-90, value));
  if (mode === 'FIXED') value = Math.min(1_000_000, Math.max(-1_000_000, value));
  return { mode, value: mode === 'NONE' ? 0 : Math.round(value * 100) / 100, rounding };
}

export function applyPriceRule(base: number, rule: PriceRule): number {
  const b = Number(base) || 0;
  if (b <= 0) return 0;
  let p = b;
  if (rule.mode === 'PERCENT') p = b * (1 + rule.value / 100);
  else if (rule.mode === 'FIXED') p = b + rule.value;
  if (p <= 0) return 0;
  if (rule.rounding === 'NEAREST_10') return Math.max(10, Math.round(p / 10) * 10);
  if (rule.rounding === 'END_9') {
    const r = Math.round(p / 10) * 10 - 1;
    return r > 0 ? r : Math.round(p);
  }
  return Math.round(p * 100) / 100;
}

/** The price this link should have on the channel. */
export function channelPrice(base: number, rule: PriceRule, override?: number | null): number {
  if (override !== null && override !== undefined && Number(override) > 0) return Math.round(Number(override) * 100) / 100;
  return applyPriceRule(base, rule);
}

/** Prices are compared in whole rupees: paisa differences are not a mismatch. */
export const samePrice = (a: number | null | undefined, b: number | null | undefined) =>
  a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(Number(a) - Number(b)) < 1;
