/**
 * Marketing CMS: content of the public site (apps/site), edited in apps/admin.
 *
 * One submodule per folder (ARCH 3). Each folder owns its module file
 * `<folder>/cms-<folder>.module.ts`; this file only lists them.
 * Admin routes live under /admin/marketing/cms, public reads under
 * /public/site.
 */
import { Module } from '@nestjs/common';

// A0: shared helpers and GET /admin/marketing/cms/config
import { CmsPathsModule } from './paths/cms-paths.module';
import { CmsContentModule } from './content/cms-content.module';

// A1: entries and publishing
import { CmsEntriesModule } from './entries/cms-entries.module';
import { CmsPublishingModule } from './publishing/cms-publishing.module';
import { CmsRevisionsModule } from './revisions/cms-revisions.module';
import { CmsSeoModule } from './seo/cms-seo.module';
import { CmsPreviewModule } from './preview/cms-preview.module';
import { CmsRevalidationModule } from './revalidation/cms-revalidation.module';

// A2: public API and resources
import { CmsPublicModule } from './public/cms-public.module';
import { CmsMediaModule } from './media/cms-media.module';
import { CmsFaqsModule } from './faqs/cms-faqs.module';
import { CmsRedirectsModule } from './redirects/cms-redirects.module';
import { CmsMenusModule } from './menus/cms-menus.module';
import { CmsSettingsModule } from './settings/cms-settings.module';
import { CmsCustomersModule } from './customers/cms-customers.module';
import { CmsDashboardModule } from './dashboard/cms-dashboard.module';

@Module({
  imports: [
    CmsPathsModule,
    CmsContentModule,

    CmsEntriesModule,
    CmsPublishingModule,
    CmsRevisionsModule,
    CmsSeoModule,
    CmsPreviewModule,
    CmsRevalidationModule,

    CmsPublicModule,
    CmsMediaModule,
    CmsFaqsModule,
    CmsRedirectsModule,
    CmsMenusModule,
    CmsSettingsModule,
    CmsCustomersModule,
    CmsDashboardModule,
  ],
})
export class CmsModule {}
