import {
  LayoutDashboard, Footprints, Award, RefreshCw, ShoppingBag,
  Package, Ruler, HandMetal,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import ShoeDashboardPage from './pages/ShoeDashboardPage';
import ShoeProductsPage from './pages/ShoeProductsPage';
import ShoeProductWizardPage from './pages/ShoeProductWizardPage';
import ShoeProductDetailPage from './pages/ShoeProductDetailPage';
import ShoePosPage from './pages/ShoePosPage';
import ShoeBrandsPage from './pages/ShoeBrandsPage';
import ShoeSizeChartsPage from './pages/ShoeSizeChartsPage';
import ShoeTryOnPage from './pages/ShoeTryOnPage';
import ShoeExchangesPage from './pages/ShoeExchangesPage';

export const ShoePack: IndustryPack = {
  id: 'shoe',
  name: 'Shoe Store & Footwear',
  shortName: 'Shoe Store',
  emoji: '👟',
  themeColor: '#f97316',
  priority: 76,
  description:
    'Size variants with box+shelf tracking, try-on requests, exchanges, brand catalogue, size charts for men/women/kids/sports.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('SHOE') || type.includes('FOOTWEAR');
  },

  navGroups: [
    {
      label: 'Shoe Store',
      icon: Footprints,
      emoji: '👟',
      color: '#f97316',
      order: 20,
      items: [
        { to: '/shoe/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/shoe/brands', label: 'Brands', icon: Award },
        { to: '/shoe/size-charts', label: 'Size Charts', icon: Ruler },
        { to: '/shoe/try-on', label: 'Try-On Requests', icon: HandMetal, badge: 'NEW' },
        { to: '/shoe/exchanges', label: 'Exchanges', icon: RefreshCw },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: ShoePosPage },

    { path: '/shoe-products/new', element: ShoeProductWizardPage },
    { path: '/shoe-products/:id/edit', element: ShoeProductWizardPage },
    { path: '/shoe-products/:id', element: ShoeProductDetailPage },
    { path: '/shoe-products', element: ShoeProductsPage },

    { path: '/shoe', element: ShoeDashboardPage },
    { path: '/shoe/dashboard', element: ShoeDashboardPage },

    { path: '/shoe/brands', element: ShoeBrandsPage },
    { path: '/shoe/size-charts', element: ShoeSizeChartsPage },
    { path: '/shoe/try-on', element: ShoeTryOnPage },
    { path: '/shoe/exchanges', element: ShoeExchangesPage },
  ],

  dashboardComponent: ShoeDashboardPage,

  productForm: {
    defaultUnit: 'pair',
    unitOptions: [
      { value: 'pair', label: 'Pair', hint: '👟', group: 'Footwear' },
      { value: 'pcs', label: 'Pieces', hint: '🎁', group: 'Accessories' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Bulk' },
    ],
  },

  featureFlags: [
    { key: 'shoeSizeVariants', label: 'Size Variants with Box Location', defaultEnabled: true },
    { key: 'shoeTryOn', label: 'Try-On Requests', defaultEnabled: true },
    { key: 'shoeExchanges', label: 'Size/Color Exchanges', defaultEnabled: true },
    { key: 'shoeSizeCharts', label: 'Size Conversion Charts', defaultEnabled: true },
    { key: 'shoeBridalCollection', label: 'Bridal & Eid Collections', defaultEnabled: true },
  ],
};
