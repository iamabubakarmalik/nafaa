// apps/web/src/industries/mobile/MobilePack.tsx
import { Smartphone, RefreshCw, Wrench, CreditCard } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

// Pages
import GlobalImeiInventoryPage from './pages/GlobalImeiInventoryPage';
import UsedPhonesPage from './pages/UsedPhonesPage';
import UsedPhoneFormPage from './pages/UsedPhoneFormPage';
import UsedPhoneDetailPage from './pages/UsedPhoneDetailPage';
import EmiPlansPage from './pages/EmiPlansPage';
import EmiPlanDetailPage from './pages/EmiPlanDetailPage';
import RepairTicketsPage from './pages/RepairTicketsPage';
import RepairTicketFormPage from './pages/RepairTicketFormPage';
import RepairTicketDetailPage from './pages/RepairTicketDetailPage';
import MobileProductWizardPage from './pages/MobileProductWizardPage';
import MobileProductDetailPage from './pages/MobileProductDetailPage';
import MobileDashboard from './dashboard/MobileDashboard';

const IMEI_VIEW = 'mobile.imei.view';
const IMEI_MANAGE = 'mobile.imei.manage';
const REPAIRS_VIEW = 'mobile.repairs.view';
const REPAIRS_MANAGE = 'mobile.repairs.manage';
const KHATA_VIEW = 'khata.view';

/**
 * Mobile industry pack — STRICT MATCHING
 *
 * Activates ONLY for mobile-specific business types.
 * Does NOT match ELECTRONICS / GADGETS / TECH (those belong to ElectronicsPack).
 */
export const MobilePack: IndustryPack = {
  id: 'mobile',
  name: 'Mobile Shop',
  shortName: 'Mobile',
  emoji: '📱',
  priority: 80,
  description:
    'IMEI stock, PTA, used phone khareed aur trade-in, repair job cards, qist plans.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase().trim();

    // STRICT: only match mobile-specific business types
    const MOBILE_TYPES = [
      'MOBILE',
      'MOBILE_SHOP',
      'MOBILE_STORE',
      'CELLPHONE',
      'CELLPHONE_SHOP',
      'SMARTPHONE_SHOP',
      'PHONE_SHOP',
      'PHONE_STORE',
    ];

    if (MOBILE_TYPES.includes(type)) return true;

    // Explicitly reject electronics/gadgets/tech types
    // (they belong to ElectronicsPack)
    const isElectronicsType =
      type.includes('ELECTRONIC') ||
      type.includes('GADGET') ||
      type.includes('TECH') ||
      type === 'CONSUMER_ELECTRONICS';
    if (isElectronicsType) return false;

    // Non-electronics business that specifically enabled IMEI feature
    // (e.g. general retail that also sells phones)
    const features = (tenant.businessFeatures ?? {}) as Record<string, boolean>;
    return features.imei === true;
  },

  navGroups: [
    {
      label: 'Mobile Extras',
      icon: Smartphone,
      emoji: '📱',
      color: '#2563eb',
      order: 20,
      items: [
        { to: '/imei-inventory', label: 'IMEI stock', icon: Smartphone, permission: IMEI_VIEW },
        { to: '/used-phones', label: 'Used phones', icon: RefreshCw, permission: IMEI_VIEW },
        { to: '/repair-tickets', label: 'Repairs', icon: Wrench, permission: REPAIRS_VIEW },
        { to: '/emi-plans', label: 'Qist plans', icon: CreditCard, permission: KHATA_VIEW },
      ],
    },
  ],

  routes: [
    // Product editor and detail (the shared pages through mobile config)
    { path: '/mobile-products/new', element: MobileProductWizardPage, permission: 'products.create' },
    { path: '/mobile-products/:id/edit', element: MobileProductWizardPage, permission: 'products.edit' },
    { path: '/mobile-products/:id', element: MobileProductDetailPage, permission: 'products.view' },

    { path: '/imei-inventory', element: GlobalImeiInventoryPage, permission: IMEI_VIEW },
    // Same page scoped to one product
    { path: '/products/:id/imei', element: GlobalImeiInventoryPage, permission: IMEI_VIEW },

    { path: '/used-phones', element: UsedPhonesPage, permission: IMEI_VIEW },
    { path: '/used-phones/new', element: UsedPhoneFormPage, permission: IMEI_MANAGE },
    { path: '/used-phones/:id/edit', element: UsedPhoneFormPage, permission: IMEI_MANAGE },
    { path: '/used-phones/:id', element: UsedPhoneDetailPage, permission: IMEI_VIEW },

    { path: '/repair-tickets', element: RepairTicketsPage, permission: REPAIRS_VIEW },
    { path: '/repair-tickets/new', element: RepairTicketFormPage, permission: REPAIRS_MANAGE },
    { path: '/repair-tickets/:id/edit', element: RepairTicketFormPage, permission: REPAIRS_MANAGE },
    { path: '/repair-tickets/:id', element: RepairTicketDetailPage, permission: REPAIRS_VIEW },

    { path: '/emi-plans', element: EmiPlansPage, permission: KHATA_VIEW },
    { path: '/emi-plans/:id', element: EmiPlanDetailPage, permission: KHATA_VIEW },
  ],

  dashboardComponent: MobileDashboard,

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
