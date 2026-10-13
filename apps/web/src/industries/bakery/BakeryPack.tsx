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

/**
 * Bakery / Cake Shop / Sweet Shop industry pack.
 * Cake customizer, production planning, freshness tracking,
 * ingredient inventory, bulk wedding / event orders.
 */
export const BakeryPack: IndustryPack = {
  id: 'bakery',
  name: 'Bakery / Cake Shop',
  shortName: 'Bakery',
  emoji: '🍰',
  priority: 72,
  description:
    'Cake customizer, production batches, freshness / expiry, ingredient inventory, wedding & event bulk orders.',

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
      label: 'Bakery Extras',
      icon: Cake,
      emoji: '🍰',
      color: '#f472b6',
      order: 20,
      items: [
        { to: '/bakery/cake-orders/new', label: 'Naya cake order', icon: Cake },
        { to: '/bakery/cake-orders', label: 'Cake Orders', icon: Calendar },
        { to: '/bakery/production', label: 'Baking', icon: ChefHat },
        { to: '/bakery/ingredients', label: 'Raw material', icon: Wheat },
        { to: '/bakery/freshness', label: 'Freshness aur waste', icon: Timer },
        { to: '/bakery/bulk-orders', label: 'Bulk Orders', icon: ShoppingBag },
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
      { value: 'pcs', label: 'Piece', hint: '🧁', group: 'Count' },
      { value: 'slice', label: 'Slice', hint: '🍰', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Pack' },
      { value: 'tray', label: 'Tray', hint: '🥮', group: 'Pack' },
      { value: 'dozen', label: 'Dozen (12)', hint: '📦', group: 'Pack' },
      { value: 'half-dozen', label: 'Half Dozen (6)', hint: '📦', group: 'Pack' },
      { value: 'pound', label: 'Pound (cake)', hint: '⚖️', group: 'Weight' },
      { value: 'kg', label: 'Kilogram', hint: '⚖️', group: 'Weight' },
      { value: 'gram', label: 'Gram', hint: '⚖️', group: 'Weight' },
      { value: 'loaf', label: 'Loaf (bread)', hint: '🍞', group: 'Bread' },
      { value: 'liter', label: 'Liter', hint: '🥛', group: 'Volume' },
      { value: 'plate', label: 'Plate (sweets)', hint: '🍽️', group: 'Serving' },
      { value: 'maan', label: 'Maan (bulk mithai)', hint: '⚖️', group: 'Weight' },
      { value: 'seer', label: 'Seer', hint: '⚖️', group: 'Weight' },
    ],
  },

  featureFlags: [
    { key: 'bakeryCakeCustomizer', label: 'Cake Customizer', defaultEnabled: true },
    { key: 'bakeryProduction', label: 'Production Batches', defaultEnabled: true },
    { key: 'bakeryFreshness', label: 'Freshness / Expiry', defaultEnabled: true },
    { key: 'bakeryIngredients', label: 'Ingredient Inventory', defaultEnabled: true },
    { key: 'bakeryBulkOrders', label: 'Wedding / Event Orders', defaultEnabled: true },
    { key: 'expiry', label: 'Batch & Expiry Tracking', defaultEnabled: true },
  ],
};
