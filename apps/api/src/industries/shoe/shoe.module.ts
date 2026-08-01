import { Module } from '@nestjs/common';
import { ShoeBrandsModule } from './brands/brands.module';
import { ShoeProductsModule } from './products/products.module';
import { ShoeSizeVariantsModule } from './size-variants/size-variants.module';
import { ShoeSizeChartsModule } from './size-charts/size-charts.module';
import { ShoeTryOnModule } from './try-on/try-on.module';
import { ShoeExchangesModule } from './exchanges/exchanges.module';
import { ShoeDashboardModule } from './dashboard/shoe-dashboard.module';

@Module({
  imports: [
    ShoeBrandsModule,
    ShoeProductsModule,
    ShoeSizeVariantsModule,
    ShoeSizeChartsModule,
    ShoeTryOnModule,
    ShoeExchangesModule,
    ShoeDashboardModule,
  ],
  exports: [
    ShoeBrandsModule,
    ShoeProductsModule,
    ShoeSizeVariantsModule,
    ShoeSizeChartsModule,
    ShoeTryOnModule,
    ShoeExchangesModule,
    ShoeDashboardModule,
  ],
})
export class ShoeModule {}

