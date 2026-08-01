import { Module } from '@nestjs/common';
import { FloristProductsModule } from './products/products.module';
import { FloristOrdersModule } from './orders/orders.module';
import { WeddingContractsModule } from './wedding-contracts/wedding-contracts.module';
import { FloristSubscriptionsModule } from './subscriptions/subscriptions.module';
import { FloristDashboardModule } from './dashboard/florist-dashboard.module';

@Module({
  imports: [
    FloristProductsModule,
    FloristOrdersModule,
    WeddingContractsModule,
    FloristSubscriptionsModule,
    FloristDashboardModule,
  ],
  exports: [
    FloristProductsModule,
    FloristOrdersModule,
    WeddingContractsModule,
    FloristSubscriptionsModule,
    FloristDashboardModule,
  ],
})
export class FloristModule {}
