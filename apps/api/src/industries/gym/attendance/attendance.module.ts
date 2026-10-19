import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { MembershipsModule } from '../memberships/memberships.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({ imports: [MembershipsModule], controllers: [AttendanceController], providers: [AttendanceService, TenantTimezoneService], exports: [AttendanceService] })
export class AttendanceModule {}
