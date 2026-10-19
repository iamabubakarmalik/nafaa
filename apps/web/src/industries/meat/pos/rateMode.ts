/**
 * Counter rate for the current bill: the normal (retail) rate or the
 * restaurant / hotel rate (the item's wholesale price). Kept outside React
 * so the catalog hook and the bill panel read the same value.
 */

import { useSyncExternalStore } from 'react';
import type { PosSavedSale } from '@modules/pos/engine';

export type RateMode = 'retail' | 'wholesale';

let mode: RateMode = 'retail';
const subs = new Set<() => void>();

const getRateMode = () => mode;
export function setRateMode(next: RateMode) {
  if (next === mode) return;
  mode = next;
  subs.forEach((f) => f());
}
export function useRateMode() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getRateMode, getRateMode);
}

/** Set by the bill panel to go back to retail rate after a bill. */
export const saleListener: { current: ((sale: PosSavedSale) => void) | null } = { current: null };
