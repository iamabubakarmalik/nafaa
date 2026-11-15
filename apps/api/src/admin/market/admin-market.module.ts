/** Admin panel: Nafaa Market workspace (overview, shops, orders, reviews, customers, home, settings, settlements, support). */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MarketCoreModule } from '../../marketplace/_shared/market-core.module';
import { MarketplaceNotificationsModule } from '../../marketplace/notifications/notifications.module';
import { AdminMarketController } from './admin-market.controller';
import { AdminMarketService } from './admin-market.service';
import { AdminMarketContentService } from './admin-market-content.service';

@Module({
  imports: [PrismaModule, MarketCoreModule, MarketplaceNotificationsModule],
  controllers: [AdminMarketController],
  providers: [AdminMarketService, AdminMarketContentService],
})
export class AdminMarketModule {}
