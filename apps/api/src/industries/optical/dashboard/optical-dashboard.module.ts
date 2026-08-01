import { Module } from '@nestjs/common';
import { OpticalDashboardController } from './optical-dashboard.controller';
import { OpticalDashboardService } from './optical-dashboard.service';

@Module({ controllers: [OpticalDashboardController], providers: [OpticalDashboardService], exports: [OpticalDashboardService] })
export class OpticalDashboardModule {}
