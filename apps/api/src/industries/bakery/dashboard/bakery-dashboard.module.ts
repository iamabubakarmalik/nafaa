import { Module } from '@nestjs/common';
import { BakeryDashboardController } from './bakery-dashboard.controller';
import { BakeryDashboardService } from './bakery-dashboard.service';
import { DashboardModule } from '../../../modules/dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [BakeryDashboardController],
  providers: [BakeryDashboardService],
  exports: [BakeryDashboardService],
})
export class BakeryDashboardModule {}
