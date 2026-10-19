import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { CommissionPayoutsController } from './commission-payouts.controller';
import { CommissionPayoutsService } from './commission-payouts.service';
import { StaffProfilesController } from './staff-profiles.controller';
import { StaffProfilesService } from './staff-profiles.service';

@Module({
  controllers: [StaffProfilesController, CommissionPayoutsController],
  providers: [StaffProfilesService, CommissionPayoutsService, ExpensesService, TenantTimezoneService],
  exports: [StaffProfilesService],
})
export class StaffProfilesModule {}
