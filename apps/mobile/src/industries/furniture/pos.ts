/**
 * Furniture counter (web furniture/pos/config.ts) on the shared POS: showroom
 * stock with colour / fabric variants, paid like any bill (cash, card, split,
 * udhaar). After a bill the delivery is booked from Deliveries (or the order);
 * the receipt footer states the delivery and return terms.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';

export const furniturePos: PosIndustryConfig = {
  ...generalPos,
  id: 'furniture',
  searchHint: msg('Naam, lakri, rang ya barcode'),
  receiptFooter: 'Delivery aur fitting ke charges alag bill par. Furniture le jane ke baad wapsi dukaan ki shart par.',
};

registerPosIndustry(furniturePos);
