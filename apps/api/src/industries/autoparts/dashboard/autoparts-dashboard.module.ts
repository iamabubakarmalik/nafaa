import { Module } from '@nestjs/common';
import { AutoPartsDashboardController } from './autoparts-dashboard.controller';
import { AutoPartsDashboardService } from './autoparts-dashboard.service';

@Module({ controllers: [AutoPartsDashboardController], providers: [AutoPartsDashboardService], exports: [AutoPartsDashboardService] })
export class AutoPartsDashboardModule {}
