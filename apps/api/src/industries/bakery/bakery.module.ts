import { Module } from '@nestjs/common';
import { BakeryDashboardModule } from './dashboard/bakery-dashboard.module';
import { BakeryProductsModule } from './products/bakery-products.module';
import { BulkOrdersModule } from './bulk-orders/bulk-orders.module';
import { CakeOrdersModule } from './cake-orders/cake-orders.module';
import { FreshnessModule } from './freshness/freshness.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { ProductionModule } from './production/production.module';
import { OrderBillVoidService } from './order-bill-void.service';
import { SalesModule } from '../../modules/sales/sales/sales.module';

@Module({
  imports: [
    BakeryProductsModule,
    CakeOrdersModule,
    ProductionModule,
    IngredientsModule,
    FreshnessModule,
    BulkOrdersModule,
    BakeryDashboardModule,
    SalesModule,
  ],
  providers: [OrderBillVoidService],
  exports: [
    BakeryProductsModule,
    CakeOrdersModule,
    ProductionModule,
    IngredientsModule,
    FreshnessModule,
    BulkOrdersModule,
    BakeryDashboardModule,
  ],
})
export class BakeryModule {}
