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
import {
  ChannelsController,
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
  ],
  providers: [OnlineOrdersService, WebsiteCatalogService, WebsiteSetupService, StatusWebhookService, WooCommerceService],
  exports: [OnlineOrdersService, WebsiteCatalogService],
})
export class OnlineOrdersModule {}
