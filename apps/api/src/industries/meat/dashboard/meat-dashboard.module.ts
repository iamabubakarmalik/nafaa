import { Module } from '@nestjs/common';
import { MeatDashboardController } from './meat-dashboard.controller';
import { MeatDashboardService } from './meat-dashboard.service';

@Module({ controllers: [MeatDashboardController], providers: [MeatDashboardService], exports: [MeatDashboardService] })
export class MeatDashboardModule {}
