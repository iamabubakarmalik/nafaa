import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../../core/queue/queue.module';

import { ShopPublishingController } from './shop-publishing.controller';
import { ShopPublishingService } from './shop-publishing.service';
import { ProductPublishingController } from './product-publishing.controller';
import { ProductPublishingService } from './product-publishing.service';
import { MarketplaceDashboardController } from './marketplace-dashboard.controller';
import { MarketplaceDashboardService } from './marketplace-dashboard.service';
import { MarketplaceOrdersManageController } from './marketplace-orders-manage.controller';
import { MarketplaceOrdersManageService } from './marketplace-orders-manage.service';
import { ReviewsManageController } from './reviews-manage.controller';
import { ReviewsManageService } from './reviews-manage.service';
import { MessagesManageController } from './messages-manage.controller';
import { MessagesManageService } from './messages-manage.service';
import { BargainsManageController } from './bargains-manage.controller';
import { BargainsManageService } from './bargains-manage.service';
import { GroupBuysManageController } from './group-buys-manage.controller';
import { GroupBuysManageService } from './group-buys-manage.service';
import { AuctionsManageController } from './auctions-manage.controller';
import { AuctionsManageService } from './auctions-manage.service';
import { LiveShopManageController } from './live-shop-manage.controller';
import { LiveShopManageService } from './live-shop-manage.service';
import { MarketplaceAnalyticsController } from './analytics.controller';
import { MarketplaceAnalyticsService } from './analytics.service';

// Phase 3A
import { CouponsAdvancedController } from './coupons-advanced.controller';
import { CouponsAdvancedService } from './coupons-advanced.service';
import { SalesFunnelController } from './sales-funnel.controller';
import { SalesFunnelService } from './sales-funnel.service';
import { SegmentationController } from './segmentation.controller';
import { SegmentationService } from './segmentation.service';

// Phase 3B
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
// Phase 4
import { MultiShopController } from './multi-shop.controller';
import { MultiShopService } from './multi-shop.service';
import { BizNotificationsController } from './biz-notifications.controller';
import { BizNotificationsService } from './biz-notifications.service';
import { SettingsHubController } from './settings-hub.controller';
import { SettingsHubService } from './settings-hub.service';


@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [
    ShopPublishingController,
    ProductPublishingController,
    MarketplaceDashboardController,
    MarketplaceOrdersManageController,
    ReviewsManageController,
    MessagesManageController,
    BargainsManageController,
    GroupBuysManageController,
    AuctionsManageController,
    LiveShopManageController,
    MarketplaceAnalyticsController,
    CouponsAdvancedController,
    SalesFunnelController,
    SegmentationController,
    LoyaltyController,
    TrackingController,
    AiController,
    MultiShopController,
    BizNotificationsController,
    SettingsHubController,
  ],
  providers: [
    ShopPublishingService,
    ProductPublishingService,
    MarketplaceDashboardService,
    MarketplaceOrdersManageService,
    ReviewsManageService,
    MessagesManageService,
    BargainsManageService,
    GroupBuysManageService,
    AuctionsManageService,
    LiveShopManageService,
    MarketplaceAnalyticsService,
    CouponsAdvancedService,
    SalesFunnelService,
    SegmentationService,
    LoyaltyService,
    TrackingService,
    AiService,
    MultiShopService,
    BizNotificationsService,
    SettingsHubService,
  ],
})
export class PublishingModule {}
