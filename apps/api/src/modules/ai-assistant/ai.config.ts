/**
 * Nafaa AI settings: models, limits and environment switches.
 *
 * Environment:
 *   ANTHROPIC_API_KEY   Claude API key. Without it the assistant still works
 *                       on its rules (common questions, parsed actions) and
 *                       answers open questions with suggestion chips.
 *   AI_PROVIDER         "mock" forces the rules provider even with a key (local
 *                       testing); the route is marked in a response header only.
 *   AI_MODEL            Model for everyday chat (default claude-haiku-5-5).
 *   AI_MODEL_DEEP       Model for Smart mode (default claude-opus-5-5).
 *   AI_MODEL_ANALYSIS   Model for analysis questions asked in Fast mode
 *                       (default claude-sonnet-5-5).
 *   AI_DAILY_LIMIT      Overrides the per-plan daily message limit (all plans).
 *   AI_MORNING_TIME     Local time of the morning summary when the shop's own
 *                       report time is in the evening (default 09:00).
 */

export const AI_DEFAULT_MODEL = 'claude-haiku-5-5';
export const AI_DEFAULT_DEEP_MODEL = 'claude-opus-5-5';
export const AI_DEFAULT_ANALYSIS_MODEL = 'claude-sonnet-5-5';

/**
 * US dollars per million tokens (Claude API list prices, Oct 2026). One token
 * at $X per million costs X micro-dollars, so cost in micros is tokens × price.
 */
export const AI_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

export interface AiTokenUsage { input: number; output: number; cacheRead: number; cacheWrite: number }

export function costMicros(model: string, u: AiTokenUsage): number {
  const p = AI_PRICES[model] ?? AI_PRICES[AI_DEFAULT_DEEP_MODEL];
  return Math.round(u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite);
}

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
export const AI_FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

/** Messages a shop (tenant) may send per business day, by plan slug. */
export const AI_DAILY_LIMITS: Record<string, number> = {
  'free-trial': 20,
  basic: 30,
  pro: 100,
  enterprise: 300,
};
export const AI_DAILY_LIMIT_FALLBACK = 20;

/** A deep question uses the larger model and counts as this many messages. */
export const AI_DEEP_COST = 3;

/** Per-user burst limit: at most this many questions in the window. */
export const AI_USER_BURST = { max: 6, windowMs: 60_000 };

/** Recent messages sent verbatim; older turns go in as a short running summary. */
export const AI_RECENT_MESSAGES = 6;
export const AI_MAX_MESSAGE_CHARS = 2000;
export const AI_SUMMARY_CHARS = 1500;

/** Tool-use rounds per question before the answer is forced out. */
export const AI_MAX_TOOL_ROUNDS = 6;

/** Output budget per model call (answers are short; streaming is used). */
export const AI_MAX_TOKENS = 4096;

/** Morning summary time when the shop's report time is not in the morning. */
export const AI_MORNING_FALLBACK_TIME = '09:00';

/** anthropic = Claude; rules = no key (rules only); mock = rules forced for testing. */
export type AiProviderKind = 'anthropic' | 'rules' | 'mock';

export function aiProviderKind(): AiProviderKind {
  if ((process.env.AI_PROVIDER ?? '').trim().toLowerCase() === 'mock') return 'mock';
  return process.env.ANTHROPIC_API_KEY?.trim() ? 'anthropic' : 'rules';
}

export function aiModels() {
  return {
    chat: process.env.AI_MODEL?.trim() || AI_DEFAULT_MODEL,
    deep: process.env.AI_MODEL_DEEP?.trim() || AI_DEFAULT_DEEP_MODEL,
    analysis: process.env.AI_MODEL_ANALYSIS?.trim() || AI_DEFAULT_ANALYSIS_MODEL,
  };
}

export function dailyLimitFor(planSlug: string | null | undefined): number {
  const override = Number(process.env.AI_DAILY_LIMIT);
  if (Number.isFinite(override) && override > 0) return Math.floor(override);
  return AI_DAILY_LIMITS[planSlug ?? ''] ?? AI_DAILY_LIMIT_FALLBACK;
}

/** Shown when an answer could not be produced. Product wording only; no vendor or setup words. */
export const AI_BUSY_MESSAGE = 'Nafaa AI abhi jawab nahi de pa raha. Thori der baad dobara poochein.';
/** Rules answer to an open question it cannot handle; suggestion chips follow. */
export const AI_UNSURE_MESSAGE = 'Ye sawal abhi main nahi samajh saka — in me se koi poochein:';
export const AI_UNSURE_MESSAGE_EN = "I couldn't understand that one yet — try one of these:";
