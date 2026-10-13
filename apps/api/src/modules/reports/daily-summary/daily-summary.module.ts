import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { LowStockModule } from '../../inventory/low-stock/low-stock.module';
import { DailySummaryController } from './daily-summary.controller';
import { DailySummaryCronService } from './daily-summary-cron.service';
import { DailySummaryService } from './daily-summary.service';

@Module({
  imports: [LowStockModule],
  controllers: [DailySummaryController],
  providers: [DailySummaryService, DailySummaryCronService, TenantTimezoneService],
})
export class DailySummaryModule {}
