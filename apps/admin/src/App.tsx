import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import LoginPage from '@/features/auth/pages/LoginPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import TenantsListPage from '@/features/tenants/pages/TenantsListPage';
import TenantDetailPage from '@/features/tenants/pages/TenantDetailPage';
import UsersPage from '@/features/users/pages/UsersPage';
import BillingPage from '@/features/billing/pages/BillingPage';
import SubscriptionsPage from '@/features/subscriptions/pages/SubscriptionsPage';
import PlansPage from '@/features/plans/pages/PlansPage';
import ReferralsPage from '@/features/referrals/pages/ReferralsPage';
import ActivityPage from '@/features/activity/pages/ActivityPage';
import AnalyticsPage from '@/features/analytics/pages/AnalyticsPage';
import AdminProductsPage from '@/features/admin-products/pages/AdminProductsPage';
import AdminSalesPage from '@/features/admin-sales/pages/AdminSalesPage';
import AdminCustomersPage from '@/features/admin-customers/pages/AdminCustomersPage';
import InvoicesPage from '@/features/invoices/pages/InvoicesPage';
import BroadcastPage from '@/features/broadcast/pages/BroadcastPage';
import PlatformDiscountsPage from '@/features/platform-discounts/pages/PlatformDiscountsPage';
import EmailTemplatesPage from '@/features/email-templates/pages/EmailTemplatesPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import HealthPage from '@/features/health/pages/HealthPage';
import BulkActionsPage from '@/features/bulk-actions/pages/BulkActionsPage';
import AdminExportsPage from '@/features/admin-exports/pages/AdminExportsPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import AdminShell from '@/components/layout/AdminShell';

// ─── Marketing Hub ────────────────────────────────────────
import { MarketingLayout } from '@/features/marketing/layout/MarketingLayout';
import { MarketingDashboardPage } from '@/features/marketing/dashboard/pages/MarketingDashboardPage';
import { SubscribersListPage } from '@/features/marketing/newsletter/pages/SubscribersListPage';
import { SendNewsletterPage } from '@/features/marketing/newsletter/pages/SendNewsletterPage';
import { ContactFormsListPage } from '@/features/marketing/contact-forms/pages/ContactFormsListPage';
import { ContactFormDetailPage } from '@/features/marketing/contact-forms/pages/ContactFormDetailPage';
import { DemoBookingsListPage } from '@/features/marketing/demo-bookings/pages/DemoBookingsListPage';
import { DemoBookingDetailPage } from '@/features/marketing/demo-bookings/pages/DemoBookingDetailPage';
import { LeadsListPage } from '@/features/marketing/leads/pages/LeadsListPage';
import { LeadDetailPage } from '@/features/marketing/leads/pages/LeadDetailPage';
import { ChatbotConversationsPage } from '@/features/marketing/chatbot/pages/ChatbotConversationsPage';
import { ChatbotConversationDetailPage } from '@/features/marketing/chatbot/pages/ChatbotConversationDetailPage';
import { CampaignsListPage } from '@/features/marketing/campaigns/pages/CampaignsListPage';
import { CampaignBuilderPage } from '@/features/marketing/campaigns/pages/CampaignBuilderPage';
import { TrafficOverviewPage } from '@/features/marketing/analytics/pages/TrafficOverviewPage';
import { SeoPagesPage } from '@/features/marketing/seo/pages/SeoPagesPage';
import { AbTestsListPage } from '@/features/marketing/ab-tests/pages/AbTestsListPage';
import { HeatmapsPage } from '@/features/marketing/heatmaps/pages/HeatmapsPage';
import { BlogAnalyticsPage } from '@/features/marketing/blog-analytics/pages/BlogAnalyticsPage';
import { FunnelPage } from '@/features/marketing/conversions/pages/FunnelPage';
import { ExportsPage as MarketingExportsPage } from '@/features/marketing/exports/pages/ExportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            {/* Main admin (uses AdminShell) */}
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              <Route path="/tenants" element={<TenantsListPage />} />
              <Route path="/tenants/:id" element={<TenantDetailPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/customers" element={<AdminCustomersPage />} />

              <Route path="/products" element={<AdminProductsPage />} />
              <Route path="/sales" element={<AdminSalesPage />} />

              <Route path="/billing" element={<BillingPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/referrals" element={<ReferralsPage />} />
              <Route path="/platform-discounts" element={<PlatformDiscountsPage />} />

              <Route path="/broadcast" element={<BroadcastPage />} />
              <Route path="/email-templates" element={<EmailTemplatesPage />} />

              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/bulk-actions" element={<BulkActionsPage />} />
              <Route path="/exports" element={<AdminExportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Marketing Hub — dedicated layout with its own sidebar */}
            <Route path="/marketing" element={<MarketingLayout />}>
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
