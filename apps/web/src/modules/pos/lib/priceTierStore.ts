/**
 * The counter's active price tier (Retail, Wholesale or Credit) for the bill
 * being built. Kept outside React so the engine, the bill panel and industry
 * hooks (hardware and meat rate switches) read and set the same value.
 */

import { useSyncExternalStore } from 'react';
import type { PriceTier } from '@core/lib/priceTiers';

let tier: PriceTier = 'RETAIL';
const subs = new Set<() => void>();

export const getCounterTier = () => tier;

export function setCounterTier(next: PriceTier) {
  if (next === tier) return;
  tier = next;
  subs.forEach((f) => f());
}

export function useCounterTier() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getCounterTier, getCounterTier);
}
