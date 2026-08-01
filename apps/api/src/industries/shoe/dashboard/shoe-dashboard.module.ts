import { Module } from '@nestjs/common';
import { ShoeDashboardController } from './shoe-dashboard.controller';
import { ShoeDashboardService } from './shoe-dashboard.service';
@Module({ controllers: [ShoeDashboardController], providers: [ShoeDashboardService], exports: [ShoeDashboardService] })
export class ShoeDashboardModule {}
