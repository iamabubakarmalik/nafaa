/**
 * Gym counter (web gym/pos): supplements, shakes and service lines (day pass,
 * locker, towel) on the shared counter. With a member as the customer, the bill
 * shows their plan, days left and fee due. Membership fees are sold from
 * Members and Memberships, not here.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { GymCartMember } from './components/GymCartMember';

export const gymPos: PosIndustryConfig = { ...generalPos, id: 'gym', searchHint: msg('Supplement, shake, day pass ya locker'), receiptFooter: 'Shukriya! Training jaari rakhein.', CartExtra: GymCartMember };
registerPosIndustry(gymPos);
