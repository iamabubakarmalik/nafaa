import { LayoutDashboard, Footprints, Award, ArrowLeftRight, Ruler, HandMetal } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import ShoeDashboard from './dashboard/ShoeDashboard';
import ShoeProductsPage from './pages/ShoeProductsPage';
import ShoeProductWizardPage from './pages/ShoeProductWizardPage';
import ShoeProductDetailPage from './pages/ShoeProductDetailPage';
import ShoeBrandsPage from './pages/ShoeBrandsPage';
import ShoeSizeChartsPage from './pages/ShoeSizeChartsPage';
import ShoeTryOnPage from './pages/ShoeTryOnPage';
import ShoeExchangesPage from './pages/ShoeExchangesPage';
import { t } from '@core/i18n';
import { SHOE_KINDS } from './components/meta';

/**
 * Shoe store: articles by brand and season with size x colour pairs (each
 * pair its own barcode and stock) on the shared counter, Sale below MRP,
 * size-wise reorder, exchange of size / colour within the shop's days,
 * size requests for sizes not in stock, and size charts.
 */
export const ShoePack: IndustryPack = {
  id: 'shoe',
  name: 'Shoe Store & Footwear',
  shortName: t('Shoe Store'),
  emoji: '👟',
  priority: 76,
  description:
    t('Size aur rang ke pair (har pair ka barcode), brand / season, size-wise reorder, exchange, size farmaish, size chart.'),

  categoryKinds: SHOE_KINDS,

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('SHOE') || type.includes('FOOTWEAR');
  },

  navGroups: [
    {
      label: t('Shoe store'),
      icon: Footprints,
      emoji: '👟',
      color: '#f97316',
      order: 20,
      items: [
        { to: '/shoe/dashboard', label: t('Shoe dashboard'), icon: LayoutDashboard },
        { to: '/shoe/exchanges', label: t('Exchange'), icon: ArrowLeftRight, permission: PERMISSIONS.RETURNS_CREATE },
        { to: '/shoe/try-on', label: t('Size requests'), icon: HandMetal, permission: PERMISSIONS.POS_USE },
        { to: '/shoe/size-charts', label: t('Size charts'), icon: Ruler, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/shoe/brands', label: t('Brands'), icon: Award, permission: PERMISSIONS.BRANDS_VIEW },
      ],
    },
  ],

  routes: [
    { path: '/shoe-products/new', element: ShoeProductWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/shoe-products/:id/edit', element: ShoeProductWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/shoe-products/:id', element: ShoeProductDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/shoe-products', element: ShoeProductsPage, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/shoe', element: ShoeDashboard },
    { path: '/shoe/dashboard', element: ShoeDashboard },

    { path: '/shoe/brands', element: ShoeBrandsPage, permission: PERMISSIONS.BRANDS_VIEW },
    { path: '/shoe/size-charts', element: ShoeSizeChartsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/shoe/try-on', element: ShoeTryOnPage, permission: PERMISSIONS.POS_USE },
    { path: '/shoe/exchanges', element: ShoeExchangesPage, permission: PERMISSIONS.RETURNS_CREATE },
  ],

  dashboardComponent: ShoeDashboard,

  productForm: {
    defaultUnit: 'pair',
    unitOptions: [
      { value: 'pair', label: t('Pair'), hint: '👟', group: t('Footwear') },
      { value: 'pcs', label: t('Pieces'), hint: '🎁', group: t('Accessories') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Bulk') },
    ],
  },

  featureFlags: [
    { key: 'shoeSizeVariants', label: t('Size Variants with Box Location'), defaultEnabled: true },
    { key: 'shoeTryOn', label: t('Try-On Requests'), defaultEnabled: true },
    { key: 'shoeExchanges', label: t('Size/Color Exchanges'), defaultEnabled: true },
    { key: 'shoeSizeCharts', label: t('Size Conversion Charts'), defaultEnabled: true },
    { key: 'shoeBridalCollection', label: t('Bridal & Eid Collections'), defaultEnabled: true },
  ],
};
