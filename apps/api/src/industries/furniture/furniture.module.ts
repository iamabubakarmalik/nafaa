import { Module } from '@nestjs/common';
import { FurnitureBillingModule } from './billing/furniture-billing.module';
import { CarpentersModule } from './carpenters/carpenters.module';
import { CustomOrdersModule } from './custom-orders/custom-orders.module';
import { FurnitureDashboardModule } from './dashboard/furniture-dashboard.module';
import { FurnitureDeliveriesModule } from './deliveries/deliveries.module';
import { FurnitureProductsModule } from './products/products.module';

@Module({
  imports: [
    FurnitureProductsModule,
    CustomOrdersModule,
    CarpentersModule,
    FurnitureDeliveriesModule,
    FurnitureDashboardModule,
    FurnitureBillingModule,
  ],
  exports: [
    FurnitureProductsModule,
    CustomOrdersModule,
    CarpentersModule,
    FurnitureDeliveriesModule,
    FurnitureDashboardModule,
  ],
})
export class FurnitureModule {}
