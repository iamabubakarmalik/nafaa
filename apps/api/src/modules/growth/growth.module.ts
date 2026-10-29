import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { ExpensesService } from '../finance/expenses/expenses.service';
import { GrowthSettingsService } from './growth-settings.service';
import { PriceCalculatorController } from './price-calculator/price-calculator.controller';
import { PriceCalculatorService } from './price-calculator/price-calculator.service';
import { AdsController } from './ads/ads.controller';
import { AdsService } from './ads/ads.service';

/**
 * Tools for online sellers: the price calculator and the ads spend log with
 * its ROAS report. Shop defaults live in TenantSettings.reportsConfig.growth.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PriceCalculatorController, AdsController],
  providers: [GrowthSettingsService, PriceCalculatorService, AdsService, ExpensesService, TenantTimezoneService],
  exports: [GrowthSettingsService],
})
export class GrowthModule {}
