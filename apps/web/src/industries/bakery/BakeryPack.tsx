import {
  Cake, Calendar, ChefHat, Wheat, Timer, ShoppingBag,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import CakeCustomizerPage from './pages/CakeCustomizerPage';
import CakeOrdersPage from './pages/CakeOrdersPage';
import CakeOrderDetailPage from './pages/CakeOrderDetailPage';
import ProductionPage from './pages/ProductionPage';
import IngredientsPage from './pages/IngredientsPage';
import FreshnessPage from './pages/FreshnessPage';
import BakeryBulkOrdersPage from './pages/BakeryBulkOrdersPage';
import BakeryProductEditor from './products/BakeryProductEditor';
import BakeryProducts from './products/BakeryProducts';
import BakeryDashboard from './dashboard/BakeryDashboard';
import BakeryBulkOrderFormPage from './pages/BakeryBulkOrderFormPage';
import { t } from '@core/i18n';
import { CATEGORIES } from './api/constants';

/**
 * Bakery / Cake Shop / Sweet Shop industry pack.
 * Cake customizer, production planning, freshness tracking,
 * ingredient inventory, bulk wedding / event orders.
 */
export const BakeryPack: IndustryPack = {
  id: 'bakery',
  name: 'Bakery / Cake Shop',
  shortName: t('Bakery'),
  emoji: '🍰',
  priority: 72,
  description:
    t('Cake customizer, production batches, freshness / expiry, ingredient inventory, wedding & event bulk orders.'),

  categoryKinds: CATEGORIES.filter((c) => c.value !== 'OTHER').map((c) => ({ value: c.value, label: c.label })),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('BAKERY') ||
      type.includes('CAKE') ||
      type.includes('SWEET') ||
      type.includes('MITHAI') ||
      type.includes('CONFECTIONERY') ||
      type.includes('PATISSERIE') ||
      type.includes('DESSERT')
    );
  },

  navGroups: [
    {
      label: t('Bakery extras'),
      icon: Cake,
      emoji: '🍰',
      color: '#f472b6',
      order: 20,
      items: [
        { to: '/bakery/cake-orders/new', label: t('New cake order'), icon: Cake },
        { to: '/bakery/cake-orders', label: t('Cake orders'), icon: Calendar },
        { to: '/bakery/production', label: t('Baking'), icon: ChefHat },
        { to: '/bakery/ingredients', label: t('Raw materials'), icon: Wheat },
        { to: '/bakery/freshness', label: t('Freshness & waste'), icon: Timer },
        { to: '/bakery/bulk-orders', label: t('Bulk orders'), icon: ShoppingBag },
      ],
    },
  ],

  routes: [
    { path: '/bakery/products/new', element: BakeryProductEditor },
    /* Dono safhe naye wale par. Pehle ye purane BakeryDashboardPage
       par jate thay, jabke naya V2 sirf /dashboard se khulta tha —
       yani sidebar se hamesha purana hi milta. */
    { path: '/bakery', element: BakeryDashboard },
    { path: '/bakery/dashboard', element: BakeryDashboard },
    { path: '/bakery/cake-orders/new', element: CakeCustomizerPage },
    { path: '/bakery/cake-orders/:id/edit', element: CakeCustomizerPage },
    { path: '/bakery/cake-orders/:id', element: CakeOrderDetailPage },
    { path: '/bakery/cake-orders', element: CakeOrdersPage },
    /* Purana BakeryProductsPage sirf wo cheezein dikhata tha jin ka
       bakery profile bana ho — Lays aur bottle us list me aate hi
       nahi thay. Naya safha saara maal laata hai. */
    { path: '/bakery/products', element: BakeryProducts },
    { path: '/bakery/production', element: ProductionPage },
    { path: '/bakery/ingredients', element: IngredientsPage },
    { path: '/bakery/freshness', element: FreshnessPage },
    { path: '/bakery/bulk-orders/new', element: BakeryBulkOrderFormPage },
    { path: '/bakery/bulk-orders/:id/edit', element: BakeryBulkOrderFormPage },
    { path: '/bakery/bulk-orders', element: BakeryBulkOrdersPage },
  ],

  dashboardComponent: BakeryDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Piece'), hint: '🧁', group: t('Count') },
      { value: 'slice', label: t('Slice'), hint: '🍰', group: t('Count') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Pack') },
      { value: 'tray', label: t('Tray'), hint: '🥮', group: t('Pack') },
      { value: 'dozen', label: t('Dozen (12)'), hint: '📦', group: t('Pack') },
      { value: 'half-dozen', label: t('Half Dozen (6)'), hint: '📦', group: t('Pack') },
      { value: 'pound', label: t('Pound (cake)'), hint: '⚖️', group: t('Weight') },
      { value: 'kg', label: t('Kilogram'), hint: '⚖️', group: t('Weight') },
      { value: 'gram', label: t('Gram'), hint: '⚖️', group: t('Weight') },
      { value: 'loaf', label: t('Loaf (bread)'), hint: '🍞', group: t('Bread') },
      { value: 'liter', label: t('Liter'), hint: '🥛', group: t('Volume') },
      { value: 'plate', label: t('Plate (sweets)'), hint: '🍽️', group: t('Serving') },
      { value: 'maan', label: t('Maan (bulk mithai)'), hint: '⚖️', group: t('Weight') },
      { value: 'seer', label: t('Seer'), hint: '⚖️', group: t('Weight') },
    ],
  },

  featureFlags: [
    { key: 'bakeryCakeCustomizer', label: t('Cake Customizer'), defaultEnabled: true },
    { key: 'bakeryProduction', label: t('Production Batches'), defaultEnabled: true },
    { key: 'bakeryFreshness', label: t('Freshness / Expiry'), defaultEnabled: true },
    { key: 'bakeryIngredients', label: t('Ingredient Inventory'), defaultEnabled: true },
    { key: 'bakeryBulkOrders', label: t('Wedding / Event Orders'), defaultEnabled: true },
    { key: 'expiry', label: t('Batch & Expiry Tracking'), defaultEnabled: true },
  ],
};
