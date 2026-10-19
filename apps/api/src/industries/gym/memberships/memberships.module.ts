import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { GymBillVoidService } from './gym-bill-void.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [SalesModule, ReturnsModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, GymBillVoidService, TenantTimezoneService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
