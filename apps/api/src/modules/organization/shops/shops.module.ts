import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopsAnalyticsService } from './shops-analytics.service';
import { ShopsService } from './shops.service';
import { StockReconcileService } from './stock-reconcile.service';

@Module({
  controllers: [ShopsController],
  providers: [ShopsService, ShopsAnalyticsService, StockReconcileService, TenantTimezoneService],
  exports: [StockReconcileService],
})
export class ShopsModule {}
