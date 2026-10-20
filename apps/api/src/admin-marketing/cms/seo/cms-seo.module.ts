import { Module } from '@nestjs/common';
import { CmsContentModule } from '../content/cms-content.module';
import { CmsChecksService } from './cms-checks.service';

/** Publish checks, SEO score, quality gates, similarity and title uniqueness. */
@Module({
  imports: [CmsContentModule],
  providers: [CmsChecksService],
  exports: [CmsChecksService],
})
export class CmsSeoModule {}
