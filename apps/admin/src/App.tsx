import { lazy } from 'react';
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

          <Route element={<ProtectedRoute />}>
            {/* Every signed-in page renders inside the admin shell */}
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              <Route path="/tenants" element={<TenantsListPage />} />
              <Route path="/tenants/:id" element={<TenantDetailPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/customers" element={<AdminCustomersPage />} />
              <Route path="/deletion-requests" element={<DeletionRequestsPage />} />

              <Route path="/products" element={<AdminProductsPage />} />
              <Route path="/sales" element={<AdminSalesPage />} />

              <Route path="/billing" element={<BillingPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/plans" element={<PlansPage />} />
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
