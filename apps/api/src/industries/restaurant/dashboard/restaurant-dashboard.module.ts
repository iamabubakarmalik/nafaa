import { Module } from '@nestjs/common';
import { RestaurantDashboardController } from './restaurant-dashboard.controller';
import { RestaurantDashboardService } from './restaurant-dashboard.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({ controllers: [RestaurantDashboardController], providers: [RestaurantDashboardService, TenantTimezoneService], exports: [RestaurantDashboardService] })
export class RestaurantDashboardModule {}