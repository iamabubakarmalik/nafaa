import { Module } from '@nestjs/common';
import { BulkPricingModule } from './bulk-pricing/bulk-pricing.module';
import { CreditAccountsModule } from './credit-accounts/credit-accounts.module';
import { CreditTransactionsModule } from './credit-transactions/credit-transactions.module';
import { HardwareBrandsModule } from './brands/brands.module';
import { HardwareDashboardModule } from './dashboard/hardware-dashboard.module';
import { HardwareDeliveriesModule } from './deliveries/deliveries.module';
import { HardwareProductsModule } from './products/products.module';
import { HardwareProjectsModule } from './projects/projects.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ReorderRulesModule } from './reorder-rules/reorder-rules.module';

@Module({
  imports: [
    HardwareBrandsModule,
    HardwareProductsModule,
    BulkPricingModule,
    HardwareProjectsModule,
    QuotationsModule,
    HardwareDeliveriesModule,
    CreditAccountsModule,
    CreditTransactionsModule,
    ReorderRulesModule,
    HardwareDashboardModule,
  ],
  exports: [
    HardwareBrandsModule,
    HardwareProductsModule,
    BulkPricingModule,
    HardwareProjectsModule,
    QuotationsModule,
    HardwareDeliveriesModule,
    CreditAccountsModule,
    CreditTransactionsModule,
    ReorderRulesModule,
    HardwareDashboardModule,
  ],
})
export class HardwareModule {}
