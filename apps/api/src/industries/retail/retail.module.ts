import { Module } from '@nestjs/common';
import { BarcodeLabelsModule } from './barcode-labels/barcode-labels.module';
import { BulkImportModule } from './bulk-import/bulk-import.module';
import { CombosModule } from './combos/combos.module';
import { DamageModule } from './damage/damage.module';
import { ProductUnitsModule } from './product-units/product-units.module';
import { QuickKeysModule } from './quick-keys/quick-keys.module';
import { ReorderModule } from './reorder/reorder.module';
import { RetailDashboardModule } from './dashboard/retail-dashboard.module';

@Module({
  imports: [
    ProductUnitsModule,
    CombosModule,
    DamageModule,
    QuickKeysModule,
    RetailDashboardModule,
    BulkImportModule,
    BarcodeLabelsModule,
    ReorderModule,
  ],
  exports: [
    ProductUnitsModule,
    CombosModule,
    DamageModule,
    QuickKeysModule,
    RetailDashboardModule,
    BulkImportModule,
    BarcodeLabelsModule,
    ReorderModule,
  ],
})
export class RetailModule {}
