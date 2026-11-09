/**
 * Stock handover between Nafaa and a sales channel.
 *
 * When a channel item is imported or linked, its stock on the channel is the
 * merchant's real number. Nafaa must never overwrite it with an unknown or
 * empty Nafaa stock. The rules here are pure so they can be tested:
 *
 *  - a new link whose Nafaa and channel stock differ starts on hold;
 *  - a link that was never pushed is not sent 0 (or a large drop) while the
 *    channel last showed positive stock: it is put on hold instead;
 *  - an item the channel does not count (Shopify "Track quantity" off,
 *    WooCommerce "Manage stock" off) is never switched to counted, unless the
 *    merchant opted in for that link.
 */

export type HoldReason = 'link' | 'import' | 'guard';

export interface StockHold {
  since: string;
  /** Channel stock when the hold started; null when unknown. */
  channelStock: number | null;
  nafaaStock: number;
  reason: HoldReason;
}

export function readHold(v: unknown): StockHold | null {
  if (!v || typeof v !== 'object') return null;
  const h = v as Record<string, unknown>;
  if (!h.since) return null;
  const cs = h.channelStock === null || h.channelStock === undefined ? null : Number(h.channelStock);
  return {
    since: String(h.since),
    channelStock: cs !== null && Number.isFinite(cs) ? cs : null,
    nafaaStock: Number(h.nafaaStock) || 0,
    reason: (['link', 'import', 'guard'].includes(String(h.reason)) ? h.reason : 'guard') as HoldReason,
  };
}

/**
 * Hold for a link made now, or null when it may start pushing at once:
 * the channel does not count stock, its stock is unknown, or both sides agree.
 */
export function holdOnLink(input: { nafaaStock: number; channelStock: number | null | undefined; tracks?: boolean | null; reason: HoldReason; now?: Date }): StockHold | null {
  if (input.tracks === false) return null;
  if (input.channelStock === null || input.channelStock === undefined || !Number.isFinite(Number(input.channelStock))) return null;
  const channel = Math.max(0, Math.floor(Number(input.channelStock)));
  const nafaa = Math.max(0, Math.floor(Number(input.nafaaStock) || 0));
  if (channel === nafaa) return null;
  return { since: (input.now ?? new Date()).toISOString(), channelStock: channel, nafaaStock: Number(input.nafaaStock) || 0, reason: input.reason };
}

/** A drop counts as large above this many units and below this share of the channel stock. */
export const DROP_UNITS = 5;
export const DROP_SHARE = 0.5;

export type BlockReason = 'held' | 'zero' | 'drop';

/**
 * Safety net for every stock push. Returns why the push must not go out for
 * this link, or null when it may. Links pushed before keep working as they did.
 */
export function handoverBlock(c: { want: number; channelQty: number | null | undefined; pushedBefore: boolean; held?: boolean }): BlockReason | null {
  if (c.held) return 'held';
  if (c.pushedBefore) return null;
  const current = c.channelQty === null || c.channelQty === undefined ? null : Number(c.channelQty);
  if (current === null || !Number.isFinite(current) || current <= 0) return null;
  const want = Math.max(0, Math.floor(Number(c.want) || 0));
  if (want <= 0) return 'zero';
  if (current - want > DROP_UNITS && want < current * DROP_SHARE) return 'drop';
  return null;
}

/**
 * Has Nafaa sent stock to this link before, or did the merchant choose to
 * send Nafaa stock? (lastPush is set by every recorded push.)
 */
export function pushedBefore(m: { lastPush?: unknown; externalData?: unknown }): boolean {
  const d = (m.externalData ?? {}) as any;
  if (d.firstStockPush || d.handoverAt) return true;
  return !!m.lastPush && typeof m.lastPush === 'object';
}

/** What a stock push does with one channel item, by whether the channel counts its stock. */
export function trackDecision(tracked: boolean | null | undefined, optedIn: boolean): 'push' | 'start-count' | 'skip' {
  if (tracked !== false) return 'push';
  return optedIn ? 'start-count' : 'skip';
}

/** The merchant asked Nafaa to start counting this link's stock on the channel. */
export const countOptedIn = (externalData: unknown) => !!(externalData as any)?.countOptInAt;

/**
 * Shopify mutation and variables that set "Track quantity" back off for
 * inventory items (recovery). One call per item: inventoryItemUpdate takes one id.
 */
export function shopifyUntrackCalls(inventoryItemIds: string[]): Array<{ query: string; variables: { id: string; input: { tracked: false } } }> {
  const query = 'mutation($id: ID!, $input: InventoryItemInput!) { inventoryItemUpdate(id: $id, input: $input) { inventoryItem { id tracked } userErrors { field message } } }';
  return [...new Set(inventoryItemIds.filter(Boolean))].map((id) => ({
    query,
    variables: { id: id.startsWith('gid://') ? id : `gid://shopify/InventoryItem/${id}`, input: { tracked: false } },
  }));
}

/**
 * A Shopify item counts as wiped by the import when Nafaa imported it with
 * 0 stock (the item was not counted then) and it is now counted with 0 available.
 */
export function untrackCandidate(r: { importQty: number | null; tracked: boolean | null; available: number | null; tracksStockOnLink?: boolean | null }): boolean {
  if (r.tracked !== true) return false;
  if (r.available !== null && r.available > 0) return false;
  return r.importQty === 0 || r.tracksStockOnLink === false;
}
