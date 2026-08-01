import { Module } from '@nestjs/common';
import { ElectronicsDashboardController } from './electronics-dashboard.controller';
import { ElectronicsDashboardService } from './electronics-dashboard.service';

@Module({ controllers: [ElectronicsDashboardController], providers: [ElectronicsDashboardService], exports: [ElectronicsDashboardService] })
export class ElectronicsDashboardModule {}
