import {
  LayoutDashboard, Wrench, Award, Shield, Home, Package,
  Truck, CalendarClock, HardHat, FileSignature, Zap,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import AppliancesDashboardPage from './pages/AppliancesDashboardPage';
import AppliancesProductsPage from './pages/AppliancesProductsPage';
import ApplianceProductWizardPage from './pages/ApplianceProductWizardPage';
import ApplianceProductDetailPage from './pages/ApplianceProductDetailPage';
import AppliancesPosPage from './pages/AppliancesPosPage';
import ApplianceBrandsPage from './pages/ApplianceBrandsPage';
import InstallationsPage from './pages/InstallationsPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import TechniciansPage from './pages/TechniciansPage';
import TechnicianDetailPage from './pages/TechnicianDetailPage';
import AmcContractsPage from './pages/AmcContractsPage';
import AmcContractFormPage from './pages/AmcContractFormPage';
import DeliveriesPage from './pages/DeliveriesPage';

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
        { to: '/appliances/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/appliances/brands', label: 'Brands', icon: Award },
        { to: '/appliances/installations', label: 'Installations', icon: HardHat, badge: 'LIVE' },
        { to: '/appliances/service-requests', label: 'Service Requests', icon: Wrench },
        { to: '/appliances/technicians', label: 'Technicians', icon: Zap },
        { to: '/appliances/amc-contracts', label: 'AMC Contracts', icon: FileSignature },
        { to: '/appliances/deliveries', label: 'Deliveries', icon: Truck },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: AppliancesPosPage },

    { path: '/appliance-products/new', element: ApplianceProductWizardPage },
    { path: '/appliance-products/:id/edit', element: ApplianceProductWizardPage },
    { path: '/appliance-products/:id', element: ApplianceProductDetailPage },
    { path: '/appliance-products', element: AppliancesProductsPage },

    { path: '/appliances', element: AppliancesDashboardPage },
    { path: '/appliances/dashboard', element: AppliancesDashboardPage },

    { path: '/appliances/brands', element: ApplianceBrandsPage },

    { path: '/appliances/installations', element: InstallationsPage },
    { path: '/appliances/service-requests', element: ServiceRequestsPage },

    { path: '/appliances/technicians', element: TechniciansPage },
    { path: '/appliances/technicians/:id', element: TechnicianDetailPage },

    { path: '/appliances/amc-contracts', element: AmcContractsPage },
    { path: '/appliances/amc-contracts/new', element: AmcContractFormPage },
    { path: '/appliances/amc-contracts/:id/edit', element: AmcContractFormPage },

    { path: '/appliances/deliveries', element: DeliveriesPage },
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
