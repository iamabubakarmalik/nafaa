import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect, type ReactElement } from 'react';
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
import ImeiInventoryPage from '@/features/industries/mobile/pages/ImeiInventoryPage';
import MobileReportsPage from '@/features/industries/mobile/reports/pages/MobileReportsPage';
import EmiPlansPage from '@/features/industries/mobile/emi/pages/EmiPlansPage';
import EmiPlanDetailPage from '@/features/industries/mobile/emi/pages/EmiPlanDetailPage';
import RepairTicketsPage from '@/features/industries/mobile/repairs/pages/RepairTicketsPage';
import RepairTicketDetailPage from '@/features/industries/mobile/repairs/pages/RepairTicketDetailPage';
import GlobalImeiInventoryPage from '@/features/industries/mobile/pages/GlobalImeiInventoryPage';
import UsedPhonesPage from '@/features/industries/mobile/pages/UsedPhonesPage';
import CatalogPage from '@/features/catalog/pages/CatalogPage';
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
import PurchaseDetailPage from '@/features/purchases/pages/PurchaseDetailPage';
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

// ─── Staff Management ──────────────────────────────────────────────
import StaffListPage from '@/features/staff/pages/StaffListPage';
import ExpiryDashboardPage from '@/features/industries/pharmacy/pages/ExpiryDashboardPage';
import TablesPage from '@/features/industries/restaurant/pages/TablesPage';
import AppointmentsPage from '@/features/industries/salon/pages/AppointmentsPage';
import CarpetRollsPage from '@/features/industries/carpet/pages/CarpetRollsPage';
import CarpetCutPiecesPage from '@/features/industries/carpet/pages/CarpetCutPiecesPage';
import CarpetRollDetailPage from '@/features/industries/carpet/pages/CarpetRollDetailPage';
import CarpetReportsPage from '@/features/industries/carpet/pages/CarpetReportsPage';
import CarpetBulkImportPage from '@/features/industries/carpet/pages/CarpetBulkImportPage';
import StaffFormPage from '@/features/staff/pages/StaffFormPage';
import StaffDetailPage from '@/features/staff/pages/StaffDetailPage';
import AttendancePage from '@/features/staff/pages/AttendancePage';
import SalaryProcessPage from '@/features/staff/pages/SalaryProcessPage';

import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import OnboardingGate from '@/routes/OnboardingGate';
import AppShell from '@/components/layout/AppShell';
import PermissionRoute from '@/routes/PermissionRoute';
import { PERMISSIONS } from '@/lib/permissions';

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

  const secure = (permission: any, node: ReactElement) => (
    <PermissionRoute permission={permission}>{node}</PermissionRoute>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/google/success" element={<GoogleSuccessPage />} />
            <Route path="/auth/google/complete-signup" element={<GoogleCompleteSignupPage />} />
            <Route path="/auth/google/error" element={<GoogleErrorPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<OnboardingGate />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Notifications inside shell so header + sidebar visible */}
                <Route path="/notifications" element={<NotificationsPage />} />

                <Route path="/products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductFormPage />)} />
                <Route path="/products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ProductFormPage />)} />
                <Route path="/mobile-reports" element={<MobileReportsPage />} />
                <Route path="/emi-plans/:id" element={<EmiPlanDetailPage />} />
                <Route path="/emi-plans" element={<EmiPlansPage />} />
                <Route path="/repair-tickets/:id" element={<RepairTicketDetailPage />} />
                <Route path="/repair-tickets" element={<RepairTicketsPage />} />
                <Route path="/imei-inventory" element={<GlobalImeiInventoryPage />} />
                <Route path="/used-phones" element={<UsedPhonesPage />} />
                <Route path="/products/:id/imei" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ImeiInventoryPage />)} />
                <Route path="/products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ProductsListPage />)} />

                <Route path="/catalog" element={secure(PERMISSIONS.PRODUCTS_VIEW, <CatalogPage />)} />

                <Route path="/brands" element={secure(PERMISSIONS.BRANDS_VIEW, <BrandsPage />)} />
                <Route path="/tags" element={secure(PERMISSIONS.TAGS_VIEW, <TagsPage />)} />
                <Route path="/categories" element={secure(PERMISSIONS.CATEGORIES_VIEW, <CategoriesPage />)} />

                <Route path="/customers/new" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <CustomerFormPage />)} />
                <Route path="/customers/:id/edit" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <CustomerFormPage />)} />
                <Route path="/customers/:id" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomerDetailPage />)} />
                <Route path="/customers" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomersListPage />)} />

                <Route path="/pos" element={secure(PERMISSIONS.POS_USE, <PosPage />)} />
                <Route path="/sales" element={secure(PERMISSIONS.SALES_VIEW, <SalesPage />)} />
                <Route path="/returns" element={secure(PERMISSIONS.RETURNS_VIEW, <ReturnsPage />)} />
                <Route path="/discounts" element={secure(PERMISSIONS.DISCOUNTS_VIEW, <DiscountsPage />)} />
                <Route path="/loyalty" element={secure(PERMISSIONS.LOYALTY_VIEW, <LoyaltyPage />)} />
                <Route path="/profit-report" element={secure(PERMISSIONS.PROFIT_REPORT_VIEW, <ProfitReportPage />)} />
                <Route path="/khata" element={secure(PERMISSIONS.KHATA_VIEW, <KhataPage />)} />
                <Route path="/cash-register" element={secure(PERMISSIONS.CASH_REGISTER_VIEW, <CashRegisterPage />)} />

                <Route path="/suppliers/new" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierFormPage />)} />
                <Route path="/suppliers/:id/edit" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierFormPage />)} />
                <Route path="/suppliers/:id" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierDetailPage />)} />
                <Route path="/suppliers" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SuppliersListPage />)} />

                <Route path="/purchases/:id" element={secure(PERMISSIONS.PURCHASES_VIEW, <PurchaseDetailPage />)} />
                <Route path="/purchases" element={secure(PERMISSIONS.PURCHASES_VIEW, <PurchasesPage />)} />
                <Route path="/expenses" element={secure(PERMISSIONS.EXPENSES_VIEW, <ExpensesPage />)} />
                <Route path="/stock-movements" element={secure(PERMISSIONS.STOCK_MOVEMENTS_VIEW, <StockMovementsPage />)} />
                <Route path="/stock-adjustments" element={secure(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, <StockAdjustmentsPage />)} />
                <Route path="/low-stock" element={secure(PERMISSIONS.LOW_STOCK_VIEW, <LowStockPage />)} />
                <Route path="/reports" element={secure(PERMISSIONS.REPORTS_VIEW, <ReportsPage />)} />
                <Route path="/settings" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsPage />)} />
                <Route path="/barcode-labels" element={secure(PERMISSIONS.BARCODE_LABELS_VIEW, <BarcodeLabelsPage />)} />

                {/* Team & Staff */}
                <Route path="/team" element={secure(PERMISSIONS.TEAM_VIEW, <TeamPage />)} />
                <Route path="/staff" element={secure(PERMISSIONS.STAFF_VIEW, <StaffListPage />)} />
                <Route path="/staff/new" element={secure(PERMISSIONS.STAFF_MANAGE, <StaffFormPage />)} />
                <Route path="/staff/attendance" element={secure(PERMISSIONS.STAFF_VIEW, <AttendancePage />)} />
                <Route path="/staff/salary/new" element={secure(PERMISSIONS.STAFF_MANAGE, <SalaryProcessPage />)} />
                <Route path="/staff/:id" element={secure(PERMISSIONS.STAFF_VIEW, <StaffDetailPage />)} />
                <Route path="/expiry-dashboard" element={<ExpiryDashboardPage />} />
                <Route path="/tables" element={<TablesPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />

                {/* Carpet Industry */}
                <Route path="/carpet-rolls" element={<CarpetRollsPage />} />
                <Route path="/carpet-rolls/:id" element={<CarpetRollDetailPage />} />
                <Route path="/carpet-reports" element={<CarpetReportsPage />} />
                <Route path="/carpet-bulk-import" element={<CarpetBulkImportPage />} />
                <Route path="/carpet-cut-pieces" element={<CarpetCutPiecesPage />} />
                <Route path="/staff/:id/edit" element={secure(PERMISSIONS.STAFF_MANAGE, <StaffFormPage />)} />

                <Route path="/shops" element={secure(PERMISSIONS.SHOPS_VIEW, <ShopsPage />)} />
                <Route path="/activity-log" element={secure(PERMISSIONS.ACTIVITY_VIEW, <ActivityLogPage />)} />
                <Route path="/transfers" element={secure(PERMISSIONS.STOCK_TRANSFERS_MANAGE, <TransfersPage />)} />
                <Route path="/exports" element={secure(PERMISSIONS.EXPORTS_VIEW, <ExportsPage />)} />
                <Route path="/backup" element={secure(PERMISSIONS.BACKUP_MANAGE, <BackupPage />)} />
                <Route path="/plans" element={secure(PERMISSIONS.PLANS_VIEW, <PlansPage />)} />
                <Route path="/billing" element={secure(PERMISSIONS.BILLING_VIEW, <BillingPage />)} />
                <Route path="/billing/invoice/:id/pay" element={secure(PERMISSIONS.BILLING_VIEW, <PayInvoicePage />)} />
                <Route path="/referrals" element={secure(PERMISSIONS.REFERRALS_VIEW, <ReferralsPage />)} />
                <Route path="/plan-usage" element={secure(PERMISSIONS.PLAN_USAGE_VIEW, <PlanUsagePage />)} />

                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/legal" element={<LegalPage />} />
              </Route>
            </Route>

            {/* Standalone routes (no shell) */}
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
