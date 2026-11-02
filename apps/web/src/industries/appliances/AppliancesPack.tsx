import { createElement } from 'react';
import { Navigate } from 'react-router-dom';
import { Barcode, BarChart3, CreditCard, FileSignature, HardHat, Home, Recycle, Shield, Truck, Wrench, Zap } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import AppliancesDashboard from './dashboard/AppliancesDashboard';
import InstallationsPage from './pages/InstallationsPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import TechniciansPage from './pages/TechniciansPage';
import TechnicianDetailPage from './pages/TechnicianDetailPage';
import AmcContractsPage from './pages/AmcContractsPage';
import AmcContractFormPage from './pages/AmcContractFormPage';
import DeliveriesPage from './pages/DeliveriesPage';
import ApplianceSerialsPage from './pages/ApplianceSerialsPage';
import ApplianceWarrantyClaimsPage from './pages/ApplianceWarrantyClaimsPage';
import TradeInsPage from './pages/TradeInsPage';
import QistPlanPage from './pages/QistPlanPage';
import LowStockPage from '@modules/inventory/low-stock/pages/LowStockPage';
// Qist plans run on the shared /emi-plans API; the list lives with the mobile pack for now.
// QistPlanPage is the shared plan page with the guarantor and the qist agreement print.
import EmiPlansPage from '@industries/mobile/pages/EmiPlansPage';
import { t } from '@core/i18n';

const JOBS_VIEW = 'service.jobs.view';
const JOBS_MANAGE = 'service.jobs.manage';
const SERIALS_VIEW = 'electronics.serials.view';
const WARRANTY_VIEW = 'electronics.warranty.view';
const KHATA_VIEW = 'khata.view';
const RETURNS_VIEW = 'returns.view';

/** The old appliance profit page now opens the shared profit report. */
const ProfitRedirect = () => createElement(Navigate, { to: '/profit-report', replace: true });

export const AppliancesPack: IndustryPack = {
  id: 'appliances',
  name: 'Home Appliances',
  shortName: t('Appliances'),
  emoji: '🏠',
  priority: 82,
  description:
    t('Serial and warranty by branch, installations, repairs, technicians, AMC contracts, heavy delivery, qist plans with guarantor, old appliance trade-ins and brand warranty claims.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('APPLIANCE') || type.includes('HOME_APPLIANCE') || type.includes('WHITE_GOODS');
  },

  navGroups: [
    {
      label: t('Appliances'),
      icon: Home,
      emoji: '🏠',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/appliances/installations', label: t('Installations'), icon: HardHat, permission: JOBS_VIEW },
        { to: '/appliances/service-requests', label: t('Repairs'), icon: Wrench, permission: JOBS_VIEW },
        { to: '/appliances/deliveries', label: t('Deliveries'), icon: Truck, permission: JOBS_VIEW },
        { to: '/appliances/technicians', label: t('Technicians'), icon: Zap, permission: JOBS_VIEW },
        { to: '/appliances/amc-contracts', label: t('AMC contracts'), icon: FileSignature, permission: JOBS_VIEW },
        { to: '/emi-plans', label: t('Instalment plans'), icon: CreditCard, permission: KHATA_VIEW },
        { to: '/appliances/serials', label: t('Serial register'), icon: Barcode, permission: SERIALS_VIEW },
        { to: '/appliances/trade-ins', label: t('Old items'), icon: Recycle, permission: RETURNS_VIEW },
        { to: '/appliances/warranty-claims', label: t('Warranty claims'), icon: Shield, permission: WARRANTY_VIEW },
        { to: '/reports', label: t('Reports'), icon: BarChart3 },
      ],
    },
  ],

  routes: [
    // Product pages are registered in App.tsx behind the products permissions.
    { path: '/appliances', element: AppliancesDashboard },
    { path: '/appliances/dashboard', element: AppliancesDashboard },
    { path: '/appliances/installations', element: InstallationsPage, permission: JOBS_VIEW },
    { path: '/appliances/service-requests', element: ServiceRequestsPage, permission: JOBS_VIEW },
    { path: '/appliances/technicians', element: TechniciansPage, permission: JOBS_VIEW },
    { path: '/appliances/technicians/:id', element: TechnicianDetailPage, permission: JOBS_VIEW },
    { path: '/appliances/amc-contracts', element: AmcContractsPage, permission: JOBS_VIEW },
    { path: '/appliances/amc-contracts/new', element: AmcContractFormPage, permission: JOBS_MANAGE },
    { path: '/appliances/amc-contracts/:id/edit', element: AmcContractFormPage, permission: JOBS_MANAGE },
    { path: '/appliances/deliveries', element: DeliveriesPage, permission: JOBS_VIEW },
    { path: '/appliances/serials', element: ApplianceSerialsPage, permission: SERIALS_VIEW },
    { path: '/appliances/warranty-claims', element: ApplianceWarrantyClaimsPage, permission: WARRANTY_VIEW },
    { path: '/emi-plans', element: EmiPlansPage, permission: KHATA_VIEW },
    { path: '/emi-plans/:id', element: QistPlanPage, permission: KHATA_VIEW },
    { path: '/appliances/trade-ins', element: TradeInsPage, permission: RETURNS_VIEW },
    { path: '/appliances/low-stock', element: LowStockPage },
    { path: '/appliances/profit-report', element: ProfitRedirect },
  ],

  dashboardComponent: AppliancesDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '🏠', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
      { value: 'unit', label: t('Unit'), hint: '📦', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'appliancesInstallations', label: t('Installation Scheduling'), defaultEnabled: true },
    { key: 'appliancesServiceRequests', label: t('Service Requests'), defaultEnabled: true },
    { key: 'appliancesTechnicians', label: t('Technician Management'), defaultEnabled: true },
    { key: 'appliancesAmcContracts', label: t('AMC Contracts'), defaultEnabled: true },
    { key: 'appliancesHeavyDelivery', label: t('Heavy Delivery Tracking'), defaultEnabled: true },
  ],
};
