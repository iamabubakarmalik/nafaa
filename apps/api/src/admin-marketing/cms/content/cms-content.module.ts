import { Module } from '@nestjs/common';
import { CmsContentService } from './cms-content.service';
import { CmsTokenService } from './cms-token.service';

/** Tokens, entry links, Markdown checks and word counts (no controllers). */
@Module({
  providers: [CmsTokenService, CmsContentService],
  exports: [CmsTokenService, CmsContentService],
})
export class CmsContentModule {}
