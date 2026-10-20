import { Module } from '@nestjs/common';
import { CmsEntriesModule } from '../entries/cms-entries.module';
import { CmsPathsModule } from '../paths/cms-paths.module';
import { CmsRevisionsController } from './cms-revisions.controller';
import { CmsRevisionsService } from './cms-revisions.service';

/** Revision list, detail, diff, restore and menu/setting/FAQ history. */
@Module({
  imports: [CmsPathsModule, CmsEntriesModule],
  controllers: [CmsRevisionsController],
  providers: [CmsRevisionsService],
  exports: [CmsRevisionsService],
})
export class CmsRevisionsModule {}
