import { Module } from '@nestjs/common';
import { BackorderService } from './backorder-stock';
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
import { InternationalController } from './international/international.controller';
import { InternationalService } from './international/international.service';
import { RadarController } from './radar/radar.controller';
import { RadarService } from './radar/radar.service';
import { StorefrontAdminController, StorefrontPublicController } from './storefront.controller';
import { PortalAdminController, PortalPublicController } from './portal/portal.controller';
import { PortalService } from './portal/portal.service';
import { OnlineProductsController } from './online-products.controller';
import { OnlineProductsService } from './online-products.service';
import { CatalogWatchService } from './catalog-watch.service';
import { CatalogJobsService } from './catalog-jobs.service';
import { ChannelContentService } from './channel-content.service';
import { OrderMoneyController } from './order-costs.controller';
import { OrderCostsService } from './order-costs.service';
import { CodReconcileService } from './cod-reconcile.service';
import { CourierRulesService } from './courier-rules.service';
import { ExpensesService } from '../../modules/finance/expenses/expenses.service';
import { OrderScanService } from './order-scan.service';
import { OrderChannelSyncService } from './order-channel-sync.service';
import { OrderEntryService } from './order-entry.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { AbandonedCartsService } from './abandoned-carts.service';
import { CommerceGrowthService } from './commerce-growth.service';
import { CommerceGrowthController } from './commerce-growth.controller';
import { StockAdjustmentsService } from '../../modules/inventory/stock-adjustments/stock-adjustments.service';
import { CommerceAdminController, CommerceAdminService, CommerceControlsController } from './commerce-admin.controller';
import { ChannelOpsController } from './channel-ops.controller';
import { ChannelOpsService } from './channel-ops.service';
import { AutomationController, CommerceSetupController, CourierScoreController, TrackingMapController } from './commerce-insights.controller';
import { TrackingMapService } from './tracking-map.service';
import { CourierScoreService } from './courier-score.service';
import { AutomationService } from './automation.service';
import { CommerceSetupService } from './commerce-setup.service';
import { RetentionController, ReviewsPublicController } from './retention/retention.controller';
import { CampaignsService } from './retention/campaigns.service';
import { ReviewsService } from './retention/reviews.service';
import { OnlineLoyaltyService } from './retention/online-loyalty.service';
import { AffiliatesService } from './retention/affiliates.service';
import { CallCenterController } from './call-center/call-center.controller';
import { CallCenterService } from './call-center/call-center.service';
import { ConversionController, ConversionPublicController } from './conversion/conversion.controller';
import { ConversionService } from './conversion/conversion.service';
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
import { StockHandoverService } from './stock-handover.service';
@Module({
  imports: [PrismaModule, IntegrationCoreModule, SalesModule],
  controllers: [
    WebsiteApiController,
    // Before OnlineOrdersController, so `online-orders/:id` never takes its paths.
    OrderMoneyController,
    DispatchController,
    CommerceGrowthController,
    RadarController, InternationalController,
    RetentionController, ReviewsPublicController,
    TrackingMapController, CourierScoreController, AutomationController, CommerceSetupController,
    CallCenterController, ConversionController, ConversionPublicController,
    OnlineOrdersController,
    LegacyChannelOrdersController,
    ChannelsController,
    ShopifyPublicController,
    CouriersController,
    OrderCourierController,
    BlocklistController,
    StorefrontPublicController,
    PortalPublicController,
    PortalAdminController,
    StorefrontAdminController,
    DarazPublicController,
    DarazPushController,
    DarazController,
    PaymentLinksController,
    PaymentLinksPublicController,
    FoodpandaPluginController,
    FoodpandaController,
    OnlineProductsController,
    CommerceAdminController, CommerceControlsController,
    ChannelOpsController,
  ],
  providers: [TenantTimezoneService, OnlineOrdersService, WebsiteCatalogService, WebsiteSetupService, StatusWebhookService, WooCommerceService, ShopifyService, ChannelCatalogService, DataRetentionService, PiiAccessLogService, CourierAccountsService, StockPushService, OrderToolsService, StorefrontService, InternationalService, RadarService, PortalService, DarazService, PaymentLinksService, FoodpandaService, OnlineProductsService, CatalogWatchService, CatalogJobsService, ChannelContentService,
    OrderCostsService, CodReconcileService, CourierRulesService, ExpensesService, OrderScanService, StockAdjustmentsService,
    OrderChannelSyncService, OrderEntryService, DispatchService, BackorderService,
    AbandonedCartsService, CommerceGrowthService, CommerceAdminService,
    ChannelOpsService,
    TrackingMapService, CourierScoreService, AutomationService, CommerceSetupService, StockHandoverService,
    CampaignsService, ReviewsService, OnlineLoyaltyService, AffiliatesService,
    CallCenterService, ConversionService],
  exports: [OnlineOrdersService, WebsiteCatalogService],
})
export class OnlineOrdersModule {}
