import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OnlineOrdersModule } from '../online-orders/online-orders.module';
import { StoresController } from './stores.controller';
import { StorefrontApiController } from './storefront-api.controller';
import { AdminStoresController } from './admin/admin-stores.controller';
import { AdminStoresService } from './admin/admin-stores.service';
import { StoreAccessService } from './store-access.service';
import { StoreCatalogService } from './store-catalog.service';
import { StoreRevalidateService } from './store-revalidate.service';
import { StoreThemeService } from './store-theme.service';
import { StoresService } from './stores.service';
import { StoreAnalyticsService } from './store-analytics.service';
import { StoreCheckoutService } from './store-checkout.service';
import { StoreCustomersService } from './store-customers.service';
import { StoreDomainsService } from './store-domains.service';
import { StoreShopifyImportService } from './store-shopify-import.service';
import { StorePublicService } from './store-public.service';

/**
 * Nafaa Stores: the website builder. Each store is a NAFAA_STORE sales
 * channel, so orders, stock, couriers and payments reuse the online-orders
 * module. Merchant API `/stores`, public storefront API `/storefront/v1`,
 * admin `/admin/stores`. Contract: ~/nafaa-backups/wip/website-builder-contract.md
 */
@Module({
  imports: [PrismaModule, OnlineOrdersModule],
  controllers: [StoresController, StorefrontApiController, AdminStoresController],
  providers: [
    StoreAccessService, StoreCatalogService, StoreRevalidateService, StoreThemeService, StoresService, StoreAnalyticsService,
    StoreCheckoutService, StoreCustomersService, StoreDomainsService, StoreShopifyImportService, StorePublicService, AdminStoresService,
  ],
  exports: [StoreRevalidateService],
})
export class StoresModule {}
