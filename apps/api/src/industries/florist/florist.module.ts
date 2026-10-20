import { Module } from '@nestjs/common';
import { FloristProductsModule } from './products/products.module';
import { FloristOrdersModule } from './orders/orders.module';
import { WeddingContractsModule } from './wedding-contracts/wedding-contracts.module';
import { FloristSubscriptionsModule } from './subscriptions/subscriptions.module';
import { FloristDashboardModule } from './dashboard/florist-dashboard.module';
import { SalesModule } from '../../modules/sales/sales/sales.module';
import { ReturnsModule } from '../../modules/sales/returns/returns.module';
import { FloristBillVoidService } from './florist-bill-void.service';

@Module({
  imports: [
    FloristProductsModule,
    FloristOrdersModule,
    WeddingContractsModule,
    FloristSubscriptionsModule,
    FloristDashboardModule,
    SalesModule,
    ReturnsModule,
  ],
  providers: [FloristBillVoidService],
  exports: [
    FloristProductsModule,
    FloristOrdersModule,
    WeddingContractsModule,
    FloristSubscriptionsModule,
    FloristDashboardModule,
  ],
})
export class FloristModule {}
