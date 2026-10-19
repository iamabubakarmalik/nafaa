import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ControlledLogController } from './controlled-log.controller';
import { ControlledLogService } from './controlled-log.service';

@Module({ controllers: [ControlledLogController], providers: [ControlledLogService, TenantTimezoneService], exports: [ControlledLogService] })
export class ControlledLogModule {}
