import { Module } from '@nestjs/common';
import { SupplierLedgerController } from './supplier-ledger.controller';
import { SupplierLedgerService } from './supplier-ledger.service';

@Module({
  controllers: [SupplierLedgerController],
  providers: [SupplierLedgerService],
  exports: [SupplierLedgerService],
})
export class SupplierLedgerModule {}
