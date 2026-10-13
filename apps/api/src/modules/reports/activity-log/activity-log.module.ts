import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService, TenantTimezoneService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
