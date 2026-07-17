import { Module } from '@nestjs/common';
import { CuttingJobsModule } from './cutting-jobs/cutting-jobs.module';
import { LiveAnimalsModule } from './live-animals/live-animals.module';
import { MeatDashboardModule } from './dashboard/meat-dashboard.module';
import { MeatProductsModule } from './products/meat-products.module';
import { QurbaniModule } from './qurbani/qurbani.module';
import { SlaughterModule } from './slaughter/slaughter.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WeightOrdersModule } from './weight-orders/weight-orders.module';
import { WholesaleModule } from './wholesale/wholesale.module';

@Module({
  imports: [
    MeatProductsModule,
    LiveAnimalsModule,
    SlaughterModule,
    CuttingJobsModule,
    WeightOrdersModule,
    SubscriptionsModule,
    QurbaniModule,
    WholesaleModule,
    MeatDashboardModule,
  ],
  exports: [
    MeatProductsModule,
    LiveAnimalsModule,
    SlaughterModule,
    CuttingJobsModule,
    WeightOrdersModule,
    SubscriptionsModule,
    QurbaniModule,
    WholesaleModule,
    MeatDashboardModule,
  ],
})
export class MeatModule {}
