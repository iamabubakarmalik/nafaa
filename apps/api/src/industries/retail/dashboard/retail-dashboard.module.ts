import { Module } from '@nestjs/common';
import { RetailDashboardController } from './retail-dashboard.controller';
import { RetailDashboardService } from './retail-dashboard.service';
import { DashboardModule } from '../../../modules/dashboard/dashboard.module';
import { LowStockModule } from '../../../modules/inventory/low-stock/low-stock.module';

@Module({
  imports: [DashboardModule, LowStockModule],
  controllers: [RetailDashboardController],
  providers: [RetailDashboardService],
  exports: [RetailDashboardService],
})
export class RetailDashboardModule {}
