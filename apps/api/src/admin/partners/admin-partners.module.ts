import { Module } from '@nestjs/common';
import { AdminPartnerOpsController } from './admin-partner-ops.controller';
import { AdminPartnersController } from './admin-partners.controller';
import { AdminTenantPartnerController } from './admin-tenant-partner.controller';
import { AdminPartnersService } from './admin-partners.service';
import { AdminPartnerActivityService } from './admin-partner-activity.service';
import { AdminPartnerMoneyService } from './admin-partner-money.service';

/**
 * Admin partner programme. PartnerAttributionService and
 * PartnerCommissionService come from the global PartnersModule.
 * The fixed-path controller is listed first so "/admin/partners/leads" is
 * never read as a partner id.
 */
@Module({
  controllers: [AdminPartnerOpsController, AdminPartnersController, AdminTenantPartnerController],
  providers: [AdminPartnersService, AdminPartnerActivityService, AdminPartnerMoneyService],
})
export class AdminPartnersModule {}
