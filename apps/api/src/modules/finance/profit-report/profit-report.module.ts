import { Module } from '@nestjs/common';
import { ProfitReportController } from './profit-report.controller';
import { ProfitReportService } from './profit-report.service';
import { ProfitAnalysisService } from './profit-analysis.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [ProfitReportController],
  providers: [ProfitReportService, ProfitAnalysisService, TenantTimezoneService],
})
export class ProfitReportModule {}
