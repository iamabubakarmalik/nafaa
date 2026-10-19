import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { TemperatureLogController } from './temperature-log.controller';
import { TemperatureLogService } from './temperature-log.service';

@Module({ controllers: [TemperatureLogController], providers: [TemperatureLogService, TenantTimezoneService], exports: [TemperatureLogService] })
export class TemperatureLogModule {}
