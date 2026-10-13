import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, TenantTimezoneService],
})
export class StaffAttendanceModule {}
