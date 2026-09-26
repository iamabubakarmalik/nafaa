import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BusinessPulseService } from './business-pulse.service';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, BusinessPulseService, TenantTimezoneService],
  // Har industry ka dashboard yahi mushtarak hisaab aur wohi
  // timezone resolver istemal karta hai
  exports: [BusinessPulseService, TenantTimezoneService],
})
export class DashboardModule {}
