/**
 * Meat counter (web meat/pos/config.ts) on the shared POS: items sold by kg open
 * the shared weigh window (kg, gram, "Rs 500 ka" and the scale), each bill can be
 * on the normal or the restaurant rate (the item's wholesale price, through the
 * bill's price tier), and orders ready for hand-over show above the bill.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { CounterRate } from './components/CounterRate';

export const meatPos: PosIndustryConfig = {
  ...generalPos,
  id: 'meat',
  searchHint: msg('Naam, cut (qeema, boneless) ya barcode…'),
  CartExtra: CounterRate,
};

registerPosIndustry(meatPos);
