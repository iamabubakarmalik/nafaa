import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import LoginPage from '@/features/auth/pages/LoginPage';
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const TenantsListPage = lazy(() => import('@/features/tenants/pages/TenantsListPage'));
const TenantDetailPage = lazy(() => import('@/features/tenants/pages/TenantDetailPage'));
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'));
const BillingPage = lazy(() => import('@/features/billing/pages/BillingPage'));
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/pages/SubscriptionsPage'));
const PlansPage = lazy(() => import('@/features/plans/pages/PlansPage'));
const AddOnsPage = lazy(() => import('@/features/addons/pages/AddOnsPage'));
const BillingSettingsPage = lazy(() => import('@/features/billing/pages/BillingSettingsPage'));
const SetupRequestsPage = lazy(() => import('@/features/billing/pages/SetupRequestsPage'));
const RevenuePage = lazy(() => import('@/features/revenue/pages/RevenuePage'));
const ReferralsPage = lazy(() => import('@/features/referrals/pages/ReferralsPage'));
const ActivityPage = lazy(() => import('@/features/activity/pages/ActivityPage'));
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage'));
const AdminProductsPage = lazy(() => import('@/features/admin-products/pages/AdminProductsPage'));
const AdminSalesPage = lazy(() => import('@/features/admin-sales/pages/AdminSalesPage'));
const DeletionRequestsPage = lazy(() => import('@/features/deletion-requests/pages/DeletionRequestsPage'));
const AdminCustomersPage = lazy(() => import('@/features/admin-customers/pages/AdminCustomersPage'));
const InvoicesPage = lazy(() => import('@/features/invoices/pages/InvoicesPage'));
const BroadcastPage = lazy(() => import('@/features/broadcast/pages/BroadcastPage'));
const PlatformDiscountsPage = lazy(() => import('@/features/platform-discounts/pages/PlatformDiscountsPage'));
const EmailTemplatesPage = lazy(() => import('@/features/email-templates/pages/EmailTemplatesPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const PlatformAppearancePage = lazy(() => import('@/features/appearance/pages/PlatformAppearancePage'));
const HealthPage = lazy(() => import('@/features/health/pages/HealthPage'));
const SystemControlsPage = lazy(() => import('@/features/system/pages/ControlsPage'));
const SystemJobsPage = lazy(() => import('@/features/system/pages/JobsPage'));
const SystemErrorsPage = lazy(() => import('@/features/system/pages/ErrorsPage'));
const BulkActionsPage = lazy(() => import('@/features/bulk-actions/pages/BulkActionsPage'));
const AdminExportsPage = lazy(() => import('@/features/admin-exports/pages/AdminExportsPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const DistributionUsagePage = lazy(() => import('@/features/distribution/pages/DistributionUsagePage'));
const CommerceOverviewPage = lazy(() => import('@/features/commerce/pages/CommerceOverviewPage'));
const CommerceChannelsPage = lazy(() => import('@/features/commerce/pages/CommerceChannelsPage'));
const CommerceJobsPage = lazy(() => import('@/features/commerce/pages/CommerceJobsPage'));
const CommerceOrdersPage = lazy(() => import('@/features/commerce/pages/CommerceOrdersPage'));
const CommerceCouriersPage = lazy(() => import('@/features/commerce/pages/CommerceCouriersPage'));
const CommerceControlsPage = lazy(() => import('@/features/commerce/pages/CommerceControlsPage'));
const StoresOverviewPage = lazy(() => import('@/features/stores/pages/StoresOverviewPage'));
const StoresListPage = lazy(() => import('@/features/stores/pages/StoresListPage'));
const StoreDetailPage = lazy(() => import('@/features/stores/pages/StoreDetailPage'));
const StoreDomainsPage = lazy(() => import('@/features/stores/pages/StoreDomainsPage'));
const StoreReportsPage = lazy(() => import('@/features/stores/pages/StoreReportsPage'));
const StoreControlsPage = lazy(() => import('@/features/stores/pages/StoreControlsPage'));
const MobileOverviewPage = lazy(() => import('@/features/mobile/pages/MobileOverviewPage'));
const MobileDevicesPage = lazy(() => import('@/features/mobile/pages/MobileDevicesPage'));
const MobileDeviceDetailPage = lazy(() => import('@/features/mobile/pages/MobileDeviceDetailPage'));
const MobileReleasesPage = lazy(() => import('@/features/mobile/pages/MobileReleasesPage'));
const MobileAnnouncementsPage = lazy(() => import('@/features/mobile/pages/MobileAnnouncementsPage'));
const MobileFlagsPage = lazy(() => import('@/features/mobile/pages/MobileFlagsPage'));
const MobileAppearancePage = lazy(() => import('@/features/mobile/pages/MobileAppearancePage'));
const MobilePushPage = lazy(() => import('@/features/mobile/pages/MobilePushPage'));
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import AdminShell from '@/shell/AdminShell';
import { useAdminTheme } from '@/design/theme';
const EmailLogsPage = lazy(() => import('@/features/email-logs/pages/EmailLogsPage'));
const SmsLogsPage = lazy(() => import('@/features/sms-logs/pages/SmsLogsPage'));
const SmsTemplatesPage = lazy(() => import('@/features/sms-templates/pages/SmsTemplatesPage'));
const BulkCommunicationsPage = lazy(() => import('@/features/bulk-communications/pages/BulkCommunicationsPage'));

// ─── Marketing Hub ────────────────────────────────────────
const MarketingDashboardPage = lazy(() => import('@/features/marketing/dashboard/pages/MarketingDashboardPage').then((m) => ({ default: m.MarketingDashboardPage })));
const SubscribersListPage = lazy(() => import('@/features/marketing/newsletter/pages/SubscribersListPage').then((m) => ({ default: m.SubscribersListPage })));
const SendNewsletterPage = lazy(() => import('@/features/marketing/newsletter/pages/SendNewsletterPage').then((m) => ({ default: m.SendNewsletterPage })));
const ContactFormsListPage = lazy(() => import('@/features/marketing/contact-forms/pages/ContactFormsListPage').then((m) => ({ default: m.ContactFormsListPage })));
const ContactFormDetailPage = lazy(() => import('@/features/marketing/contact-forms/pages/ContactFormDetailPage').then((m) => ({ default: m.ContactFormDetailPage })));
const DemoBookingsListPage = lazy(() => import('@/features/marketing/demo-bookings/pages/DemoBookingsListPage').then((m) => ({ default: m.DemoBookingsListPage })));
const DemoBookingDetailPage = lazy(() => import('@/features/marketing/demo-bookings/pages/DemoBookingDetailPage').then((m) => ({ default: m.DemoBookingDetailPage })));
const LeadsListPage = lazy(() => import('@/features/marketing/leads/pages/LeadsListPage').then((m) => ({ default: m.LeadsListPage })));
const LeadDetailPage = lazy(() => import('@/features/marketing/leads/pages/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })));
const ChatbotConversationsPage = lazy(() => import('@/features/marketing/chatbot/pages/ChatbotConversationsPage').then((m) => ({ default: m.ChatbotConversationsPage })));
const ChatbotConversationDetailPage = lazy(() => import('@/features/marketing/chatbot/pages/ChatbotConversationDetailPage').then((m) => ({ default: m.ChatbotConversationDetailPage })));
const CampaignsListPage = lazy(() => import('@/features/marketing/campaigns/pages/CampaignsListPage').then((m) => ({ default: m.CampaignsListPage })));
const CampaignBuilderPage = lazy(() => import('@/features/marketing/campaigns/pages/CampaignBuilderPage').then((m) => ({ default: m.CampaignBuilderPage })));
const TrafficOverviewPage = lazy(() => import('@/features/marketing/analytics/pages/TrafficOverviewPage').then((m) => ({ default: m.TrafficOverviewPage })));
const SeoPagesPage = lazy(() => import('@/features/marketing/seo/pages/SeoPagesPage').then((m) => ({ default: m.SeoPagesPage })));
const AbTestsListPage = lazy(() => import('@/features/marketing/ab-tests/pages/AbTestsListPage').then((m) => ({ default: m.AbTestsListPage })));
const HeatmapsPage = lazy(() => import('@/features/marketing/heatmaps/pages/HeatmapsPage').then((m) => ({ default: m.HeatmapsPage })));
const BlogAnalyticsPage = lazy(() => import('@/features/marketing/blog-analytics/pages/BlogAnalyticsPage').then((m) => ({ default: m.BlogAnalyticsPage })));
const FunnelPage = lazy(() => import('@/features/marketing/conversions/pages/FunnelPage').then((m) => ({ default: m.FunnelPage })));
const MarketingExportsPage = lazy(() => import('@/features/marketing/exports/pages/ExportsPage').then((m) => ({ default: m.ExportsPage })));
const CmsRoutes = lazy(() => import('@/features/marketing/cms/routes').then((m) => ({ default: m.CmsRoutes })));

const AcceptInvitePage = lazy(() => import('@/features/auth/pages/AcceptInvitePage'));
const StaffPage = lazy(() => import('@/features/staff/pages/StaffPage'));
const RolesPage = lazy(() => import('@/features/staff/pages/RolesPage'));
const AuditLogPage = lazy(() => import('@/features/staff/pages/AuditLogPage'));
const LiveNowPage = lazy(() => import('@/features/live/pages/LiveNowPage'));
const AiUsagePage = lazy(() => import('@/features/ai-usage/pages/AiUsagePage'));
const SecurityPage = lazy(() => import('@/features/account/pages/SecurityPage'));
const PartnersListPage = lazy(() => import('@/features/partners/pages/PartnersListPage'));
const PartnerDetailPage = lazy(() => import('@/features/partners/pages/PartnerDetailPage'));
const PartnerLeadsPage = lazy(() => import('@/features/partners/pages/PartnerLeadsPage'));
const PartnerVisitAuditPage = lazy(() => import('@/features/partners/pages/VisitAuditPage'));
const PartnerPayoutsPage = lazy(() => import('@/features/partners/pages/PayoutsPage'));
const PartnerPlansPage = lazy(() => import('@/features/partners/pages/PlansPage'));
const PartnerPerformancePage = lazy(() => import('@/features/partners/pages/PerformancePage'));
const PartnerKitPage = lazy(() => import('@/features/partners/pages/KitPage'));
const SocialOverviewPage = lazy(() => import('@/features/brand-social/pages/OverviewPage'));
const SocialCalendarPage = lazy(() => import('@/features/brand-social/pages/CalendarPage'));
const SocialComposerPage = lazy(() => import('@/features/brand-social/pages/ComposerPage'));
const SocialApprovalsPage = lazy(() => import('@/features/brand-social/pages/ApprovalsPage'));
const SocialHandoffPage = lazy(() => import('@/features/brand-social/pages/HandoffPage'));
const SocialMediaPage = lazy(() => import('@/features/brand-social/pages/MediaPage'));
const SocialAnalyticsPage = lazy(() => import('@/features/brand-social/pages/AnalyticsPage'));
const SocialAccountsPage = lazy(() => import('@/features/brand-social/pages/AccountsPage'));
const SocialMetaCallbackPage = lazy(() => import('@/features/brand-social/pages/MetaCallbackPage'));
const SocialPlatformCallbackPage = lazy(() => import('@/features/brand-social/pages/PlatformCallbackPage'));
const SocialSettingsPage = lazy(() => import('@/features/brand-social/pages/SettingsPage'));
const SocialAdsPage = lazy(() => import('@/features/brand-social/pages/AdsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  useAdminTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route path="/accept-invite" element={<Suspense fallback={null}><AcceptInvitePage /></Suspense>} />

          <Route element={<ProtectedRoute />}>
            {/* Every signed-in page renders inside the admin shell */}
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/system/controls" element={<SystemControlsPage />} />
              <Route path="/system/jobs" element={<SystemJobsPage />} />
              <Route path="/system/errors" element={<SystemErrorsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              <Route path="/tenants" element={<TenantsListPage />} />
              <Route path="/tenants/:id" element={<TenantDetailPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/customers" element={<AdminCustomersPage />} />
              <Route path="/deletion-requests" element={<DeletionRequestsPage />} />

              {/* Partner programme: fixed paths are listed before /partners/:id */}
              <Route path="/partners" element={<PartnersListPage />} />
              <Route path="/partners/applications" element={<PartnersListPage key="applications" applications />} />
              <Route path="/partners/leads" element={<PartnerLeadsPage />} />
              <Route path="/partners/visits" element={<PartnerVisitAuditPage />} />
              <Route path="/partners/payouts" element={<PartnerPayoutsPage />} />
              <Route path="/partners/plans" element={<PartnerPlansPage />} />
              <Route path="/partners/performance" element={<PartnerPerformancePage />} />
              <Route path="/partners/kit" element={<PartnerKitPage />} />
              <Route path="/partners/:id" element={<PartnerDetailPage />} />

              <Route path="/products" element={<AdminProductsPage />} />
              <Route path="/sales" element={<AdminSalesPage />} />

              <Route path="/billing" element={<BillingPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/billing/settings" element={<BillingSettingsPage />} />
              <Route path="/setups" element={<SetupRequestsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/addons" element={<AddOnsPage />} />
              <Route path="/revenue" element={<RevenuePage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/referrals" element={<ReferralsPage />} />
              <Route path="/platform-discounts" element={<PlatformDiscountsPage />} />
              <Route path="/distribution" element={<DistributionUsagePage />} />

              <Route path="/commerce" element={<CommerceOverviewPage />} />
              <Route path="/commerce/channels" element={<CommerceChannelsPage />} />
              <Route path="/commerce/jobs" element={<CommerceJobsPage />} />
              <Route path="/commerce/orders" element={<CommerceOrdersPage />} />
              <Route path="/commerce/couriers" element={<CommerceCouriersPage />} />
              <Route path="/commerce/controls" element={<CommerceControlsPage />} />

              {/* Nafaa Stores websites: fixed paths are listed before /stores/:id */}
              <Route path="/stores" element={<StoresOverviewPage />} />
              <Route path="/stores/list" element={<StoresListPage />} />
              <Route path="/stores/domains" element={<StoreDomainsPage />} />
              <Route path="/stores/reports" element={<StoreReportsPage />} />
              <Route path="/stores/controls" element={<StoreControlsPage />} />
              <Route path="/stores/:id" element={<StoreDetailPage />} />

              <Route path="/mobile" element={<MobileOverviewPage />} />
              <Route path="/mobile/devices" element={<MobileDevicesPage />} />
              <Route path="/mobile/devices/:id" element={<MobileDeviceDetailPage />} />
              <Route path="/mobile/releases" element={<MobileReleasesPage />} />
              <Route path="/mobile/announcements" element={<MobileAnnouncementsPage />} />
              <Route path="/mobile/flags" element={<MobileFlagsPage />} />
              <Route path="/mobile/appearance" element={<MobileAppearancePage />} />
              <Route path="/mobile/push" element={<MobilePushPage />} />

              <Route path="/broadcast" element={<BroadcastPage />} />
              <Route path="/email-templates" element={<EmailTemplatesPage />} />
              <Route path="/email-logs" element={<EmailLogsPage />} />
              <Route path="/sms-templates" element={<SmsTemplatesPage />} />
              <Route path="/sms-logs" element={<SmsLogsPage />} />
              <Route path="/bulk-communications" element={<BulkCommunicationsPage />} />

              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/bulk-actions" element={<BulkActionsPage />} />
              <Route path="/exports" element={<AdminExportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/appearance" element={<PlatformAppearancePage />} />

              <Route path="/staff" element={<StaffPage />} />
              <Route path="/staff/roles" element={<RolesPage />} />
              <Route path="/staff/audit" element={<AuditLogPage />} />
              <Route path="/account/security" element={<SecurityPage />} />
              <Route path="/ai-usage" element={<AiUsagePage />} />
              <Route path="/live" element={<LiveNowPage />} />

              {/* Nafaa Social: Nafaa's own social accounts (Marketing workspace) */}
              <Route path="/social" element={<SocialOverviewPage />} />
              <Route path="/social/calendar" element={<SocialCalendarPage />} />
              <Route path="/social/posts/:id" element={<SocialComposerPage />} />
              <Route path="/social/approvals" element={<SocialApprovalsPage />} />
              <Route path="/social/handoff" element={<SocialHandoffPage />} />
              <Route path="/social/media" element={<SocialMediaPage />} />
              <Route path="/social/analytics" element={<SocialAnalyticsPage />} />
              <Route path="/social/ads" element={<SocialAdsPage />} />
              <Route path="/social/accounts" element={<SocialAccountsPage />} />
              <Route path="/social/accounts/callback" element={<SocialMetaCallbackPage />} />
              <Route path="/social/accounts/callback/:platform" element={<SocialPlatformCallbackPage />} />
              <Route path="/social/settings" element={<SocialSettingsPage />} />

              {/* Marketing site workspace */}
              <Route path="/marketing">
                <Route index element={<MarketingDashboardPage />} />

                <Route path="newsletter" element={<SubscribersListPage />} />
                <Route path="newsletter/send" element={<SendNewsletterPage />} />

                <Route path="contact-forms" element={<ContactFormsListPage />} />
                <Route path="contact-forms/:id" element={<ContactFormDetailPage />} />

                <Route path="demos" element={<DemoBookingsListPage />} />
                <Route path="demos/:id" element={<DemoBookingDetailPage />} />

                <Route path="leads" element={<LeadsListPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />

                <Route path="chatbot" element={<ChatbotConversationsPage />} />
                <Route path="chatbot/:id" element={<ChatbotConversationDetailPage />} />

                <Route path="campaigns" element={<CampaignsListPage />} />
                <Route path="campaigns/new" element={<CampaignBuilderPage />} />

                <Route path="analytics" element={<TrafficOverviewPage />} />
                <Route path="seo" element={<SeoPagesPage />} />
                <Route path="ab-tests" element={<AbTestsListPage />} />
                <Route path="heatmaps" element={<HeatmapsPage />} />
                <Route path="blog" element={<BlogAnalyticsPage />} />
                <Route path="conversions" element={<FunnelPage />} />
                <Route path="exports" element={<MarketingExportsPage />} />

                {/* Website CMS (/marketing/website) */}
                <Route path="website/*" element={<CmsRoutes />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
