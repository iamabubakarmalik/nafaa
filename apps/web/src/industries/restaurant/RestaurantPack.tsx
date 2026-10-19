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

export const RestaurantPack: IndustryPack = {
  id: 'restaurant',
  name: 'Restaurant / Café',
  shortName: 'Restaurant',
  emoji: '🍽️',
  priority: 70,
  description:
    'Dine-in, takeaway & delivery. Tables, KOT, modifiers, recipes, kitchen stations, riders, happy hours.',

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
      label: 'Restaurant Industry',
      icon: ChefHat,
      emoji: '🍽️',
      color: '#ea580c',
      order: 20,
      items: [
        // ✅ wizard button
        { to: '/restaurant-menu-items/new', label: '+ Add Menu Item', icon: Sparkles, badge: 'FAST' },

        { to: '/restaurant/dashboard', label: 'Restaurant Dashboard', icon: LayoutDashboard, badge: 'NEW' },
        { to: '/restaurant/orders', label: 'Orders', icon: ShoppingBag },
        { to: '/restaurant/tables', label: 'Tables', icon: Utensils },
        { to: '/restaurant/menu', label: 'Menu', icon: ChefHat },
        { to: '/restaurant/modifiers', label: 'Add-ons', icon: Sparkles },
        { to: '/restaurant/kot', label: 'Kitchen (KOT)', icon: Timer },
        { to: '/restaurant/riders', label: 'Riders', icon: Bike },
        { to: '/restaurant/happy-hours', label: 'Happy Hours', icon: Zap },
        { to: '/restaurant/recipes', label: 'Recipes', icon: BookOpen },
        { to: '/restaurant/stations', label: 'Kitchen Stations', icon: Flame },
        { to: '/restaurant/delivery', label: 'Delivery Tracking', icon: MapPin },
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
      { value: 'plate', label: 'Plate', hint: '🍽️', group: 'Serving' },
      { value: 'cup', label: 'Cup', hint: '🥤', group: 'Serving' },
      { value: 'bowl', label: 'Bowl', hint: '🍜', group: 'Serving' },
      { value: 'glass', label: 'Glass', hint: '🥛', group: 'Serving' },
      { value: 'pcs', label: 'Pieces', hint: '🔢', group: 'Count' },
      { value: 'kg', label: 'Kilograms', hint: '⚖️', group: 'Weight' },
      { value: 'gram', label: 'Grams', hint: '⚖️', group: 'Weight' },
      { value: 'liter', label: 'Liter', hint: '🥛', group: 'Volume' },
      { value: 'ml', label: 'Milliliter', hint: '🥛', group: 'Volume' },
    ],
  },

  featureFlags: [
    { key: 'restaurantTables', label: 'Table Management', defaultEnabled: true },
    { key: 'restaurantModifiers', label: 'Modifiers', defaultEnabled: true },
    { key: 'restaurantKot', label: 'KOT Printing', defaultEnabled: true },
    { key: 'restaurantDelivery', label: 'Delivery Tracking', defaultEnabled: false },
    { key: 'restaurantRecipes', label: 'Recipes / BOM', defaultEnabled: false },
  ],

  /** Token and waiter on the shared bill page. */
  receipt: { infoRows: restaurantReceiptRows },
};
