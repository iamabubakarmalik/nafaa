import { Navigate } from 'react-router-dom';
import { Award, CalendarClock, Gift, Heart, LayoutDashboard, Sparkles, TestTube2 } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import CosmeticsDashboard from './dashboard/CosmeticsDashboard';
import CosmeticsProductWizardPage from './pages/CosmeticsProductWizardPage';
import CosmeticsProductDetailPage from './pages/CosmeticsProductDetailPage';
import CosmeticsExpiryPage from './pages/CosmeticsExpiryPage';
import CosmeticsTestersPage from './pages/CosmeticsTestersPage';
import { t } from '@core/i18n';

/* Old cosmetics addresses now open the shared pages that replaced them. */
const ToProducts = () => <Navigate to="/products" replace />;
const ToBrands = () => <Navigate to="/brands" replace />;
const ToExpiry = () => <Navigate to="/cosmetics/expiry" replace />;
const ToDeals = () => <Navigate to="/combos" replace />;
const ToLoyalty = () => <Navigate to="/loyalty" replace />;

/**
 * Cosmetics and beauty shop: brands, shades and sizes as variants, batch
 * expiry (sold earliest first), testers written off from stock, deals as
 * combos and customer loyalty — all on the shared products, counter,
 * brands, combos, loyalty and damage pages.
 */
export const CosmeticsPack: IndustryPack = {
  id: 'cosmetics',
  name: 'Cosmetics & Beauty',
  shortName: t('Cosmetics'),
  emoji: '💄',
  priority: 46,
  description: t('Makeup, skincare, fragrance and haircare: brands, shades, batch expiry, testers, deals and loyalty.'),

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
      label: t('Cosmetics'),
      icon: Sparkles,
      emoji: '💄',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/cosmetics/dashboard', label: t('Cosmetics dashboard'), icon: LayoutDashboard },
        { to: '/cosmetics/expiry', label: t('Expiry'), icon: CalendarClock, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/cosmetics/testers', label: t('Testers'), icon: TestTube2, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/brands', label: t('Brands'), icon: Award, permission: PERMISSIONS.BRANDS_VIEW },
        { to: '/combos', label: t('Deals / gift sets'), icon: Gift, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/loyalty', label: t('Loyalty'), icon: Heart, permission: PERMISSIONS.LOYALTY_VIEW },
      ],
    },
  ],

  routes: [
    { path: '/cosmetics-products/new', element: CosmeticsProductWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/cosmetics-products/:id/edit', element: CosmeticsProductWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/cosmetics-products/:id', element: CosmeticsProductDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/cosmetics-products', element: ToProducts },

    { path: '/cosmetics', element: CosmeticsDashboard },
    { path: '/cosmetics/dashboard', element: CosmeticsDashboard },
    { path: '/cosmetics/expiry', element: CosmeticsExpiryPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/cosmetics/testers', element: CosmeticsTestersPage, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/cosmetics/brands', element: ToBrands },
    { path: '/cosmetics/batches', element: ToExpiry },
    { path: '/cosmetics/bundles', element: ToDeals },
    { path: '/cosmetics/bundles/new', element: ToDeals },
    { path: '/cosmetics/bundles/:id/edit', element: ToDeals },
    { path: '/cosmetics/gift-bundles', element: ToDeals },
    { path: '/cosmetics/gift-bundles/new', element: ToDeals },
    { path: '/cosmetics/gift-bundles/:id/edit', element: ToDeals },
    { path: '/cosmetics/loyalty', element: ToLoyalty },
  ],

  dashboardComponent: CosmeticsDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Piece'), hint: '💄', group: t('Count') },
      { value: 'ml', label: 'ml', hint: '💧', group: t('Volume') },
      { value: 'g', label: t('Gram'), hint: '⚖️', group: t('Weight') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'cosmeticsBatchTracking', label: t('Batch aur expiry'), defaultEnabled: true },
    { key: 'cosmeticsTesters', label: t('Testers'), defaultEnabled: true },
  ],
};
