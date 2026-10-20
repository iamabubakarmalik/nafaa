import { Module } from '@nestjs/common';
import { CmsContentModule } from '../content/cms-content.module';
import { CmsConfigController } from './cms-config.controller';
import { CmsConfigService } from './cms-config.service';
import { CmsPathService } from './cms-path.service';

/** Path rules (`CmsPathService`) and `GET /admin/marketing/cms/config`. */
@Module({
  imports: [CmsContentModule],
  controllers: [CmsConfigController],
  providers: [CmsPathService, CmsConfigService],
  exports: [CmsPathService],
})
export class CmsPathsModule {}
