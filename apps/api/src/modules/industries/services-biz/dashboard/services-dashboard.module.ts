import { Module } from '@nestjs/common';
import { ServicesDashboardController } from './services-dashboard.controller';
import { ServicesDashboardService } from './services-dashboard.service';

@Module({ controllers: [ServicesDashboardController], providers: [ServicesDashboardService], exports: [ServicesDashboardService] })
export class ServicesDashboardModule {}
