import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantDigestsModule } from './modules/tenant-digests/tenant-digests.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { envValidationSchema } from './config/env.validation';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from './modules/subscriptions/guards/subscription.guard';
import { BackupModule } from './modules/backup/backup.module';
import { BillingModule } from './modules/billing/billing.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CustomerLedgerModule } from './modules/customer-ledger/customer-ledger.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { EmailModule } from './modules/email/email.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ExportsModule } from './modules/exports/exports.module';
import { FeatureGatingModule } from './modules/feature-gating/feature-gating.module';
import { ProductsModule } from './modules/inventory/products/products.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { NotificationPrefsModule } from './modules/notification-prefs/notification-prefs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProfitReportModule } from './modules/profit-report/profit-report.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StockReportModule } from './modules/reports/stock-report/stock-report.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SalesModule } from './modules/sales/sales.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ShopsModule } from './modules/shops/shops.module';
import { SmsModule } from './modules/sms/sms.module';
import { StockAdjustmentsModule } from './modules/stock-adjustments/stock-adjustments.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TeamModule } from './modules/team/team.module';
import { StaffModule } from './modules/staff/staff.module';
import { IndustriesModule } from './modules/industries/industries.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { BrandsModule } from './modules/brands/brands.module';
import { TagsModule } from './modules/tags/tags.module';
import { ProductVariantsModule } from './modules/product-variants/product-variants.module';
import { ProductImagesModule } from './modules/product-images/product-images.module';
import { ProductBatchesModule } from './modules/product-batches/product-batches.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    TenantDigestsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    UploadsModule,
    EmailModule,
    SmsModule,
    NotificationsModule,
    NotificationPrefsModule,
    ReferralsModule,
    FeatureGatingModule,
    AuthModule,
    OnboardingModule,
    DashboardModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    DiscountsModule,
    SalesModule,
    ReturnsModule,
    LoyaltyModule,
    SuppliersModule,
    PurchasesModule,
    StockMovementsModule,
    StockAdjustmentsModule,
    ExpensesModule,
    ExpenseCategoriesModule,
    SettingsModule,
    ReportsModule,
    StockReportModule,
    ProfitReportModule,
    TeamModule,
    StaffModule,
    IndustriesModule,
    CustomerLedgerModule,
    ShopsModule,
    CashRegisterModule,
    ActivityLogModule,
    SearchModule,
    TransfersModule,
    ExportsModule,
    BackupModule,
    PlansModule,
    SubscriptionsModule,
    BillingModule,
    StripeModule,
    AdminModule,
    BrandsModule,
    TagsModule,
    ProductVariantsModule,
    ProductImagesModule,
    ProductBatchesModule,

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
