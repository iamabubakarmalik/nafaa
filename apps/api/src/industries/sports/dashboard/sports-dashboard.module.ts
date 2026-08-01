import { Module } from '@nestjs/common';
import { SportsDashboardController } from './sports-dashboard.controller';
import { SportsDashboardService } from './sports-dashboard.service';

@Module({
  controllers: [SportsDashboardController],
  providers: [SportsDashboardService],
  exports: [SportsDashboardService],
})
export class SportsDashboardModule {}
