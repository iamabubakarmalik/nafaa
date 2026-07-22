import { Smartphone, RefreshCw, Wrench, CreditCard, BarChart3, Sparkles } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

// Pages
import ImeiInventoryPage from './pages/ImeiInventoryPage';
import GlobalImeiInventoryPage from './pages/GlobalImeiInventoryPage';
import UsedPhonesPage from './pages/UsedPhonesPage';
import MobileReportsPage from './pages/MobileReportsPage';
import EmiPlansPage from './pages/EmiPlansPage';
import EmiPlanDetailPage from './pages/EmiPlanDetailPage';
import RepairTicketsPage from './pages/RepairTicketsPage';
import RepairTicketDetailPage from './pages/RepairTicketDetailPage';
import MobileProductWizardPage from './pages/MobileProductWizardPage';
import MobileProductDetailPage from './pages/MobileProductDetailPage';

/**
 * Mobile / Electronics industry pack.
 * IMEI tracking, used phones, repairs, EMI plans.
 */
export const MobilePack: IndustryPack = {
  id: 'mobile',
  name: 'Mobile / Electronics',
  shortName: 'Mobile',
  emoji: '📱',
  themeColor: '#2563eb',
  priority: 80,
  description:
    'IMEI tracking, PTA compliance, used phone trade-in, repair tickets, EMI installment plans.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    if (type) {
      return (
        type.includes('MOBILE') ||
        type.includes('PHONE') ||
        type.includes('ELECTRONICS')
      );
    }
    const features = (tenant.businessFeatures ?? {}) as Record<string, boolean>;
    return features.imei === true;
  },

  navGroups: [
    {
      label: 'Mobile Industry',
      icon: Smartphone,
      emoji: '📱',
      color: '#2563eb',
      order: 20,
      items: [
        { to: '/mobile-products/new', label: '+ Add Mobile Product', icon: Sparkles, badge: 'FAST' },
        { to: '/imei-inventory', label: 'IMEI Inventory', icon: Smartphone },
        { to: '/used-phones', label: 'Used Phones', icon: RefreshCw },
        { to: '/repair-tickets', label: 'Repairs', icon: Wrench },
        { to: '/emi-plans', label: 'EMI Plans', icon: CreditCard },
        { to: '/mobile-reports', label: 'Mobile Reports', icon: BarChart3 },
      ],
    },
  ],

  routes: [
    // Wizard — highest priority mobile routes
    { path: '/mobile-products/new', element: MobileProductWizardPage },
    { path: '/mobile-products/:id/edit', element: MobileProductWizardPage },
    // Detail view — comes AFTER edit so /:id/edit isn\'t swallowed
    { path: '/mobile-products/:id', element: MobileProductDetailPage },

    // Existing pages
    { path: '/imei-inventory', element: GlobalImeiInventoryPage },
    { path: '/products/:id/imei', element: ImeiInventoryPage },
    { path: '/used-phones', element: UsedPhonesPage },
    { path: '/repair-tickets', element: RepairTicketsPage },
    { path: '/repair-tickets/:id', element: RepairTicketDetailPage },
    { path: '/emi-plans', element: EmiPlansPage },
    { path: '/emi-plans/:id', element: EmiPlanDetailPage },
    { path: '/mobile-reports', element: MobileReportsPage },
  ],

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🔢', group: 'Count' },
      { value: 'unit', label: 'Units', hint: '📦', group: 'Count' },
      { value: 'set', label: 'Set', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'imei', label: 'IMEI Tracking', description: 'Track each phone by IMEI', defaultEnabled: true },
    { key: 'ptaCompliance', label: 'PTA Compliance', description: 'Track PTA status per IMEI', defaultEnabled: true },
    { key: 'usedPhones', label: 'Used Phones', description: 'Trade-in & resale workflow', defaultEnabled: true },
    { key: 'repairs', label: 'Repair Tickets', description: 'Service jobs with parts & payments', defaultEnabled: true },
    { key: 'emi', label: 'EMI Plans', description: 'Installment sales', defaultEnabled: true },
  ],
};
