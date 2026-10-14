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

@Module({
  imports: [ProductVariantsModule, ProductUnitsModule],
  controllers: [ProductsController, ProductImportController],
  providers: [ProductsService, ProductCatalogService, ProductInsightsService, TenantTimezoneService, ProductImportService],
  exports: [ProductImportService],
})
export class ProductsModule {}
