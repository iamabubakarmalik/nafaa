import {
  LayoutDashboard, Wrench, Award, Shield, Home, Package,
  Truck, CalendarClock, HardHat, FileSignature, Zap,
  Barcode, BarChart3, PackageX, Boxes, TrendingUp,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import AppliancesDashboardPage from './pages/AppliancesDashboardPage';
import AppliancesPosPage from './pages/AppliancesPosPage';
import InstallationsPage from './pages/InstallationsPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import TechniciansPage from './pages/TechniciansPage';
import TechnicianDetailPage from './pages/TechnicianDetailPage';
import AmcContractsPage from './pages/AmcContractsPage';
import AmcContractFormPage from './pages/AmcContractFormPage';
import DeliveriesPage from './pages/DeliveriesPage';
import ApplianceSerialsPage from './pages/ApplianceSerialsPage';
import ApplianceWarrantyClaimsPage from './pages/ApplianceWarrantyClaimsPage';
import AppliancesReportsPage from './pages/AppliancesReportsPage';
import AppliancesLowStockPage from './pages/AppliancesLowStockPage';
import AppliancesStockReportPage from './pages/AppliancesStockReportPage';
import AppliancesProfitReportPage from './pages/AppliancesProfitReportPage';

export const AppliancesPack: IndustryPack = {
  id: 'appliances',
  name: 'Home Appliances',
  shortName: 'Appliances',
  emoji: '🏠',
  themeColor: '#0891b2',
  priority: 82,
  description:
    'Installation scheduling, service requests, technician management, AMC contracts, heavy delivery tracking, warranty & serial tracking.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('APPLIANCE') ||
      type.includes('HOME_APPLIANCE') ||
      type.includes('WHITE_GOODS')
    );
  },

  navGroups: [
    {
      label: 'Appliances',
      icon: Home,
      emoji: '🏠',
      color: '#0891b2',
      order: 20,
      items: [
        // Brands yahan se hata diya gaya (2026-09-14) — ab global
        // /brands page hai. Do alag brand tables ki wajah se ek hi
        // "Haier" do jagah alag record ban jati thi.
        { to: '/appliances/installations', label: 'Installations', icon: HardHat, badge: 'LIVE' },
        { to: '/appliances/service-requests', label: 'Service Requests', icon: Wrench },
        { to: '/appliances/technicians', label: 'Technicians', icon: Zap },
        { to: '/appliances/amc-contracts', label: 'AMC Contracts', icon: FileSignature },
        { to: '/appliances/deliveries', label: 'Deliveries', icon: Truck },
        { to: '/appliances/serials', label: 'Serial Register', icon: Barcode },
        { to: '/appliances/warranty-claims', label: 'Warranty Claims', icon: Shield, badge: 'NEW' },
        { to: '/appliances/reports', label: 'Reports', icon: BarChart3, badge: 'NEW' },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: AppliancesPosPage },

    // Product ke raaste App.tsx me hain — wahan permission ka
    // pehra (`secure(PERMISSIONS.PRODUCTS_VIEW, …)`) laga hua hai.
    // Yahan se dobara register karne par wohi safha BIN-PEHRA bhi
    // khul jata tha: cashier cost price dekh sakta tha.

    { path: '/appliances', element: AppliancesDashboardPage },
    { path: '/appliances/dashboard', element: AppliancesDashboardPage },

    // /appliances/brands hata diya gaya — global /brands istemal hota hai.
    // ApplianceBrandsPage file apni jagah pari hai, sirf route nahi raha.

    { path: '/appliances/installations', element: InstallationsPage },
    { path: '/appliances/service-requests', element: ServiceRequestsPage },

    { path: '/appliances/technicians', element: TechniciansPage },
    { path: '/appliances/technicians/:id', element: TechnicianDetailPage },

    { path: '/appliances/amc-contracts', element: AmcContractsPage },
    { path: '/appliances/amc-contracts/new', element: AmcContractFormPage },
    { path: '/appliances/amc-contracts/:id/edit', element: AmcContractFormPage },

    { path: '/appliances/deliveries', element: DeliveriesPage },

    { path: '/appliances/serials', element: ApplianceSerialsPage },
    { path: '/appliances/warranty-claims', element: ApplianceWarrantyClaimsPage },

    { path: '/appliances/reports', element: AppliancesReportsPage },
    { path: '/appliances/low-stock', element: AppliancesLowStockPage },
    { path: '/appliances/stock-report', element: AppliancesStockReportPage },
    { path: '/appliances/profit-report', element: AppliancesProfitReportPage },
  ],

  dashboardComponent: AppliancesDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🏠', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
      { value: 'unit', label: 'Unit', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'appliancesInstallations', label: 'Installation Scheduling', defaultEnabled: true },
    { key: 'appliancesServiceRequests', label: 'Service Requests', defaultEnabled: true },
    { key: 'appliancesTechnicians', label: 'Technician Management', defaultEnabled: true },
    { key: 'appliancesAmcContracts', label: 'AMC Contracts', defaultEnabled: true },
    { key: 'appliancesHeavyDelivery', label: 'Heavy Delivery Tracking', defaultEnabled: true },
  ],
};
