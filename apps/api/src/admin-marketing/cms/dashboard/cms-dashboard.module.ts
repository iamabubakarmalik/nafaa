import { Module } from '@nestjs/common';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsDashboardController } from './cms-dashboard.controller';
import { CmsDashboardService } from './cms-dashboard.service';

/** Website dashboard and health report (API-CONTRACT 8.9). */
@Module({
  imports: [CmsPublicCoreModule],
  controllers: [CmsDashboardController],
  providers: [CmsDashboardService],
})
export class CmsDashboardModule {}
