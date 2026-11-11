import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EntitlementInterceptor } from './entitlement.interceptor';
import { EmailModule } from '../../email/email.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { BillingLifecycleService } from './billing-lifecycle.service';
import { BillingNotifier } from './billing-notifier';
import { BillingPricingController, EntitlementsController, PricingCatalogController } from './billing-pricing.controller';
import { BillingPricingService } from './billing-pricing.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

/**
 * Pricing v2: entitlements (what a shop may use), add-ons, the lifecycle job
 * and billing messages. Global so feature gates in any module can ask
 * EntitlementsService.
 */
@Global()
@Module({
  imports: [ConfigModule, EmailModule, NotificationsModule, SubscriptionsModule],
  controllers: [PricingCatalogController, EntitlementsController, BillingPricingController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: EntitlementInterceptor }, EntitlementsService, BillingPricingService, BillingNotifier, BillingLifecycleService, TenantTimezoneService],
  exports: [EntitlementsService, BillingPricingService, BillingNotifier],
})
export class BillingPricingModule {}
