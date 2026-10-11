import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BusinessPulseService } from './business-pulse.service';
import { DayReportService } from './day-report.service';
import { InsightsService } from './insights.service';
import { DashboardListsService } from './lists.service';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, BusinessPulseService, DayReportService, InsightsService, DashboardListsService, TenantTimezoneService],
  // Har industry ka dashboard yahi mushtarak hisaab aur wohi
  // timezone resolver istemal karta hai
  exports: [BusinessPulseService, TenantTimezoneService],
})
export class DashboardModule {}
