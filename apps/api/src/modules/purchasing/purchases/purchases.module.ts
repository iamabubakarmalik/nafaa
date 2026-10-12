import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SupplierLedgerModule } from '../supplier-ledger/supplier-ledger.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [SupplierLedgerModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, TenantTimezoneService],
})
export class PurchasesModule {}
