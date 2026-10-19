import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { GarmentsDashboardController } from './garments-dashboard.controller';
import { GarmentsDashboardService } from './garments-dashboard.service';

@Module({ controllers: [GarmentsDashboardController], providers: [GarmentsDashboardService, TenantTimezoneService], exports: [GarmentsDashboardService] })
export class GarmentsDashboardModule {}
