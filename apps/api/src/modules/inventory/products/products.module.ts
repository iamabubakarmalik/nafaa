import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductCatalogService } from './product-catalog.service';
import { ProductInsightsService } from './product-insights.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { ProductUnitsModule } from '../../../industries/retail/product-units/product-units.module';
import { ProductImportController } from './import/product-import.controller';
import { ProductImportService } from './import/product-import.service';
import { ProductBulkEditController } from './bulk-edit/product-bulk-edit.controller';
import { ProductBulkEditService } from './bulk-edit/product-bulk-edit.service';
import { StockAdjustmentsModule } from '../stock-adjustments/stock-adjustments.module';
import { ImeiModule } from '../../../industries/mobile/imei/imei.module';

@Module({
  imports: [ProductVariantsModule, ProductUnitsModule, StockAdjustmentsModule, ImeiModule],
  controllers: [ProductsController, ProductImportController, ProductBulkEditController],
  providers: [ProductsService, ProductCatalogService, ProductInsightsService, TenantTimezoneService, ProductImportService, ProductBulkEditService],
  exports: [ProductImportService],
})
export class ProductsModule {}
