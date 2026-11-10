import {
  LayoutDashboard, Flower2, Truck, Heart, Repeat, ShoppingBag, Sparkles,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import FloristDashboard from './dashboard/FloristDashboard';
import FloristProductsPage from './pages/FloristProductsPage';
import FloristProductWizardPage from './pages/FloristProductWizardPage';
import FloristProductDetailPage from './pages/FloristProductDetailPage';
import FloristPosPage from './pages/FloristPosPage';
import FloristOrdersPage from './pages/FloristOrdersPage';
import FloristWeddingsPage from './pages/FloristWeddingsPage';
import FloristSubscriptionsPage from './pages/FloristSubscriptionsPage';
import FloristFreshnessPage from './pages/FloristFreshnessPage';
import { t } from '@core/i18n';
import { CATEGORY_GROUPS as FLORIST_CATEGORY_GROUPS } from './lib/meta';

export const FloristPack: IndustryPack = {
  id: 'florist',
  name: 'Florist / Flower Shop',
  shortName: t('Florist'),
  emoji: '🌸',
  priority: 75,
  categoryKinds: FLORIST_CATEGORY_GROUPS.flatMap((g) => g.items).filter(([v]) => v !== 'OTHER').map(([value, label]) => ({ value, label })),
  description:
    t('Bouquets, wedding contracts, delivery scheduling, freshness tracking, subscriptions, occasion-based orders.'),

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
      label: t('Florist'),
      icon: Flower2,
      emoji: '🌸',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/florist/dashboard', label: t('Dashboard'), icon: LayoutDashboard },
        { to: '/florist/orders', label: t('Orders'), icon: ShoppingBag },
        { to: '/florist/deliveries', label: t('Today\'s deliveries'), icon: Truck },
        { to: '/florist/weddings', label: t('Wedding contracts'), icon: Heart },
        { to: '/florist/subscriptions', label: t('Subscriptions'), icon: Repeat },
        { to: '/florist/freshness', label: t('Freshness'), icon: Sparkles },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: FloristPosPage },

    { path: '/florist-products/new', element: FloristProductWizardPage },
    { path: '/florist-products/:id/edit', element: FloristProductWizardPage },
    { path: '/florist-products/:id', element: FloristProductDetailPage },
    { path: '/florist-products', element: FloristProductsPage },

    { path: '/florist', element: FloristDashboard },
    { path: '/florist/dashboard', element: FloristDashboard },

    { path: '/florist/orders', element: FloristOrdersPage },
    { path: '/florist/deliveries', element: FloristOrdersPage },
    { path: '/florist/weddings', element: FloristWeddingsPage },
    { path: '/florist/subscriptions', element: FloristSubscriptionsPage },
    { path: '/florist/freshness', element: FloristFreshnessPage },
  ],

  dashboardComponent: FloristDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '🌸', group: t('Count') },
      { value: 'stem', label: t('Stem'), hint: '🌹', group: t('Count') },
      { value: 'bunch', label: t('Bunch'), hint: '💐', group: t('Count') },
      { value: 'dozen', label: t('Dozen'), hint: '📦', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'floristFreshnessTracking', label: t('Freshness Tracking'), defaultEnabled: true },
    { key: 'weddingContracts', label: t('Wedding Contracts'), defaultEnabled: true },
    { key: 'floralSubscriptions', label: t('Recurring Subscriptions'), defaultEnabled: true },
    { key: 'floristDeliveryScheduling', label: t('Delivery Time Slots'), defaultEnabled: true },
    { key: 'floristCustomization', label: t('Custom Bouquets'), defaultEnabled: true },
  ],
};
