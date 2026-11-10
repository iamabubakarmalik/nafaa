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

/** Price facts kept on a link (`externalData`). Every field is optional: older links carry only some. */
export interface LinkPriceState {
  /** Last price Nafaa sent, and when. */
  pushedPrice?: unknown;
  pushedPriceAt?: unknown;
  /** Last price read from the channel, and when the read started. */
  channelPrice?: unknown;
  channelPriceAt?: unknown;
  /** Last price both sides agreed on (after a push, a pull, or a match), and when. */
  syncedPrice?: unknown;
  syncedAt?: unknown;
  /** Nafaa's price for this link as last seen by the sync, and when it was first seen at that value. */
  nafaaPrice?: unknown;
  nafaaPriceAt?: unknown;
  /** Older drift re-send counters (no longer written). */
  driftPushes?: unknown;
  driftPushedAt?: unknown;
  /** Channel price a push replaced, kept for recovery. */
  channelPriceBefore?: unknown;
  /** Recovery decision already taken on this link. */
  priceRecovery?: unknown;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const time = (v: unknown): number | null => {
  const t = Date.parse(String(v ?? ''));
  return Number.isFinite(t) ? t : null;
};

/** The price both sides last agreed on: the last sync point, else the last push. */
export function agreedPrice(d: LinkPriceState | null | undefined): number | null {
  return num(d?.syncedPrice) ?? num(d?.pushedPrice);
}
function agreedAt(d: LinkPriceState): number | null {
  return num(d.syncedPrice) !== null ? time(d.syncedAt) : time(d.pushedPriceAt);
}

/**
 * The channel shows a price other than the one both sides last agreed on, read
 * after that agreement. A read that started before the last push (a slow list
 * read racing a push) does not count.
 */
export function channelMoved(d: LinkPriceState | null | undefined): boolean {
  if (!d) return false;
  const seen = num(d.channelPrice);
  const agreed = agreedPrice(d);
  if (seen === null || seen <= 0 || agreed === null || samePrice(seen, agreed)) return false;
  const seenAt = time(d.channelPriceAt);
  const at = agreedAt(d);
  return seenAt === null || at === null || seenAt > at;
}

/**
 * When Nafaa's price for a link was first seen at its current value. The sync
 * records it on the link: a recorded value that differs is a change seen now;
 * a link with nothing recorded (older links) gives null, as the time is unknown.
 */
export function nafaaSeenAt(d: LinkPriceState | null | undefined, want: number, now: number): number | null {
  const known = num(d?.nafaaPrice);
  if (known === null) return null;
  if (!samePrice(known, want)) return now;
  return time(d?.nafaaPriceAt);
}

export type PriceFromMode = 'NAFAA' | 'WEBSITE' | 'LATEST' | 'NONE';

/**
 * What the price sync does with one link:
 *  - push: send Nafaa's price to the channel;
 *  - pull: take the channel price into Nafaa;
 *  - hold: the channel changed the price after Nafaa's last push; wait for the merchant;
 *  - agree: both sides already show the same price; only record it;
 *  - skip: nothing to do.
 */
export type PriceStep = 'push' | 'pull' | 'hold' | 'agree' | 'skip';

export interface PriceInput {
  from: PriceFromMode;
  /** Nafaa's price for this link on the channel (rule and link price applied). */
  want: number;
  data: LinkPriceState | null | undefined;
  now: number;
  /** "Sync now": send Nafaa's price even when it did not change (never over a channel change). */
  force?: boolean;
  /** The link is waiting for the merchant ("kaunsi rakhein?"). */
  held?: boolean;
}

export function priceDecision(input: PriceInput): { step: PriceStep; why: string } {
  const { from, want, now } = input;
  const d = input.data ?? {};
  if (!(want > 0) || from === 'NONE') return { step: 'skip', why: 'off' };
  const seen = num(d.channelPrice);
  const agreed = agreedPrice(d);
  const moved = channelMoved(d);
  const nafaaMoved = agreed === null || !samePrice(want, agreed);
  const seenAt = time(d.channelPriceAt) ?? 0;
  const nafaaAt = nafaaSeenAt(d, want, now);

  // Both sides already show the same price: record the agreement, nothing to send.
  if (seen !== null && samePrice(seen, want)) {
    return agreed !== null && samePrice(agreed, want) && !input.held ? { step: 'skip', why: 'same' } : { step: 'agree', why: 'same' };
  }

  if (from === 'NAFAA') {
    if (moved) {
      // Nafaa's price changed after the channel's change: Nafaa's newer decision goes out.
      if (nafaaMoved && nafaaAt !== null && nafaaAt > seenAt) return { step: 'push', why: 'nafaa-newer' };
      return { step: 'hold', why: 'channel-changed' };
    }
    if (input.held) {
      // The channel went back to the agreed price: the question is gone.
      return nafaaMoved || input.force ? { step: 'push', why: 'hold-cleared' } : { step: 'agree', why: 'hold-cleared' };
    }
    if (nafaaMoved) return { step: 'push', why: agreed === null ? 'first' : 'nafaa-changed' };
    return input.force ? { step: 'push', why: 'force' } : { step: 'skip', why: 'unchanged' };
  }

  if (from === 'WEBSITE') {
    if (seen === null || seen <= 0) return { step: 'skip', why: 'not-read' };
    // The channel changed since the last agreement, or there never was one: take its price.
    if (moved || agreed === null) return { step: 'pull', why: agreed === null ? 'first' : 'channel-changed' };
    // Only Nafaa changed: the channel owns the price, so nothing is sent (shows as "Price farq").
    return { step: 'skip', why: 'nafaa-only' };
  }

  // LATEST: whichever side changed last wins.
  if (seen === null || seen <= 0) return nafaaMoved ? { step: 'push', why: 'first' } : { step: 'skip', why: 'not-read' };
  if (moved && nafaaMoved) {
    // Both changed and the order is unknown (link from before the times were kept): ask.
    if (nafaaAt === null) return { step: 'hold', why: 'both-changed' };
    return nafaaAt > seenAt ? { step: 'push', why: 'nafaa-newer' } : { step: 'pull', why: 'channel-newer' };
  }
  if (moved) return { step: 'pull', why: 'channel-changed' };
  if (nafaaMoved) {
    if (agreed !== null) return { step: 'push', why: 'nafaa-changed' };
    if (nafaaAt === null) return { step: 'hold', why: 'never-agreed' };
    return nafaaAt > seenAt ? { step: 'push', why: 'first-nafaa-newer' } : { step: 'pull', why: 'first-channel-newer' };
  }
  return input.force ? { step: 'push', why: 'force' } : { step: 'skip', why: 'unchanged' };
}

/**
 * Recovery after the old drift re-send: a link Nafaa pushed back over a price
 * the channel had set. The channel price to offer back is the one last read
 * from the channel when it differs from what Nafaa sent, else the price a
 * push replaced. A link already decided after its last drift push is left out.
 */
export function recoveryCandidate(d: LinkPriceState | null | undefined): { channelPrice: number; nafaaPrice: number; at: string | null } | null {
  if (!d) return null;
  const pushed = num(d.pushedPrice);
  if (pushed === null || pushed <= 0) return null;
  const driftAt = time(d.driftPushedAt);
  const before = (d.channelPriceBefore && typeof d.channelPriceBefore === 'object' ? d.channelPriceBefore : null) as { price?: unknown; at?: unknown; by?: unknown } | null;
  const drifted = (num(d.driftPushes) ?? 0) > 0 || driftAt !== null || !!before;
  if (!drifted) return null;
  const decided = time((d.priceRecovery as { at?: unknown } | null)?.at);
  const lastDrift = Math.max(driftAt ?? 0, time(before?.by) ?? 0);
  if (decided !== null && decided >= lastDrift) return null;
  const seen = num(d.channelPrice);
  if (seen !== null && seen > 0 && !samePrice(seen, pushed)) return { channelPrice: seen, nafaaPrice: pushed, at: typeof d.channelPriceAt === 'string' ? d.channelPriceAt : null };
  const old = num(before?.price);
  if (old !== null && old > 0 && !samePrice(old, pushed)) return { channelPrice: old, nafaaPrice: pushed, at: typeof before?.at === 'string' ? before.at : null };
  return null;
}

/**
 * Price safety guard: a push that moves the channel price too far is held for
 * the merchant instead of sent ("Qeemat bahut badal rahi hai"). Catches a link
 * made to the wrong Nafaa product, where Nafaa would otherwise overwrite the
 * listing with an unrelated price.
 */
export interface PriceGuard {
  on: boolean;
  /** Hold when the new price is this percent or more below the channel price. */
  dropPct: number;
  /** Hold when the new price is this percent or more above the channel price. */
  risePct: number;
  /** First push of a link (no agreed price yet): hold when the prices differ by this percent or more either way. */
  firstPct: number;
}

export const DEFAULT_PRICE_GUARD: PriceGuard = { on: true, dropPct: 40, risePct: 150, firstPct: 40 };

export function readPriceGuard(raw: unknown): PriceGuard {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof PriceGuard, unknown>>;
  const pct = (v: unknown, fallback: number, max: number) => {
    const n = Number(v);
    return v === undefined || v === null || v === '' || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(5, Math.round(n)));
  };
  return {
    on: r.on !== false,
    dropPct: pct(r.dropPct, DEFAULT_PRICE_GUARD.dropPct, 95),
    risePct: pct(r.risePct, DEFAULT_PRICE_GUARD.risePct, 1000),
    firstPct: pct(r.firstPct, DEFAULT_PRICE_GUARD.firstPct, 1000),
  };
}

/**
 * Whether sending `want` over the channel's current price is too big a jump.
 * The current price is the last one read from the channel; with no read there
 * is nothing to compare and the push goes ahead. Returns the change in percent
 * (negative = cheaper) when it is too big, else null.
 */
export function priceJump(input: { want: number; data: LinkPriceState | null | undefined; guard: PriceGuard }): { pct: number; current: number; first: boolean } | null {
  const { want, guard } = input;
  if (!guard.on || !(want > 0)) return null;
  const current = num(input.data?.channelPrice);
  if (current === null || current <= 0 || samePrice(current, want)) return null;
  const first = agreedPrice(input.data) === null;
  const pct = Math.round(((want - current) / current) * 1000) / 10;
  const tooBig = first ? Math.abs(pct) >= guard.firstPct : pct <= -guard.dropPct || pct >= guard.risePct;
  return tooBig ? { pct, current, first } : null;
}

/** The merchant said "Nahi" to this exact jump: the same Nafaa price is not offered again. */
export function jumpDeclined(d: { priceGuardDeclined?: unknown } | null | undefined, want: number): boolean {
  const x = d?.priceGuardDeclined as { nafaaPrice?: unknown } | null | undefined;
  const n = num(x?.nafaaPrice);
  return n !== null && samePrice(n, want);
}
