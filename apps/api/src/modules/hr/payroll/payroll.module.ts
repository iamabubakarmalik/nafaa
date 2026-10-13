import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CommissionModule } from '../commission/commission.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [CommissionModule],
  controllers: [PayrollController],
  providers: [PayrollService, TenantTimezoneService],
})
export class PayrollModule {}
