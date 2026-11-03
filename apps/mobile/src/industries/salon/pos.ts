/**
 * Salon counter (web salon/pos): the shared counter gives way to the salon's
 * own screen, which bills services with the stylist and posts commission.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { SalonCounterScreen } from './screens/SalonCounterScreen';

export const salonPos: PosIndustryConfig = { ...generalPos, id: 'salon', combos: false, quickKeys: false, searchHint: msg('Service ya product'), receiptFooter: 'Dobara aaiye. Appointment ke liye call karein.', Screen: SalonCounterScreen };
registerPosIndustry(salonPos);
