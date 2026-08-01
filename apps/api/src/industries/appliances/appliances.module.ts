import { Module } from '@nestjs/common';
import { AmcContractsModule } from './amc-contracts/amc-contracts.module';
import { ApplianceBrandsModule } from './brands/brands.module';
import { ApplianceDeliveriesModule } from './deliveries/deliveries.module';
import { ApplianceProductsModule } from './products/products.module';
import { ApplianceSerialModule } from './serial-tracking/serial-tracking.module';
import { AppliancesDashboardModule } from './dashboard/appliances-dashboard.module';
import { InstallationsModule } from './installations/installations.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { TechniciansModule } from './technicians/technicians.module';

@Module({
  imports: [
    ApplianceBrandsModule,
    ApplianceProductsModule,
    ApplianceSerialModule,
    InstallationsModule,
    ServiceRequestsModule,
    TechniciansModule,
    AmcContractsModule,
    ApplianceDeliveriesModule,
    AppliancesDashboardModule,
  ],
  exports: [
    ApplianceBrandsModule,
    ApplianceProductsModule,
    ApplianceSerialModule,
    InstallationsModule,
    ServiceRequestsModule,
    TechniciansModule,
    AmcContractsModule,
    ApplianceDeliveriesModule,
    AppliancesDashboardModule,
  ],
})
export class AppliancesModule {}
