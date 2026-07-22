import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect, type ReactElement } from 'react';
import { useThemeStore } from '@core/stores/theme.store';
import { useLocaleStore } from '@core/stores/locale.store';

// ─── Notifications ─────────────────────────────────────────────
import NotificationsPage from '@modules/notifications/NotificationsPage';

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
import DashboardPage from '@modules/dashboard/pages/DashboardPage';
import DashboardGate from '@modules/dashboard/pages/DashboardGate';

// ─── Onboarding ────────────────────────────────────────────────
import OnboardingPage from '@modules/onboarding/pages/OnboardingPage';

// ─── Catalog / Products ────────────────────────────────────────
import BrandsPage from '@modules/inventory/brands/pages/BrandsPage';
import TagsPage from '@modules/inventory/tags/pages/TagsPage';
import ProductsListPage from '@modules/inventory/products/pages/ProductsListPage';
import ProductBulkImportPage from '@modules/inventory/products/pages/ProductBulkImportPage';
import ProductFormPage from '@modules/inventory/products/pages/ProductFormPage';
import ProductFormGate from '@modules/inventory/products/pages/ProductFormGate';
import ProductViewGate from '@modules/inventory/products/pages/ProductViewGate';
import CatalogPage from '@modules/catalog/pages/CatalogPage';
import CatalogGate from '@modules/catalog/pages/CatalogGate';
import CategoriesPage from '@modules/inventory/categories/pages/CategoriesPage';

// ─── Mobile Industry ───────────────────────────────────────────
import ImeiInventoryPage from '@industries/mobile/pages/ImeiInventoryPage';
import MobileReportsPage from '@industries/mobile/pages/MobileReportsPage';
import EmiPlansPage from '@industries/mobile/pages/EmiPlansPage';
import EmiPlanDetailPage from '@industries/mobile/pages/EmiPlanDetailPage';
import RepairTicketsPage from '@industries/mobile/pages/RepairTicketsPage';
import RepairTicketDetailPage from '@industries/mobile/pages/RepairTicketDetailPage';
import GlobalImeiInventoryPage from '@industries/mobile/pages/GlobalImeiInventoryPage';
import UsedPhonesPage from '@industries/mobile/pages/UsedPhonesPage';

// ─── Customers ─────────────────────────────────────────────────
import CustomersListPage from '@modules/customers/customers/pages/CustomersListPage';
import CustomersListGate from '@modules/customers/customers/pages/CustomersListGate';
import CustomerFormPage from '@modules/customers/customers/pages/CustomerFormPage';
import CustomerDetailPage from '@modules/customers/customers/pages/CustomerDetailPage';
import CustomerDetailGate from '@modules/customers/customers/pages/CustomerDetailGate';

// ─── Sales & POS ───────────────────────────────────────────────
import BookingsListPage from '@modules/bookings/pages/BookingsListPage';
import BookingFormPage from '@modules/bookings/pages/BookingFormPage';
import BookingDetailPage from '@modules/bookings/pages/BookingDetailPage';
import PosGate from '@modules/pos/pages/PosGate';
import SalesGate from '@modules/sales/sales/pages/SalesGate';
import ReceiptGate from '@modules/sales/sales/pages/ReceiptGate';
import ReturnsPage from '@modules/sales/returns/pages/ReturnsPage';
import DiscountsPage from '@modules/sales/discounts/pages/DiscountsPage';
import LoyaltyPage from '@modules/customers/loyalty/pages/LoyaltyPage';

// ─── Suppliers / Purchases / Expenses ──────────────────────────
import SuppliersListPage from '@modules/purchasing/suppliers/pages/SuppliersListPage';
import SupplierFormPage from '@modules/purchasing/suppliers/pages/SupplierFormPage';
import SupplierDetailPage from '@modules/purchasing/suppliers/pages/SupplierDetailPage';
import PurchasesPage from '@modules/purchasing/purchases/pages/PurchasesPage';
import PurchasesGate from '@modules/purchasing/purchases/pages/PurchasesGate';
import PurchaseDetailPage from '@modules/purchasing/purchases/pages/PurchaseDetailPage';
import ExpensesPage from '@modules/finance/expenses/pages/ExpensesPage';

// ─── Inventory ─────────────────────────────────────────────────
import StockMovementsPage from '@modules/inventory/stock-movements/pages/StockMovementsPage';
import StockAdjustmentsPage from '@modules/inventory/stock-adjustments/pages/StockAdjustmentsPage';
import LowStockPage from '@modules/inventory/low-stock/pages/LowStockPage';
import TransfersPage from '@modules/inventory/transfers/pages/TransfersPage';

// ─── Reports ───────────────────────────────────────────────────
import ReportsPage from '@modules/reports/reports/pages/ReportsPage';
import ReportsGate from '@modules/reports/reports/pages/ReportsGate';
import StockReportPage from '@modules/inventory/stock-report/pages/StockReportPage';
import ProfitReportPage from '@modules/finance/profit-report/pages/ProfitReportPage';

// ─── Settings / System ─────────────────────────────────────────
import SettingsPage from '@modules/organization/settings/pages/SettingsPage';
import BarcodeLabelsPage from '@modules/inventory/barcodes/pages/BarcodeLabelsPage';
import ShopsPage from '@modules/organization/shops/pages/ShopsPage';
import ActivityLogPage from '@modules/reports/activity-log/pages/ActivityLogPage';
import ExportsPage from '@modules/reports/exports/pages/ExportsPage';
import BackupPage from '@modules/backup/pages/BackupPage';
import KhataPage from '@modules/customers/khata/pages/KhataPage';
import CashRegisterPage from '@modules/finance/cash-register/pages/CashRegisterPage';

// ─── Team & Staff ──────────────────────────────────────────────
import TeamPage from '@modules/organization/team/pages/TeamPage';
import StaffListPage from '@modules/organization/staff/pages/StaffListPage';
import StaffFormPage from '@modules/organization/staff/pages/StaffFormPage';
import StaffDetailPage from '@modules/organization/staff/pages/StaffDetailPage';
import AttendancePage from '@modules/organization/staff/pages/AttendancePage';
import SalaryProcessPage from '@modules/organization/staff/pages/SalaryProcessPage';

// ─── Billing ───────────────────────────────────────────────────
import PlansPage from '@modules/billing/billing/pages/PlansPage';
import BillingPage from '@modules/billing/billing/pages/BillingPage';
import PayInvoicePage from '@modules/billing/billing/pages/PayInvoicePage';
import ReferralsPage from '@modules/customers/referrals/pages/ReferralsPage';
import PlanUsagePage from '@modules/billing/plan-usage/pages/PlanUsagePage';

// ─── User ──────────────────────────────────────────────────────
import ProfilePage from '@modules/profile/pages/ProfilePage';
import HelpPage from '@modules/help/pages/HelpPage';
import LegalPage from '@modules/legal/pages/LegalPage';

// ─── Carpet Industry ───────────────────────────────────────────
import CarpetRollsPage from '@industries/carpet/pages/CarpetRollsPage';
import CarpetCutPiecesPage from '@industries/carpet/pages/CarpetCutPiecesPage';
import CarpetRollDetailPage from '@industries/carpet/pages/CarpetRollDetailPage';
import CarpetReportsPage from '@industries/carpet/pages/CarpetReportsPage';
import CarpetBulkImportPage from '@industries/carpet/pages/CarpetBulkImportPage';

// ─── Retail Industry ───────────────────────────────────────────
import RetailDashboardPage from '@industries/retail/pages/RetailDashboardPage';
import CombosPage from '@industries/retail/pages/CombosPage';
import ComboFormPage from '@industries/retail/pages/ComboFormPage';
import DamageLogPage from '@industries/retail/pages/DamageLogPage';
import ProductUnitsPage from '@industries/retail/pages/ProductUnitsPage';
import QuickKeysPage from '@industries/retail/pages/QuickKeysPage';
import BulkImportPage from '@industries/retail/pages/BulkImportPage';
import ReorderPage from '@industries/retail/pages/ReorderPage';

// ─── Restaurant Industry ───────────────────────────────────────
import RestaurantDashboardPage from '@industries/restaurant/pages/RestaurantDashboardPage';
import RestaurantOrdersPage from '@industries/restaurant/pages/RestaurantOrdersPage';
import TablesLayoutPage from '@industries/restaurant/pages/TablesLayoutPage';
import MenuItemsPage from '@industries/restaurant/pages/MenuItemsPage';
import ModifiersPage from '@industries/restaurant/pages/ModifiersPage';
import KotDisplayPage from '@industries/restaurant/pages/KotDisplayPage';
import RidersPage from '@industries/restaurant/pages/RidersPage';
import HappyHoursPage from '@industries/restaurant/pages/HappyHoursPage';
import NewOrderPage from '@industries/restaurant/pages/NewOrderPage';
import OrderDetailPage from '@industries/restaurant/pages/OrderDetailPage';
import RecipesPage from '@industries/restaurant/pages/RecipesPage';
import StationsPage from '@industries/restaurant/pages/StationsPage';
import DeliveryTrackingPage from '@industries/restaurant/pages/DeliveryTrackingPage';

// ─── Pharmacy Industry ─────────────────────────────────────────
import PharmacyDashboardPage from '@industries/pharmacy/pages/PharmacyDashboardPage';
import PrescriptionsPage from '@industries/pharmacy/pages/PrescriptionsPage';
import NewPrescriptionPage from '@industries/pharmacy/pages/NewPrescriptionPage';
import PrescriptionDetailPage from '@industries/pharmacy/pages/PrescriptionDetailPage';
import PharmacyDoctorsPage from '@industries/pharmacy/pages/PharmacyDoctorsPage';
import SaltsPage from '@industries/pharmacy/pages/SaltsPage';
import MedicinesPage from '@industries/pharmacy/pages/MedicinesPage';
import ExpiringPage from '@industries/pharmacy/pages/ExpiringPage';
import ControlledLogPage from '@industries/pharmacy/pages/ControlledLogPage';
import TemperatureLogPage from '@industries/pharmacy/pages/TemperatureLogPage';

// ─── Garments Industry ─────────────────────────────────────────
import GarmentsDashboardPage from '@industries/garments/pages/GarmentsDashboardPage';
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
import SalonDashboardPage from '@industries/salon/pages/SalonDashboardPage';
import ServicesPage from '@industries/salon/pages/ServicesPage';
import StaffPage from '@industries/salon/pages/StaffPage';
import AppointmentsPage from '@industries/salon/pages/AppointmentsPage';
import NewAppointmentPage from '@industries/salon/pages/NewAppointmentPage';
import AppointmentDetailPage from '@industries/salon/pages/AppointmentDetailPage';
import MembershipsPage from '@industries/salon/pages/MembershipsPage';
import PackagesPage from '@industries/salon/pages/PackagesPage';
import CalendarViewPage from '@industries/salon/pages/CalendarViewPage';
import CustomersPage from '@industries/salon/pages/CustomersPage';

// ─── Hardware Industry ─────────────────────────────────────────
import HardwareDashboardPage from '@industries/hardware/pages/HardwareDashboardPage';
import HardwareBrandsPage from '@industries/hardware/pages/BrandsPage';
import HardwareProductsPage from '@industries/hardware/pages/ProductsPage';
import HardwareProjectsPage from '@industries/hardware/pages/ProjectsPage';
import HardwareQuotationsPage from '@industries/hardware/pages/QuotationsPage';
import HardwareNewQuotationPage from '@industries/hardware/pages/NewQuotationPage';
import HardwareQuotationDetailPage from '@industries/hardware/pages/QuotationDetailPage';
import HardwareDeliveriesPage from '@industries/hardware/pages/DeliveriesPage';
import HardwareCreditAccountsPage from '@industries/hardware/pages/CreditAccountsPage';
import HardwareReorderRulesPage from '@industries/hardware/pages/ReorderRulesPage';

// ─── Dairy Industry ────────────────────────────────────────────
import DairyDashboardPage from '@industries/dairy/pages/DairyDashboardPage';
import DairyFarmersPage from '@industries/dairy/pages/FarmersPage';
import DairyCustomersPage from '@industries/dairy/pages/DairyCustomersPage';
import DairyRoutesPage from '@industries/dairy/pages/RoutesPage';
import DairyDeliveriesPage from '@industries/dairy/pages/DeliveriesPage';
import DairyFarmerSuppliesPage from '@industries/dairy/pages/FarmerSuppliesPage';
import DairyMonthlyBillsPage from '@industries/dairy/pages/MonthlyBillsPage';
import DairyQualityTestsPage from '@industries/dairy/pages/QualityTestsPage';
import DairyProductsPage from '@industries/dairy/pages/DairyProductsPage';

// ─── Meat Industry ─────────────────────────────────────────────
import MeatDashboardPage from '@industries/meat/pages/MeatDashboardPage';
import MeatProductsPage from '@industries/meat/pages/MeatProductsPage';
import LiveAnimalsPage from '@industries/meat/pages/LiveAnimalsPage';
import SlaughterLogPage from '@industries/meat/pages/SlaughterLogPage';
import CuttingJobsPage from '@industries/meat/pages/CuttingJobsPage';
import WeightOrdersPage from '@industries/meat/pages/WeightOrdersPage';
import NewWeightOrderPage from '@industries/meat/pages/NewWeightOrderPage';
import QurbaniPage from '@industries/meat/pages/QurbaniPage';
import SubscriptionsPage from '@industries/meat/pages/SubscriptionsPage';
import WholesalePage from '@industries/meat/pages/WholesalePage';

// ─── Clinic Industry ───────────────────────────────────────────
import ClinicDashboardPage from '@industries/clinic/pages/ClinicDashboardPage';
import DoctorsPage from '@industries/clinic/pages/DoctorsPage';
import PatientsPage from '@industries/clinic/pages/PatientsPage';
import ClinicAppointmentsPage from '@industries/clinic/pages/ClinicAppointmentsPage';
import QueuePage from '@industries/clinic/pages/QueuePage';
import ClinicNewAppointmentPage from '@industries/clinic/pages/ClinicNewAppointmentPage';
import ClinicAppointmentDetailPage from '@industries/clinic/pages/ClinicAppointmentDetailPage';
import ClinicPrescriptionsPage from '@industries/clinic/pages/ClinicPrescriptionsPage';
import LabOrdersPage from '@industries/clinic/pages/LabOrdersPage';
import VaccinationsPage from '@industries/clinic/pages/VaccinationsPage';

// ─── Gym Industry ──────────────────────────────────────────────
import GymDashboardPage from '@industries/gym/pages/GymDashboardPage';
import GymMembersPage from '@industries/gym/pages/MembersPage';
import GymPlansPage from '@industries/gym/pages/PlansPage';
import GymMembershipsPage from '@industries/gym/pages/MembershipsPage';
import GymAttendancePage from '@industries/gym/pages/AttendancePage';
import GymTrainersPage from '@industries/gym/pages/TrainersPage';
import GymClassesPage from '@industries/gym/pages/ClassesPage';
import GymPTSessionsPage from '@industries/gym/pages/PTSessionsPage';
import EquipmentPage from '@industries/gym/pages/EquipmentPage';
import MemberDetailPage from '@industries/gym/pages/MemberDetailPage';

// ─── Bakery Industry ───────────────────────────────────────────
import BakeryDashboardPage from '@industries/bakery/pages/BakeryDashboardPage';
import CakeCustomizerPage from '@industries/bakery/pages/CakeCustomizerPage';
import CakeOrdersPage from '@industries/bakery/pages/CakeOrdersPage';
import CakeOrderDetailPage from '@industries/bakery/pages/CakeOrderDetailPage';
import BakeryProductsPage from '@industries/bakery/pages/BakeryProductsPage';
import ProductionPage from '@industries/bakery/pages/ProductionPage';
import IngredientsPage from '@industries/bakery/pages/IngredientsPage';
import FreshnessPage from '@industries/bakery/pages/FreshnessPage';
import BakeryBulkOrdersPage from '@industries/bakery/pages/BakeryBulkOrdersPage';
import BakeryProductWizardPage from '@industries/bakery/pages/BakeryProductWizardPage';
import BakeryProductDetailPage from '@industries/bakery/pages/BakeryProductDetailPage';
import GymMemberWizardPage from '@industries/gym/pages/GymMemberWizardPage';
import GymMemberDetailPage from '@industries/gym/pages/GymMemberDetailPage';
import ClinicServiceWizardPage from '@industries/clinic/pages/ClinicServiceWizardPage';
import ClinicServiceDetailPage from '@industries/clinic/pages/ClinicServiceDetailPage';

// ─── Agri Industry ─────────────────────────────────────────────
import AgriDashboardPage from '@industries/agri/pages/AgriDashboardPage';
import AgriProductsPage from '@industries/agri/pages/AgriProductsPage';
import FarmersPage from '@industries/agri/pages/FarmersPage';
import BulkOrdersPage from '@industries/agri/pages/BulkOrdersPage';
import NewBulkOrderPage from '@industries/agri/pages/NewBulkOrderPage';
import AdvisoryPage from '@industries/agri/pages/AdvisoryPage';
import SeasonalPlansPage from '@industries/agri/pages/SeasonalPlansPage';
import SubsidyPage from '@industries/agri/pages/SubsidyPage';

// ─── Hotel Industry ────────────────────────────────────────────
import HotelDashboardPage from '@industries/hotel/pages/HotelDashboardPage';
import RoomTypesPage from '@industries/hotel/pages/RoomTypesPage';
import RoomsPage from '@industries/hotel/pages/RoomsPage';
import GuestsPage from '@industries/hotel/pages/GuestsPage';
import BookingsPage from '@industries/hotel/pages/BookingsPage';
import NewBookingPage from '@industries/hotel/pages/NewBookingPage';
import HotelBookingDetailPage from '@industries/hotel/pages/HotelBookingDetailPage';
import HousekeepingPage from '@industries/hotel/pages/HousekeepingPage';

// ─── Jewelry Industry ──────────────────────────────────────────
import JewelryDashboardPage from '@industries/jewelry/pages/JewelryDashboardPage';
import MetalRatesPage from '@industries/jewelry/pages/MetalRatesPage';
import JewelryProductsPage from '@industries/jewelry/pages/JewelryProductsPage';
import JewelrySalesPage from '@industries/jewelry/pages/JewelrySalesPage';
import NewSalePage from '@industries/jewelry/pages/NewSalePage';
import CustomOrdersPage from '@industries/jewelry/pages/CustomOrdersPage';
import ExchangesPage from '@industries/jewelry/pages/ExchangesPage';
import KarigarsPage from '@industries/jewelry/pages/KarigarsPage';
import MetalStockPage from '@industries/jewelry/pages/MetalStockPage';

// ─── Auto Parts Industry ───────────────────────────────────────
import AutoPartsDashboardPage from '@industries/autoparts/pages/AutoPartsDashboardPage';
import VehicleMakesPage from '@industries/autoparts/pages/VehicleMakesPage';
import VehicleModelsPage from '@industries/autoparts/pages/VehicleModelsPage';
import CustomerVehiclesPage from '@industries/autoparts/pages/CustomerVehiclesPage';
import PartsPage from '@industries/autoparts/pages/PartsPage';
import WorkshopJobsPage from '@industries/autoparts/pages/WorkshopJobsPage';
import NewWorkshopJobPage from '@industries/autoparts/pages/NewWorkshopJobPage';
import WorkshopJobDetailPage from '@industries/autoparts/pages/WorkshopJobDetailPage';
import MechanicsPage from '@industries/autoparts/pages/MechanicsPage';
import ServiceRemindersPage from '@industries/autoparts/pages/ServiceRemindersPage';

// ─── Bookstore Industry ────────────────────────────────────────
import BookstoreDashboardPage from '@industries/bookstore/pages/BookstoreDashboardPage';
import PublishersPage from '@industries/bookstore/pages/PublishersPage';
import AuthorsPage from '@industries/bookstore/pages/AuthorsPage';
import BooksPage from '@industries/bookstore/pages/BooksPage';
import StationeryPage from '@industries/bookstore/pages/StationeryPage';
import ArtSuppliesPage from '@industries/bookstore/pages/ArtSuppliesPage';
import SchoolsPage from '@industries/bookstore/pages/SchoolsPage';
import SchoolListsPage from '@industries/bookstore/pages/SchoolListsPage';
import RentalsPage from '@industries/bookstore/pages/RentalsPage';

// ─── Industry Product/Item Wizards & Details ──────────────────
import CarpetProductWizardPage from '@industries/carpet/pages/CarpetProductWizardPage';
import CarpetProductDetailPage from '@industries/carpet/pages/CarpetProductDetailPage';
import MobileProductWizardPage from '@industries/mobile/pages/MobileProductWizardPage';
import MobileProductDetailPage from '@industries/mobile/pages/MobileProductDetailPage';
import RetailProductWizardPage from '@industries/retail/pages/RetailProductWizardPage';
import RetailProductDetailPage from '@industries/retail/pages/RetailProductDetailPage';
import RestaurantMenuItemWizardPage from '@industries/restaurant/pages/RestaurantMenuItemWizardPage';
import RestaurantMenuItemDetailPage from '@industries/restaurant/pages/RestaurantMenuItemDetailPage';
import PharmacyMedicineWizardPage from '@industries/pharmacy/pages/PharmacyMedicineWizardPage';
import PharmacyMedicineDetailPage from '@industries/pharmacy/pages/PharmacyMedicineDetailPage';
import GarmentProductWizardPage from '@industries/garments/pages/GarmentProductWizardPage';
import GarmentProductDetailPage from '@industries/garments/pages/GarmentProductDetailPage';
import JewelryItemWizardPage from '@industries/jewelry/pages/JewelryItemWizardPage';
import JewelryItemDetailPage from '@industries/jewelry/pages/JewelryItemDetailPage';
import HardwareProductWizardPage from '@industries/hardware/pages/HardwareProductWizardPage';
import HardwareProductDetailPage from '@industries/hardware/pages/HardwareProductDetailPage';
import DairyProductWizardPage from '@industries/dairy/pages/DairyProductWizardPage';
import DairyProductDetailPage from '@industries/dairy/pages/DairyProductDetailPage';
import MeatProductWizardPage from '@industries/meat/pages/MeatProductWizardPage';
import MeatProductDetailPage from '@industries/meat/pages/MeatProductDetailPage';
import AgriProductWizardPage from '@industries/agri/pages/AgriProductWizardPage';
import AgriProductDetailPage from '@industries/agri/pages/AgriProductDetailPage';
import AutoPartWizardPage from '@industries/autoparts/pages/AutoPartWizardPage';
import AutoPartDetailPage from '@industries/autoparts/pages/AutoPartDetailPage';
import BookstoreProductWizardPage from '@industries/bookstore/pages/BookstoreProductWizardPage';
import BookstoreProductDetailPage from '@industries/bookstore/pages/BookstoreProductDetailPage';
import SalonServiceWizardPage from '@industries/salon/pages/SalonServiceWizardPage';
import SalonServiceDetailPage from '@industries/salon/pages/SalonServiceDetailPage';
import HotelRoomTypeWizardPage from '@industries/hotel/pages/HotelRoomTypeWizardPage';
import HotelRoomTypeDetailPage from '@industries/hotel/pages/HotelRoomTypeDetailPage';

import ServicesBizServiceWizardPage from '@industries/services-biz/pages/ServicesBizServiceWizardPage';
import ServicesBizServiceDetailPage from '@industries/services-biz/pages/ServicesBizServiceDetailPage';

// ─── Route Guards & Layout ─────────────────────────────────────
import { ProtectedRoute, PublicOnlyRoute } from '@app/router/ProtectedRoute';
import OnboardingGate from '@app/router/OnboardingGate';
import AppShell from '@app/layout/AppShell';
import PermissionRoute from '@app/router/PermissionRoute';
import { PERMISSIONS } from '@core/lib/permissions';

// ─── Industry Pack System ──────────────────────────────────────
import '@app/providers/registerIndustries';
import { IndustryProvider } from '@industries/_shared/registry/IndustryProvider';
import { industryRoutes } from '@industries/_shared/registry/IndustryRoutes';

// ─── React Query Client ────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  const initTheme = useThemeStore((s) => s.initialize);
  const initLocale = useLocaleStore((s) => s.initialize);

  useEffect(() => {
    initTheme();
    initLocale();
  }, [initTheme, initLocale]);

  // Helper to wrap a route with permission check
  const secure = (permission: any, node: ReactElement) => (
    <PermissionRoute permission={permission}>{node}</PermissionRoute>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <>
        <IndustryProvider>
          <Routes>
            {/* ═══════════════════════════════════════════════════════ */}
            {/* PUBLIC ROUTES — only when logged out                    */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/google/success" element={<GoogleSuccessPage />} />
              <Route path="/auth/google/complete-signup" element={<GoogleCompleteSignupPage />} />
              <Route path="/auth/google/error" element={<GoogleErrorPage />} />
            </Route>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PROTECTED ROUTES — require auth                         */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Route element={<ProtectedRoute />}>

              {/* ─── Standalone routes (NO app shell, NO onboarding gate) ─── */}
              {/*
                These must render BEFORE OnboardingGate so onboarding
                page itself, receipt printing, and email verification
                are always reachable regardless of onboarding state.
              */}
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/verify-email" element={<EmailVerifyPage />} />
              <Route path="/sales/:id/receipt" element={<ReceiptGate />} />

              {/* ─── Onboarding-guarded routes (force complete first) ─── */}
              <Route element={<OnboardingGate />}>
                <Route element={<AppShell />}>

                  {/* ── Dashboard ────────────────────────────────── */}
                  <Route path="/dashboard" element={<DashboardGate />} />
                  <Route path="/notifications" element={<NotificationsPage />} />

                  {/* ── Products & Catalog ───────────────────────── */}
                  <Route path="/products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductFormGate />)} />
                  <Route path="/products/bulk-import" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ProductBulkImportPage />)} />
                  <Route path="/products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ProductFormGate />)} />
                  <Route path="/products/:id/imei" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ImeiInventoryPage />)} />
                  <Route path="/products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ProductViewGate />)} />
                  <Route path="/products" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ProductsListPage />)} />

                  <Route path="/catalog" element={secure(PERMISSIONS.PRODUCTS_VIEW, <CatalogGate />)} />
                  <Route path="/brands" element={secure(PERMISSIONS.BRANDS_VIEW, <BrandsPage />)} />
                  <Route path="/tags" element={secure(PERMISSIONS.TAGS_VIEW, <TagsPage />)} />
                  <Route path="/categories" element={secure(PERMISSIONS.CATEGORIES_VIEW, <CategoriesPage />)} />

                  {/* ── Mobile Industry ──────────────────────────── */}
                  <Route path="/mobile-reports" element={<MobileReportsPage />} />
                  <Route path="/emi-plans/:id" element={<EmiPlanDetailPage />} />
                  <Route path="/emi-plans" element={<EmiPlansPage />} />
                  <Route path="/repair-tickets/:id" element={<RepairTicketDetailPage />} />
                  <Route path="/repair-tickets" element={<RepairTicketsPage />} />
                  <Route path="/imei-inventory" element={<GlobalImeiInventoryPage />} />
                  <Route path="/used-phones" element={<UsedPhonesPage />} />

                  {/* ── Customers ────────────────────────────────── */}
                  <Route path="/customers/new" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <CustomerFormPage />)} />
                  <Route path="/customers/:id/edit" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <CustomerFormPage />)} />
                  <Route path="/customers/:id" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomerDetailGate />)} />
                  <Route path="/customers" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <CustomersListGate />)} />

                  {/* ── Sales / POS ──────────────────────────────── */}
                  <Route path="/pos" element={secure(PERMISSIONS.POS_USE, <PosGate />)} />
                  <Route path="/bookings/new" element={secure(PERMISSIONS.SALES_VIEW, <BookingFormPage />)} />
                  <Route path="/bookings/:id" element={secure(PERMISSIONS.SALES_VIEW, <BookingDetailPage />)} />
                  <Route path="/bookings" element={secure(PERMISSIONS.SALES_VIEW, <BookingsListPage />)} />
                  <Route path="/sales" element={secure(PERMISSIONS.SALES_VIEW, <SalesGate />)} />
                  <Route path="/returns" element={secure(PERMISSIONS.RETURNS_VIEW, <ReturnsPage />)} />
                  <Route path="/discounts" element={secure(PERMISSIONS.DISCOUNTS_VIEW, <DiscountsPage />)} />
                  <Route path="/loyalty" element={secure(PERMISSIONS.LOYALTY_VIEW, <LoyaltyPage />)} />
                  <Route path="/profit-report" element={secure(PERMISSIONS.PROFIT_REPORT_VIEW, <ProfitReportPage />)} />
                  <Route path="/khata" element={secure(PERMISSIONS.KHATA_VIEW, <KhataPage />)} />
                  <Route path="/cash-register" element={secure(PERMISSIONS.CASH_REGISTER_VIEW, <CashRegisterPage />)} />

                  {/* ── Suppliers & Purchases ────────────────────── */}
                  <Route path="/suppliers/new" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierFormPage />)} />
                  <Route path="/suppliers/:id/edit" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierFormPage />)} />
                  <Route path="/suppliers/:id" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SupplierDetailPage />)} />
                  <Route path="/suppliers" element={secure(PERMISSIONS.SUPPLIERS_VIEW, <SuppliersListPage />)} />
                  <Route path="/purchases/:id" element={secure(PERMISSIONS.PURCHASES_VIEW, <PurchaseDetailPage />)} />
                  <Route path="/purchases" element={secure(PERMISSIONS.PURCHASES_VIEW, <PurchasesGate />)} />
                  <Route path="/expenses" element={secure(PERMISSIONS.EXPENSES_VIEW, <ExpensesPage />)} />

                  {/* ── Inventory ────────────────────────────────── */}
                  <Route path="/stock-movements" element={secure(PERMISSIONS.STOCK_MOVEMENTS_VIEW, <StockMovementsPage />)} />
                  <Route path="/stock-adjustments" element={secure(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, <StockAdjustmentsPage />)} />
                  <Route path="/low-stock" element={secure(PERMISSIONS.LOW_STOCK_VIEW, <LowStockPage />)} />
                  <Route path="/transfers" element={secure(PERMISSIONS.STOCK_TRANSFERS_MANAGE, <TransfersPage />)} />

                  {/* ── Reports ──────────────────────────────────── */}
                  <Route path="/reports" element={secure(PERMISSIONS.REPORTS_VIEW, <ReportsGate />)} />
                  <Route path="/stock-report" element={secure(PERMISSIONS.REPORTS_VIEW, <StockReportPage />)} />

                  {/* ── Settings & System ────────────────────────── */}
                  <Route path="/settings" element={secure(PERMISSIONS.SETTINGS_VIEW, <SettingsPage />)} />
                  <Route path="/barcode-labels" element={secure(PERMISSIONS.BARCODE_LABELS_VIEW, <BarcodeLabelsPage />)} />
                  <Route path="/shops" element={secure(PERMISSIONS.SHOPS_VIEW, <ShopsPage />)} />
                  <Route path="/activity-log" element={secure(PERMISSIONS.ACTIVITY_VIEW, <ActivityLogPage />)} />
                  <Route path="/exports" element={secure(PERMISSIONS.EXPORTS_VIEW, <ExportsPage />)} />
                  <Route path="/backup" element={secure(PERMISSIONS.BACKUP_MANAGE, <BackupPage />)} />

                  {/* ── Team & Staff ─────────────────────────────── */}
                  <Route path="/team" element={secure(PERMISSIONS.TEAM_VIEW, <TeamPage />)} />
                  <Route path="/staff/new" element={secure(PERMISSIONS.STAFF_MANAGE, <StaffFormPage />)} />
                  <Route path="/staff/attendance" element={secure(PERMISSIONS.STAFF_VIEW, <AttendancePage />)} />
                  <Route path="/staff/salary/new" element={secure(PERMISSIONS.STAFF_MANAGE, <SalaryProcessPage />)} />
                  <Route path="/staff/:id/edit" element={secure(PERMISSIONS.STAFF_MANAGE, <StaffFormPage />)} />
                  <Route path="/staff/:id" element={secure(PERMISSIONS.STAFF_VIEW, <StaffDetailPage />)} />
                  <Route path="/staff" element={secure(PERMISSIONS.STAFF_VIEW, <StaffListPage />)} />
                  <Route path="/appointments" element={<AppointmentsPage />} />

                  {/* ── Billing ──────────────────────────────────── */}
                  <Route path="/plans" element={secure(PERMISSIONS.PLANS_VIEW, <PlansPage />)} />
                  <Route path="/billing/invoice/:id/pay" element={secure(PERMISSIONS.BILLING_VIEW, <PayInvoicePage />)} />
                  <Route path="/billing" element={secure(PERMISSIONS.BILLING_VIEW, <BillingPage />)} />
                  <Route path="/referrals" element={secure(PERMISSIONS.REFERRALS_VIEW, <ReferralsPage />)} />
                  <Route path="/plan-usage" element={secure(PERMISSIONS.PLAN_USAGE_VIEW, <PlanUsagePage />)} />

                  {/* ── User ─────────────────────────────────────── */}
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/legal" element={<LegalPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/* INDUSTRY-SPECIFIC ROUTES                        */}
                  {/* ═══════════════════════════════════════════════ */}

                  {/* ── Carpet ───────────────────────────────────── */}
                  <Route path="/carpet-rolls/:id" element={<CarpetRollDetailPage />} />
                  <Route path="/carpet-rolls" element={<CarpetRollsPage />} />
                  <Route path="/carpet-cut-pieces" element={<CarpetCutPiecesPage />} />
                  <Route path="/carpet-reports" element={<CarpetReportsPage />} />
                  <Route path="/carpet-bulk-import" element={<CarpetBulkImportPage />} />

                  {/* ── Retail ───────────────────────────────────── */}
                  <Route path="/retail" element={<RetailDashboardPage />} />
                  <Route path="/retail/dashboard" element={<RetailDashboardPage />} />
                  <Route path="/retail/combos/new" element={<ComboFormPage />} />
                  <Route path="/retail/combos/:id/edit" element={<ComboFormPage />} />
                  <Route path="/retail/combos" element={<CombosPage />} />
                  <Route path="/retail/damage" element={<DamageLogPage />} />
                  <Route path="/retail/product-units" element={<ProductUnitsPage />} />
                  <Route path="/retail/quick-keys" element={<QuickKeysPage />} />
                  <Route path="/retail/bulk-import" element={<BulkImportPage />} />
                  <Route path="/retail/reorders" element={<ReorderPage />} />
                  <Route path="/retail/barcode-labels" element={<BarcodeLabelsPage />} />

                  {/* ── Restaurant ───────────────────────────────── */}
                  <Route path="/restaurant" element={<RestaurantDashboardPage />} />
                  <Route path="/restaurant/dashboard" element={<RestaurantDashboardPage />} />
                  <Route path="/restaurant/orders/new" element={<NewOrderPage />} />
                  <Route path="/restaurant/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/restaurant/orders" element={<RestaurantOrdersPage />} />
                  <Route path="/restaurant/tables" element={<TablesLayoutPage />} />
                  <Route path="/restaurant/menu" element={<MenuItemsPage />} />
                  <Route path="/restaurant/modifiers" element={<ModifiersPage />} />
                  <Route path="/restaurant/kot" element={<KotDisplayPage />} />
                  <Route path="/restaurant/riders" element={<RidersPage />} />
                  <Route path="/restaurant/happy-hours" element={<HappyHoursPage />} />
                  <Route path="/restaurant/recipes" element={<RecipesPage />} />
                  <Route path="/restaurant/stations" element={<StationsPage />} />
                  <Route path="/restaurant/delivery" element={<DeliveryTrackingPage />} />

                  {/* ── Pharmacy ─────────────────────────────────── */}
                  <Route path="/pharmacy" element={<PharmacyDashboardPage />} />
                  <Route path="/pharmacy/dashboard" element={<PharmacyDashboardPage />} />
                  <Route path="/pharmacy/prescriptions/new" element={<NewPrescriptionPage />} />
                  <Route path="/pharmacy/prescriptions/:id" element={<PrescriptionDetailPage />} />
                  <Route path="/pharmacy/prescriptions" element={<PrescriptionsPage />} />
                  <Route path="/pharmacy/doctors" element={<PharmacyDoctorsPage />} />
                  <Route path="/pharmacy/salts" element={<SaltsPage />} />
                  <Route path="/pharmacy/medicines" element={<MedicinesPage />} />
                  <Route path="/pharmacy/expiring" element={<ExpiringPage />} />
                  <Route path="/pharmacy/controlled-log" element={<ControlledLogPage />} />
                  <Route path="/pharmacy/temperature-log" element={<TemperatureLogPage />} />

                  {/* ── Garments ─────────────────────────────────── */}
                  <Route path="/garments" element={<GarmentsDashboardPage />} />
                  <Route path="/garments/dashboard" element={<GarmentsDashboardPage />} />
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

                  {/* ── Salon ────────────────────────────────────── */}
                  <Route path="/salon" element={<SalonDashboardPage />} />
                  <Route path="/salon/dashboard" element={<SalonDashboardPage />} />
                  <Route path="/salon/services" element={<ServicesPage />} />
                  <Route path="/salon/staff" element={<StaffPage />} />
                  <Route path="/salon/appointments/new" element={<NewAppointmentPage />} />
                  <Route path="/salon/appointments/:id" element={<AppointmentDetailPage />} />
                  <Route path="/salon/appointments" element={<AppointmentsPage />} />
                  <Route path="/salon/memberships" element={<MembershipsPage />} />
                  <Route path="/salon/packages" element={<PackagesPage />} />
                  <Route path="/salon/calendar" element={<CalendarViewPage />} />
                  <Route path="/salon/customers" element={<CustomersPage />} />

                  {/* ── Hardware ─────────────────────────────────── */}
                  <Route path="/hardware" element={<HardwareDashboardPage />} />
                  <Route path="/hardware/dashboard" element={<HardwareDashboardPage />} />
                  <Route path="/hardware/brands" element={<HardwareBrandsPage />} />
                  <Route path="/hardware/products" element={<HardwareProductsPage />} />
                  <Route path="/hardware/projects" element={<HardwareProjectsPage />} />
                  <Route path="/hardware/quotations/new" element={<HardwareNewQuotationPage />} />
                  <Route path="/hardware/quotations/:id" element={<HardwareQuotationDetailPage />} />
                  <Route path="/hardware/quotations" element={<HardwareQuotationsPage />} />
                  <Route path="/hardware/deliveries" element={<HardwareDeliveriesPage />} />
                  <Route path="/hardware/credit-accounts" element={<HardwareCreditAccountsPage />} />
                  <Route path="/hardware/reorder-rules" element={<HardwareReorderRulesPage />} />

                  {/* ── Dairy ────────────────────────────────────── */}
                  <Route path="/dairy" element={<DairyDashboardPage />} />
                  <Route path="/dairy/dashboard" element={<DairyDashboardPage />} />
                  <Route path="/dairy/farmers" element={<DairyFarmersPage />} />
                  <Route path="/dairy/customers" element={<DairyCustomersPage />} />
                  <Route path="/dairy/routes" element={<DairyRoutesPage />} />
                  <Route path="/dairy/deliveries" element={<DairyDeliveriesPage />} />
                  <Route path="/dairy/farmer-supplies" element={<DairyFarmerSuppliesPage />} />
                  <Route path="/dairy/monthly-bills" element={<DairyMonthlyBillsPage />} />
                  <Route path="/dairy/quality-tests" element={<DairyQualityTestsPage />} />
                  <Route path="/dairy/products" element={<DairyProductsPage />} />

                  {/* ── Meat ─────────────────────────────────────── */}
                  <Route path="/meat" element={<MeatDashboardPage />} />
                  <Route path="/meat/dashboard" element={<MeatDashboardPage />} />
                  <Route path="/meat/products" element={<MeatProductsPage />} />
                  <Route path="/meat/live-animals" element={<LiveAnimalsPage />} />
                  <Route path="/meat/slaughter" element={<SlaughterLogPage />} />
                  <Route path="/meat/cutting-jobs" element={<CuttingJobsPage />} />
                  <Route path="/meat/weight-orders/new" element={<NewWeightOrderPage />} />
                  <Route path="/meat/weight-orders" element={<WeightOrdersPage />} />
                  <Route path="/meat/subscriptions" element={<SubscriptionsPage />} />
                  <Route path="/meat/qurbani" element={<QurbaniPage />} />
                  <Route path="/meat/wholesale" element={<WholesalePage />} />

                  {/* ── Clinic ───────────────────────────────────── */}
                  <Route path="/clinic" element={<ClinicDashboardPage />} />
                  <Route path="/clinic/dashboard" element={<ClinicDashboardPage />} />
                  <Route path="/clinic/doctors" element={<DoctorsPage />} />
                  <Route path="/clinic/patients" element={<PatientsPage />} />
                  <Route path="/clinic/appointments/new" element={<ClinicNewAppointmentPage />} />
                  <Route path="/clinic/appointments/:id" element={<ClinicAppointmentDetailPage />} />
                  <Route path="/clinic/appointments" element={<ClinicAppointmentsPage />} />
                  <Route path="/clinic/prescriptions" element={<ClinicPrescriptionsPage />} />
                  <Route path="/clinic/lab-orders" element={<LabOrdersPage />} />
                  <Route path="/clinic/vaccinations" element={<VaccinationsPage />} />
                  <Route path="/clinic/queue" element={<QueuePage />} />

                  {/* ── Gym ──────────────────────────────────────── */}
                  <Route path="/gym" element={<GymDashboardPage />} />
                  <Route path="/gym/dashboard" element={<GymDashboardPage />} />
                  <Route path="/gym/members/:id" element={<GymMemberDetailPage />} />
                  <Route path="/gym/members" element={<GymMembersPage />} />
                  <Route path="/gym/plans" element={<GymPlansPage />} />
                  <Route path="/gym/memberships" element={<GymMembershipsPage />} />
                  <Route path="/gym/attendance" element={<GymAttendancePage />} />
                  <Route path="/gym/trainers" element={<GymTrainersPage />} />
                  <Route path="/gym/classes" element={<GymClassesPage />} />
                  <Route path="/gym/personal-training" element={<GymPTSessionsPage />} />
                  <Route path="/gym/equipment" element={<EquipmentPage />} />

                  {/* ── Bakery ───────────────────────────────────── */}
                  <Route path="/bakery" element={<BakeryDashboardPage />} />
                  <Route path="/bakery/dashboard" element={<BakeryDashboardPage />} />
                  <Route path="/bakery/cake-orders/new" element={<CakeCustomizerPage />} />
                  <Route path="/bakery/cake-orders/:id" element={<CakeOrderDetailPage />} />
                  <Route path="/bakery/cake-orders" element={<CakeOrdersPage />} />
                  <Route path="/bakery/products" element={<BakeryProductsPage />} />
                  <Route path="/bakery/production" element={<ProductionPage />} />
                  <Route path="/bakery/ingredients" element={<IngredientsPage />} />
                  <Route path="/bakery/freshness" element={<FreshnessPage />} />
                  <Route path="/bakery/bulk-orders" element={<BakeryBulkOrdersPage />} />

                  {/* ── Agri ─────────────────────────────────────── */}
                  <Route path="/agri" element={<AgriDashboardPage />} />
                  <Route path="/agri/dashboard" element={<AgriDashboardPage />} />
                  <Route path="/agri/products" element={<AgriProductsPage />} />
                  <Route path="/agri/farmers" element={<FarmersPage />} />
                  <Route path="/agri/bulk-orders/new" element={<NewBulkOrderPage />} />
                  <Route path="/agri/bulk-orders" element={<BulkOrdersPage />} />
                  <Route path="/agri/advisory" element={<AdvisoryPage />} />
                  <Route path="/agri/seasonal-plans" element={<SeasonalPlansPage />} />
                  <Route path="/agri/subsidy" element={<SubsidyPage />} />

                  {/* ── Hotel ────────────────────────────────────── */}
                  <Route path="/hotel" element={<HotelDashboardPage />} />
                  <Route path="/hotel/dashboard" element={<HotelDashboardPage />} />
                  <Route path="/hotel/room-types" element={<RoomTypesPage />} />
                  <Route path="/hotel/rooms" element={<RoomsPage />} />
                  <Route path="/hotel/guests" element={<GuestsPage />} />
                  <Route path="/hotel/bookings/new" element={<NewBookingPage />} />
                  <Route path="/hotel/bookings/:id" element={<HotelBookingDetailPage />} />
                  <Route path="/hotel/bookings" element={<BookingsPage />} />
                  <Route path="/hotel/housekeeping" element={<HousekeepingPage />} />

                  {/* ── Jewelry ──────────────────────────────────── */}
                  <Route path="/jewelry" element={<JewelryDashboardPage />} />
                  <Route path="/jewelry/dashboard" element={<JewelryDashboardPage />} />
                  <Route path="/jewelry/metal-rates" element={<MetalRatesPage />} />
                  <Route path="/jewelry/products" element={<JewelryProductsPage />} />
                  <Route path="/jewelry/sales/new" element={<NewSalePage />} />
                  <Route path="/jewelry/sales" element={<JewelrySalesPage />} />
                  <Route path="/jewelry/custom-orders" element={<CustomOrdersPage />} />
                  <Route path="/jewelry/exchanges" element={<ExchangesPage />} />
                  <Route path="/jewelry/karigars" element={<KarigarsPage />} />
                  <Route path="/jewelry/metal-stock" element={<MetalStockPage />} />

                  {/* ── Auto Parts / Workshop ────────────────────── */}
                  <Route path="/autoparts" element={<AutoPartsDashboardPage />} />
                  <Route path="/autoparts/dashboard" element={<AutoPartsDashboardPage />} />
                  <Route path="/autoparts/makes" element={<VehicleMakesPage />} />
                  <Route path="/autoparts/models" element={<VehicleModelsPage />} />
                  <Route path="/autoparts/vehicles" element={<CustomerVehiclesPage />} />
                  <Route path="/autoparts/parts" element={<PartsPage />} />
                  <Route path="/autoparts/jobs/new" element={<NewWorkshopJobPage />} />
                  <Route path="/autoparts/jobs/:id" element={<WorkshopJobDetailPage />} />
                  <Route path="/autoparts/jobs" element={<WorkshopJobsPage />} />
                  <Route path="/autoparts/mechanics" element={<MechanicsPage />} />
                  <Route path="/autoparts/reminders" element={<ServiceRemindersPage />} />

                  {/* ── Bookstore / Stationery ───────────────────── */}
                  <Route path="/bookstore" element={<BookstoreDashboardPage />} />
                  <Route path="/bookstore/dashboard" element={<BookstoreDashboardPage />} />
                  <Route path="/bookstore/publishers" element={<PublishersPage />} />
                  <Route path="/bookstore/authors" element={<AuthorsPage />} />
                  <Route path="/bookstore/books" element={<BooksPage />} />
                  <Route path="/bookstore/stationery" element={<StationeryPage />} />
                  <Route path="/bookstore/art-supplies" element={<ArtSuppliesPage />} />
                  <Route path="/bookstore/schools" element={<SchoolsPage />} />
                  <Route path="/bookstore/school-lists" element={<SchoolListsPage />} />
                  <Route path="/bookstore/rentals" element={<RentalsPage />} />

                  {/* ─── Industry Product/Item routes ─────────── */}
                  {/* Carpet */}
                  <Route path="/carpet-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <CarpetProductWizardPage />)} />
                  <Route path="/carpet-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <CarpetProductWizardPage />)} />
                  <Route path="/carpet-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <CarpetProductDetailPage />)} />

                  {/* Mobile */}
                  <Route path="/mobile-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <MobileProductWizardPage />)} />
                  <Route path="/mobile-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <MobileProductWizardPage />)} />
                  <Route path="/mobile-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <MobileProductDetailPage />)} />

                  {/* Retail */}
                  <Route path="/retail-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <RetailProductWizardPage />)} />
                  <Route path="/retail-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <RetailProductWizardPage />)} />
                  <Route path="/retail-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <RetailProductDetailPage />)} />

                  {/* Restaurant */}
                  <Route path="/restaurant-menu-items/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <RestaurantMenuItemWizardPage />)} />
                  <Route path="/restaurant-menu-items/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <RestaurantMenuItemWizardPage />)} />
                  <Route path="/restaurant-menu-items/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <RestaurantMenuItemDetailPage />)} />

                  {/* Pharmacy */}
                  <Route path="/pharmacy-medicines/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <PharmacyMedicineWizardPage />)} />
                  <Route path="/pharmacy-medicines/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <PharmacyMedicineWizardPage />)} />
                  <Route path="/pharmacy-medicines/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <PharmacyMedicineDetailPage />)} />

                  {/* Bakery — wizard for both new + edit + detail (until dedicated detail page exists) */}
                  <Route path="/bakery-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <BakeryProductWizardPage />)} />
                  <Route path="/bakery-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <BakeryProductWizardPage />)} />
                  <Route path="/bakery-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <BakeryProductDetailPage />)} />

                  {/* Gym Member Wizard */}
                  <Route path="/gym-members/new" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <GymMemberWizardPage />)} />
                  <Route path="/gym-members/:id/edit" element={secure(PERMISSIONS.CUSTOMERS_EDIT, <GymMemberWizardPage />)} />
                  <Route path="/gym-members/:id" element={secure(PERMISSIONS.CUSTOMERS_VIEW, <GymMemberDetailPage />)} />

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

                  {/* Hardware */}
                  <Route path="/hardware-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <HardwareProductWizardPage />)} />
                  <Route path="/hardware-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <HardwareProductWizardPage />)} />
                  <Route path="/hardware-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <HardwareProductDetailPage />)} />

                  {/* Dairy */}
                  <Route path="/dairy-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <DairyProductWizardPage />)} />
                  <Route path="/dairy-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <DairyProductWizardPage />)} />
                  <Route path="/dairy-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <DairyProductDetailPage />)} />

                  {/* Meat */}
                  <Route path="/meat-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <MeatProductWizardPage />)} />
                  <Route path="/meat-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <MeatProductWizardPage />)} />
                  <Route path="/meat-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <MeatProductDetailPage />)} />

                  {/* Agri */}
                  <Route path="/agri-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <AgriProductWizardPage />)} />
                  <Route path="/agri-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <AgriProductWizardPage />)} />
                  <Route path="/agri-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <AgriProductDetailPage />)} />

                  {/* AutoParts */}
                  <Route path="/autoparts-parts/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <AutoPartWizardPage />)} />
                  <Route path="/autoparts-parts/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <AutoPartWizardPage />)} />
                  <Route path="/autoparts-parts/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <AutoPartDetailPage />)} />

                  {/* Bookstore */}
                  <Route path="/bookstore-products/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <BookstoreProductWizardPage />)} />
                  <Route path="/bookstore-products/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <BookstoreProductWizardPage />)} />
                  <Route path="/bookstore-products/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <BookstoreProductDetailPage />)} />

                  {/* Salon */}
                  <Route path="/salon-services/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <SalonServiceWizardPage />)} />
                  <Route path="/salon-services/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <SalonServiceWizardPage />)} />
                  <Route path="/salon-services/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <SalonServiceDetailPage />)} />

                  {/* Hotel */}
                  <Route path="/hotel-room-types/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <HotelRoomTypeWizardPage />)} />
                  <Route path="/hotel-room-types/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <HotelRoomTypeWizardPage />)} />
                  <Route path="/hotel-room-types/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <HotelRoomTypeDetailPage />)} />

                  {/* Services-Biz service wizard */}
                  <Route path="/services-biz-services/new" element={secure(PERMISSIONS.PRODUCTS_CREATE, <ServicesBizServiceWizardPage />)} />
                  <Route path="/services-biz-services/:id/edit" element={secure(PERMISSIONS.PRODUCTS_EDIT, <ServicesBizServiceWizardPage />)} />
                  <Route path="/services-biz-services/:id" element={secure(PERMISSIONS.PRODUCTS_VIEW, <ServicesBizServiceDetailPage />)} />

                  {/* ── Industry pack routes (auto-registered) ───── */}
                  {industryRoutes()}

                </Route>
              </Route>
            </Route>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* FALLBACK                                                */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </IndustryProvider>
      </>

      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3500}
      />
    </QueryClientProvider>
  );
}
