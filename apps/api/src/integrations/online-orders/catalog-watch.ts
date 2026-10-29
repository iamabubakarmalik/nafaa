import { createHash } from 'crypto';
import type { LinkInput, RemoteProduct, RemoteVariant } from './channel-catalog.service';
import type { MatchResult } from './product-matcher';

/** One read of a channel's product list, matched against the Nafaa catalog. */
export interface ScanResult {
  at: string;
  remote: RemoteProduct[];
  remoteError: string | null;
  remoteFailure: unknown;
  linked: number;
  open: Array<{ p: RemoteProduct; v: RemoteVariant }>;
  results: Array<{ item: { p: RemoteProduct; v: RemoteVariant }; match: MatchResult | null }>;
  products: Map<string, { id: string; name: string; sku: string | null; price: number; hasVariants: boolean; variants: Array<{ id: string; name: string; sku: string | null; price: number }> }>;
  isLinked: (p: RemoteProduct, v: RemoteVariant) => unknown;
}

/** Only exact SKU/barcode ("Pakka") matches. */
export function pickSureLinks(results: ScanResult['results']): LinkInput[] {
  return results
    .filter((r) => r.match?.kind === 'sku')
    .map(({ item: { p, v }, match }) => ({
      externalProductId: p.externalProductId,
      externalVariantId: v.externalVariantId,
      productId: match!.productId,
      variantId: match!.variantId,
      externalTitle: p.hasVariants ? `${p.title} — ${v.title}` : p.title,
      externalImage: v.image ?? p.image,
      externalSku: v.sku,
    }));
}

/** Short, stable id for a channel item (kept in the channel config). */
export const itemKey = (p: { externalProductId: string }, v: { externalVariantId: string | null }) =>
  createHash('sha1').update(`${p.externalProductId}:${v.externalVariantId ?? '-'}`).digest('base64url').slice(0, 10);

/** What the watch remembers per channel between runs. */
export interface WatchState {
  /** Open (unlinked) items seen on the last run. */
  seen: string[];
  /** Items that appeared after watching began, with the time they were first seen. */
  firstSeen: Record<string, string>;
}

const MAX_KEYS = 5000;
const DAY_MS = 24 * 3600_000;

/**
 * Next watch state from the open items of this run. The very first run is the
 * baseline: what is already on the channel is not "new". Linked or removed
 * items drop out. Returns how many new items have stayed unlinked for 24 h.
 */
export function watchStep(prev: WatchState | null | undefined, openKeys: string[], now: number): { state: WatchState; staleNew: number } {
  const open = [...new Set(openKeys)].slice(0, MAX_KEYS);
  if (!prev) return { state: { seen: open, firstSeen: {} }, staleNew: 0 };
  const before = new Set(prev.seen);
  const firstSeen: Record<string, string> = {};
  const iso = new Date(now).toISOString();
  for (const k of open) {
    if (prev.firstSeen[k]) firstSeen[k] = prev.firstSeen[k];
    else if (!before.has(k)) firstSeen[k] = iso;
  }
  const staleNew = Object.values(firstSeen).filter((t) => now - Date.parse(t) >= DAY_MS).length;
  return { state: { seen: open, firstSeen }, staleNew };
}

export type AlertKind = 'sync' | 'unlinked' | 'disconnected';

/** At most one alert per channel and kind in a day. */
export const alertDue = (lastIso: string | null | undefined, now: number) => !lastIso || now - Date.parse(lastIso) >= DAY_MS;
