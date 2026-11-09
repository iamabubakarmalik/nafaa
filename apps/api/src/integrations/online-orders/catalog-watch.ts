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
      externalStock: v.tracked === false ? null : v.stock,
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

export type AlertKind = 'sync' | 'unlinked' | 'disconnected' | 'price';

/**
 * Is this open channel item new? Items open on the watch's first run are the
 * baseline (not new); items that appeared later are. Before any baseline, only
 * items a product webhook announced as created count as new.
 */
export function isNewItem(state: WatchState | null | undefined, key: string, announced = false): boolean {
  if (!state) return announced;
  if (state.firstSeen[key]) return true;
  return !state.seen.includes(key);
}

/** Statuses of a sellable channel product (Shopify active, Woo publish, Daraz active). */
const LIVE_STATUSES = new Set(['active', 'publish', 'live', '']);

/**
 * Channel products to bring into Nafaa by themselves: the whole listing is
 * unlinked, nothing in Nafaa matches any of its items (a SKU match is linked
 * instead, a likely match waits for the merchant), it is live on the channel,
 * and at least one of its items is new.
 */
export function newProductPicks(input: {
  remote: Array<{ externalProductId: string; status?: string | null; variants: Array<{ externalVariantId: string | null }> }>;
  results: Array<{ item: { p: { externalProductId: string }; v: { externalVariantId: string | null } }; match: { kind: string } | null }>;
  isNew: (p: { externalProductId: string }, v: { externalVariantId: string | null }) => boolean;
}): string[] {
  const open = new Map<string, { count: number; matched: boolean; fresh: boolean }>();
  for (const { item, match } of input.results) {
    const o = open.get(item.p.externalProductId) ?? { count: 0, matched: false, fresh: false };
    o.count++;
    if (match) o.matched = true;
    if (input.isNew(item.p, item.v)) o.fresh = true;
    open.set(item.p.externalProductId, o);
  }
  return input.remote
    .filter((p) => {
      const o = open.get(p.externalProductId);
      return !!o && p.variants.length > 0 && o.count === p.variants.length && !o.matched && o.fresh && LIVE_STATUSES.has(String(p.status ?? '').toLowerCase());
    })
    .map((p) => p.externalProductId);
}

/** Auto import runs only where the merchant switched it on, Nafaa pushes to the channel, and a branch takes the stock. */
export function autoImportAllowed(cfg: { autoImport: boolean }, mode: string, shopId: string | null | undefined): boolean {
  return cfg.autoImport && (mode === 'woocommerce' || mode === 'shopify' || mode === 'daraz') && !!shopId;
}

/** At most one alert per channel and kind in a day. */
export const alertDue = (lastIso: string | null | undefined, now: number) => !lastIso || now - Date.parse(lastIso) >= DAY_MS;
