/**
 * Small cache for industry facts about a bill (restaurant order, glasses
 * order, florist delivery). Sales rows and receipts must stay synchronous, so
 * a pack reads from this cache and the first read starts one batched fetch.
 * When it lands, the sales history and the open bill are nudged to render
 * again, so chips and receipt rows appear without a manual refresh.
 */

import { apiKey } from '@/core/offline';
import { queryClient } from '@/core/query/client';

export interface BillLookup<T> {
  /** Cached value for a bill key; undefined until loaded, null when the bill has none. Starts the fetch on first ask. */
  get: (key: string) => T | null | undefined;
  /** Cached value without starting a fetch. */
  peek: (key: string) => T | null | undefined;
}

const SETTLE_MS = 60;

/** `load` gets a batch of keys and returns what it found; keys it leaves out are cached as "none". */
export function createBillLookup<T>(load: (keys: string[]) => Promise<Map<string, T>>, opts: { saleIdOf?: (key: string) => string } = {}): BillLookup<T> {
  const cache = new Map<string, T | null>();
  const queued = new Set<string>();
  const inflight = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    const keys = [...queued];
    queued.clear();
    keys.forEach((k) => inflight.add(k));
    void load(keys)
      .then((found) => keys.forEach((k) => cache.set(k, found.get(k) ?? null)))
      .catch(() => { /* offline or denied: leave unknown, ask again next time */ })
      .finally(() => {
        keys.forEach((k) => inflight.delete(k));
        if (keys.some((k) => cache.has(k))) nudge(keys.map((k) => opts.saleIdOf?.(k) ?? k));
      });
  };

  return {
    peek: (key) => cache.get(key),
    get: (key) => {
      if (cache.has(key)) return cache.get(key);
      if (!inflight.has(key) && !queued.has(key)) {
        queued.add(key);
        if (!timer) timer = setTimeout(flush, SETTLE_MS);
      }
      return undefined;
    },
  };
}

/** Makes the sales history and any open bill render again (new data field forces a fresh object). */
function nudge(saleIds: string[]) {
  void queryClient.invalidateQueries({ queryKey: ['sales-history'] });
  for (const id of saleIds) {
    const key = apiKey(`/sales/${id}`);
    if (queryClient.getQueryData(key)) queryClient.setQueryData(key, (old: unknown) => (old && typeof old === 'object' ? { ...(old as object), _industryTick: Date.now() } : old));
  }
}
