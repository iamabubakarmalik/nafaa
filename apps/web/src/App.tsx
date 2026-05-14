import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme.store';
import { useLocaleStore } from '@/store/locale.store';

import NotificationsPage from '@/features/notifications/NotificationsPage';

import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import GoogleSuccessPage from '@/features/auth/pages/GoogleSuccessPage';
import GoogleCompleteSignupPage from '@/features/auth/pages/GoogleCompleteSignupPage';
import GoogleErrorPage from '@/features/auth/pages/GoogleErrorPage';

import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import BrandsPage from '@/features/brands/pages/BrandsPage';
import TagsPage from '@/features/tags/pages/TagsPage';
import ProductsListPage from '@/features/products/pages/ProductsListPage';
import ProductFormPage from '@/features/products/pages/ProductFormPage';
import CustomersListPage from '@/features/customers/pages/CustomersListPage';
import CustomerFormPage from '@/features/customers/pages/CustomerFormPage';
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';
import PosPage from '@/features/pos/pages/PosPage';
import SalesPage from '@/features/sales/pages/SalesPage';
import ReceiptPage from '@/features/sales/pages/ReceiptPage';
import SuppliersListPage from '@/features/suppliers/pages/SuppliersListPage';
import SupplierFormPage from '@/features/suppliers/pages/SupplierFormPage';
import SupplierDetailPage from '@/features/suppliers/pages/SupplierDetailPage';
import PurchasesPage from '@/features/purchases/pages/PurchasesPage';
import CategoriesPage from '@/features/categories/pages/CategoriesPage';
import ExpensesPage from '@/features/expenses/pages/ExpensesPage';
import StockMovementsPage from '@/features/stock-movements/pages/StockMovementsPage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import BarcodeLabelsPage from '@/features/barcodes/pages/BarcodeLabelsPage';
import TeamPage from '@/features/team/pages/TeamPage';
import KhataPage from '@/features/khata/pages/KhataPage';
import StockAdjustmentsPage from '@/features/stock-adjustments/pages/StockAdjustmentsPage';
import LowStockPage from '@/features/low-stock/pages/LowStockPage';
import CashRegisterPage from '@/features/cash-register/pages/CashRegisterPage';
import ShopsPage from '@/features/shops/pages/ShopsPage';
import ActivityLogPage from '@/features/activity-log/pages/ActivityLogPage';
import TransfersPage from '@/features/transfers/pages/TransfersPage';
import ExportsPage from '@/features/exports/pages/ExportsPage';
import BackupPage from '@/features/backup/pages/BackupPage';
import ReturnsPage from '@/features/returns/pages/ReturnsPage';
import DiscountsPage from '@/features/discounts/pages/DiscountsPage';
import LoyaltyPage from '@/features/loyalty/pages/LoyaltyPage';
import ProfitReportPage from '@/features/profit-report/pages/ProfitReportPage';
import PlansPage from '@/features/billing/pages/PlansPage';
import BillingPage from '@/features/billing/pages/BillingPage';
import PayInvoicePage from '@/features/billing/pages/PayInvoicePage';
import ReferralsPage from '@/features/referrals/pages/ReferralsPage';
import PlanUsagePage from '@/features/plan-usage/pages/PlanUsagePage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import HelpPage from '@/features/help/pages/HelpPage';
import LegalPage from '@/features/legal/pages/LegalPage';
import OnboardingPage from '@/features/onboarding/pages/OnboardingPage';

import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import OnboardingGate from '@/routes/OnboardingGate';
import AppShell from '@/components/layout/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const initTheme = useThemeStore((s) => s.initialize);
  const initLocale = useLocaleStore((s) => s.initialize);

  useEffect(() => {
    initTheme();
    initLocale();
  }, [initTheme, initLocale]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/google/success" element={<GoogleSuccessPage />} />
            <Route path="/auth/google/complete-signup" element={<GoogleCompleteSignupPage />} />
            <Route path="/auth/google/error" element={<GoogleErrorPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<OnboardingGate />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id/edit" element={<ProductFormPage />} />
                <Route path="/products" element={<ProductsListPage />} />

                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />

                <Route path="/customers/new" element={<CustomerFormPage />} />
                <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/customers" element={<CustomersListPage />} />

                <Route path="/pos" element={<PosPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/discounts" element={<DiscountsPage />} />
                <Route path="/loyalty" element={<LoyaltyPage />} />
                <Route path="/profit-report" element={<ProfitReportPage />} />

                <Route path="/suppliers/new" element={<SupplierFormPage />} />
                <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
                <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
                <Route path="/suppliers" element={<SuppliersListPage />} />

                <Route path="/purchases" element={<PurchasesPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/stock-movements" element={<StockMovementsPage />} />
                <Route path="/stock-adjustments" element={<StockAdjustmentsPage />} />
                <Route path="/low-stock" element={<LowStockPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/barcode-labels" element={<BarcodeLabelsPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/khata" element={<KhataPage />} />
                <Route path="/cash-register" element={<CashRegisterPage />} />
                <Route path="/shops" element={<ShopsPage />} />
                <Route path="/activity-log" element={<ActivityLogPage />} />
                <Route path="/transfers" element={<TransfersPage />} />
                <Route path="/exports" element={<ExportsPage />} />
                <Route path="/backup" element={<BackupPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/billing/invoice/:id/pay" element={<PayInvoicePage />} />
                <Route path="/referrals" element={<ReferralsPage />} />
                <Route path="/plan-usage" element={<PlanUsagePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/legal" element={<LegalPage />} />
              </Route>
            </Route>

            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/sales/:id/receipt" element={<ReceiptPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
