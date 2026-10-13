import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { CustomersReportController } from './customers-report.controller';
import { CustomerInsightsService } from './customer-insights.service';
import { CustomerCreditService } from './customer-credit.service';

@Module({
  controllers: [CustomersReportController],
  providers: [CustomerInsightsService, CustomerCreditService, TenantTimezoneService],
})
export class CustomersReportModule {}
