/**
 * Shared Market engine: sales channel, live catalog, status sync and
 * platform settings. Imported by the customer and seller Market modules.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OnlineOrdersModule } from '../../integrations/online-orders/online-orders.module';
import { MarketplaceNotificationsModule } from '../notifications/notifications.module';
import { MarketCatalogService } from './market-catalog.service';
import { MarketChannelService } from './market-channel.service';
import { MarketIntakeService } from './market-intake.service';
import { MarketSettingsService } from './market-settings.service';
import { MarketStatusSyncService } from './market-status-sync.service';

@Module({
  imports: [PrismaModule, OnlineOrdersModule, MarketplaceNotificationsModule],
  providers: [MarketCatalogService, MarketChannelService, MarketIntakeService, MarketSettingsService, MarketStatusSyncService],
  exports: [MarketCatalogService, MarketChannelService, MarketIntakeService, MarketSettingsService, MarketStatusSyncService, OnlineOrdersModule],
})
export class MarketCoreModule {}
