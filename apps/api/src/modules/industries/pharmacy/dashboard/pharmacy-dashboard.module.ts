import { Module } from '@nestjs/common';
import { PharmacyDashboardController } from './pharmacy-dashboard.controller';
import { PharmacyDashboardService } from './pharmacy-dashboard.service';

@Module({ controllers: [PharmacyDashboardController], providers: [PharmacyDashboardService], exports: [PharmacyDashboardService] })
export class PharmacyDashboardModule {}
