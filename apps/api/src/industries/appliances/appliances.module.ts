import { Module } from '@nestjs/common';
import { ReturnsModule } from '../../modules/sales/returns/returns.module';
import { SalesModule } from '../../modules/sales/sales/sales.module';
import { ApplianceBillVoidService } from './common/appliance-bill-void.service';
import { AmcContractsModule } from './amc-contracts/amc-contracts.module';
import { AppliancesAnalyticsModule } from './analytics/appliances-analytics.module';
// ApplianceBrandsModule yahan se nikal diya gaya (2026-09-14).
// Brand ab global /brands module se aata hai — do alag brand tables
// rakhne ki wajah se ek hi "Haier" do jagah alag record ban jati thi.
// File apni jagah para hai, sirf module tree se hata hai.
import { ApplianceDeliveriesModule } from './deliveries/deliveries.module';
import { ApplianceProductsModule } from './products/products.module';
import { ApplianceSerialModule } from './serial-tracking/serial-tracking.module';
import { AppliancesDashboardModule } from './dashboard/appliances-dashboard.module';
import { InstallationsModule } from './installations/installations.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { TechniciansModule } from './technicians/technicians.module';
import { ApplianceWarrantyClaimsModule } from './warranty-claims/warranty-claims.module';

@Module({
  imports: [
    SalesModule,
    ReturnsModule,
    ApplianceProductsModule,
    ApplianceSerialModule,
    InstallationsModule,
    ServiceRequestsModule,
    TechniciansModule,
    AmcContractsModule,
    ApplianceDeliveriesModule,
    AppliancesDashboardModule,
    AppliancesAnalyticsModule,
    ApplianceWarrantyClaimsModule,
  ],
  providers: [ApplianceBillVoidService],
  exports: [
    ApplianceProductsModule,
    ApplianceSerialModule,
    InstallationsModule,
    ServiceRequestsModule,
    TechniciansModule,
    AmcContractsModule,
    ApplianceDeliveriesModule,
    AppliancesDashboardModule,
    AppliancesAnalyticsModule,
    ApplianceWarrantyClaimsModule,
  ],
})
export class AppliancesModule {}
