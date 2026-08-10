import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MarketingDashboardController } from './dashboard.controller';
import { MarketingDashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingDashboardController],
  providers: [MarketingDashboardService],
  exports: [MarketingDashboardService],
})
export class MarketingDashboardModule {}
