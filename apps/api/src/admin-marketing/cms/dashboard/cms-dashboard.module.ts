import { Module } from '@nestjs/common';

/**
 * Website overview, health report and revalidate-all.
 *
 * Empty shell registered in cms.module.ts by A0 so the CMS module tree
 * compiles before Phase 2. Owner: A2, who fills it in (controllers,
 * providers, exports) and keeps this file name and class name.
 */
@Module({})
export class CmsDashboardModule {}
