import { Module } from '@nestjs/common';
import { UploadsModule } from '../../../modules/uploads/uploads.module';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsMediaController } from './cms-media.controller';
import { CmsMediaService } from './cms-media.service';

/** Media library on Cloudinary (API-CONTRACT 8.4). */
@Module({
  imports: [CmsPublicCoreModule, UploadsModule],
  controllers: [CmsMediaController],
  providers: [CmsMediaService],
  exports: [CmsMediaService],
})
export class CmsMediaModule {}
