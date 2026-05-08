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
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
