// apps/web/src/App.tsx
import { ManagerPinHost } from '@core/security/ManagerPin';
import { OwnerOnly } from '@app/router/RoleGuard';
import { BrowserRouter, Navigate, Route, Routes, useParams, type Params } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryCachePersister } from '@core/lib/offline/queryPersister';
import { Toaster } from 'sonner';
import { useEffect, type ReactElement } from 'react';
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
import ProductFormPage from '@modules/inventory/products/pages/ProductFormPage';
import ProductFormGate from '@modules/inventory/products/pages/ProductFormGate';
import ProductViewGate from '@modules/inventory/products/pages/ProductViewGate';
import CatalogPage from '@modules/catalog/pages/CatalogPage';
import CategoriesPage from '@modules/inventory/categories/pages/CategoriesPage';

// ─── Mobile Industry ───────────────────────────────────────────
// The rest of the mobile pages are routed by MobilePack with permissions.
import GlobalImeiInventoryPage from '@industries/mobile/pages/GlobalImeiInventoryPage';

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

// ═══════════════════════════════════════════════════════════════
// ─── ORIGINAL 19 INDUSTRIES ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// ─── Carpet Industry ───────────────────────────────────────────
import CarpetRollsPage from '@industries/carpet/pages/CarpetRollsPage';
import CarpetCutPiecesPage from '@industries/carpet/pages/CarpetCutPiecesPage';
import CarpetRollDetailPage from '@industries/carpet/pages/CarpetRollDetailPage';
import CarpetBulkImportPage from '@industries/carpet/pages/CarpetBulkImportPage';

// ─── Retail Industry ───────────────────────────────────────────
import CombosPage from '@modules/inventory/combos/pages/CombosPage';
import ComboFormPage from '@modules/inventory/combos/pages/ComboFormPage';
import DamagePage from '@modules/inventory/damage/pages/DamagePage';
import ProductUnitsPage from '@modules/inventory/product-units/pages/ProductUnitsPage';
import QuickKeysPage from '@modules/pos/quick-keys/QuickKeysPage';

// ─── Restaurant Industry ───────────────────────────────────────
import RestaurantDashboard from '@industries/restaurant/dashboard/RestaurantDashboard';
import RestaurantOrdersPage from '@industries/restaurant/pages/RestaurantOrdersPage';
import TablesLayoutPage from '@industries/restaurant/pages/TablesLayoutPage';
import RestaurantProductsListPage from '@industries/restaurant/pages/RestaurantProductsListPage';
import ModifiersPage from '@industries/restaurant/pages/ModifiersPage';
import KotDisplayPage from '@industries/restaurant/pages/KotDisplayPage';
import RidersPage from '@industries/restaurant/pages/RidersPage';
import HappyHoursPage from '@industries/restaurant/pages/HappyHoursPage';
import NewOrderPage from '@industries/restaurant/pages/NewOrderPage';
import OrderDetailPage from '@industries/restaurant/pages/OrderDetailPage';
import RecipesPage from '@industries/restaurant/pages/RecipesPage';
import StationsPage from '@industries/restaurant/pages/StationsPage';
import DeliveryTrackingPage from '@industries/restaurant/pages/DeliveryTrackingPage';

// ─── Garments Industry ─────────────────────────────────────────
import GarmentsDashboard from '@industries/garments/dashboard/GarmentsDashboard';
import CollectionsPage from '@industries/garments/pages/CollectionsPage';
import SizeChartsPage from '@industries/garments/pages/SizeChartsPage';
import MeasurementsPage from '@industries/garments/pages/MeasurementsPage';
import GarmentProductsPage from '@industries/garments/pages/GarmentProductsPage';
import TailoringPage from '@industries/garments/pages/TailoringPage';
import NewTailoringOrderPage from '@industries/garments/pages/NewTailoringOrderPage';
import TailoringDetailPage from '@industries/garments/pages/TailoringDetailPage';
import AlterationsPage from '@industries/garments/pages/AlterationsPage';
import ReservationsPage from '@industries/garments/pages/ReservationsPage';
import LayawayPage from '@industries/garments/pages/LayawayPage';

// ─── Salon Industry ────────────────────────────────────────────
import SalonDashboard from '@industries/salon/dashboard/SalonDashboard';
import ServicesPage from '@industries/salon/pages/ServicesPage';
import StaffPage from '@industries/salon/pages/StaffPage';
import AppointmentsPage from '@industries/salon/pages/AppointmentsPage';
import NewAppointmentPage from '@industries/salon/pages/NewAppointmentPage';
import AppointmentDetailPage from '@industries/salon/pages/AppointmentDetailPage';
import MembershipsPage from '@industries/salon/pages/MembershipsPage';
import PackagesPage from '@industries/salon/pages/PackagesPage';
import CalendarViewPage from '@industries/salon/pages/CalendarViewPage';
import CustomersPage from '@industries/salon/pages/CustomersPage';

// ─── Bakery Industry ───────────────────────────────────────────
import BakeryDashboard from '@/industries/bakery/dashboard/BakeryDashboard';
import DayBookPage from '@modules/reports/day-book/DayBookPage';
import ProfitLossPage from '@modules/reports/pnl/pages/ProfitLossPage';
import { StaffReportPage } from '@modules/reports/staff-report';
import { CustomersReportPage } from '@modules/reports/customers-report';
import AuditPage from '@modules/reports/audit/pages/AuditPage';
import CakeCustomizerPage from '@industries/bakery/pages/CakeCustomizerPage';
import CakeOrdersPage from '@industries/bakery/pages/CakeOrdersPage';
import CakeOrderDetailPage from '@industries/bakery/pages/CakeOrderDetailPage';
import BakeryProducts from '@industries/bakery/products/BakeryProducts';
import BakeryBulkOrderFormPage from '@industries/bakery/pages/BakeryBulkOrderFormPage';
import ProductionPage from '@industries/bakery/pages/ProductionPage';
import IngredientsPage from '@industries/bakery/pages/IngredientsPage';
import FreshnessPage from '@industries/bakery/pages/FreshnessPage';
import BakeryBulkOrdersPage from '@industries/bakery/pages/BakeryBulkOrdersPage';
import BakeryProductEditor from '@industries/bakery/products/BakeryProductEditor';
import BakeryProductDetail from '@industries/bakery/products/BakeryProductDetail';
import ClinicServiceWizardPage from '@industries/clinic/pages/ClinicServiceWizardPage';
import ClinicServiceDetailPage from '@industries/clinic/pages/ClinicServiceDetailPage';

// ─── Agri Industry ─────────────────────────────────────────────
import AgriDashboard from '@industries/agri/dashboard/AgriDashboard';
import AgriProductsListPage from '@industries/agri/pages/AgriProductsListPage';
import FarmersPage from '@industries/agri/pages/FarmersPage';
import BulkOrdersPage from '@industries/agri/pages/BulkOrdersPage';
import NewBulkOrderPage from '@industries/agri/pages/NewBulkOrderPage';
import AdvisoryPage from '@industries/agri/pages/AdvisoryPage';
import SeasonalPlansPage from '@industries/agri/pages/SeasonalPlansPage';
import SubsidyPage from '@industries/agri/pages/SubsidyPage';

// ─── Jewelry Industry ──────────────────────────────────────────
import JewelryDashboard from '@industries/jewelry/dashboard/JewelryDashboard';
import MetalRatesPage from '@industries/jewelry/pages/MetalRatesPage';
import JewelryProductsPage from '@industries/jewelry/pages/JewelryProductsPage';
import JewelrySalesPage from '@industries/jewelry/pages/JewelrySalesPage';
import CustomOrdersPage from '@industries/jewelry/pages/CustomOrdersPage';
import ExchangesPage from '@industries/jewelry/pages/ExchangesPage';
import KarigarsPage from '@industries/jewelry/pages/KarigarsPage';
import MetalStockPage from '@industries/jewelry/pages/MetalStockPage';

// ─── Industry Product/Item Wizards & Details ──────────────────
import CarpetProductWizardPage from '@industries/carpet/pages/CarpetProductWizardPage';
import CarpetProductDetailPage from '@industries/carpet/pages/CarpetProductDetailPage';
import MobileProductWizardPage from '@/industries/mobile/pages/MobileProductWizardPage';
import MobileProductDetailPage from '@industries/mobile/pages/MobileProductDetailPage';
import RetailProductEditor from '@industries/retail/products/RetailProductEditor';
import RetailProductDetail from '@industries/retail/products/RetailProductDetail';
import RestaurantProductEditor from '@industries/restaurant/products/RestaurantProductEditor';
import RestaurantProductDetail from '@industries/restaurant/products/RestaurantProductDetail';
import GarmentProductWizardPage from '@industries/garments/pages/GarmentProductWizardPage';
import GarmentProductDetailPage from '@industries/garments/pages/GarmentProductDetailPage';
import JewelryItemWizardPage from '@industries/jewelry/pages/JewelryItemWizardPage';
import JewelryItemDetailPage from '@industries/jewelry/pages/JewelryItemDetailPage';
import AgriProductWizardPage from '@industries/agri/pages/AgriProductWizardPage';
import AgriProductDetailPage from '@industries/agri/pages/AgriProductDetailPage';
import SalonServiceWizardPage from '@industries/salon/pages/SalonServiceWizardPage';
import SalonServiceDetailPage from '@industries/salon/pages/SalonServiceDetailPage';
import HotelRoomTypeWizardPage from '@industries/hotel/pages/HotelRoomTypeWizardPage';
import HotelRoomTypeDetailPage from '@industries/hotel/pages/HotelRoomTypeDetailPage';

import ServicesBizServiceWizardPage from '@industries/services-biz/pages/ServicesBizServiceWizardPage';
import ServicesBizServiceDetailPage from '@industries/services-biz/pages/ServicesBizServiceDetailPage';

// ═══════════════════════════════════════════════════════════════
// ─── 11 NEW INDUSTRIES ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// ─── Appliances Industry ───────────────────────────────────────
import ApplianceProducts from '@industries/appliances/products/ApplianceProducts';
import ApplianceProductEditor from '@industries/appliances/products/ApplianceProductEditor';
import ApplianceProductDetail from '@industries/appliances/products/ApplianceProductDetail';

// ─── Electronics Industry ──────────────────────────────────────
import ElectronicsDashboard from '@industries/electronics/dashboard/ElectronicsDashboard';
import ElectronicsProducts from '@industries/electronics/products/ElectronicsProducts';
import ElectronicsProductEditor from '@industries/electronics/products/ElectronicsProductEditor';
import ElectronicsProductDetail from '@industries/electronics/products/ElectronicsProductDetail';
import ElectronicsBundlesPage from '@industries/electronics/pages/ElectronicsBundlesPage';
import ElectronicsBundleFormPage from '@industries/electronics/pages/BundleFormPage';
import ElectronicsWarrantyClaimsPage from '@industries/electronics/pages/WarrantyClaimsPage';

// ─── Furniture Industry ────────────────────────────────────────
import FurnitureDashboard from '@industries/furniture/dashboard/FurnitureDashboard';
import FurnitureProductsPage from '@industries/furniture/pages/FurnitureProductsPage';
import FurnitureProductWizardPage from '@industries/furniture/pages/FurnitureProductWizardPage';
import FurnitureProductDetailPage from '@industries/furniture/pages/FurnitureProductDetailPage';
import FurnitureCustomOrdersPage from '@industries/furniture/pages/CustomOrdersPage';
import FurnitureCustomOrderFormPage from '@industries/furniture/pages/CustomOrderFormPage';
import FurnitureCustomOrderDetailPage from '@industries/furniture/pages/CustomOrderDetailPage';
import FurnitureDeliveriesPage from '@industries/furniture/pages/DeliveriesPage';
import CarpentersPage from '@industries/furniture/pages/CarpentersPage';

// ─── Gaming Industry ───────────────────────────────────────────
import GamingDashboard from '@industries/gaming/dashboard/GamingDashboard';
import GamingProductsPage from '@industries/gaming/pages/GamingProductsPage';
import GamingProductWizardPage from '@industries/gaming/pages/GamingProductWizardPage';
import GamingProductDetailPage from '@industries/gaming/pages/GamingProductDetailPage';
import GamingCafeLivePage from '@industries/gaming/pages/GamingCafeLivePage';
import GamingStationsPage from '@industries/gaming/pages/GamingStationsPage';
import GamingRentalsPage from '@industries/gaming/pages/GamingRentalsPage';
import GamingTopupsPage from '@industries/gaming/pages/GamingTopupsPage';
import GamingTournamentsPage from '@industries/gaming/pages/GamingTournamentsPage';

// ─── Route Guards & Layout ─────────────────────────────────────
import { ProtectedRoute, PublicOnlyRoute } from '@app/router/ProtectedRoute';
import { queryClient } from '@core/lib/queryClient';
import OnboardingGate from '@app/router/OnboardingGate';
import AppShell from '@app/shell/AppShell';
import PermissionRoute from '@app/router/PermissionRoute';
import { PERMISSIONS } from '@core/lib/permissions';

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
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/sync" element={<SyncCenterPage />} />

                  {/* ── Products & Catalog ───────────────────────── */}
                  <Route path="/products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductFormGate />)} />
                  <Route path="/products/bulk-import" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductBulkImportPage />)} />
                  <Route path="/products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ProductFormGate />)} />
                  <Route path="/products/:id/imei" element={secure(PERMISSIONS.MOBILE_IMEI_VIEW, <GlobalImeiInventoryPage />)} />
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
                  <Route path="/appointments" element={<AppointmentsPage />} />

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

                  {/* ═══════════════════════════════════════════════ */}
                  {/* ORIGINAL 19 INDUSTRIES                          */}
                  {/* ═══════════════════════════════════════════════ */}

                  {/* Carpet */}
                  <Route path="/carpet-rolls/:id" element={<CarpetRollDetailPage />} />
                  <Route path="/carpet-rolls" element={<CarpetRollsPage />} />
                  <Route path="/carpet-cut-pieces" element={<CarpetCutPiecesPage />} />
                  <Route path="/carpet-reports" element={<Navigate to="/reports" replace />} />
                  <Route path="/carpet-bulk-import" element={<CarpetBulkImportPage />} />

                  {/* Retail */}
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
                  <Route path="/retail/barcode-labels" element={secure(PERMISSIONS.PRODUCTS_VIEW, <BarcodeLabelsPage />)} />

                  {/* Restaurant */}
                  <Route path="/restaurant" element={secure(PERMISSIONS.DASHBOARD_VIEW, <RestaurantDashboard />)} />
                  <Route path="/restaurant/dashboard" element={secure(PERMISSIONS.DASHBOARD_VIEW, <RestaurantDashboard />)} />
                  <Route path="/restaurant/orders/new" element={secure(PERMISSIONS.RESTAURANT_ORDERS_VIEW, <NewOrderPage />)} />
                  <Route path="/restaurant/orders/:id" element={secure(PERMISSIONS.RESTAURANT_ORDERS_VIEW, <OrderDetailPage />)} />
                  <Route path="/restaurant/orders" element={secure(PERMISSIONS.RESTAURANT_ORDERS_VIEW, <RestaurantOrdersPage />)} />
                  <Route path="/restaurant/tables" element={secure(PERMISSIONS.RESTAURANT_ORDERS_VIEW, <TablesLayoutPage />)} />
                  <Route path="/restaurant/menu" element={secure(PERMISSIONS.RESTAURANT_MENU_VIEW, <RestaurantProductsListPage />)} />
                  <Route path="/restaurant/modifiers" element={secure(PERMISSIONS.RESTAURANT_MENU_VIEW, <ModifiersPage />)} />
                  <Route path="/restaurant/kot" element={secure(PERMISSIONS.RESTAURANT_KITCHEN_VIEW, <KotDisplayPage />)} />
                  <Route path="/restaurant/riders" element={secure(PERMISSIONS.RESTAURANT_ORDERS_VIEW, <RidersPage />)} />
                  <Route path="/restaurant/happy-hours" element={secure(PERMISSIONS.RESTAURANT_MENU_VIEW, <HappyHoursPage />)} />
                  <Route path="/restaurant/recipes" element={secure(PERMISSIONS.RESTAURANT_KITCHEN_VIEW, <RecipesPage />)} />
                  <Route path="/restaurant/stations" element={secure(PERMISSIONS.RESTAURANT_KITCHEN_VIEW, <StationsPage />)} />
                  <Route path="/restaurant/delivery" element={secure(PERMISSIONS.RESTAURANT_ORDERS_VIEW, <DeliveryTrackingPage />)} />

                  {/* Pharmacy pages are routed by PharmacyPack with permissions. */}

                  {/* Garments */}
                  <Route path="/garments" element={<GarmentsDashboard />} />
                  <Route path="/garments/dashboard" element={<GarmentsDashboard />} />
                  <Route path="/garments/collections" element={<CollectionsPage />} />
                  <Route path="/garments/size-charts" element={<SizeChartsPage />} />
                  <Route path="/garments/measurements" element={<MeasurementsPage />} />
                  <Route path="/garments/products" element={<GarmentProductsPage />} />
                  <Route path="/garments/tailoring/new" element={<NewTailoringOrderPage />} />
                  <Route path="/garments/tailoring/:id" element={<TailoringDetailPage />} />
                  <Route path="/garments/tailoring" element={<TailoringPage />} />
                  <Route path="/garments/alterations" element={<AlterationsPage />} />
                  <Route path="/garments/reservations" element={<ReservationsPage />} />
                  <Route path="/garments/layaway" element={<LayawayPage />} />

                  {/* Salon */}
                  <Route path="/salon" element={<SalonDashboard />} />
                  <Route path="/salon/dashboard" element={<SalonDashboard />} />
                  <Route path="/salon/services" element={<ServicesPage />} />
                  <Route path="/salon/staff" element={<StaffPage />} />
                  <Route path="/salon/appointments/new" element={<NewAppointmentPage />} />
                  <Route path="/salon/appointments/:id" element={<AppointmentDetailPage />} />
                  <Route path="/salon/appointments" element={<AppointmentsPage />} />
                  <Route path="/salon/memberships" element={<MembershipsPage />} />
                  <Route path="/salon/packages" element={<PackagesPage />} />
                  <Route path="/salon/calendar" element={<CalendarViewPage />} />
                  <Route path="/salon/customers" element={<CustomersPage />} />

                  {/* Bakery
                      NOTE: ye routes BakeryPack ke routes se alag hain aur
                      inhi par safha khulta hai. Pack me naye safhe lagane
                      ke bawajood yahan purane rah gaye thay — is liye
                      sidebar se hamesha purana hi milta tha. */}
                  <Route path="/bakery" element={secure(PERMISSIONS.DASHBOARD_VIEW, <BakeryDashboard />)} />
                  <Route path="/bakery/dashboard" element={secure(PERMISSIONS.DASHBOARD_VIEW, <BakeryDashboard />)} />
                  <Route path="/bakery/cake-orders/new" element={secure(PERMISSIONS.BAKERY_ORDERS_MANAGE, <CakeCustomizerPage />)} />
                  <Route path="/bakery/cake-orders/:id/edit" element={secure(PERMISSIONS.BAKERY_ORDERS_MANAGE, <CakeCustomizerPage />)} />
                  <Route path="/bakery/cake-orders/:id" element={secure(PERMISSIONS.BAKERY_ORDERS_VIEW, <CakeOrderDetailPage />)} />
                  <Route path="/bakery/cake-orders" element={secure(PERMISSIONS.BAKERY_ORDERS_VIEW, <CakeOrdersPage />)} />
                  <Route path="/bakery/products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <BakeryProducts />)} />
                  <Route path="/bakery/production" element={secure(PERMISSIONS.BAKERY_PRODUCTION_VIEW, <ProductionPage />)} />
                  <Route path="/bakery/ingredients" element={secure(PERMISSIONS.BAKERY_INGREDIENTS_VIEW, <IngredientsPage />)} />
                  <Route path="/bakery/freshness" element={secure(PERMISSIONS.BAKERY_PRODUCTION_VIEW, <FreshnessPage />)} />
                  <Route path="/bakery/bulk-orders/new" element={secure(PERMISSIONS.BAKERY_ORDERS_MANAGE, <BakeryBulkOrderFormPage />)} />
                  <Route path="/bakery/bulk-orders/:id/edit" element={secure(PERMISSIONS.BAKERY_ORDERS_MANAGE, <BakeryBulkOrderFormPage />)} />
                  <Route path="/bakery/bulk-orders" element={secure(PERMISSIONS.BAKERY_ORDERS_VIEW, <BakeryBulkOrdersPage />)} />

                  {/* Agri */}
                  <Route path="/agri" element={secure(PERMISSIONS.DASHBOARD_VIEW, <AgriDashboard />)} />
                  <Route path="/agri/dashboard" element={secure(PERMISSIONS.DASHBOARD_VIEW, <AgriDashboard />)} />
                  <Route path="/agri/products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <AgriProductsListPage />)} />
                  <Route path="/agri/farmers" element={secure(PERMISSIONS.AGRI_FARMERS_VIEW, <FarmersPage />)} />
                  <Route path="/agri/bulk-orders/new" element={secure(PERMISSIONS.AGRI_ORDERS_VIEW, <NewBulkOrderPage />)} />
                  <Route path="/agri/bulk-orders" element={secure(PERMISSIONS.AGRI_ORDERS_VIEW, <BulkOrdersPage />)} />
                  <Route path="/agri/advisory" element={secure(PERMISSIONS.AGRI_ADVISORY_VIEW, <AdvisoryPage />)} />
                  <Route path="/agri/seasonal-plans" element={secure(PERMISSIONS.AGRI_ORDERS_VIEW, <SeasonalPlansPage />)} />
                  <Route path="/agri/subsidy" element={secure(PERMISSIONS.AGRI_ORDERS_VIEW, <SubsidyPage />)} />

                  {/* Jewelry */}
                  <Route path="/jewelry" element={<JewelryDashboard />} />
                  <Route path="/jewelry/dashboard" element={<JewelryDashboard />} />
                  <Route path="/jewelry/metal-rates" element={<MetalRatesPage />} />
                  <Route path="/jewelry/products" element={<JewelryProductsPage />} />
                  <Route path="/jewelry/sales" element={<JewelrySalesPage />} />
                  <Route path="/jewelry/custom-orders" element={<CustomOrdersPage />} />
                  <Route path="/jewelry/exchanges" element={<ExchangesPage />} />
                  <Route path="/jewelry/karigars" element={<KarigarsPage />} />
                  <Route path="/jewelry/metal-stock" element={<MetalStockPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/* 11 NEW INDUSTRIES                                */}
                  {/* ═══════════════════════════════════════════════ */}

                  {/* Appliances — asal routes ab AppliancesPack me hain.
                      Pehle wahi raaste yahan DOBARA bhi likhe the: ek hi
                      path do dafa register hone se React Router me takrar
                      hoti thi. Ab sirf purane link redirect karte hain. */}
                  <Route path="/appliances/amc/new" element={<Navigate to="/appliances/amc-contracts/new" replace />} />
                  <Route path="/appliances/amc" element={<Navigate to="/appliances/amc-contracts" replace />} />
                  <Route path="/appliances/brands" element={<Navigate to="/brands" replace />} />

                  {/* Electronics */}
                  <Route path="/electronics" element={secure(PERMISSIONS.DASHBOARD_VIEW, <ElectronicsDashboard />)} />
                  <Route path="/electronics/dashboard" element={secure(PERMISSIONS.DASHBOARD_VIEW, <ElectronicsDashboard />)} />
                  <Route path="/electronics/bundles/new" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ElectronicsBundleFormPage />)} />
                  <Route path="/electronics/bundles/:id/edit" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ElectronicsBundleFormPage />)} />
                  <Route path="/electronics/bundles" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ElectronicsBundlesPage />)} />
                  <Route path="/electronics/serial-tracking" element={<Navigate to="/electronics/serials" replace />} />
                  <Route path="/electronics/warranty-claims" element={secure(PERMISSIONS.ELECTRONICS_WARRANTY_VIEW, <ElectronicsWarrantyClaimsPage />)} />

                  {/* Furniture */}
                  <Route path="/furniture" element={<FurnitureDashboard />} />
                  <Route path="/furniture/dashboard" element={<FurnitureDashboard />} />
                  <Route path="/furniture/custom-orders/new" element={<FurnitureCustomOrderFormPage />} />
                  <Route path="/furniture/custom-orders/:id/edit" element={<FurnitureCustomOrderFormPage />} />
                  <Route path="/furniture/custom-orders/:id" element={<FurnitureCustomOrderDetailPage />} />
                  <Route path="/furniture/custom-orders" element={<FurnitureCustomOrdersPage />} />
                  <Route path="/furniture/deliveries" element={<FurnitureDeliveriesPage />} />
                  <Route path="/furniture/carpenters" element={<CarpentersPage />} />

                  {/* Gaming */}
                  <Route path="/gaming" element={<GamingDashboard />} />
                  <Route path="/gaming/dashboard" element={<GamingDashboard />} />
                  <Route path="/gaming/cafe" element={<GamingCafeLivePage />} />
                  <Route path="/gaming/stations" element={<GamingStationsPage />} />
                  <Route path="/gaming/rentals" element={<GamingRentalsPage />} />
                  <Route path="/gaming/topups" element={<GamingTopupsPage />} />
                  <Route path="/gaming/tournaments" element={<GamingTournamentsPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/* INDUSTRY PRODUCT WIZARDS & DETAILS               */}
                  {/* ═══════════════════════════════════════════════ */}

                  {/* Carpet */}
                  <Route path="/carpet-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <CarpetProductWizardPage />)} />
                  <Route path="/carpet-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <CarpetProductWizardPage />)} />
                  <Route path="/carpet-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <CarpetProductDetailPage />)} />

                  {/* Mobile */}
                  <Route path="/mobile-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <MobileProductWizardPage />)} />
                  <Route path="/mobile-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <MobileProductWizardPage />)} />
                  <Route path="/mobile-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <MobileProductDetailPage />)} />

                  {/* Retail */}
                  <Route path="/retail-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <RetailProductEditor />)} />
                  <Route path="/retail-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <RetailProductEditor />)} />
                  <Route path="/retail-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <RetailProductDetail />)} />

                  {/* Restaurant */}
                  <Route path="/restaurant-menu-items/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <RestaurantProductEditor />)} />
                  <Route path="/restaurant-menu-items/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <RestaurantProductEditor />)} />
                  <Route path="/restaurant-menu-items/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <RestaurantProductDetail />)} />

                  {/* Bakery */}
                  <Route path="/bakery-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <BakeryProductEditor />)} />
                  <Route path="/bakery-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <BakeryProductEditor />)} />
                  <Route path="/bakery-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <BakeryProductDetail />)} />

                  {/* Old gym member links go to the pack pages */}
                  <Route path="/gym-members/new" element={<Navigate to="/gym/members/new" replace />} />
                  <Route path="/gym-members/:id/edit" element={<ParamRedirect to={(p) => `/gym/members/${p.id}/edit`} />} />
                  <Route path="/gym-members/:id" element={<ParamRedirect to={(p) => `/gym/members/${p.id}`} />} />
                  {/* Clinic */}
                  <Route path="/clinic-services/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ClinicServiceWizardPage />)} />
                  <Route path="/clinic-services/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ClinicServiceWizardPage />)} />
                  <Route path="/clinic-services/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ClinicServiceDetailPage />)} />

                  {/* Garments */}
                  <Route path="/garment-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <GarmentProductWizardPage />)} />
                  <Route path="/garment-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <GarmentProductWizardPage />)} />
                  <Route path="/garment-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <GarmentProductDetailPage />)} />

                  {/* Jewelry */}
                  <Route path="/jewelry-items/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <JewelryItemWizardPage />)} />
                  <Route path="/jewelry-items/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <JewelryItemWizardPage />)} />
                  <Route path="/jewelry-items/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <JewelryItemDetailPage />)} />

                  {/* Agri */}
                  <Route path="/agri-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <AgriProductWizardPage />)} />
                  <Route path="/agri-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <AgriProductWizardPage />)} />
                  <Route path="/agri-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <AgriProductDetailPage />)} />

                  {/* Salon */}
                  <Route path="/salon-services/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <SalonServiceWizardPage />)} />
                  <Route path="/salon-services/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <SalonServiceWizardPage />)} />
                  <Route path="/salon-services/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <SalonServiceDetailPage />)} />

                  {/* Hotel */}
                  <Route path="/hotel-room-types/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <HotelRoomTypeWizardPage />)} />
                  <Route path="/hotel-room-types/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <HotelRoomTypeWizardPage />)} />
                  <Route path="/hotel-room-types/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <HotelRoomTypeDetailPage />)} />

                  {/* Services-Biz */}
                  <Route path="/services-biz-services/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ServicesBizServiceWizardPage />)} />
                  <Route path="/services-biz-services/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ServicesBizServiceWizardPage />)} />
                  <Route path="/services-biz-services/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ServicesBizServiceDetailPage />)} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/* 11 NEW INDUSTRY WIZARDS & DETAILS + LIST         */}
                  {/* ═══════════════════════════════════════════════ */}

                  {/* Appliances */}
                  <Route path="/appliances-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ApplianceProductEditor />)} />
                  <Route path="/appliances-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ApplianceProductEditor />)} />
                  <Route path="/appliances-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProductDetail />)} />
                  <Route path="/appliances-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProducts />)} />
                  {/* Appliance ke safhe andar "/appliance-products" (bina 's')
                      likhte hain — wo bhi isi pehre se guzrein. */}
                  <Route path="/appliance-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ApplianceProductEditor />)} />
                  <Route path="/appliance-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ApplianceProductEditor />)} />
                  <Route path="/appliance-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProductDetail />)} />
                  <Route path="/appliance-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ApplianceProducts />)} />

                  {/* Electronics */}
                  <Route path="/electronics-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ElectronicsProductEditor />)} />
                  <Route path="/electronics-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ElectronicsProductEditor />)} />
                  <Route path="/electronics-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ElectronicsProductDetail />)} />
                  <Route path="/electronics-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ElectronicsProducts />)} />

                  {/* Furniture */}
                  <Route path="/furniture-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <FurnitureProductWizardPage />)} />
                  <Route path="/furniture-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <FurnitureProductWizardPage />)} />
                  <Route path="/furniture-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <FurnitureProductDetailPage />)} />
                  <Route path="/furniture-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <FurnitureProductsPage />)} />

                  {/* Gaming */}
                  <Route path="/gaming-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <GamingProductWizardPage />)} />
                  <Route path="/gaming-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <GamingProductWizardPage />)} />
                  <Route path="/gaming-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <GamingProductDetailPage />)} />
                  <Route path="/gaming-products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <GamingProductsPage />)} />

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
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3500}
      />
    </PersistQueryClientProvider>
  );
}
