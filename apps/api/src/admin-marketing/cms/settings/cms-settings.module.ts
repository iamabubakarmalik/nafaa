import { Module } from '@nestjs/common';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsSettingsController } from './cms-settings.controller';
import { CmsSettingsService } from './cms-settings.service';

/** Site settings with history (API-CONTRACT 8.7). Exports the reader for the other CMS modules. */
@Module({
  imports: [CmsPublicCoreModule],
  controllers: [CmsSettingsController],
  providers: [CmsSettingsService],
  exports: [CmsSettingsService],
})
export class CmsSettingsModule {}
