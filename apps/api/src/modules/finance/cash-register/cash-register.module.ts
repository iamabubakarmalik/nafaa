import { Module } from '@nestjs/common';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterReportService } from './cash-register-report.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [CashRegisterController],
  providers: [CashRegisterService, CashRegisterReportService, TenantTimezoneService],
})
export class CashRegisterModule {}
