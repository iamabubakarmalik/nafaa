import { Module } from '@nestjs/common';
import { AdminActivityModule } from './activity/admin-activity.module';
import { AdminAnalyticsModule } from './analytics/admin-analytics.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminBillingModule } from './billing/admin-billing.module';
import { AdminBroadcastModule } from './broadcast/admin-broadcast.module';
import { AdminBulkModule } from './bulk/admin-bulk.module';
import { AdminCommunicationsModule } from './communications/admin-communications.module';
import { AdminCustomersModule } from './customers/admin-customers.module';
import { AdminDeletionRequestsModule } from './deletion-requests/admin-deletion-requests.module';
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
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { AdminStaffModule } from './staff/admin-staff.module';
import { AdminAiUsageModule } from './ai-usage/admin-ai-usage.module';
import { AdminPresenceModule } from './presence/admin-presence.module';
import { AdminSystemControlModule } from './system-control/admin-system-control.module';
import { AdminAuditInterceptor } from './access/admin-audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminTenantsModule } from './tenants/admin-tenants.module';
import { AdminUsersModule } from './users/admin-users.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminNotificationsModule,
    AdminTenantsModule,
    AdminUsersModule,
    AdminDashboardModule,
    AdminStaffModule,
    AdminAiUsageModule,
    AdminPresenceModule,
    AdminSystemControlModule,
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
    AdminDeletionRequestsModule,
    AdminInvoicesModule,
    AdminBroadcastModule,
    AdminPlatformDiscountsModule,
    AdminEmailTemplatesModule,
    AdminCommunicationsModule,
    AdminSettingsModule,
    AdminHealthModule,
    AdminBulkModule,
    AdminExportsModule,
  ],
  // Every admin change is written to the audit log (see access/admin-audit.interceptor.ts).
  providers: [{ provide: APP_INTERCEPTOR, useClass: AdminAuditInterceptor }],
})
export class AdminModule {}
