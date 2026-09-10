import { Module } from '@nestjs/common';
import { BundlesModule } from './bundles/bundles.module';
import { ElectronicsDashboardModule } from './dashboard/electronics-dashboard.module';
import { ElectronicsProductsModule } from './products/products.module';
import { SerialTrackingModule } from './serial-tracking/serial-tracking.module';
import { WarrantyClaimsModule } from './warranty-claims/warranty-claims.module';
import { ElectronicsPosModule } from './pos/electronics-pos.module';
import { ElectronicsAnalyticsModule } from './analytics/electronics-analytics.module';

@Module({
  imports: [
    ElectronicsPosModule,
    ElectronicsAnalyticsModule,
    ElectronicsProductsModule,
    SerialTrackingModule,
    WarrantyClaimsModule,
    BundlesModule,
    ElectronicsDashboardModule,
  ],
  exports: [
    ElectronicsPosModule,
    ElectronicsAnalyticsModule,
    ElectronicsProductsModule,
    SerialTrackingModule,
    WarrantyClaimsModule,
    BundlesModule,
    ElectronicsDashboardModule,
  ],
})
export class ElectronicsModule {}
