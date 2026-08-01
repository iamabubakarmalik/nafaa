import {
  LayoutDashboard, Sparkles, Award, Package, Gift,
  Users, Palette, Droplet, Wind,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import CosmeticsDashboardPage from './pages/CosmeticsDashboardPage';
import CosmeticsProductsPage from './pages/CosmeticsProductsPage';
import CosmeticsProductWizardPage from './pages/CosmeticsProductWizardPage';
import CosmeticsProductDetailPage from './pages/CosmeticsProductDetailPage';
import CosmeticsPosPage from './pages/CosmeticsPosPage';
import CosmeticsBrandsPage from './pages/CosmeticsBrandsPage';
import CosmeticsBatchesPage from './pages/CosmeticsBatchesPage';
import CosmeticsGiftBundlesPage from './pages/CosmeticsGiftBundlesPage';
import CosmeticsLoyaltyPage from './pages/CosmeticsLoyaltyPage';
import BundleFormPage from './pages/BundleFormPage';

export const CosmeticsPack: IndustryPack = {
  id: 'cosmetics',
  name: 'Cosmetics & Beauty',
  shortName: 'Cosmetics',
  emoji: '💄',
  themeColor: '#ec4899',
  priority: 76,
  description:
    'Makeup, skincare, fragrances, haircare with shade matching, batch expiry tracking, gift bundles, and 5-tier loyalty program.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('COSMETIC') || type.includes('BEAUTY') ||
      type.includes('MAKEUP') || type.includes('SKINCARE') ||
      type.includes('FRAGRANCE') || type.includes('PERFUME')
    );
  },

  navGroups: [
    {
      label: 'Cosmetics',
      icon: Sparkles,
      emoji: '💄',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/cosmetics/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/cosmetics/brands', label: 'Brands', icon: Award },
        { to: '/cosmetics/batches', label: 'Batch Tracking', icon: Package, badge: 'EXP' },
        { to: '/cosmetics/bundles', label: 'Gift Bundles', icon: Gift },
        { to: '/cosmetics/loyalty', label: 'Loyalty Members', icon: Users },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: CosmeticsPosPage },

    { path: '/cosmetics-products/new', element: CosmeticsProductWizardPage },
    { path: '/cosmetics-products/:id/edit', element: CosmeticsProductWizardPage },
    { path: '/cosmetics-products/:id', element: CosmeticsProductDetailPage },
    { path: '/cosmetics-products', element: CosmeticsProductsPage },

    { path: '/cosmetics', element: CosmeticsDashboardPage },
    { path: '/cosmetics/dashboard', element: CosmeticsDashboardPage },

    { path: '/cosmetics/brands', element: CosmeticsBrandsPage },
    { path: '/cosmetics/batches', element: CosmeticsBatchesPage },

    { path: '/cosmetics/bundles', element: CosmeticsGiftBundlesPage },
    { path: '/cosmetics/bundles/new', element: BundleFormPage },
    { path: '/cosmetics/bundles/:id/edit', element: BundleFormPage },

    { path: '/cosmetics/loyalty', element: CosmeticsLoyaltyPage },
  ],

  dashboardComponent: CosmeticsDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '💄', group: 'Count' },
      { value: 'ml', label: 'Millilitres', hint: '💧', group: 'Volume' },
      { value: 'g', label: 'Grams', hint: '⚖️', group: 'Weight' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'cosmeticsBatchTracking', label: 'Batch & Expiry Tracking', defaultEnabled: true },
    { key: 'cosmeticsShadeMatcher', label: 'Shade Matcher', defaultEnabled: true },
    { key: 'cosmeticsFragranceRecommender', label: 'Fragrance Recommender', defaultEnabled: true },
    { key: 'cosmeticsGiftBundles', label: 'Gift Bundles', defaultEnabled: true },
    { key: 'cosmeticsLoyalty', label: 'Loyalty Program', defaultEnabled: true },
    { key: 'cosmeticsBirthdayOffers', label: 'Birthday Offer Automation', defaultEnabled: true },
  ],
};
