import { Module } from '@nestjs/common';
import { AdminActivityModule } from './activity/admin-activity.module';
import { AdminAnalyticsModule } from './analytics/admin-analytics.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminBillingModule } from './billing/admin-billing.module';
import { AdminBroadcastModule } from './broadcast/admin-broadcast.module';
import { AdminBulkModule } from './bulk/admin-bulk.module';
import { AdminCustomersModule } from './customers/admin-customers.module';
import { AdminEmailTemplatesModule } from './email-templates/admin-email-templates.module';
import { AdminExportsModule } from './exports/admin-exports.module';
import { AdminHealthModule } from './health/admin-health.module';
import { AdminImpersonateModule } from './impersonate/admin-impersonate.module';
import { AdminInvoicesModule } from './invoices/admin-invoices.module';
import { AdminNotesModule } from './notes/admin-notes.module';
import { AdminNotificationsModule } from './notifications/admin-notifications.module';
import { AdminPlansModule } from './plans/admin-plans.module';
import { AdminPlatformDiscountsModule } from './platform-discounts/admin-platform-discounts.module';
import { AdminProductsModule } from './products/admin-products.module';
import { AdminReferralsModule } from './referrals/admin-referrals.module';
import { AdminSalesModule } from './sales/admin-sales.module';
import { AdminSettingsModule } from './settings/admin-settings.module';
import { AdminSubscriptionsModule } from './subscriptions/admin-subscriptions.module';
import { AdminSystemModule } from './system/admin-system.module';
import { AdminTenantsModule } from './tenants/admin-tenants.module';
import { AdminUsersModule } from './users/admin-users.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminNotificationsModule,
    AdminTenantsModule,
    AdminUsersModule,
    AdminSystemModule,
    AdminBillingModule,
    AdminSubscriptionsModule,
    AdminPlansModule,
    AdminReferralsModule,
    AdminActivityModule,
    AdminAnalyticsModule,
    AdminImpersonateModule,
    AdminNotesModule,
    AdminProductsModule,
    AdminSalesModule,
    AdminCustomersModule,
    AdminInvoicesModule,
    AdminBroadcastModule,
    AdminPlatformDiscountsModule,
    AdminEmailTemplatesModule,
    AdminSettingsModule,
    AdminHealthModule,
    AdminBulkModule,
    AdminExportsModule,
  ],
})
export class AdminModule {}
