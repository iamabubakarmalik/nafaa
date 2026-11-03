/**
 * Clinic counter (web clinic/pos): services, lab tests and medicines on the shared
 * counter; sold on credit they go to the patient's khata like any bill. Doctor
 * fees are billed from the visit, not from here.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';

export const clinicPos: PosIndustryConfig = {
  ...generalPos, id: 'clinic', searchHint: msg('Service, test ya dawai ka naam'), receiptFooter: 'Dawai doctor ki hidayat ke mutabiq lein. Agli visit par ye bill saath laayein.',
  hideProduct: (p) => p.sku === 'CLINIC-FEE',
};
registerPosIndustry(clinicPos);
