/**
 * Text tokens (API-CONTRACT 3.1): `{{price:basic.monthly}}`,
 * `{{price:min.monthly}}`, `{{count:industries}}`, `{{fact:compliance.fbrPra}}`
 * and `{{year}}`.
 *
 * Pure functions over a `TokenContext`. `CmsTokenService` builds the context
 * from the Plan table, published entry counts and settings `entity`.
 */
import {
  findTokens,
  type CountTokenKey,
  type FoundToken,
  type ParsedToken,
} from '../contract/cms-contract';

/** The Plan columns a price token reads. Only active, public plans belong here. */
export interface TokenPlan {
  slug: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
}

export interface TokenContext {
  plans: readonly TokenPlan[];
  counts: Readonly<Record<CountTokenKey, number>>;
  /** Raw settings `entity` value for the locale (or null when not set). */
  entity: unknown;
  /** Current year in Asia/Karachi. */
  year: number;
}

export type TokenProblemReason = 'syntax' | 'unknown_plan' | 'unknown_fact' | 'no_price';

export interface TokenProblem {
  raw: string;
  index: number;
  reason: TokenProblemReason;
}

/** PKR as shown on the site: "Rs 1,500". Whole rupees unless the plan has paisa. */
export function formatPkr(amount: number): string {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `Rs ${formatted}`;
}

/** Thousands separators for counts: 1234 → "1,234". */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/** Lowest non-zero monthly price among the given plans, or null. */
export function minMonthlyPrice(plans: readonly TokenPlan[]): number | null {
  let min: number | null = null;
  for (const plan of plans) {
    if (plan.priceMonthly > 0 && (min === null || plan.priceMonthly < min)) min = plan.priceMonthly;
  }
  return min;
}

/**
 * Reads a dotted path from settings `entity`. Strings and numbers are used as
 * is; an object with a `text` string (compliance statements) gives its text;
 * an array of strings is joined with ", ". Anything else is unknown.
 */
export function lookupFact(entity: unknown, path: string): string | null {
  let current: unknown = entity;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return null;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  if (typeof current === 'string') return current.trim() === '' ? null : current;
  if (typeof current === 'number' && Number.isFinite(current)) return String(current);
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    const text = (current as { text?: unknown }).text;
    return typeof text === 'string' && text.trim() !== '' ? text : null;
  }
  if (Array.isArray(current) && current.length > 0 && current.every((v) => typeof v === 'string')) {
    return (current as string[]).join(', ');
  }
  return null;
}

/** The value of one parsed token, or the reason it has none. */
export function resolveToken(token: ParsedToken, ctx: TokenContext): { value: string } | { reason: TokenProblemReason } {
  switch (token.kind) {
    case 'year':
      return { value: String(ctx.year) };
    case 'count':
      return { value: formatCount(ctx.counts[token.key] ?? 0) };
    case 'priceMin': {
      const min = minMonthlyPrice(ctx.plans);
      return min === null ? { reason: 'no_price' } : { value: formatPkr(min) };
    }
    case 'price': {
      const plan = ctx.plans.find((p) => p.slug === token.planSlug);
      if (!plan) return { reason: 'unknown_plan' };
      const amount =
        token.period === 'monthly' ? plan.priceMonthly : token.period === 'quarterly' ? plan.priceQuarterly : plan.priceYearly;
      return { value: formatPkr(amount) };
    }
    case 'fact': {
      const value = lookupFact(ctx.entity, token.path);
      return value === null ? { reason: 'unknown_fact' } : { value };
    }
  }
}

/** Checks every token in a string without changing it. */
export function tokenProblems(text: string, ctx: TokenContext): TokenProblem[] {
  const problems: TokenProblem[] = [];
  for (const found of findTokens(text)) {
    const problem = problemFor(found, ctx);
    if (problem) problems.push(problem);
  }
  return problems;
}

function problemFor(found: FoundToken, ctx: TokenContext): TokenProblem | null {
  if (!found.token) return { raw: found.raw, index: found.index, reason: 'syntax' };
  const result = resolveToken(found.token, ctx);
  return 'reason' in result ? { raw: found.raw, index: found.index, reason: result.reason } : null;
}

/**
 * Replaces every token with its value. Tokens that cannot be resolved are
 * kept as written (`keep`, for the admin) or removed (`remove`, for public
 * responses, so visitors never see braces).
 */
export function resolveTokensInText(
  text: string,
  ctx: TokenContext,
  onUnresolved: 'keep' | 'remove' = 'remove',
): { text: string; problems: TokenProblem[] } {
  if (!text.includes('{{')) return { text, problems: [] };
  const problems: TokenProblem[] = [];
  let out = '';
  let last = 0;
  for (const found of findTokens(text)) {
    out += text.slice(last, found.index);
    last = found.index + found.raw.length;
    const result = found.token ? resolveToken(found.token, ctx) : ({ reason: 'syntax' } as const);
    if ('value' in result) {
      out += result.value;
    } else {
      problems.push({ raw: found.raw, index: found.index, reason: result.reason });
      if (onUnresolved === 'keep') out += found.raw;
    }
  }
  out += text.slice(last);
  return { text: out, problems };
}

/** Roman Urdu message for a token problem (shown as is in the admin). */
export function tokenProblemMessage(problem: TokenProblem): string {
  switch (problem.reason) {
    case 'syntax':
      return `Token samajh nahi aaya: ${problem.raw}`;
    case 'unknown_plan':
      return `Token me plan nahi mila (Admin → Plans me active aur public plan chahiye): ${problem.raw}`;
    case 'unknown_fact':
      return `Token ki fact Settings → Entity facts me nahi mili: ${problem.raw}`;
    case 'no_price':
      return `Koi active public plan price ke saath nahi: ${problem.raw}`;
  }
}
