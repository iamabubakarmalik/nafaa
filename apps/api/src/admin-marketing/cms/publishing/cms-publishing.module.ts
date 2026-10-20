import { Module } from '@nestjs/common';
import { CmsContentModule } from '../content/cms-content.module';
import { CmsPathsModule } from '../paths/cms-paths.module';
import { CmsSeoModule } from '../seo/cms-seo.module';
import { CmsPublishingService } from './cms-publishing.service';

/**
 * Publish, schedule (cron), unpublish, archive, bulk and preview snapshots.
 * Revalidation comes from the global CmsRevalidationModule.
 */
@Module({
  imports: [CmsContentModule, CmsPathsModule, CmsSeoModule],
  providers: [CmsPublishingService],
  exports: [CmsPublishingService],
})
export class CmsPublishingModule {}
