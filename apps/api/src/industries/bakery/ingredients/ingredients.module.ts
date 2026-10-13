import { Module } from '@nestjs/common';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SupplierLedgerModule } from '../../../modules/purchasing/supplier-ledger/supplier-ledger.module';
import { PurchasesService } from '../../../modules/purchasing/purchases/purchases.service';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

// PurchasesService is provided here (its module does not export it) so a quick
// raw-material buy is booked as a supplier bill, like the purchase screen.
@Module({
  imports: [SupplierLedgerModule],
  controllers: [IngredientsController],
  providers: [IngredientsService, TenantTimezoneService, PurchasesService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
