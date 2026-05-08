import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import ProductsPage from '@/features/products/pages/ProductsPage';
import CustomersPage from '@/features/customers/pages/CustomersPage';
import PosPage from '@/features/pos/pages/PosPage';
import SalesPage from '@/features/sales/pages/SalesPage';
import ReceiptPage from '@/features/sales/pages/ReceiptPage';
import SuppliersPage from '@/features/suppliers/pages/SuppliersPage';
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
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';

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
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/discounts" element={<DiscountsPage />} />
              <Route path="/loyalty" element={<LoyaltyPage />} />
              <Route path="/profit-report" element={<ProfitReportPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
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
            </Route>

            <Route path="/sales/:id/receipt" element={<ReceiptPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
