/**
 * Counter rate for the current bill: the shop's normal (retail) rate or the
 * wholesale rate for contractors and shopkeepers. Backed by the shared POS
 * price tier, so the bill, the receipt and reports see the same tier.
 */

import type { PosSavedSale } from '@modules/pos/engine';
import { getCounterTier, setCounterTier, useCounterTier } from '@modules/pos/lib/priceTierStore';

export type RateMode = 'retail' | 'wholesale';

export const getRateMode = (): RateMode => (getCounterTier() === 'WHOLESALE' ? 'wholesale' : 'retail');
export const setRateMode = (next: RateMode) => setCounterTier(next === 'wholesale' ? 'WHOLESALE' : 'RETAIL');
export const useRateMode = (): RateMode => (useCounterTier() === 'WHOLESALE' ? 'wholesale' : 'retail');

/** Set by the bill panel (inside the router) to offer a challan after a bill. */
export const saleListener: { current: ((sale: PosSavedSale) => void) | null } = { current: null };
