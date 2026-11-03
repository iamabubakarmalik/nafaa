/**
 * Jewelry counter (web JewelryPosPage): pieces are priced from their weight
 * at today's rate, so the pack brings its own counter screen in place of the
 * shared one. Bill, receipt, khata and reports stay the shared ones.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry } from '@/modules/pos/engine/industry';
import { JewelryCounterScreen } from './screens/JewelryCounterScreen';

registerPosIndustry({ ...generalPos, id: 'jewelry', combos: false, quickKeys: false, searchHint: msg('Naam, design number, hallmark, barcode…'), Screen: JewelryCounterScreen });
