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
import { PiiAccessLogService } from './pii-access-log.service';
import { ShopifyPublicController } from './shopify-public.controller';
import { CourierAccountsService } from './courier-accounts.service';
import { StockPushService } from './stock-push.service';
import { OrderToolsService } from './order-tools.service';
import { StorefrontService } from './storefront.service';
import { DarazService } from './daraz.service';
import { PaymentLinksService } from './payment-links.service';
import { PaymentLinksController, PaymentLinksPublicController } from './payment-links.controller';
import { DarazController, DarazPublicController, DarazPushController } from './daraz.controller';
import { StorefrontAdminController, StorefrontPublicController } from './storefront.controller';
import { OnlineProductsController } from './online-products.controller';
import { OnlineProductsService } from './online-products.service';
import { CatalogWatchService } from './catalog-watch.service';
import { OrderMoneyController } from './order-costs.controller';
import { OrderCostsService } from './order-costs.service';
import { CodReconcileService } from './cod-reconcile.service';
import { CourierRulesService } from './courier-rules.service';
import { ExpensesService } from '../../modules/finance/expenses/expenses.service';
import { OrderScanService } from './order-scan.service';
import { StockAdjustmentsService } from '../../modules/inventory/stock-adjustments/stock-adjustments.service';
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
    // Before OnlineOrdersController, so `online-orders/:id` never takes its paths.
    OrderMoneyController,
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
    DarazPushController,
    DarazController,
    PaymentLinksController,
    PaymentLinksPublicController,
    FoodpandaPluginController,
    FoodpandaController,
    OnlineProductsController,
  ],
  providers: [TenantTimezoneService, OnlineOrdersService, WebsiteCatalogService, WebsiteSetupService, StatusWebhookService, WooCommerceService, ShopifyService, ChannelCatalogService, DataRetentionService, PiiAccessLogService, CourierAccountsService, StockPushService, OrderToolsService, StorefrontService, DarazService, PaymentLinksService, FoodpandaService, OnlineProductsService, CatalogWatchService,
    OrderCostsService, CodReconcileService, CourierRulesService, ExpensesService, OrderScanService, StockAdjustmentsService],
  exports: [OnlineOrdersService, WebsiteCatalogService],
})
export class OnlineOrdersModule {}
