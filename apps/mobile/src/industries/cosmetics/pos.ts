/**
 * Cosmetics counter (web cosmetics/pos/config.ts) on the shared POS: shades are
 * variants (the counter asks which shade), expiry batches are sold earliest
 * first by the server, and deals are combos with their own tab.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';

export const cosmeticsPos: PosIndustryConfig = {
  ...generalPos,
  id: 'cosmetics',
  searchHint: msg('Naam, brand, shade ya barcode…'),
  // Printed on the bill, which follows the shop's language.
  receiptFooter: 'Khula hua cosmetics wapas nahi hota. Shukriya!',
};

registerPosIndustry(cosmeticsPos);
