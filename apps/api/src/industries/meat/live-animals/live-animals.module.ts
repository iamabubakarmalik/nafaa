import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SupplierLedgerModule } from '../../../modules/purchasing/supplier-ledger/supplier-ledger.module';
import { PurchasesService } from '../../../modules/purchasing/purchases/purchases.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { LiveAnimalsController } from './live-animals.controller';
import { LiveAnimalsService } from './live-animals.service';

@Module({
  imports: [SupplierLedgerModule],
  controllers: [LiveAnimalsController],
  providers: [LiveAnimalsService, PurchasesService, ExpensesService, TenantTimezoneService],
  exports: [LiveAnimalsService],
})
export class LiveAnimalsModule {}
