import { Module } from '@nestjs/common';
import { BundlesModule } from './bundles/bundles.module';
import { ElectronicsBrandsModule } from './brands/brands.module';
import { ElectronicsDashboardModule } from './dashboard/electronics-dashboard.module';
import { ElectronicsProductsModule } from './products/products.module';
import { SerialTrackingModule } from './serial-tracking/serial-tracking.module';
import { WarrantyClaimsModule } from './warranty-claims/warranty-claims.module';

@Module({
  imports: [
    ElectronicsBrandsModule,
    ElectronicsProductsModule,
    SerialTrackingModule,
    WarrantyClaimsModule,
    BundlesModule,
    ElectronicsDashboardModule,
  ],
  exports: [
    ElectronicsBrandsModule,
    ElectronicsProductsModule,
    SerialTrackingModule,
    WarrantyClaimsModule,
    BundlesModule,
    ElectronicsDashboardModule,
  ],
})
export class ElectronicsModule {}
