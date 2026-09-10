import { Module } from '@nestjs/common';
import { ElectronicsAnalyticsController } from './electronics-analytics.controller';
import { ElectronicsAnalyticsService } from './electronics-analytics.service';

@Module({
  controllers: [ElectronicsAnalyticsController],
  providers: [ElectronicsAnalyticsService],
  exports: [ElectronicsAnalyticsService],
})
export class ElectronicsAnalyticsModule {}
