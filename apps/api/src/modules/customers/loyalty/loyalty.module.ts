import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, TenantTimezoneService],
})
export class LoyaltyModule {}
