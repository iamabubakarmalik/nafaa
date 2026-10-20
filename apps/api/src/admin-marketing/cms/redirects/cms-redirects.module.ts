import { Module } from '@nestjs/common';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsRedirectsController } from './cms-redirects.controller';
import { CmsRedirectsService } from './cms-redirects.service';

/** Redirect rules with patterns, chain flattening and CSV (API-CONTRACT 8.5). */
@Module({
  imports: [CmsPublicCoreModule],
  controllers: [CmsRedirectsController],
  providers: [CmsRedirectsService],
  exports: [CmsRedirectsService],
})
export class CmsRedirectsModule {}
