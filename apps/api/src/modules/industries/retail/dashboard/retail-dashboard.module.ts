import { Module } from '@nestjs/common';
import { RetailDashboardController } from './retail-dashboard.controller';
import { RetailDashboardService } from './retail-dashboard.service';

@Module({
  controllers: [RetailDashboardController],
  providers: [RetailDashboardService],
  exports: [RetailDashboardService],
})
export class RetailDashboardModule {}
