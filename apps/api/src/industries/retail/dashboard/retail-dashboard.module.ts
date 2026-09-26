import { Module } from '@nestjs/common';
import { RetailDashboardController } from './retail-dashboard.controller';
import { RetailDashboardService } from './retail-dashboard.service';
import { DashboardModule } from '../../../modules/dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [RetailDashboardController],
  providers: [RetailDashboardService],
  exports: [RetailDashboardService],
})
export class RetailDashboardModule {}
