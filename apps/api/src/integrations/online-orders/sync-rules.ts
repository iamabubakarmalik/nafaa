import { createHash } from 'crypto';
import type { PriceFrom } from './website-config';

/**
 * Rules for the two-way channel sync of content (name, description, pictures)
 * and of stock edited by hand on the channel. Pure functions; the services
 * read and write. Prices have their own rules in channel-price.ts.
 */

// ═══════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════

export interface ContentSnapshot {
  title: string;
  /** Plain text (HTML tags removed, spaces collapsed). */
  description: string;
  /** Picture URLs in order. Each side is compared only with itself: a channel re-hosts pictures under its own URLs. */
  images: string[];
}

export const plainText = (html: string | null | undefined) =>
  String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

const cleanUrl = (u: string) => String(u).split('?')[0];

/** Stable fingerprint of one side's content. */
export function contentHash(c: ContentSnapshot): string {
  const body = JSON.stringify([c.title.trim(), plainText(c.description), c.images.map(cleanUrl)]);
  return createHash('sha1').update(body).digest('base64url').slice(0, 16);
}

/**
 * Content kept on a link (`externalData.content`), per side: the fingerprint
 * both sides last agreed on, and the last one seen with its time.
 */
export interface ContentState {
  nafaaSynced?: string | null;
  channelSynced?: string | null;
  syncedAt?: string | null;
  nafaaSeen?: string | null;
  nafaaSeenAt?: string | null;
  channelSeen?: string | null;
  channelSeenAt?: string | null;
  /** What Nafaa last sent (title, for the echo check) and when. */
  pushedTitle?: string | null;
  pushedAt?: string | null;
}

const ms = (v: unknown) => {
  const t = Date.parse(String(v ?? ''));
  return Number.isFinite(t) ? t : null;
};

export type ContentStep = 'push' | 'pull' | 'baseline' | 'skip';

/**
 * What the content sync does for one product on one channel. The first time
 * both sides are seen they become the baseline (nothing is copied), so turning
 * the sync on never rewrites a catalog. After that, a side "moved" when its
 * fingerprint differs from the one at the last agreement:
 *  - NAFAA: Nafaa moved → push (a channel edit is left alone);
 *  - WEBSITE: channel moved → pull;
 *  - LATEST: the side that moved, or the later one when both moved.
 */
export function contentDecision(from: PriceFrom, s: ContentState | null | undefined): { step: ContentStep; why: string } {
  if (from === 'NONE') return { step: 'skip', why: 'off' };
  const d = s ?? {};
  const nafaa = d.nafaaSeen ?? null;
  const channel = d.channelSeen ?? null;
  if (!nafaa || !channel) return { step: 'skip', why: 'not-seen' };
  if (!d.nafaaSynced || !d.channelSynced) return { step: 'baseline', why: 'first' };
  const nafaaMoved = nafaa !== d.nafaaSynced;
  const channelMoved = channel !== d.channelSynced;
  if (!nafaaMoved && !channelMoved) return { step: 'skip', why: 'same' };
  if (from === 'NAFAA') return nafaaMoved ? { step: 'push', why: 'nafaa-changed' } : { step: 'skip', why: 'channel-only' };
  if (from === 'WEBSITE') return channelMoved ? { step: 'pull', why: 'channel-changed' } : { step: 'skip', why: 'nafaa-only' };
  if (nafaaMoved && channelMoved) {
    const n = ms(d.nafaaSeenAt) ?? 0;
    const c = ms(d.channelSeenAt) ?? 0;
    return n > c ? { step: 'push', why: 'nafaa-newer' } : { step: 'pull', why: 'channel-newer' };
  }
  return nafaaMoved ? { step: 'push', why: 'nafaa-changed' } : { step: 'pull', why: 'channel-changed' };
}

/** Echo window: a channel update this soon after Nafaa's push, with Nafaa's title, is Nafaa's own change coming back. */
export const ECHO_MS = 5 * 60_000;

/**
 * Is this channel content the echo of Nafaa's own push? The channel's own
 * update time (Shopify updated_at, Woo date_modified) is at or before the
 * push plus the window, and the title is the one Nafaa sent. Pictures are
 * not compared (the channel re-hosts them).
 */
export function isContentEcho(s: ContentState | null | undefined, observed: { title: string; updatedAt: string | null }): boolean {
  const pushedAt = ms(s?.pushedAt);
  if (pushedAt === null || !s?.pushedTitle) return false;
  const at = ms(observed.updatedAt) ?? Date.now();
  return at <= pushedAt + ECHO_MS && observed.title.trim() === s.pushedTitle.trim();
}

// ═══════════════════════════════════════════════════════════
// STOCK EDITED BY HAND ON THE CHANNEL
// ═══════════════════════════════════════════════════════════

/**
 * Units changed by hand on the channel, or null when the change is Nafaa's own
 * push or an order:
 *  - the channel quantity read after Nafaa's last push (read time or the
 *    channel's own update time later than the push);
 *  - expected now = what Nafaa sent − units sold on channel orders since then
 *    + units of channel orders cancelled since then (the channel restocks them);
 *  - the hand change is what the channel shows beyond that.
 * Nothing is taken when Nafaa never sent this item a quantity.
 */
export function handEditQty(input: {
  seen: number | null | undefined;
  seenAt: string | null | undefined;
  pushed: number | null | undefined;
  pushedAt: string | null | undefined;
  soldSince?: number;
  cancelledSince?: number;
}): number | null {
  const { seen, pushed } = input;
  if (seen === null || seen === undefined || !Number.isFinite(Number(seen))) return null;
  if (pushed === null || pushed === undefined || !Number.isFinite(Number(pushed))) return null;
  const seenAt = ms(input.seenAt);
  const pushedAt = ms(input.pushedAt);
  // A read from before (or at) Nafaa's push is the old quantity or the push itself coming back.
  if (pushedAt !== null && (seenAt === null || seenAt <= pushedAt)) return null;
  const expected = Number(pushed) - (input.soldSince ?? 0) + (input.cancelledSince ?? 0);
  const delta = Math.round((Number(seen) - expected) * 10_000) / 10_000;
  return delta === 0 ? null : delta;
}

/** Units of one channel item in a list of normalized order items. */
export function orderUnits(items: unknown, externalProductId: string | null, externalVariantId: string | null): number {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items as Array<Record<string, unknown>>) {
    const v = it?.externalVariantId ? String(it.externalVariantId) : null;
    const p = it?.externalProductId ? String(it.externalProductId) : null;
    const hit = externalVariantId ? v === externalVariantId : !v && p === externalProductId;
    if (hit) n += Number(it.quantity) || 0;
  }
  return n;
}
