import { Module } from '@nestjs/common';
import { HardwareDashboardController } from './hardware-dashboard.controller';
import { HardwareDashboardService } from './hardware-dashboard.service';

@Module({ controllers: [HardwareDashboardController], providers: [HardwareDashboardService], exports: [HardwareDashboardService] })
export class HardwareDashboardModule {}
