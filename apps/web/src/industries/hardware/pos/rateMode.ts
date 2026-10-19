/**
 * Counter rate for the current bill: the shop's normal (retail) rate or the
 * wholesale rate for contractors and shopkeepers. Kept outside React so the
 * POS hooks (beforeAdd) and the bill panel read the same value.
 */

import { useSyncExternalStore } from 'react';
import type { PosSavedSale } from '@modules/pos/engine';

export type RateMode = 'retail' | 'wholesale';

let mode: RateMode = 'retail';
const subs = new Set<() => void>();

export const getRateMode = () => mode;
export function setRateMode(next: RateMode) {
  if (next === mode) return;
  mode = next;
  subs.forEach((f) => f());
}
export function useRateMode() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getRateMode, getRateMode);
}

/** Set by the bill panel (inside the router) to offer a challan after a bill. */
export const saleListener: { current: ((sale: PosSavedSale) => void) | null } = { current: null };
