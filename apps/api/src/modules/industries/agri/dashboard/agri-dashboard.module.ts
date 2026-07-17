import { Module } from '@nestjs/common';
import { AgriDashboardController } from './agri-dashboard.controller';
import { AgriDashboardService } from './agri-dashboard.service';

@Module({ controllers: [AgriDashboardController], providers: [AgriDashboardService], exports: [AgriDashboardService] })
export class AgriDashboardModule {}
