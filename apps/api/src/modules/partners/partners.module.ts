import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PartnerAttributionService } from './attribution/partner-attribution.service';
import { PartnerCommissionService } from './commission/partner-commission.service';
import { PartnerAuthController } from './portal/partner-auth.controller';
import { PartnerAuthService } from './portal/partner-auth.service';
import { PartnerGuard } from './portal/partner.guard';
import { PartnerPortalController } from './portal/partner-portal.controller';
import { PartnerPortalService } from './portal/partner-portal.service';

/**
 * Partner portal (partner.nafaa.pk) API, partner attribution at signup and
 * the commission job. Global so signup (AuthModule) and the admin partner
 * pages can use attribution and commissions without import cycles.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [PartnerAuthController, PartnerPortalController],
  providers: [PartnerAttributionService, PartnerCommissionService, PartnerAuthService, PartnerPortalService, PartnerGuard],
  exports: [PartnerAttributionService, PartnerCommissionService],
})
export class PartnersModule {}
