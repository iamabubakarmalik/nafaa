import { Module } from '@nestjs/common';
import { AdminBillingCatalogController } from './admin-billing-catalog.controller';
import { AdminBillingCatalogService } from './admin-billing-catalog.service';
import { AdminShopBillingController } from './admin-shop-billing.controller';
import { AdminShopBillingService } from './admin-shop-billing.service';

/**
 * Pricing v2 admin: add-on catalog, billing rules, revenue and per-shop deals.
 * EntitlementsService and BillingPricingService come from the global
 * BillingPricingModule.
 */
@Module({
  controllers: [AdminBillingCatalogController, AdminShopBillingController],
  providers: [AdminBillingCatalogService, AdminShopBillingService],
})
export class AdminBillingCatalogModule {}
