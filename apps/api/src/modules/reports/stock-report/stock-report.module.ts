import { Module } from '@nestjs/common';
import { StockReportController } from './stock-report.controller';
import { StockReportService } from './stock-report.service';

@Module({
  controllers: [StockReportController],
  providers: [StockReportService],
})
export class StockReportModule {}
