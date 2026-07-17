import { Module } from '@nestjs/common';
import { HotelDashboardController } from './hotel-dashboard.controller';
import { HotelDashboardService } from './hotel-dashboard.service';

@Module({ controllers: [HotelDashboardController], providers: [HotelDashboardService], exports: [HotelDashboardService] })
export class HotelDashboardModule {}
