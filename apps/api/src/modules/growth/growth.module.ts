import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../finance/expenses/expenses.service';
import { GrowthSettingsService } from './growth-settings.service';
import { PriceCalculatorController } from './price-calculator/price-calculator.controller';
import { PriceCalculatorService } from './price-calculator/price-calculator.service';
import { AdsController } from './ads/ads.controller';
import { AdsService } from './ads/ads.service';
import { MarketingController } from './marketing/marketing.controller';
import { MarketingService } from './marketing/marketing.service';
import { MetaCapiService } from './marketing/meta-capi.service';
import { AdCopyService } from './marketing/ad-copy.service';
import { SocialModule } from './social/social.module';
import { MetaGraphService } from '../../integrations/meta/meta-graph.service';
import { MetaAdsController } from './meta-ads/meta-ads.controller';
import { MetaAdsService } from './meta-ads/meta-ads.service';
import { AdRulesService } from './meta-ads/ad-rules.service';

/**
 * Tools for online sellers: the price calculator, the ads spend log with its
 * ROAS report, and the marketing hub (campaign attribution, Meta Conversions
 * API, ad copy, Meta ads management and ad rules). Shop defaults live in TenantSettings.reportsConfig.growth.
 */
/*
 * MetaGraphService is provided here directly (it needs only Prisma): importing
 * MetaModule would load the Google and storefront files before the
 * online-orders module and break that module's import cycle.
 */
@Module({
  imports: [PrismaModule, SocialModule],
  controllers: [PriceCalculatorController, AdsController, MarketingController, MetaAdsController],
  providers: [GrowthSettingsService, PriceCalculatorService, AdsService, ExpensesService, TenantTimezoneService, MarketingService, MetaCapiService, AdCopyService, MetaAdsService, AdRulesService, MetaGraphService],
  exports: [GrowthSettingsService],
})
export class GrowthModule {}
