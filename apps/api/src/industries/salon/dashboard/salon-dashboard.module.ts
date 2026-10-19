import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalonDashboardController } from './salon-dashboard.controller';
import { SalonDashboardService } from './salon-dashboard.service';

@Module({ controllers: [SalonDashboardController], providers: [SalonDashboardService, TenantTimezoneService], exports: [SalonDashboardService] })
export class SalonDashboardModule {}
