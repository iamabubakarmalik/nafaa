import { Module } from '@nestjs/common';
import { FbrModule } from '../../../integrations/fbr/fbr.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesHistoryService } from './sales-history.service';
import { SaleBatchesService } from './sale-batches.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  imports: [DiscountsModule, FbrModule],
  controllers: [SalesController],
  providers: [SalesService, SalesHistoryService, SaleBatchesService, TenantTimezoneService],
  exports: [SalesService],
})
export class SalesModule {}
