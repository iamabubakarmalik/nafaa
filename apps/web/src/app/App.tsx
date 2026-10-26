// apps/web/src/App.tsx
import { ManagerPinHost } from '@core/security/ManagerPin';
import { Navigate, Route, Routes, useParams, type Params } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryCachePersister } from '@core/lib/offline/queryPersister';
import { Toaster } from 'sonner';
import { ConfirmHost } from '@/design-system/components';
import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { AppearanceBridge, AppearanceProvider } from '@/design-system';
import { useLocaleStore } from '@core/stores/locale.store';

// ─── Notifications ─────────────────────────────────────────────
import NotificationsPage from '@modules/notifications/NotificationsPage';

// ─── Marketplace Publishing ────────────────────────────────────
import MarketplaceSettingsPage from '@modules/organization/marketplace-settings/pages/MarketplaceSettingsPage';

// ─── Integrations Hub ──────────────────────────────────────────
import IntegrationHubPage from '@integrations/pages/IntegrationHubPage';
import AccountingPage from '@integrations/accounting/AccountingPage';
import HardwarePage from '@core/hardware/HardwarePage';
import PrintSettingsPage from '@core/print/PrintSettingsPage';
import AppearancePage from '@modules/appearance/pages/AppearancePage';
import DeveloperPage from '@integrations/developer/DeveloperPage';
import PayQrPage from '@core/payments/PayQrPage';
import GooglePage from '@integrations/google/GooglePage';
import TaxPage from '@modules/tax/TaxPage';
import FoodpandaPage from '@integrations/online-orders/pages/FoodpandaPage';
import CustomerDisplayPage from '@core/hardware/CustomerDisplayPage';
import {
  OnlineOrdersPage, WebsiteConnectPage, WebsiteRedirect, ConnectChannelPage, ChannelsListPage, ConnectDonePage, ShopifyAppPage, CodPage, CouriersPage, CourierDetailPage, PrintInvoicesPage, OnlineReportsPage, BlocklistPage, OnlineCustomersPage, PaymentsPage, PublicPayPage, PublicOrderPage, DevInvitePage, PublicTrackPage, OnlineStoreDocsPage,
} from '@integrations/online-orders';

// ─── FBR Tax Integration ───────────────────────────────────────

// ─── Marketplace Suite ─────────────────────────────────────────
import MarketplaceDashboardPage from '../marketplace/dashboard/MarketplaceDashboardPage';
import ShopProfilePage from '../marketplace/shop-profile/ShopProfilePage';
import MarketplaceProductsPage from '../marketplace/products/MarketplaceProductsPage';
import MarketplaceProductDetailPage from '../marketplace/products/MarketplaceProductDetailPage';
import MarketplaceOrdersPage from '../marketplace/orders/MarketplaceOrdersPage';
import MarketplaceReviewsPage from '../marketplace/reviews/MarketplaceReviewsPage';
import MarketplaceMessagesPage from '../marketplace/messages/MarketplaceMessagesPage';
import MarketplaceBargainsPage from '../marketplace/bargains/MarketplaceBargainsPage';
import MarketplaceGroupBuysPage from '../marketplace/group-buys/MarketplaceGroupBuysPage';
import MarketplaceAuctionsPage from '../marketplace/auctions/MarketplaceAuctionsPage';
import MarketplaceLiveShopPage from '../marketplace/live-shop/MarketplaceLiveShopPage';
import MarketplacePromotionsPage from '../marketplace/promotions/MarketplacePromotionsPage';
import MarketplaceDeliveryPage from '../marketplace/delivery/MarketplaceDeliveryPage';
import MarketplaceAnalyticsPage from '../marketplace/analytics/MarketplaceAnalyticsPage';
import CouponsAdvancedPage from '../marketplace/coupons-advanced/CouponsAdvancedPage';
import SalesFunnelPage from '../marketplace/sales-funnel/SalesFunnelPage';
import CustomerSegmentationPage from '../marketplace/customer-segmentation/CustomerSegmentationPage';
import LoyaltyRewardsPage from '../marketplace/loyalty/LoyaltyRewardsPage';
import RiderTrackingPage from '../marketplace/rider-tracking/RiderTrackingPage';
import AiRecommendationsPage from '../marketplace/ai-recommendations/AiRecommendationsPage';
import MultiShopManagerPage from '../marketplace/multi-shop/MultiShopManagerPage';
import NotificationCenterPage from '../marketplace/notifications/NotificationCenterPage';
import SettingsHubPage from '../marketplace/settings-hub/SettingsHubPage';

// ─── Auth ──────────────────────────────────────────────────────
import LoginPage from '@modules/auth/pages/LoginPage';
import RegisterPage from '@modules/auth/pages/RegisterPage';
import ForgotPasswordPage from '@modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@modules/auth/pages/ResetPasswordPage';
import GoogleSuccessPage from '@modules/auth/pages/GoogleSuccessPage';
import GoogleCompleteSignupPage from '@modules/auth/pages/GoogleCompleteSignupPage';
import GoogleErrorPage from '@modules/auth/pages/GoogleErrorPage';
import EmailVerifyPage from '@modules/auth/pages/EmailVerifyPage';

// ─── Dashboard ─────────────────────────────────────────────────
import DashboardGate from '@modules/dashboard/pages/DashboardGate';

// ─── Onboarding ────────────────────────────────────────────────
import OnboardingPage from '@modules/onboarding/pages/OnboardingPage';

// ─── Catalog / Products ────────────────────────────────────────
import BrandsPage from '@modules/inventory/brands/pages/BrandsPage';
import TagsPage from '@modules/inventory/tags/pages/TagsPage';
import ProductsListGate from '@modules/inventory/products/pages/ProductsListGate';
import ProductBulkImportPage from '@modules/inventory/products/pages/ProductBulkImportPage';
import ProductBulkEditPage from '@modules/inventory/products/pages/ProductBulkEditPage';
import ProductFormGate from '@modules/inventory/products/pages/ProductFormGate';
import ProductViewGate from '@modules/inventory/products/pages/ProductViewGate';
import CatalogPage from '@modules/catalog/pages/CatalogPage';
import CategoriesPage from '@modules/inventory/categories/pages/CategoriesPage';

// ─── Mobile Industry ───────────────────────────────────────────
// The rest of the mobile pages are routed by MobilePack with permissions.

// ─── Customers ─────────────────────────────────────────────────
import { CustomersPage as CustomerDirectoryPage } from '@modules/customers/directory/CustomersPage';
import CustomerFormPage from '@modules/customers/customers/pages/CustomerFormPage';
import { CustomerProfilePage } from '@modules/customers/directory/CustomerProfilePage';

// ─── Sales & POS ───────────────────────────────────────────────
import BookingsListPage from '@modules/bookings/pages/BookingsListPage';
import BookingFormPage from '@modules/bookings/pages/BookingFormPage';
import BookingDetailPage from '@modules/bookings/pages/BookingDetailPage';
import PosGate from '@modules/pos/pages/PosGate';
import SalesGate from '@modules/sales/sales/pages/SalesGate';
import ReceiptPage from '@modules/sales/sales/pages/ReceiptPage';
import { OfflineBanner, SyncCenterPage } from '@core/lib/offline/ui';
import ReturnsPage from '@modules/sales/returns/pages/ReturnsPage';
import DiscountsPage from '@modules/sales/discounts/pages/DiscountsPage';
import LoyaltyPage from '@modules/customers/loyalty/pages/LoyaltyPage';

// ─── Suppliers / Purchases / Expenses ──────────────────────────
import SuppliersListPage from '@modules/purchasing/suppliers/pages/SuppliersListPage';
import SupplierFormPage from '@modules/purchasing/suppliers/pages/SupplierFormPage';
import SupplierDetailPage from '@modules/purchasing/suppliers/pages/SupplierDetailPage';
import PurchasesGate, { PurchaseEditorGate } from '@modules/purchasing/purchases/pages/PurchasesGate';
import PurchaseDetailGate from '@modules/purchasing/purchases/pages/PurchaseDetailGate';
import ExpensesPage from '@modules/finance/expenses/pages/ExpensesPage';

// ─── Inventory ─────────────────────────────────────────────────
import StockMovementsPage from '@modules/inventory/stock-movements/pages/StockMovementsPage';
import StockAdjustmentsPage from '@modules/inventory/stock-adjustments/pages/StockAdjustmentsPage';
import LowStockPage from '@modules/inventory/low-stock/pages/LowStockPage';
import TransfersPage from '@modules/inventory/transfers/pages/TransfersPage';

// ─── Reports ───────────────────────────────────────────────────
import ReportsCenterPage from '@modules/reports/center/pages/ReportsCenterPage';
import StockReportPage from '@modules/inventory/stock-report/pages/StockReportPage';
import ProfitReportPage from '@modules/finance/profit-report/pages/ProfitReportPage';

// ─── Settings / System ─────────────────────────────────────────
import SettingsPage from '@modules/organization/settings/pages/SettingsPage';
import SettingsSectionPage from '@modules/organization/settings/pages/SettingsSectionPage';
import BarcodeLabelsPage from '@modules/inventory/barcodes/pages/BarcodeLabelsPage';
import ShopsPage from '@modules/organization/shops/pages/ShopsPage';
import ShopFormPage from '@modules/organization/shops/pages/ShopFormPage';
import ShopsOverviewPage from '@modules/organization/shops/pages/ShopsOverviewPage';
import ActivityLogPage from '@modules/reports/activity-log/pages/ActivityLogPage';
import ExportsPage from '@modules/reports/exports/pages/ExportsPage';
import BackupPage from '@modules/backup/pages/BackupPage';
import { KhataBookPage } from '@modules/customers/directory/KhataBookPage';
import CashRegisterPage from '@modules/finance/cash-register/pages/CashRegisterPage';
import MoneyPage from '@modules/finance/money/pages/MoneyPage';

// ─── Team & Staff ──────────────────────────────────────────────
import HrStaffPage from '@modules/hr/staff/pages/StaffPage';
import HrStaffFormPage from '@modules/hr/staff/pages/StaffFormPage';
import HrStaffProfilePage from '@modules/hr/staff/pages/StaffProfilePage';
import HrAttendancePage from '@modules/hr/attendance/pages/AttendancePage';
import PayrollPage from '@modules/hr/payroll/pages/PayrollPage';
import CommissionPage from '@modules/hr/commission/pages/CommissionPage';

// ─── Billing ───────────────────────────────────────────────────
import PlansPage from '@/modules/billing/billing/pages/PlansPage';
import BillingPage from '@modules/billing/billing/pages/BillingPage';
import PayInvoicePage from '@modules/billing/billing/pages/PayInvoicePage';
import ReferralsPage from '@modules/customers/referrals/pages/ReferralsPage';
import PlanUsagePage from '@modules/billing/plan-usage/pages/PlanUsagePage';

// ─── User ──────────────────────────────────────────────────────
import ProfilePage from '@modules/profile/pages/ProfilePage';
import HelpPage from '@modules/help/pages/HelpPage';
import LegalPage from '@modules/legal/pages/LegalPage';

// ─── Retail tools (every industry) ─────────────────────────────
import CombosPage from '@modules/inventory/combos/pages/CombosPage';
import ComboFormPage from '@modules/inventory/combos/pages/ComboFormPage';
import DamagePage from '@modules/inventory/damage/pages/DamagePage';
import ProductUnitsPage from '@modules/inventory/product-units/pages/ProductUnitsPage';
import QuickKeysPage from '@modules/pos/quick-keys/QuickKeysPage';

// ─── More reports ──────────────────────────────────────────────
import DayBookPage from '@modules/reports/day-book/DayBookPage';
import ProfitLossPage from '@modules/reports/pnl/pages/ProfitLossPage';
import { StaffReportPage } from '@modules/reports/staff-report';
import { CustomersReportPage } from '@modules/reports/customers-report';
import AuditPage from '@modules/reports/audit/pages/AuditPage';

// ─── Appointments (salon page, shown for every industry) ───────
import AppointmentsPage from '@industries/salon/pages/AppointmentsPage';

// ─── Product editors and details no pack declares ──────────────
import BakeryProductEditor from '@industries/bakery/products/BakeryProductEditor';
import BakeryProductDetail from '@industries/bakery/products/BakeryProductDetail';
import ClinicServiceWizardPage from '@industries/clinic/pages/ClinicServiceWizardPage';
import ClinicServiceDetailPage from '@industries/clinic/pages/ClinicServiceDetailPage';
import ApplianceProducts from '@industries/appliances/products/ApplianceProducts';
import ApplianceProductEditor from '@industries/appliances/products/ApplianceProductEditor';
import ApplianceProductDetail from '@industries/appliances/products/ApplianceProductDetail';

// ─── Route Guards & Layout ─────────────────────────────────────
import { ProtectedRoute, PublicOnlyRoute } from '@app/router/ProtectedRoute';
import { queryClient } from '@core/lib/queryClient';
import OnboardingGate from '@app/router/OnboardingGate';
import AppShell from '@app/shell/AppShell';
import PermissionRoute from '@app/router/PermissionRoute';
import { PERMISSIONS } from '@core/lib/permissions';

// ─── Nafaa AI (full page; the side panel lives in the app shell) ───
const AiPage = lazy(() => import('@modules/ai-assistant/pages/AiPage'));

// ─── Industry Pack System ──────────────────────────────────────
import '@app/providers/registerIndustries';
import { IndustryProvider } from '@industries/_shared/registry/IndustryProvider';
import { industryRoutes } from '@industries/_shared/registry/IndustryRoutes';

// ─── React Query Client (defined in @core/lib/queryClient) ─────

/* ═══ Persistence config — sirf successful queries save hoti hain ═══ */
const persistOptions = {
  persister: queryCachePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 din
  // v2: pre-multishop caches hold one branch's numbers under branch-agnostic
  // keys, so they have to be dropped once when multi-shop ships.
  buster: 'nafaa-offline-v2',      // schema badlo to yahan version badha do
  dehydrateOptions: {
    shouldDehydrateQuery: (q: any) => q.state?.status === 'success',
    shouldDehydrateMutation: () => false,
  },
};

/** Redirects an old URL to a new one that carries the same route params. */
function ParamRedirect({ to }: { to: (params: Readonly<Params<string>>) => string }) {
  const params = useParams();
  return <Navigate to={to(params)} replace />;
}

export default function App() {
  const initLocale = useLocaleStore((s) => s.initialize);

  useEffect(() => {
    initLocale();
  }, [initLocale]);

  const secure = (permission: any, node: ReactElement) => (
    <PermissionRoute permission={permission}>{node}</PermissionRoute>
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => {
        // Hydrated from IndexedDB — paused mutations resume (agar koi hon)
        queryClient.resumePausedMutations().catch(() => {});
      }}
    >
      <AppearanceProvider>
        <IndustryProvider>
          <AppearanceBridge />
          <OfflineBanner />
          <Routes>
            {/* ═══ BILKUL PUBLIC — login ho ya na ho (customer ka order form, developer link) ═══ */}
            <Route path="/order/:key" element={<PublicOrderPage />} />
            <Route path="/order/:key/track" element={<PublicTrackPage />} />
            <Route path="/pay/:token" element={<PublicPayPage />} />
            <Route path="/connect/dev/:token" element={<DevInvitePage />} />
            <Route path="/docs/online-store" element={<OnlineStoreDocsPage />} />
            {/* Customer ki screen — sirf isi computer ki POS window se sunti hai, server se kuch nahi */}
            <Route path="/customer-display" element={<CustomerDisplayPage />} />

            {/* ═══ PUBLIC ROUTES ═══ */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/google/success" element={<GoogleSuccessPage />} />
              <Route path="/auth/google/complete-signup" element={<GoogleCompleteSignupPage />} />
              <Route path="/auth/google/error" element={<GoogleErrorPage />} />
            </Route>

            {/* ═══ PROTECTED ROUTES ═══ */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/verify-email" element={<EmailVerifyPage />} />
              <Route path="/sales/:id/receipt" element={<ReceiptPage />} />
              <Route path="/jewelry/sales/:id/receipt" element={<ReceiptPage />} />
              {/* Online orders ke invoice / packing slip — shell ke bina (print) */}
              <Route path="/online-orders/print" element={<PrintInvoicesPage />} />
              {/* WooCommerce "Approve" ke baad popup yahan wapas aata hai — shell ke bagair */}
              <Route path="/connect/:platform/done" element={<ConnectDonePage />} />

              <Route element={<OnboardingGate />}>
                <Route element={<AppShell />}>

                  {/* ── Dashboard ────────────────────────────────── */}
                  <Route path="/dashboard" element={<DashboardGate />} />
                  <Route path="/ai" element={secure(PERMISSIONS.AI_USE, <Suspense fallback={null}><AiPage /></Suspense>)} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/sync" element={<SyncCenterPage />} />

                  {/* ── Products & Catalog ───────────────────────── */}
                  <Route path="/products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductFormGate />)} />
                  <Route path="/products/bulk-import" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductBulkImportPage key="bulk-import" />)} />
                  <Route path="/products/bulk-create" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductBulkImportPage key="bulk-create" start="blank" />)} />
                  <Route path="/products/bulk-edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ProductBulkEditPage />)} />
                  <Route path="/products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ProductFormGate />)} />
                  <Route path="/products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ProductViewGate />)} />
                  <Route path="/products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ProductsListGate />)} />

                  <Route path="/catalog" element={secure(PERMISSIONS.PRODUCTS_VIEW, <CatalogPage />)} />
                  <Route path="/brands" element={secure(PERMISSIONS.BRANDS_VIEW, <BrandsPage />)} />
                  <Route path="/tags" element={secure(PERMISSIONS.TAGS_VIEW, <TagsPage />)} />
                  <Route path="/categories" element={secure(PERMISSIONS.CATEGORIES_VIEW, <CategoriesPage />)} />

                  {/* ── Mobile ─────────────────────────────────── */}
                  <Route path="/mobile-reports" element={<Navigate to="/reports" replace />} />
                  <Route path="/appliances/reports" element={<Navigate to="/reports" replace />} />
                  <Route path="/appliances/stock-report" element={<Navigate to="/stock-report" replace />} />

                  {/* ── Customers ──────────────────────────────── */}
                  <Route path="/customers/new" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <CustomerFormPage />)} />
                  <Route path="/customers/:id/edit" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <CustomerFormPage />)} />
                  <Route path="/customers/:id" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomerProfilePage />)} />
                  <Route path="/customers" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomerDirectoryPage />)} />

                  {/* ── Sales / POS ────────────────────────────── */}
                  <Route path="/pos" element={secure(PERMISSIONS.POS_USE, <PosGate />)} />
                  <Route path="/bookings/new" element={secure(PERMISSIONS.SERVICE_BOOKINGS_MANAGE, <BookingFormPage />)} />
                  <Route path="/bookings/:id" element={secure(PERMISSIONS.SERVICE_BOOKINGS_VIEW, <BookingDetailPage />)} />
                  <Route path="/bookings" element={secure(PERMISSIONS.SERVICE_BOOKINGS_VIEW, <BookingsListPage />)} />
                  <Route path="/sales" element={secure(PERMISSIONS.SALES_VIEW, <SalesGate />)} />
                  <Route path="/returns" element={secure(PERMISSIONS.RETURNS_VIEW, <ReturnsPage />)} />
                  <Route path="/discounts" element={secure(PERMISSIONS.DISCOUNTS_VIEW, <DiscountsPage />)} />
                  <Route path="/loyalty" element={secure(PERMISSIONS.LOYALTY_VIEW, <LoyaltyPage />)} />
                  <Route path="/profit-report" element={secure(PERMISSIONS.PROFIT_REPORT_VIEW, <ProfitReportPage />)} />
                  <Route path="/khata" element={secure(PERMISSIONS.KHATA_VIEW, <KhataBookPage />)} />
                  <Route path="/cash-register" element={secure(PERMISSIONS.CASH_REGISTER_VIEW, <CashRegisterPage />)} />
                  {/* Dukaan ka Hisab — cash, maal, lena, dena sab ek jagah */}
                  <Route path="/money" element={secure(PERMISSIONS.REPORTS_VIEW, <MoneyPage />)} />

                  {/* ── Suppliers & Purchases ──────────────────── */}
                  <Route path="/suppliers/new" element={secure(PERMISSIONS.SUPPLIERS_EDIT, <SupplierFormPage />)} />
                  <Route path="/suppliers/:id/edit" element={secure(PERMISSIONS.SUPPLIERS_EDIT, <SupplierFormPage />)} />
                  <Route path="/suppliers/:id" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierDetailPage />)} />
                  <Route path="/suppliers" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SuppliersListPage />)} />
                  <Route path="/purchases/new" element={secure(PERMISSIONS.PURCHASES_CREATE, <PurchaseEditorGate />)} />
                  <Route path="/purchases/:id" element={secure(PERMISSIONS.PURCHASES_VIEW, <PurchaseDetailGate />)} />
                  <Route path="/purchases" element={secure(PERMISSIONS.PURCHASES_VIEW, <PurchasesGate />)} />
                  <Route path="/expenses" element={secure(PERMISSIONS.EXPENSES_VIEW, <ExpensesPage />)} />

                  {/* ── Inventory ──────────────────────────────── */}
                  <Route path="/stock-movements" element={secure(PERMISSIONS.STOCK_MOVEMENTS_VIEW, <StockMovementsPage />)} />
                  <Route path="/stock-adjustments" element={secure(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, <StockAdjustmentsPage />)} />
                  <Route path="/low-stock" element={secure(PERMISSIONS.LOW_STOCK_VIEW, <LowStockPage />)} />
                  <Route path="/transfers" element={secure(PERMISSIONS.STOCK_TRANSFERS_MANAGE, <TransfersPage />)} />

                  {/* ── Reports ────────────────────────────────── */}
                  <Route path="/reports" element={secure(PERMISSIONS.REPORTS_VIEW, <ReportsCenterPage />)} />
                  <Route path="/day-report" element={secure(PERMISSIONS.DASHBOARD_VIEW, <DayBookPage />)} />
                  <Route path="/profit-loss" element={secure(PERMISSIONS.PROFIT_REPORT_VIEW, <ProfitLossPage />)} />
                  <Route path="/reports/staff" element={secure(PERMISSIONS.REPORTS_VIEW, secure(PERMISSIONS.STAFF_VIEW, <StaffReportPage />))} />
                  <Route path="/reports/customers" element={secure(PERMISSIONS.REPORTS_VIEW, secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomersReportPage />))} />
                  <Route path="/audit" element={secure(PERMISSIONS.ACTIVITY_VIEW, <AuditPage />)} />
                  <Route path="/stock-report" element={secure(PERMISSIONS.REPORTS_VIEW, <StockReportPage />)} />

                  {/* ── Settings & System ──────────────────────── */}
                  {/* Settings: overview, then one page per section. /settings?tab=<old id> redirects inside SettingsPage. */}
                  <Route path="/settings" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsPage />)} />
                  <Route path="/settings/store" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="store" />)} />
                  <Route path="/settings/business-type" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="business-type" />)} />
                  <Route path="/settings/language" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="language" />)} />
                  <Route path="/settings/tax" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="tax" />)} />
                  <Route path="/settings/reports" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="reports" />)} />
                  <Route path="/settings/counter" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="counter" />)} />
                  <Route path="/settings/receipt" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="receipt" />)} />
                  <Route path="/settings/stock" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="stock" />)} />
                  <Route path="/settings/credit-loyalty" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="credit-loyalty" />)} />
                  <Route path="/settings/notifications" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="notifications" />)} />
                  <Route path="/settings/whatsapp" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="whatsapp" />)} />
                  <Route path="/settings/security" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsSectionPage section="security" />)} />
                  <Route path="/settings/data-export" element={secure(PERMISSIONS.SETTINGS_VIEW, secure(PERMISSIONS.BACKUP_MANAGE, <SettingsSectionPage section="data-export" />))} />
                  <Route path="/settings/danger" element={secure(PERMISSIONS.SETTINGS_VIEW, secure(PERMISSIONS.SETTINGS_MANAGE, <SettingsSectionPage section="danger" />))} />
                  <Route path="/marketplace/settings" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceSettingsPage />)} />
                  <Route path="/integrations" element={secure(PERMISSIONS.SETTINGS_VIEW, <IntegrationHubPage />)} />
                  <Route path="/online-orders" element={secure(PERMISSIONS.SALES_VIEW, <OnlineOrdersPage />)} />
                  <Route path="/online-orders/cod" element={secure(PERMISSIONS.SALES_VIEW, <CodPage />)} />
                  <Route path="/online-orders/reports" element={secure(PERMISSIONS.SALES_VIEW, <OnlineReportsPage />)} />
                  <Route path="/online-orders/customers" element={secure(PERMISSIONS.SALES_VIEW, <OnlineCustomersPage />)} />
                  <Route path="/online-store/payments" element={secure(PERMISSIONS.SALES_VIEW, <PaymentsPage />)} />
                  <Route path="/online-store/foodpanda" element={secure(PERMISSIONS.SETTINGS_VIEW, <FoodpandaPage />)} />
                  <Route path="/settings/accounting" element={secure(PERMISSIONS.SETTINGS_VIEW, <AccountingPage />)} />
                  <Route path="/settings/hardware" element={secure(PERMISSIONS.POS_USE, <HardwarePage />)} />
                  <Route path="/settings/printing" element={secure(PERMISSIONS.POS_USE, <PrintSettingsPage />)} />
                  {/* Every signed-in user can change their own look; business defaults are checked inside. */}
                  <Route path="/settings/appearance" element={<AppearancePage />} />
                  <Route path="/settings/developer" element={secure(PERMISSIONS.SETTINGS_VIEW, <DeveloperPage />)} />
                  <Route path="/settings/payment-qr" element={secure(PERMISSIONS.SETTINGS_VIEW, <PayQrPage />)} />
                  <Route path="/settings/google" element={secure(PERMISSIONS.SETTINGS_VIEW, <GooglePage />)} />
                  <Route path="/settings/tax-authority" element={<Navigate to="/tax/settings" replace />} />
                  <Route path="/online-store/blocklist" element={secure(PERMISSIONS.SALES_VIEW, <BlocklistPage />)} />
                  <Route path="/online-store/couriers" element={secure(PERMISSIONS.SALES_VIEW, <CouriersPage />)} />
                  <Route path="/online-store/couriers/:code" element={secure(PERMISSIONS.SALES_VIEW, <CourierDetailPage />)} />
                  <Route path="/online-store/website" element={secure(PERMISSIONS.SETTINGS_VIEW, <WebsiteRedirect />)} />
                  <Route path="/online-store/channels" element={secure(PERMISSIONS.SETTINGS_VIEW, <ChannelsListPage />)} />
                  <Route path="/online-store/channels/:id" element={secure(PERMISSIONS.SETTINGS_VIEW, <WebsiteConnectPage />)} />
                  <Route path="/online-store/connect" element={secure(PERMISSIONS.SETTINGS_VIEW, <ConnectChannelPage />)} />
                  {/* Shopify admin → Apps → Nafaa yahan khulta hai */}
                  <Route path="/shopify" element={secure(PERMISSIONS.SETTINGS_VIEW, <ShopifyAppPage />)} />
                  {/* Tax ek jagah — purane FBR links yahin aate hain */}
                  <Route path="/tax" element={secure(PERMISSIONS.SETTINGS_VIEW, <TaxPage />)} />
                  <Route path="/tax/invoices" element={secure(PERMISSIONS.SETTINGS_VIEW, <TaxPage />)} />
                  <Route path="/tax/reports" element={secure(PERMISSIONS.SETTINGS_VIEW, <TaxPage />)} />
                  <Route path="/tax/settings" element={secure(PERMISSIONS.SETTINGS_VIEW, <TaxPage />)} />
                  <Route path="/fbr" element={<Navigate to="/tax/settings" replace />} />
                  <Route path="/fbr/setup" element={<Navigate to="/tax/settings" replace />} />
                  <Route path="/fbr/wizard" element={<Navigate to="/tax/settings" replace />} />
                  <Route path="/fbr/invoices" element={<Navigate to="/tax/invoices" replace />} />
                  <Route path="/fbr/reports" element={<Navigate to="/tax/reports" replace />} />
                  <Route path="/fbr/analytics" element={<Navigate to="/tax" replace />} />
                  <Route path="/integrations/orders" element={<IntegrationHubPage defaultTab="orders" />} />
                  <Route path="/integrations/shipments" element={<IntegrationHubPage defaultTab="shipments" />} />
                  <Route path="/integrations/logs" element={<IntegrationHubPage defaultTab="logs" />} />

                  {/* ═══ Marketplace Full Suite ═══ */}
                  <Route path="/marketplace" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceDashboardPage />)} />
                  <Route path="/marketplace/dashboard" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceDashboardPage />)} />
                  <Route path="/marketplace/shop-profile" element={secure(PERMISSIONS.SETTINGS_VIEW, <ShopProfilePage />)} />
                  <Route path="/marketplace/products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <MarketplaceProductsPage />)} />
                  <Route path="/marketplace/products/:productId" element={secure(PERMISSIONS.PRODUCTS_EDIT, <MarketplaceProductDetailPage />)} />
                  <Route path="/marketplace/orders" element={secure(PERMISSIONS.SALES_VIEW, <MarketplaceOrdersPage />)} />
                  <Route path="/marketplace/reviews" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceReviewsPage />)} />
                  <Route path="/marketplace/messages" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceMessagesPage />)} />
                  <Route path="/marketplace/bargains" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceBargainsPage />)} />
                  <Route path="/marketplace/group-buys" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceGroupBuysPage />)} />
                  <Route path="/marketplace/auctions" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceAuctionsPage />)} />
                  <Route path="/marketplace/live-shop" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceLiveShopPage />)} />
                  <Route path="/marketplace/promotions" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplacePromotionsPage />)} />
                  <Route path="/marketplace/delivery" element={secure(PERMISSIONS.SETTINGS_VIEW, <MarketplaceDeliveryPage />)} />
                  <Route path="/marketplace/analytics" element={secure(PERMISSIONS.REPORTS_VIEW, <MarketplaceAnalyticsPage />)} />
                  <Route path="/marketplace/coupons-advanced" element={secure(PERMISSIONS.SETTINGS_VIEW, <CouponsAdvancedPage />)} />
                  <Route path="/marketplace/sales-funnel" element={secure(PERMISSIONS.REPORTS_VIEW, <SalesFunnelPage />)} />
                  <Route path="/marketplace/segments" element={secure(PERMISSIONS.SETTINGS_VIEW, <CustomerSegmentationPage />)} />
                  <Route path="/marketplace/loyalty" element={secure(PERMISSIONS.SETTINGS_VIEW, <LoyaltyRewardsPage />)} />
                  <Route path="/marketplace/rider-tracking" element={secure(PERMISSIONS.SETTINGS_VIEW, <RiderTrackingPage />)} />
                  <Route path="/marketplace/ai-insights" element={secure(PERMISSIONS.SETTINGS_VIEW, <AiRecommendationsPage />)} />
                  <Route path="/marketplace/multi-shop" element={secure(PERMISSIONS.SETTINGS_VIEW, <MultiShopManagerPage />)} />
                  <Route path="/marketplace/notifications" element={secure(PERMISSIONS.SETTINGS_VIEW, <NotificationCenterPage />)} />
                  <Route path="/marketplace/settings-hub" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsHubPage />)} />

                  <Route path="/barcode-labels" element={secure(PERMISSIONS.BARCODE_LABELS_VIEW, <BarcodeLabelsPage />)} />
                  <Route path="/shops/new" element={secure(PERMISSIONS.SHOPS_MANAGE, <ShopFormPage />)} />
                  <Route path="/shops/:id/edit" element={secure(PERMISSIONS.SHOPS_MANAGE, <ShopFormPage />)} />
                  <Route path="/shops" element={secure(PERMISSIONS.SHOPS_VIEW, <ShopsPage />)} />
                  <Route path="/shops/overview" element={secure(PERMISSIONS.SHOPS_VIEW, <ShopsOverviewPage />)} />
                  <Route path="/activity-log" element={secure(PERMISSIONS.ACTIVITY_VIEW, <ActivityLogPage />)} />
                  <Route path="/exports" element={secure(PERMISSIONS.EXPORTS_VIEW, <ExportsPage />)} />
                  <Route path="/backup" element={secure(PERMISSIONS.BACKUP_MANAGE, <BackupPage />)} />

                  {/* ── Team & Staff ───────────────────────────── */}
                  <Route path="/team" element={secure(PERMISSIONS.TEAM_VIEW, <Navigate to="/staff?tab=roles" replace />)} />
                  <Route path="/staff/new" element={secure(PERMISSIONS.STAFF_MANAGE, <HrStaffFormPage />)} />
                  <Route path="/staff/attendance" element={secure(PERMISSIONS.STAFF_VIEW, <HrAttendancePage />)} />
                  <Route path="/staff/salary/new" element={secure(PERMISSIONS.STAFF_MANAGE, <PayrollPage />)} />
                  <Route path="/staff/commission" element={secure(PERMISSIONS.COMMISSION_OWN, <CommissionPage />)} />
                  <Route path="/staff/:id/edit" element={secure(PERMISSIONS.STAFF_MANAGE, <HrStaffFormPage />)} />
                  <Route path="/staff/:id" element={secure(PERMISSIONS.STAFF_VIEW, <HrStaffProfilePage />)} />
                  <Route path="/staff" element={secure(PERMISSIONS.STAFF_VIEW, <HrStaffPage />)} />
                  <Route path="/appointments" element={secure(PERMISSIONS.SERVICE_BOOKINGS_VIEW, <AppointmentsPage />)} />

                  {/* ── Billing ────────────────────────────────── */}
                  <Route path="/plans" element={secure(PERMISSIONS.PLANS_VIEW, <PlansPage />)} />
                  <Route path="/billing/invoice/:id/pay" element={secure(PERMISSIONS.BILLING_VIEW, <PayInvoicePage />)} />
                  <Route path="/billing" element={secure(PERMISSIONS.BILLING_VIEW, <BillingPage />)} />
                  <Route path="/referrals" element={secure(PERMISSIONS.REFERRALS_VIEW, <ReferralsPage />)} />
                  <Route path="/plan-usage" element={secure(PERMISSIONS.PLAN_USAGE_VIEW, <PlanUsagePage />)} />

                  {/* ── User ───────────────────────────────────── */}
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/legal" element={<LegalPage />} />

                  {/* Industry pages live in the industry packs (industryRoutes below), which
                      add the permission check for each path. Only routes that no pack
                      declares stay here. */}

                  {/* ── Retail tools shared by every industry, plus old /retail/* links */}
                  <Route path="/combos/new" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ComboFormPage />)} />
                  <Route path="/combos/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ComboFormPage />)} />
                  <Route path="/combos" element={secure(PERMISSIONS.PRODUCTS_VIEW, <CombosPage />)} />
                  <Route path="/retail/combos/*" element={<Navigate to="/combos" replace />} />
                  <Route path="/retail/combos" element={<Navigate to="/combos" replace />} />
                  <Route path="/damage" element={secure(PERMISSIONS.PRODUCTS_VIEW, <DamagePage />)} />
                  <Route path="/retail/damage" element={<Navigate to="/damage" replace />} />
                  <Route path="/product-units" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ProductUnitsPage />)} />
                  <Route path="/retail/product-units" element={<Navigate to="/product-units" replace />} />
                  <Route path="/quick-keys" element={secure(PERMISSIONS.PRODUCTS_VIEW, <QuickKeysPage />)} />
                  <Route path="/retail/quick-keys" element={<Navigate to="/quick-keys" replace />} />
                  <Route path="/retail/bulk-import" element={<Navigate to="/products/bulk-import" replace />} />
                  <Route path="/retail/reorders" element={<Navigate to="/low-stock" replace />} />

                  {/* ── Old links that now open the shared page */}
                  <Route path="/carpet-reports" element={<Navigate to="/reports" replace />} />
                  <Route path="/appliances/amc/new" element={<Navigate to="/appliances/amc-contracts/new" replace />} />
                  <Route path="/appliances/amc" element={<Navigate to="/appliances/amc-contracts" replace />} />
                  <Route path="/appliances/brands" element={<Navigate to="/brands" replace />} />
                  <Route path="/electronics/serial-tracking" element={<Navigate to="/electronics/serials" replace />} />
                  <Route path="/gym-members/new" element={<Navigate to="/gym/members/new" replace />} />
                  <Route path="/gym-members/:id/edit" element={<ParamRedirect to={(p) => `/gym/members/${p.id}/edit`} />} />
                  <Route path="/gym-members/:id" element={<ParamRedirect to={(p) => `/gym/members/${p.id}`} />} />

                  {/* ── Product editors and details not declared by a pack */}
                  <Route path="/bakery-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <BakeryProductEditor />)} />
                  <Route path="/bakery-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <BakeryProductEditor />)} />
                  <Route path="/bakery-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <BakeryProductDetail />)} />
                  <Route path="/clinic-services/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ClinicServiceWizardPage />)} />
                  <Route path="/clinic-services/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ClinicServiceWizardPage />)} />
                  <Route path="/clinic-services/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ClinicServiceDetailPage />)} />

                  {/* ── Appliance products; pages inside the industry also link to "/appliance-products" (no s) */}
                  <Route path="/appliances-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ApplianceProductEditor />)} />
                  <Route path="/appliances-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ApplianceProductEditor />)} />
                  <Route path="/appliances-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProductDetail />)} />
                  <Route path="/appliances-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProducts />)} />
                  <Route path="/appliance-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ApplianceProductEditor />)} />
                  <Route path="/appliance-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ApplianceProductEditor />)} />
                  <Route path="/appliance-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProductDetail />)} />
                  <Route path="/appliance-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProducts />)} />

                  {/* ── Industry pack auto-registered routes ─── */}
                  {industryRoutes()}

                </Route>
              </Route>
            </Route>

            {/* ═══ FALLBACK ═══ */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </IndustryProvider>
      </AppearanceProvider>

      <ManagerPinHost />
      <ConfirmHost />
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3500}
      />
    </PersistQueryClientProvider>
  );
}
