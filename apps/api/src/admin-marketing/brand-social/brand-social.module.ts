import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MetaGraphService } from '../../integrations/meta/meta-graph.service';
import { UploadsModule } from '../../modules/uploads/uploads.module';
import { BrandSocialController } from './brand-social.controller';
import { AutomationAuditInterceptor, AutomationKeyGuard, BrandSocialAutomationController } from './brand-social-automation.controller';
import { BrandSocialAccountsService } from './brand-social-accounts.service';
import { BrandSocialAiService } from './brand-social-ai.service';
import { BrandSocialGraphService } from './brand-social-graph.service';
import { BrandSocialInsightsService } from './brand-social-insights.service';
import { BrandSocialMediaService } from './brand-social-media.service';
import { BrandSocialPostsService } from './brand-social-posts.service';
import { BrandSocialPublisherService } from './brand-social-publisher.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';

/**
 * Nafaa Social: Nafaa's own social media accounts, posts, publishing,
 * results and ads overview, run from the admin panel, plus the automation
 * API for an automated marketer. Graph calls go through its own instance of
 * MetaGraphService; files through the uploads module's Cloudinary storage.
 */
@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [BrandSocialController, BrandSocialAutomationController],
  providers: [
    BrandSocialSettingsService, BrandSocialGraphService, BrandSocialAccountsService, BrandSocialPostsService,
    BrandSocialPublisherService, BrandSocialInsightsService, BrandSocialMediaService, BrandSocialAiService,
    AutomationKeyGuard, AutomationAuditInterceptor,
    // Provided here rather than importing MetaModule: that module pulls in the
    // online-orders graph and creates an import cycle at boot.
    MetaGraphService,
  ],
})
export class BrandSocialModule {}
