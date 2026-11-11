import { Module } from '@nestjs/common';
import { AdminBillingCatalogController } from './admin-billing-catalog.controller';
import { AdminBillingCatalogService } from './admin-billing-catalog.service';
import { AdminShopBillingController } from './admin-shop-billing.controller';
import { AdminShopBillingService } from './admin-shop-billing.service';
import { AdminSetupsController } from './admin-setups.controller';
import { AdminSetupsService } from './admin-setups.service';

/**
 * Pricing v2 admin: add-on catalog, billing rules, revenue and per-shop deals.
 * EntitlementsService and BillingPricingService come from the global
 * BillingPricingModule.
 */
@Module({
  controllers: [AdminBillingCatalogController, AdminShopBillingController, AdminSetupsController],
  providers: [AdminBillingCatalogService, AdminShopBillingService, AdminSetupsService],
})
export class AdminBillingCatalogModule {}
