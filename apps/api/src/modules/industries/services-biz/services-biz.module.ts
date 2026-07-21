import { Module } from '@nestjs/common';
import { AmcModule } from './amc/amc.module';
import { CatalogModule } from './catalog/catalog.module';
import { CustomerProfilesModule } from './customer-profiles/customer-profiles.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { JobsModule } from './jobs/jobs.module';
import { QuotesModule } from './quotes/quotes.module';
import { ServicesDashboardModule } from './dashboard/services-dashboard.module';
import { TechniciansModule } from './technicians/technicians.module';
import { WarrantyModule } from './warranty/warranty.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [
    CatalogModule,
    TechniciansModule,
    JobsModule,
    QuotesModule,
    AmcModule,
    WarrantyModule,
    CustomerProfilesModule,
    ZonesModule,
    DispatchModule,
    ServicesDashboardModule,
  ],
  exports: [
    CatalogModule,
    TechniciansModule,
    JobsModule,
    QuotesModule,
    AmcModule,
    WarrantyModule,
    CustomerProfilesModule,
    ZonesModule,
    DispatchModule,
    ServicesDashboardModule,
  ],
})
export class ServicesBizModule {}
