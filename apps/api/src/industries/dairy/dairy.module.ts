import { Module } from '@nestjs/common';
import { DairyCustomersModule } from './customers/customers.module';
import { DairyDashboardModule } from './dashboard/dairy-dashboard.module';
import { DairyDeliveriesModule } from './deliveries/deliveries.module';
import { DairyProductsModule } from './products/products.module';
import { DairyRoutesModule } from './routes/routes.module';
import { FarmerSuppliesModule } from './farmer-supplies/farmer-supplies.module';
import { FarmersModule } from './farmers/farmers.module';
import { MonthlyBillsModule } from './monthly-bills/monthly-bills.module';
import { QualityTestsModule } from './quality-tests/quality-tests.module';

@Module({
  imports: [
    DairyProductsModule,
    FarmersModule,
    FarmerSuppliesModule,
    DairyRoutesModule,
    DairyCustomersModule,
    DairyDeliveriesModule,
    MonthlyBillsModule,
    QualityTestsModule,
    DairyDashboardModule,
  ],
  exports: [
    DairyProductsModule,
    FarmersModule,
    FarmerSuppliesModule,
    DairyRoutesModule,
    DairyCustomersModule,
    DairyDeliveriesModule,
    MonthlyBillsModule,
    QualityTestsModule,
    DairyDashboardModule,
  ],
})
export class DairyModule {}
