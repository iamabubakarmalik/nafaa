import { Module } from '@nestjs/common';
import { CmsPathsModule } from '../paths/cms-paths.module';
import { CmsPreviewService } from './cms-preview.service';

/** Signed preview tokens. A2's public preview endpoint uses `CmsPreviewService.verify`. */
@Module({
  imports: [CmsPathsModule],
  providers: [CmsPreviewService],
  exports: [CmsPreviewService],
})
export class CmsPreviewModule {}
