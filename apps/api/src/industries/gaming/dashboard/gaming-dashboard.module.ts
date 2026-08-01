import { Module } from '@nestjs/common';
import { GamingDashboardController } from './gaming-dashboard.controller';
import { GamingDashboardService } from './gaming-dashboard.service';

@Module({ controllers: [GamingDashboardController], providers: [GamingDashboardService], exports: [GamingDashboardService] })
export class GamingDashboardModule {}
