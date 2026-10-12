import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { StockAnalysisService } from './stock-analysis.service';
import { StockReportController } from './stock-report.controller';
import { StockReportService } from './stock-report.service';

@Module({
  controllers: [StockReportController],
  providers: [StockReportService, StockAnalysisService, TenantTimezoneService],
})
export class StockReportModule {}
