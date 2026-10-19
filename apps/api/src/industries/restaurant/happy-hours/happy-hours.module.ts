import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { HappyHoursController } from './happy-hours.controller';
import { HappyHoursService } from './happy-hours.service';

@Module({ controllers: [HappyHoursController], providers: [HappyHoursService, TenantTimezoneService], exports: [HappyHoursService] })
export class HappyHoursModule {}
