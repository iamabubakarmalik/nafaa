import { Module } from '@nestjs/common';
import { BakeryDashboardController } from './bakery-dashboard.controller';
import { BakeryDashboardService } from './bakery-dashboard.service';

@Module({ controllers: [BakeryDashboardController], providers: [BakeryDashboardService], exports: [BakeryDashboardService] })
export class BakeryDashboardModule {}
