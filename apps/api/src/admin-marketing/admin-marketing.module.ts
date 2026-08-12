import { Module } from '@nestjs/common';

// Phase 1
import { NewsletterModule } from './newsletter/newsletter.module';
import { ContactFormsModule } from './contact-forms/contact-forms.module';
import { DemoBookingsModule } from './demo-bookings/demo-bookings.module';
import { LeadsModule } from './leads/leads.module';

// Phase 2
import { ChatbotModule } from './chatbot/chatbot.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SeoModule } from './seo/seo.module';
import { AbTestsModule } from './ab-tests/ab-tests.module';
import { HeatmapsModule } from './heatmaps/heatmaps.module';
import { BlogAnalyticsModule } from './blog-analytics/blog-analytics.module';
import { ConversionsModule } from './conversions/conversions.module';
import { ExportsModule } from './exports/exports.module';
import { MarketingDashboardModule } from './dashboard/dashboard.module';
import { PublicTrackingModule } from './public-tracking/public-tracking.module';

@Module({
  imports: [
    // Phase 1
    NewsletterModule,
    ContactFormsModule,
    DemoBookingsModule,
    LeadsModule,

    // Phase 2
    ChatbotModule,
    CampaignsModule,
    AnalyticsModule,
    SeoModule,
    AbTestsModule,
    HeatmapsModule,
    BlogAnalyticsModule,
    ConversionsModule,
    ExportsModule,
    MarketingDashboardModule,
    PublicTrackingModule,
  ],
})
export class AdminMarketingModule {}
