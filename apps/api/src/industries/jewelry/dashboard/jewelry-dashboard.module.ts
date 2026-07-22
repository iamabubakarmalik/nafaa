import { Module } from '@nestjs/common';
import { JewelryDashboardController } from './jewelry-dashboard.controller';
import { JewelryDashboardService } from './jewelry-dashboard.service';

@Module({ controllers: [JewelryDashboardController], providers: [JewelryDashboardService], exports: [JewelryDashboardService] })
export class JewelryDashboardModule {}
