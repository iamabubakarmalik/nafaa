import { Module } from '@nestjs/common';
import { CmsPathsModule } from '../paths/cms-paths.module';
import { CmsPreviewModule } from '../preview/cms-preview.module';
import { CmsPublishingModule } from '../publishing/cms-publishing.module';
import { CmsSeoModule } from '../seo/cms-seo.module';
import { CmsEntriesController } from './cms-entries.controller';
import { CmsEntriesService } from './cms-entries.service';

/** Admin entry CRUD, lookup, duplicate, translations and the publish routes. */
@Module({
  imports: [CmsPathsModule, CmsSeoModule, CmsPublishingModule, CmsPreviewModule],
  controllers: [CmsEntriesController],
  providers: [CmsEntriesService],
  exports: [CmsEntriesService],
})
export class CmsEntriesModule {}
