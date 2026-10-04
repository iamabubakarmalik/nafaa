import { Module } from '@nestjs/common';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [CommissionController],
  providers: [CommissionService, TenantTimezoneService],
  exports: [CommissionService],
})
export class CommissionModule {}
