import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { envValidationSchema } from './config/env.validation';

// ─── Core Foundation (Global) ──────────────────────────────
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './core/realtime/realtime.module';
import { QueueModule } from './core/queue/queue.module';
import { SchedulerModule } from './core/scheduler/scheduler.module';
import { StorageModule } from './core/storage/storage.module';

// ─── Auth / Onboarding ────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

// ─── Business Ops ─────────────────────────────────────────
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProductsModule } from './modules/inventory/products/products.module';
import { CategoriesModule } from './modules/inventory/categories/categories.module';
import { BrandsModule } from './modules/inventory/brands/brands.module';
import { TagsModule } from './modules/inventory/tags/tags.module';
import { ProductVariantsModule } from './modules/inventory/product-variants/product-variants.module';
import { ProductImagesModule } from './modules/inventory/product-images/product-images.module';
import { ProductBatchesModule } from './modules/inventory/product-batches/product-batches.module';
import { StockMovementsModule } from './modules/inventory/stock-movements/stock-movements.module';
import { StockAdjustmentsModule } from './modules/inventory/stock-adjustments/stock-adjustments.module';
import { TransfersModule } from './modules/inventory/transfers/transfers.module';

import { CustomersModule } from './modules/customers/customers/customers.module';
import { CustomerLedgerModule } from './modules/customers/customer-ledger/customer-ledger.module';
import { LoyaltyModule } from './modules/customers/loyalty/loyalty.module';
import { ReferralsModule } from './modules/customers/referrals/referrals.module';

import { DiscountsModule } from './modules/sales/discounts/discounts.module';
import { SalesModule } from './modules/sales/sales/sales.module';
import { ReturnsModule } from './modules/sales/returns/returns.module';
import { BookingsModule } from './modules/bookings/bookings.module';

import { SuppliersModule } from './modules/purchasing/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchasing/purchases/purchases.module';

import { ExpensesModule } from './modules/finance/expenses/expenses.module';
import { ExpenseCategoriesModule } from './modules/finance/expense-categories/expense-categories.module';
import { CashRegisterModule } from './modules/finance/cash-register/cash-register.module';
import { ProfitReportModule } from './modules/finance/profit-report/profit-report.module';

import { ReportsModule } from './modules/reports/reports/reports.module';
import { StockReportModule } from './modules/reports/stock-report/stock-report.module';
import { ExportsModule } from './modules/reports/exports/exports.module';
import { ActivityLogModule } from './modules/reports/activity-log/activity-log.module';

import { SettingsModule } from './modules/organization/settings/settings.module';
import { ShopsModule } from './modules/organization/shops/shops.module';
import { TeamModule } from './modules/organization/team/team.module';
import { StaffModule } from './modules/organization/staff/staff.module';

import { SearchModule } from './modules/pos/search/search.module';
import { BackupModule } from './modules/backup/backup.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EmailModule } from './modules/email/email.module';
import { SmsModule } from './modules/sms/sms.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationPrefsModule } from './modules/notification-prefs/notification-prefs.module';
import { TenantDigestsModule } from './modules/tenant-digests/tenant-digests.module';
import { FeatureGatingModule } from './modules/feature-gating/feature-gating.module';

// ─── Billing ──────────────────────────────────────────────
import { PlansModule } from './modules/billing/plans/plans.module';
import { SubscriptionsModule } from './modules/billing/subscriptions/subscriptions.module';
import { SubscriptionGuard } from './modules/billing/subscriptions/guards/subscription.guard';
import { BillingModule } from './modules/billing/billing/billing.module';

// ─── Industries + Admin ───────────────────────────────────
import { IndustriesModule } from './industries/industries.module';
import { AdminModule } from './admin/admin.module';
import { AdminMarketingModule } from './admin-marketing/admin-marketing.module';

// ─── Marketplace ──────────────────────────────────────────
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PublishingModule } from './marketplace/publishing/publishing.module';

// ─── Integrations ─────────────────────────────────────────
import { StripeModule } from './integrations/stripe/stripe.module';
import { JazzCashModule } from './integrations/payments/jazzcash/jazzcash.module';
import { EasypaisaModule } from './integrations/payments/easypaisa/easypaisa.module';

// ─── Batch B: Delivery + Push ─────────────────────────────
import { DeliveryModule } from './modules/delivery/delivery.module';
import { PushModule } from './modules/push/push.module';

// ─── Batch C: Promotions + Messaging + Loyalty + Subscriptions
import { PromotionsModule } from './modules/promotions/promotions.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { LoyaltyTiersModule } from './modules/loyalty-tiers/loyalty-tiers.module';
import { CustomerSubscriptionsModule } from './modules/customer-subscriptions/customer-subscriptions.module';

// ─── Batch D: Fraud + Split + Voice + Emergency + FBR + Courier + WhatsApp
import { FraudDetectionModule } from './modules/fraud-detection/fraud-detection.module';
import { SplitPaymentModule } from './marketplace/split-payment/split-payment.module';
import { VoiceSearchModule } from './marketplace/voice-search/voice-search.module';
import { EmergencyDeliveryModule } from './marketplace/emergency-delivery/emergency-delivery.module';
import { FbrModule } from './integrations/fbr/fbr.module';
import { PostExModule } from './integrations/courier/postex/postex.module';
import { WhatsappModule } from './integrations/whatsapp/whatsapp.module';
// ─── Integration Framework ─────────────────────────────────
import { IntegrationCoreModule } from './integrations/core/integration.module';
import { CustomWebsiteModule } from './integrations/channels/custom-website/custom-website.module';
import { FoodpandaModule } from './integrations/channels/foodpanda/foodpanda.module';
import { DarazModule } from './integrations/channels/daraz/daraz.module';
import { TcsModule } from './integrations/courier/tcs/tcs.module';
import { LeopardsModule } from './integrations/courier/leopards/leopards.module';

// ─── Batch E: Cart Recovery + Try Before Buy + B2B + Prayer + AI ────
import { CartRecoveryModule } from './marketplace/cart-recovery/cart-recovery.module';
import { TryBeforeBuyModule } from './marketplace/try-before-buy/try-before-buy.module';
import { B2BWholesaleModule } from './modules/b2b-wholesale/b2b-wholesale.module';
import { PrayerRamzanModule } from './modules/prayer-ramzan/prayer-ramzan.module';
import { AiAssistantModule } from './marketplace/ai-assistant/ai-assistant.module';


@Module({
  imports: [
    // ─── Config ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // ─── Foundation ───
    PrismaModule,
    RealtimeModule,
    QueueModule,
    SchedulerModule,
    StorageModule,

    // ─── Shared services ───
    UploadsModule,
    EmailModule,
    SmsModule,
    NotificationsModule,
    NotificationPrefsModule,
    TenantDigestsModule,
    ReferralsModule,
    FeatureGatingModule,

    // ─── Auth ───
    AuthModule,
    OnboardingModule,

    // ─── Core business ───
    DashboardModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    TagsModule,
    ProductVariantsModule,
    ProductImagesModule,
    ProductBatchesModule,
    CustomersModule,
    CustomerLedgerModule,
    LoyaltyModule,
    DiscountsModule,
    SalesModule,
    BookingsModule,
    ReturnsModule,
    SuppliersModule,
    PurchasesModule,
    StockMovementsModule,
    StockAdjustmentsModule,
    TransfersModule,
    ExpensesModule,
    ExpenseCategoriesModule,
    SettingsModule,
    ReportsModule,
    StockReportModule,
    ProfitReportModule,
    TeamModule,
    StaffModule,
    ShopsModule,
    CashRegisterModule,
    ActivityLogModule,
    SearchModule,
    ExportsModule,
    BackupModule,

    // ─── Billing ───
    PlansModule,
    SubscriptionsModule,
    BillingModule,

    // ─── Industries + Admin + Marketplace ───
    IndustriesModule,
    AdminModule,
    AdminMarketingModule,
    PublishingModule,
    MarketplaceModule,

    // ─── Integrations ───
    StripeModule,
    JazzCashModule,
    EasypaisaModule,

    // ─── Batch B ───
    DeliveryModule,
    PushModule,

    // ─── Batch C ───
    PromotionsModule,
    MessagingModule,
    LoyaltyTiersModule,
    CustomerSubscriptionsModule,

    // ─── Batch D ───
    FraudDetectionModule,
    SplitPaymentModule,
    VoiceSearchModule,
    EmergencyDeliveryModule,
    FbrModule,
    PostExModule,
    WhatsappModule,

    // ─── Integration Framework ───
    IntegrationCoreModule,
    CustomWebsiteModule,
    FoodpandaModule,
    DarazModule,
    TcsModule,
    LeopardsModule,

    // ─── Batch E ───
    CartRecoveryModule,
    TryBeforeBuyModule,
    B2BWholesaleModule,
    PrayerRamzanModule,
    AiAssistantModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
