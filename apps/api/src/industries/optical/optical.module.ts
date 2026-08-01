import { Module } from '@nestjs/common';
import { OpticalDashboardModule } from './dashboard/optical-dashboard.module';
import { EyeTestsModule } from './eye-tests/eye-tests.module';
import { LensOrdersModule } from './lens-orders/lens-orders.module';
import { OptometristsModule } from './optometrists/optometrists.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { OpticalProductsModule } from './products/products.module';

@Module({
  imports: [
    OpticalProductsModule,
    PrescriptionsModule,
    EyeTestsModule,
    OptometristsModule,
    LensOrdersModule,
    OpticalDashboardModule,
  ],
  exports: [
    OpticalProductsModule,
    PrescriptionsModule,
    EyeTestsModule,
    OptometristsModule,
    LensOrdersModule,
    OpticalDashboardModule,
  ],
})
export class OpticalModule {}

