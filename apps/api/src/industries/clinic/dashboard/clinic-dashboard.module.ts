import { Module } from '@nestjs/common';
import { ClinicDashboardController } from './clinic-dashboard.controller';
import { ClinicDashboardService } from './clinic-dashboard.service';

@Module({ controllers: [ClinicDashboardController], providers: [ClinicDashboardService], exports: [ClinicDashboardService] })
export class ClinicDashboardModule {}
