import { Module } from '@nestjs/common';
import { SalonDashboardController } from './salon-dashboard.controller';
import { SalonDashboardService } from './salon-dashboard.service';

@Module({ controllers: [SalonDashboardController], providers: [SalonDashboardService], exports: [SalonDashboardService] })
export class SalonDashboardModule {}
