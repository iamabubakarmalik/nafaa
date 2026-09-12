import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { StockReconcileService } from './stock-reconcile.service';

@Module({
  controllers: [ShopsController],
  providers: [ShopsService, StockReconcileService],
  exports: [StockReconcileService],
})
export class ShopsModule {}
