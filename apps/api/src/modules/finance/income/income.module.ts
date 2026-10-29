import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SupplierLedgerModule } from '../../purchasing/supplier-ledger/supplier-ledger.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';

@Module({
  imports: [SupplierLedgerModule],
  controllers: [IncomeController],
  providers: [IncomeService, TenantTimezoneService],
  exports: [IncomeService],
})
export class IncomeModule {}
