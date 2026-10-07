import { Module } from '@nestjs/common';
import { FoodpandaController, FoodpandaPluginController } from './foodpanda.controller';
import { FoodpandaService } from './foodpanda.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SalesModule } from '../../modules/sales/sales/sales.module';
import { IntegrationCoreModule } from '../core/integration.module';
import { OnlineOrdersService } from './online-orders.service';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { WebsiteCatalogService } from './website-catalog.service';
import { WebsiteSetupService } from './website-setup.service';
import { StatusWebhookService } from './status-webhook.service';
import { WebsiteApiController } from './website-api.controller';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { ChannelCatalogService } from './channel-catalog.service';
import { DataRetentionService } from './data-retention.service';
import { ShopifyPublicController } from './shopify-public.controller';
import { CourierAccountsService } from './courier-accounts.service';
import { StockPushService } from './stock-push.service';
import { OrderToolsService } from './order-tools.service';
import { StorefrontService } from './storefront.service';
import { DarazService } from './daraz.service';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController, PaymentLinksPublicController } from './payment-links.controller';
import { DarazController, DarazPublicController } from './daraz.controller';
import { StorefrontAdminController, StorefrontPublicController } from './storefront.controller';
import {
  BlocklistController,
  ChannelsController,
  CouriersController,
  OrderCourierController,
  LegacyChannelOrdersController,
  OnlineOrdersController,
} from './online-orders.controller';

/**
 * Online orders: website/Daraz/Foodpanda ke orders → bill → stock.
 * Custom website ka poora connection (public API + setup) bhi yahin hai.
 */
@Module({
  imports: [PrismaModule, IntegrationCoreModule, SalesModule],
  controllers: [
    WebsiteApiController,
    OnlineOrdersController,
    LegacyChannelOrdersController,
    ChannelsController,
    ShopifyPublicController,
    CouriersController,
    OrderCourierController,
    BlocklistController,
    StorefrontPublicController,
    StorefrontAdminController,
    DarazPublicController,
    DarazController,
    PaymentLinksController,
    PaymentLinksPublicController,
    FoodpandaPluginController,
    FoodpandaController,
  ],
  providers: [TenantTimezoneService, OnlineOrdersService, WebsiteCatalogService, WebsiteSetupService, StatusWebhookService, WooCommerceService, ShopifyService, ChannelCatalogService, DataRetentionService, CourierAccountsService, StockPushService, OrderToolsService, StorefrontService, DarazService, PaymentLinksService, FoodpandaService],
  exports: [OnlineOrdersService, WebsiteCatalogService],
})
export class OnlineOrdersModule {}
