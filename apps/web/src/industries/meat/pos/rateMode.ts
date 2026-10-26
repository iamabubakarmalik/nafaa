/**
 * Counter rate for the current bill: the normal (retail) rate or the
 * restaurant / hotel rate (the item's wholesale price). Backed by the shared
 * POS price tier, so the bill, the receipt and reports see the same tier.
 */

import type { PosSavedSale } from '@modules/pos/engine';
import { setCounterTier, useCounterTier } from '@modules/pos/lib/priceTierStore';

export type RateMode = 'retail' | 'wholesale';

export const setRateMode = (next: RateMode) => setCounterTier(next === 'wholesale' ? 'WHOLESALE' : 'RETAIL');
export const useRateMode = (): RateMode => (useCounterTier() === 'WHOLESALE' ? 'wholesale' : 'retail');

/** Set by the bill panel to go back to retail rate after a bill. */
export const saleListener: { current: ((sale: PosSavedSale) => void) | null } = { current: null };
