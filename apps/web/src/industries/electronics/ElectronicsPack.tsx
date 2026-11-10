// apps/web/src/industries/electronics/ElectronicsPack.tsx
import { Barcode, Cpu, Layers, Shield } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import ElectronicsDashboard from './dashboard/ElectronicsDashboard';
import ElectronicsProducts from './products/ElectronicsProducts';
import ElectronicsProductEditor from './products/ElectronicsProductEditor';
import ElectronicsProductDetail from './products/ElectronicsProductDetail';
import ElectronicsPos from './pos/ElectronicsPos';
import WarrantyClaimsPage from './pages/WarrantyClaimsPage';
import SerialTrackingPage from './pages/SerialTrackingPage';
import ElectronicsBundlesPage from './pages/ElectronicsBundlesPage';
import BundleFormPage from './pages/BundleFormPage';
import { CATEGORY_GROUPS, CATEGORY_META } from './constants';
import { t } from '@core/i18n';

/**
 * Electronics & Gadgets pack — STRICT MATCHING
 *
 * Activates ONLY for electronics/gadgets/tech business types.
 * Does NOT match MOBILE / PHONE (those belong to MobilePack).
 */
export const ElectronicsPack: IndustryPack = {
  id: 'electronics',
  name: 'Electronics & Gadgets',
  shortName: t('Electronics'),
  emoji: '🔌',
  priority: 62,
  categoryKinds: CATEGORY_GROUPS.flatMap((g) => g.items).filter((c) => c !== 'OTHER').map((c) => ({ value: c, label: CATEGORY_META[c].label })),
  description:
    t('Serial/IMEI tracking, warranty claims, brand management, tech specs, bundles, condition grading.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase().trim();

    // STRICT: only match electronics/gadgets/tech
    const ELECTRONICS_TYPES = [
      'ELECTRONICS',
      'ELECTRONICS_STORE',
      'ELECTRONICS_SHOP',
      'GADGETS',
      'GADGET_SHOP',
      'GADGET_STORE',
      'TECH',
      'TECH_STORE',
      'TECH_ACCESSORIES',
      'CONSUMER_ELECTRONICS',
    ];

    if (ELECTRONICS_TYPES.includes(type)) return true;

    // Explicitly reject mobile-specific types
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
    if (MOBILE_TYPES.includes(type)) return false;

    return false;
  },

  navGroups: [
    {
      label: t('Electronics extras'),
      icon: Cpu,
      emoji: '🔌',
      color: '#3b82f6',
      order: 20,
      items: [
        { to: '/electronics/serials', label: t('Serial / IMEI'), icon: Barcode },
        { to: '/electronics/warranty-claims', label: t('Warranty claims'), icon: Shield },
        { to: '/electronics/bundles', label: t('Bundles'), icon: Layers },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: ElectronicsPos },

    { path: '/electronics-products/new', element: ElectronicsProductEditor },
    { path: '/electronics-products/:id/edit', element: ElectronicsProductEditor },
    { path: '/electronics-products/:id', element: ElectronicsProductDetail },
    { path: '/electronics-products', element: ElectronicsProducts },

    { path: '/electronics', element: ElectronicsDashboard },
    { path: '/electronics/dashboard', element: ElectronicsDashboard },

    { path: '/electronics/serials', element: SerialTrackingPage },
    { path: '/electronics/warranty-claims', element: WarrantyClaimsPage },

    { path: '/electronics/bundles', element: ElectronicsBundlesPage },
    { path: '/electronics/bundles/new', element: BundleFormPage },
    { path: '/electronics/bundles/:id/edit', element: BundleFormPage },
  ],

  dashboardComponent: ElectronicsDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '📱', group: t('Count') },
      { value: 'pack', label: t('Pack'), hint: '📦', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'electronicsSerialTracking', label: t('Serial/IMEI Tracking'), defaultEnabled: true },
    { key: 'electronicsWarrantyClaims', label: t('Warranty Claims'), defaultEnabled: true },
    { key: 'electronicsBundles', label: t('Product Bundles'), defaultEnabled: true },
    { key: 'electronicsConditionGrading', label: t('Used/Refurbished Grading'), defaultEnabled: true },
  ],
};
