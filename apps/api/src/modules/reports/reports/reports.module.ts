import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsCenterController } from './reports-center.controller';
import { ReportsCenterService } from './reports-center.service';
import { ReportsIndustryService } from './reports-industry.service';

@Module({
  controllers: [ReportsCenterController, ReportsController],
  providers: [ReportsService, ReportsCenterService, ReportsIndustryService, TenantTimezoneService],
})
export class ReportsModule {}
