import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { LowStockController } from './low-stock.controller';
import { LowStockService } from './low-stock.service';

@Module({
  controllers: [LowStockController],
  providers: [LowStockService, TenantTimezoneService],
  exports: [LowStockService],
})
export class LowStockModule {}
