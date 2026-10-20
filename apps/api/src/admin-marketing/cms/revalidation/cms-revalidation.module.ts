import { Module } from '@nestjs/common';

/**
 * Site revalidation client (HMAC, retries) and IndexNow. Exports SiteRevalidationService.
 *
 * Empty shell registered in cms.module.ts by A0 so the CMS module tree
 * compiles before Phase 2. Owner: A1, who fills it in (controllers,
 * providers, exports) and keeps this file name and class name.
 */
@Module({})
export class CmsRevalidationModule {}
