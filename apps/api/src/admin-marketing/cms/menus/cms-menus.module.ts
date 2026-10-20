import { Module } from '@nestjs/common';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsSettingsModule } from '../settings/cms-settings.module';
import { CmsMenusController } from './cms-menus.controller';
import { CmsMenusService } from './cms-menus.service';

/** Menus (API-CONTRACT 8.6). Exports the resolver used by the public layout. */
@Module({
  imports: [CmsPublicCoreModule, CmsSettingsModule],
  controllers: [CmsMenusController],
  providers: [CmsMenusService],
  exports: [CmsMenusService],
})
export class CmsMenusModule {}
