import { Global, Module } from '@nestjs/common';
import { CmsFanoutService } from './cms-fanout.service';
import { IndexNowService } from './indexnow.service';
import { SiteRevalidationService } from './site-revalidation.service';

/**
 * Site revalidation (HMAC, retries), tag fan-out and IndexNow.
 *
 * Global so code outside the CMS (Admin → Plans) can inject
 * SiteRevalidationService without changing its own module.
 */
@Global()
@Module({
  providers: [SiteRevalidationService, CmsFanoutService, IndexNowService],
  exports: [SiteRevalidationService, CmsFanoutService, IndexNowService],
})
export class CmsRevalidationModule {}
