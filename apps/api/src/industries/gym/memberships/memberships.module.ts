import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { LockersModule } from '../lockers/lockers.module';
import { PersonalTrainingModule } from '../personal-training/personal-training.module';
import { GymBillVoidService } from './gym-bill-void.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [SalesModule, ReturnsModule, PersonalTrainingModule, LockersModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, GymBillVoidService, TenantTimezoneService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
