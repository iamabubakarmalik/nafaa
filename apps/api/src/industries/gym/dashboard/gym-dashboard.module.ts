import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { GymDashboardController } from './gym-dashboard.controller';
import { GymDashboardService } from './gym-dashboard.service';

@Module({ controllers: [GymDashboardController], providers: [GymDashboardService, TenantTimezoneService], exports: [GymDashboardService] })
export class GymDashboardModule {}
