import { Module } from '@nestjs/common';
import { CmsContentModule } from '../content/cms-content.module';
import { CmsPathsModule } from '../paths/cms-paths.module';
import { CmsCardsService } from './cms-cards.service';
import { CmsPublicCacheService } from './cms-public-cache.service';
import { CmsSiteEvents } from './cms-site-events.service';
import { SiteRevalidationBridge } from './site-revalidation.bridge';

/**
 * Shared by every A2 module: the public LRU cache and `CmsSiteEvents`
 * (cache flush + site revalidation after a write) and entry cards. Kept apart from
 * `CmsPublicModule` so resource modules can use it without import cycles.
 */
@Module({
  imports: [CmsContentModule, CmsPathsModule],
  providers: [CmsPublicCacheService, SiteRevalidationBridge, CmsSiteEvents, CmsCardsService],
  exports: [CmsPublicCacheService, CmsSiteEvents, CmsCardsService, SiteRevalidationBridge, CmsContentModule, CmsPathsModule],
})
export class CmsPublicCoreModule {}
