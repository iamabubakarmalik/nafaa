import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, TenantTimezoneService],
  // Nafaa AI reads the loyalty overview; exporting avoids a second instance (and a second nightly expiry cron).
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
