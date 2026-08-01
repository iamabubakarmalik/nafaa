import { Module } from '@nestjs/common';
import { FurnitureDashboardController } from './furniture-dashboard.controller';
import { FurnitureDashboardService } from './furniture-dashboard.service';

@Module({ controllers: [FurnitureDashboardController], providers: [FurnitureDashboardService], exports: [FurnitureDashboardService] })
export class FurnitureDashboardModule {}
