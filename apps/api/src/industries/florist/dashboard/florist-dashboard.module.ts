import { Module } from '@nestjs/common';
import { FloristDashboardController } from './florist-dashboard.controller';
import { FloristDashboardService } from './florist-dashboard.service';
@Module({ controllers: [FloristDashboardController], providers: [FloristDashboardService], exports: [FloristDashboardService] })
export class FloristDashboardModule {}
