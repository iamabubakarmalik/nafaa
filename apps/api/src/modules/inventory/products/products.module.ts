import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductCatalogService } from './product-catalog.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductCatalogService],
})
export class ProductsModule {}
