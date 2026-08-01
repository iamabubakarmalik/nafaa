import {
  LayoutDashboard, Sparkles, Zap, Award, Shield, Cpu, Package,
  Barcode, BadgeCheck, Layers,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import ElectronicsDashboardPage from './pages/ElectronicsDashboardPage';
import ElectronicsProductsPage from './pages/ElectronicsProductsPage';
import ElectronicsProductWizardPage from './pages/ElectronicsProductWizardPage';
import ElectronicsProductDetailPage from './pages/ElectronicsProductDetailPage';
import ElectronicsPosPage from './pages/ElectronicsPosPage';
import ElectronicsBrandsPage from './pages/ElectronicsBrandsPage';
import WarrantyClaimsPage from './pages/WarrantyClaimsPage';
import SerialTrackingPage from './pages/SerialTrackingPage';
import ElectronicsBundlesPage from './pages/ElectronicsBundlesPage';
import BundleFormPage from './pages/BundleFormPage';

export const ElectronicsPack: IndustryPack = {
  id: 'electronics',
  name: 'Electronics & Gadgets',
  shortName: 'Electronics',
  emoji: '🔌',
  themeColor: '#3b82f6',
  priority: 80,
  description:
    'Serial/IMEI tracking, warranty claims, brand management, tech specs, bundles, condition grading.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('ELECTRONICS') ||
      type.includes('GADGET') ||
      type.includes('MOBILE') ||
      type.includes('TECH')
    );
  },

  navGroups: [
    {
      label: 'Electronics',
      icon: Cpu,
      emoji: '🔌',
      color: '#3b82f6',
      order: 20,
      items: [
        { to: '/electronics/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/electronics/brands', label: 'Brands', icon: Award },
        { to: '/electronics/serials', label: 'Serial/IMEI Track', icon: Barcode },
        { to: '/electronics/warranty-claims', label: 'Warranty Claims', icon: Shield, badge: 'NEW' },
        { to: '/electronics/bundles', label: 'Bundles', icon: Layers },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: ElectronicsPosPage },

    { path: '/electronics-products/new', element: ElectronicsProductWizardPage },
    { path: '/electronics-products/:id/edit', element: ElectronicsProductWizardPage },
    { path: '/electronics-products/:id', element: ElectronicsProductDetailPage },
    { path: '/electronics-products', element: ElectronicsProductsPage },

    { path: '/electronics', element: ElectronicsDashboardPage },
    { path: '/electronics/dashboard', element: ElectronicsDashboardPage },

    { path: '/electronics/brands', element: ElectronicsBrandsPage },

    { path: '/electronics/serials', element: SerialTrackingPage },
    { path: '/electronics/warranty-claims', element: WarrantyClaimsPage },

    { path: '/electronics/bundles', element: ElectronicsBundlesPage },
    { path: '/electronics/bundles/new', element: BundleFormPage },
    { path: '/electronics/bundles/:id/edit', element: BundleFormPage },
  ],

  dashboardComponent: ElectronicsDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '📱', group: 'Count' },
      { value: 'pack', label: 'Pack', hint: '📦', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'electronicsSerialTracking', label: 'Serial/IMEI Tracking', defaultEnabled: true },
    { key: 'electronicsWarrantyClaims', label: 'Warranty Claims', defaultEnabled: true },
    { key: 'electronicsBundles', label: 'Product Bundles', defaultEnabled: true },
    { key: 'electronicsConditionGrading', label: 'Used/Refurbished Grading', defaultEnabled: true },
  ],
};
