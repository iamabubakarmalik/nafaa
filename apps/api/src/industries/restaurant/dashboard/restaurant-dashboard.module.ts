import { Module } from '@nestjs/common';
import { RestaurantDashboardController } from './restaurant-dashboard.controller';
import { RestaurantDashboardService } from './restaurant-dashboard.service';

@Module({ controllers: [RestaurantDashboardController], providers: [RestaurantDashboardService], exports: [RestaurantDashboardService] })
export class RestaurantDashboardModule {}