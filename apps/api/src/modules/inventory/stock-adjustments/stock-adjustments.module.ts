import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { Module } from '@nestjs/common';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';

@Module({
  controllers: [StockAdjustmentsController],
  providers: [StockAdjustmentsService, TenantTimezoneService],
})
export class StockAdjustmentsModule {}
