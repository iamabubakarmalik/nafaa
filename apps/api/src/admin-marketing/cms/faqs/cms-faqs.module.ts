import { Module } from '@nestjs/common';
import { CmsPublicCoreModule } from '../public/cms-public-core.module';
import { CmsFaqsController } from './cms-faqs.controller';
import { CmsFaqsService } from './cms-faqs.service';

/** Reusable FAQs with draft and publish (API-CONTRACT 8.3). */
@Module({
  imports: [CmsPublicCoreModule],
  controllers: [CmsFaqsController],
  providers: [CmsFaqsService],
  exports: [CmsFaqsService],
})
export class CmsFaqsModule {}
