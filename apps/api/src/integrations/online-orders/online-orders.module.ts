import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SalesModule } from '../../modules/sales/sales/sales.module';
import { IntegrationCoreModule } from '../core/integration.module';
import { OnlineOrdersService } from './online-orders.service';
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
import {
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
  ],
  providers: [OnlineOrdersService, WebsiteCatalogService, WebsiteSetupService, StatusWebhookService, WooCommerceService, ShopifyService, ChannelCatalogService, DataRetentionService, CourierAccountsService],
  exports: [OnlineOrdersService, WebsiteCatalogService],
})
export class OnlineOrdersModule {}
