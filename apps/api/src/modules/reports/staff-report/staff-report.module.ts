import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CommissionModule } from '../../hr/commission/commission.module';
import { StaffReportController } from './staff-report.controller';
import { StaffReportService } from './staff-report.service';
import { StaffShiftsService } from './staff-shifts.service';

@Module({
  imports: [CommissionModule],
  controllers: [StaffReportController],
  providers: [StaffReportService, StaffShiftsService, TenantTimezoneService],
})
export class StaffReportModule {}
