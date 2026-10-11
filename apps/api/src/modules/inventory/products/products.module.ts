import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductCatalogService } from './product-catalog.service';
import { ProductInsightsService } from './product-insights.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductCatalogService, ProductInsightsService, TenantTimezoneService],
})
export class ProductsModule {}
