import { ChefHat, ShoppingBag, Utensils, Sparkles, Timer, Bike, Zap, BookOpen, Flame, MapPin, LayoutDashboard } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import RestaurantDashboard from './dashboard/RestaurantDashboard';
import RestaurantOrdersPage from './pages/RestaurantOrdersPage';
import NewOrderPage from './pages/NewOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import TablesLayoutPage from './pages/TablesLayoutPage';
import RestaurantProductsListPage from './pages/RestaurantProductsListPage';
import ModifiersPage from './pages/ModifiersPage';
import KotDisplayPage from './pages/KotDisplayPage';
import RidersPage from './pages/RidersPage';
import HappyHoursPage from './pages/HappyHoursPage';
import RecipesPage from './pages/RecipesPage';
import StationsPage from './pages/StationsPage';
import DeliveryTrackingPage from './pages/DeliveryTrackingPage';
import RestaurantProductEditor from './products/RestaurantProductEditor';
import RestaurantProductDetail from './products/RestaurantProductDetail';
import { restaurantReceiptRows } from './lib/receiptRows';
import { t } from '@core/i18n';

export const RestaurantPack: IndustryPack = {
  id: 'restaurant',
  name: 'Restaurant / Café',
  shortName: t('Restaurant'),
  emoji: '🍽️',
  priority: 70,
  description:
    t('Dine-in, takeaway & delivery. Tables, KOT, modifiers, recipes, kitchen stations, riders, happy hours.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    if (!type) return false;

    // ── HARD EXCLUSIONS ──────────────────────────────────
    // Bakery / cake / sweet shops have their own dedicated pack.
    // Never let them fall into Restaurant just because of "FOOD".
    if (
      type.includes('BAKERY') ||
      type.includes('CAKE') ||
      type.includes('SWEET') ||
      type.includes('MITHAI') ||
      type.includes('CONFECTIONERY') ||
      type.includes('PATISSERIE') ||
      type.includes('DESSERT')
    ) {
      return false;
    }

    // ── Restaurant-family keywords (narrow, explicit) ────
    return (
      type === 'RESTAURANT' ||
      type === 'CAFE' ||
      type === 'FAST_FOOD' ||
      type === 'DINE_IN' ||
      type.includes('RESTAURANT') ||
      type.includes('CAFE') ||
      type.includes('FAST_FOOD') ||
      type.includes('FASTFOOD') ||
      type.includes('DINE') ||
      type.includes('DHABA') ||
      type.includes('CAFETERIA') ||
      type.includes('FOOD_TRUCK') ||
      type.includes('FOODTRUCK') ||
      type.includes('CLOUD_KITCHEN')
    );
  },

  navGroups: [
    {
      label: t('Restaurant'),
      icon: ChefHat,
      emoji: '🍽️',
      color: '#ea580c',
      order: 20,
      items: [
        // ✅ wizard button
        { to: '/restaurant-menu-items/new', label: t('Add menu item'), icon: Sparkles, badge: t('FAST') },

        { to: '/restaurant/dashboard', label: t('Restaurant dashboard'), icon: LayoutDashboard, badge: t('NEW') },
        { to: '/restaurant/orders', label: t('Orders'), icon: ShoppingBag },
        { to: '/restaurant/tables', label: t('Tables'), icon: Utensils },
        { to: '/restaurant/menu', label: t('Menu'), icon: ChefHat },
        { to: '/restaurant/modifiers', label: t('Add-ons'), icon: Sparkles },
        { to: '/restaurant/kot', label: t('Kitchen (KOT)'), icon: Timer },
        { to: '/restaurant/riders', label: t('Riders'), icon: Bike },
        { to: '/restaurant/happy-hours', label: t('Happy hours'), icon: Zap },
        { to: '/restaurant/recipes', label: t('Recipes'), icon: BookOpen },
        { to: '/restaurant/stations', label: t('Kitchen stations'), icon: Flame },
        { to: '/restaurant/delivery', label: t('Delivery tracking'), icon: MapPin },
      ],
    },
  ],

  routes: [
    // Menu item editor and detail (the shared product pages through restaurant config)
    { path: '/restaurant-menu-items/new', element: RestaurantProductEditor, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/restaurant-menu-items/:id/edit', element: RestaurantProductEditor, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/restaurant-menu-items/:id', element: RestaurantProductDetail, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/restaurant', element: RestaurantDashboard },
    { path: '/restaurant/dashboard', element: RestaurantDashboard },
    { path: '/restaurant/orders/new', element: NewOrderPage },
    { path: '/restaurant/orders/:id', element: OrderDetailPage },
    { path: '/restaurant/orders', element: RestaurantOrdersPage },
    { path: '/restaurant/tables', element: TablesLayoutPage },
    { path: '/restaurant/menu', element: RestaurantProductsListPage },
    { path: '/restaurant/modifiers', element: ModifiersPage },
    { path: '/restaurant/kot', element: KotDisplayPage },
    { path: '/restaurant/riders', element: RidersPage },
    { path: '/restaurant/happy-hours', element: HappyHoursPage },
    { path: '/restaurant/recipes', element: RecipesPage },
    { path: '/restaurant/stations', element: StationsPage },
    { path: '/restaurant/delivery', element: DeliveryTrackingPage },
  ],

  dashboardComponent: RestaurantDashboard,

  productForm: {
    defaultUnit: 'plate',
    unitOptions: [
      { value: 'plate', label: t('Plate'), hint: '🍽️', group: t('Serving') },
      { value: 'cup', label: t('Cup'), hint: '🥤', group: t('Serving') },
      { value: 'bowl', label: t('Bowl'), hint: '🍜', group: t('Serving') },
      { value: 'glass', label: t('Glass'), hint: '🥛', group: t('Serving') },
      { value: 'pcs', label: t('Pieces'), hint: '🔢', group: t('Count') },
      { value: 'kg', label: t('Kilograms'), hint: '⚖️', group: t('Weight') },
      { value: 'gram', label: t('Grams'), hint: '⚖️', group: t('Weight') },
      { value: 'liter', label: t('Liter'), hint: '🥛', group: t('Volume') },
      { value: 'ml', label: t('Milliliter'), hint: '🥛', group: t('Volume') },
    ],
  },

  featureFlags: [
    { key: 'restaurantTables', label: t('Table Management'), defaultEnabled: true },
    { key: 'restaurantModifiers', label: t('Modifiers'), defaultEnabled: true },
    { key: 'restaurantKot', label: t('KOT Printing'), defaultEnabled: true },
    { key: 'restaurantDelivery', label: t('Delivery Tracking'), defaultEnabled: false },
    { key: 'restaurantRecipes', label: t('Recipes / BOM'), defaultEnabled: false },
  ],

  /** Token and waiter on the shared bill page. */
  receipt: { infoRows: restaurantReceiptRows },
};
