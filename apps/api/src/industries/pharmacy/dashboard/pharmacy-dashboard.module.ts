import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PharmacyDashboardController } from './pharmacy-dashboard.controller';
import { PharmacyDashboardService } from './pharmacy-dashboard.service';

@Module({ controllers: [PharmacyDashboardController], providers: [PharmacyDashboardService, TenantTimezoneService], exports: [PharmacyDashboardService] })
export class PharmacyDashboardModule {}
