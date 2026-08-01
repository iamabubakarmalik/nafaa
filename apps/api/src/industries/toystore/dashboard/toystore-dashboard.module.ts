import { Module } from '@nestjs/common';
import { ToystoreDashboardController } from './toystore-dashboard.controller';
import { ToystoreDashboardService } from './toystore-dashboard.service';

@Module({ controllers: [ToystoreDashboardController], providers: [ToystoreDashboardService], exports: [ToystoreDashboardService] })
export class ToystoreDashboardModule {}
