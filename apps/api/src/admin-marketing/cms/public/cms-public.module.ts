import { Module } from '@nestjs/common';
import { CmsMenusModule } from '../menus/cms-menus.module';
import { CmsPreviewModule } from '../preview/cms-preview.module';
import { CmsRedirectsModule } from '../redirects/cms-redirects.module';
import { CmsSeoModule } from '../seo/cms-seo.module';
import { CmsSettingsModule } from '../settings/cms-settings.module';
import { CmsLlmsPreviewController } from './cms-llms-preview.controller';
import { CmsPublicController } from './cms-public.controller';
import { CmsPublicCoreModule } from './cms-public-core.module';
import { CmsPublicEntryService } from './cms-public-entry.service';
import { CmsPublicService } from './cms-public.service';

/**
 * Public read API under /public/site with the in-memory LRU cache
 * (API-CONTRACT 2), plus the admin llms preview that renders the same data.
 */
@Module({
  imports: [CmsPublicCoreModule, CmsSettingsModule, CmsMenusModule, CmsRedirectsModule, CmsPreviewModule, CmsSeoModule],
  controllers: [CmsPublicController, CmsLlmsPreviewController],
  providers: [CmsPublicService, CmsPublicEntryService],
  exports: [CmsPublicService, CmsPublicEntryService],
})
export class CmsPublicModule {}
