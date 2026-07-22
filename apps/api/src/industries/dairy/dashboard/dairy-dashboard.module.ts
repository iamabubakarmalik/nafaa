import { Module } from '@nestjs/common';
import { DairyDashboardController } from './dairy-dashboard.controller';
import { DairyDashboardService } from './dairy-dashboard.service';

@Module({ controllers: [DairyDashboardController], providers: [DairyDashboardService], exports: [DairyDashboardService] })
export class DairyDashboardModule {}
