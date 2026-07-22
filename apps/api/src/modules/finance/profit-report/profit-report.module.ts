import { Module } from '@nestjs/common';
import { ProfitReportController } from './profit-report.controller';
import { ProfitReportService } from './profit-report.service';

@Module({
  controllers: [ProfitReportController],
  providers: [ProfitReportService],
})
export class ProfitReportModule {}
