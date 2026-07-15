import { Module } from '@nestjs/common';
import { GarmentsDashboardController } from './garments-dashboard.controller';
import { GarmentsDashboardService } from './garments-dashboard.service';

@Module({ controllers: [GarmentsDashboardController], providers: [GarmentsDashboardService], exports: [GarmentsDashboardService] })
export class GarmentsDashboardModule {}
