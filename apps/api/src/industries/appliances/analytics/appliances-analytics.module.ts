import { Module } from '@nestjs/common';
import { AppliancesAnalyticsController } from './appliances-analytics.controller';
import { AppliancesAnalyticsService } from './appliances-analytics.service';

@Module({
  controllers: [AppliancesAnalyticsController],
  providers: [AppliancesAnalyticsService],
  exports: [AppliancesAnalyticsService],
})
export class AppliancesAnalyticsModule {}
