import { Module } from '@nestjs/common';
import { AppliancesDashboardController } from './appliances-dashboard.controller';
import { AppliancesDashboardService } from './appliances-dashboard.service';

@Module({ controllers: [AppliancesDashboardController], providers: [AppliancesDashboardService], exports: [AppliancesDashboardService] })
export class AppliancesDashboardModule {}
