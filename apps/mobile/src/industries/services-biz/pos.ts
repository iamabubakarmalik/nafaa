/**
 * Services counter (web services-biz/pos): rate-list services and parts on the shared
 * counter. A finished job is billed from its own screen (Invoice), which closes the
 * job with its bill.
 */

import { msg } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';

export const servicesPos: PosIndustryConfig = { ...generalPos, id: 'services-biz', searchHint: msg('Service ya part ka naam'), receiptFooter: 'Kaam ki warranty job card par likhi hai.' };
registerPosIndustry(servicesPos, ['services']);
