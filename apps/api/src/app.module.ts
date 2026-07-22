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
import { ActivityLogModule } from './modules/reports/activity-log/activity-log.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from './modules/billing/subscriptions/guards/subscription.guard';
import { BackupModule } from './modules/backup/backup.module';
import { BillingModule } from './modules/billing/billing/billing.module';
import { CashRegisterModule } from './modules/finance/cash-register/cash-register.module';
import { CategoriesModule } from './modules/inventory/categories/categories.module';
import { CustomerLedgerModule } from './modules/customers/customer-ledger/customer-ledger.module';
import { CustomersModule } from './modules/customers/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DiscountsModule } from './modules/sales/discounts/discounts.module';
import { EmailModule } from './modules/email/email.module';
import { ExpenseCategoriesModule } from './modules/finance/expense-categories/expense-categories.module';
import { ExpensesModule } from './modules/finance/expenses/expenses.module';
import { ExportsModule } from './modules/reports/exports/exports.module';
import { FeatureGatingModule } from './modules/feature-gating/feature-gating.module';
import { ProductsModule } from './modules/inventory/products/products.module';
import { LoyaltyModule } from './modules/customers/loyalty/loyalty.module';
import { NotificationPrefsModule } from './modules/notification-prefs/notification-prefs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlansModule } from './modules/billing/plans/plans.module';
import { ProfitReportModule } from './modules/finance/profit-report/profit-report.module';
import { PurchasesModule } from './modules/purchasing/purchases/purchases.module';
import { ReferralsModule } from './modules/customers/referrals/referrals.module';
import { ReportsModule } from './modules/reports/reports/reports.module';
import { StockReportModule } from './modules/reports/stock-report/stock-report.module';
import { ReturnsModule } from './modules/sales/returns/returns.module';
import { SalesModule } from './modules/sales/sales/sales.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { SearchModule } from './modules/pos/search/search.module';
import { SettingsModule } from './modules/organization/settings/settings.module';
import { ShopsModule } from './modules/organization/shops/shops.module';
import { SmsModule } from './modules/sms/sms.module';
import { StockAdjustmentsModule } from './modules/inventory/stock-adjustments/stock-adjustments.module';
import { StockMovementsModule } from './modules/inventory/stock-movements/stock-movements.module';
import { StripeModule } from './integrations/stripe/stripe.module';
import { SubscriptionsModule } from './modules/billing/subscriptions/subscriptions.module';
import { SuppliersModule } from './modules/purchasing/suppliers/suppliers.module';
import { TeamModule } from './modules/organization/team/team.module';
import { StaffModule } from './modules/organization/staff/staff.module';
import { IndustriesModule } from './industries/industries.module';
import { TransfersModule } from './modules/inventory/transfers/transfers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { BrandsModule } from './modules/inventory/brands/brands.module';
import { TagsModule } from './modules/inventory/tags/tags.module';
import { ProductVariantsModule } from './modules/inventory/product-variants/product-variants.module';
import { ProductImagesModule } from './modules/inventory/product-images/product-images.module';
import { ProductBatchesModule } from './modules/inventory/product-batches/product-batches.module';
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
    BookingsModule,
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
