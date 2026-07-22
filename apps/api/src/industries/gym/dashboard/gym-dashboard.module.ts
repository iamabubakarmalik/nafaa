import { Module } from '@nestjs/common';
import { GymDashboardController } from './gym-dashboard.controller';
import { GymDashboardService } from './gym-dashboard.service';

@Module({ controllers: [GymDashboardController], providers: [GymDashboardService], exports: [GymDashboardService] })
export class GymDashboardModule {}
