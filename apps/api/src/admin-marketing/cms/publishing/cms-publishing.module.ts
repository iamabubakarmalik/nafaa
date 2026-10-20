import { Module } from '@nestjs/common';

/**
 * Publish, unpublish, schedule, restore, published index rebuild, auto-redirects and the scheduler. Exports PublishingService.
 *
 * Empty shell registered in cms.module.ts by A0 so the CMS module tree
 * compiles before Phase 2. Owner: A1, who fills it in (controllers,
 * providers, exports) and keeps this file name and class name.
 */
@Module({})
export class CmsPublishingModule {}
