/** Same-formula matching for the pharmacy counter. */

import type { PosItem } from '@modules/pos/engine';

/**
 * Shelf items with exactly the same salts and strengths as `item`, cheapest
 * first. Out-of-stock ones are left out unless `includeEmpty` is set; then
 * they come after the in-stock ones.
 */
export function substitutesFor(item: PosItem, all: PosItem[], opts: { includeEmpty?: boolean } = {}): PosItem[] {
  const key = item.meta?.salts;
  if (!key) return [];
  return all
    .filter((o) => o.id !== item.id && o.meta?.salts === key && (opts.includeEmpty || o.stock > 0))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.price - b.price);
}
