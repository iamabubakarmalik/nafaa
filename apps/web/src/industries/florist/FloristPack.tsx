import {
  LayoutDashboard, Flower2, Truck, Heart, Repeat, ShoppingBag, Sparkles,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import FloristDashboardPage from './pages/FloristDashboardPage';
import FloristProductsPage from './pages/FloristProductsPage';
import FloristProductWizardPage from './pages/FloristProductWizardPage';
import FloristProductDetailPage from './pages/FloristProductDetailPage';
import FloristPosPage from './pages/FloristPosPage';
import FloristOrdersPage from './pages/FloristOrdersPage';
import FloristWeddingsPage from './pages/FloristWeddingsPage';
import FloristSubscriptionsPage from './pages/FloristSubscriptionsPage';
import FloristFreshnessPage from './pages/FloristFreshnessPage';

export const FloristPack: IndustryPack = {
  id: 'florist',
  name: 'Florist / Flower Shop',
  shortName: 'Florist',
  emoji: '🌸',
  themeColor: '#ec4899',
  priority: 75,
  description:
    'Bouquets, wedding contracts, delivery scheduling, freshness tracking, subscriptions, occasion-based orders.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('FLORIST') || type.includes('FLOWER') ||
      type.includes('BOUQUET') || type.includes('WEDDING_DECOR')
    );
  },

  navGroups: [
    {
      label: 'Florist',
      icon: Flower2,
      emoji: '🌸',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/florist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/florist/orders', label: 'Orders', icon: ShoppingBag },
        { to: '/florist/deliveries', label: 'Today Deliveries', icon: Truck, badge: 'LIVE' },
        { to: '/florist/weddings', label: 'Weddings', icon: Heart },
        { to: '/florist/subscriptions', label: 'Subscriptions', icon: Repeat },
        { to: '/florist/freshness', label: 'Freshness', icon: Sparkles },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: FloristPosPage },

    { path: '/florist-products/new', element: FloristProductWizardPage },
    { path: '/florist-products/:id/edit', element: FloristProductWizardPage },
    { path: '/florist-products/:id', element: FloristProductDetailPage },
    { path: '/florist-products', element: FloristProductsPage },

    { path: '/florist', element: FloristDashboardPage },
    { path: '/florist/dashboard', element: FloristDashboardPage },

    { path: '/florist/orders', element: FloristOrdersPage },
    { path: '/florist/deliveries', element: FloristOrdersPage },
    { path: '/florist/weddings', element: FloristWeddingsPage },
    { path: '/florist/subscriptions', element: FloristSubscriptionsPage },
    { path: '/florist/freshness', element: FloristFreshnessPage },
  ],

  dashboardComponent: FloristDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🌸', group: 'Count' },
      { value: 'stem', label: 'Stem', hint: '🌹', group: 'Count' },
      { value: 'bunch', label: 'Bunch', hint: '💐', group: 'Count' },
      { value: 'dozen', label: 'Dozen', hint: '📦', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'floristFreshnessTracking', label: 'Freshness Tracking', defaultEnabled: true },
    { key: 'weddingContracts', label: 'Wedding Contracts', defaultEnabled: true },
    { key: 'floralSubscriptions', label: 'Recurring Subscriptions', defaultEnabled: true },
    { key: 'floristDeliveryScheduling', label: 'Delivery Time Slots', defaultEnabled: true },
    { key: 'floristCustomization', label: 'Custom Bouquets', defaultEnabled: true },
  ],
};
