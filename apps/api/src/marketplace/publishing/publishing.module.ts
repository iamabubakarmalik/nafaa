import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../../core/queue/queue.module';
import { MarketCoreModule } from '../_shared/market-core.module';

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
import { MarketplaceAnalyticsController } from './analytics.controller';
import { MarketplaceAnalyticsService } from './analytics.service';

// Phase 3A
import { CouponsAdvancedController } from './coupons-advanced.controller';
import { CouponsAdvancedService } from './coupons-advanced.service';

// Phase 3B
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
// Phase 4
import { BizNotificationsController } from './biz-notifications.controller';
import { BizNotificationsService } from './biz-notifications.service';
import { SettingsHubController } from './settings-hub.controller';
import { SettingsHubService } from './settings-hub.service';


@Module({
  imports: [PrismaModule, QueueModule, MarketCoreModule],
  controllers: [
    ShopPublishingController,
    ProductPublishingController,
    MarketplaceDashboardController,
    MarketplaceOrdersManageController,
    ReviewsManageController,
    MessagesManageController,
    MarketplaceAnalyticsController,
    CouponsAdvancedController,
    LoyaltyController,
    TrackingController,
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
    MarketplaceAnalyticsService,
    CouponsAdvancedService,
    LoyaltyService,
    TrackingService,
    BizNotificationsService,
    SettingsHubService,
  ],
})
export class PublishingModule {}
