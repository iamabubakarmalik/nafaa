import { Module } from '@nestjs/common';
import { AdvisoryModule } from './advisory/advisory.module';
import { AgriDashboardModule } from './dashboard/agri-dashboard.module';
import { AgriProductsModule } from './products/agri-products.module';
import { BulkOrdersModule } from './bulk-orders/bulk-orders.module';
import { FarmersModule } from './farmers/farmers.module';
import { LedgerModule } from './ledger/ledger.module';
import { SeasonalPlansModule } from './seasonal-plans/seasonal-plans.module';
import { SubsidyModule } from './subsidy/subsidy.module';

@Module({
  imports: [
    AgriProductsModule,
    FarmersModule,
    LedgerModule,
    BulkOrdersModule,
    AdvisoryModule,
    SeasonalPlansModule,
    SubsidyModule,
    AgriDashboardModule, 
  ],
  exports: [
    AgriProductsModule,
    FarmersModule,
    LedgerModule,
    BulkOrdersModule,
    AdvisoryModule,
    SeasonalPlansModule,
    SubsidyModule,
    AgriDashboardModule,
  ],
})
export class AgriModule {}
