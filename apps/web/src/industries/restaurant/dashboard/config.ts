/**
 * Restaurant dashboard: the standard dashboard plus live orders, the table
 * floor and the kitchen queue.
 */

import {
  BarChart3, Bike, BookOpen, ChefHat, MapPin, Plus, Receipt, ShoppingBag, ShoppingCart, Sparkles, Timer, Users, Utensils, Zap,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { useMasked } from '@modules/dashboard/engine';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useRestaurantOps } from './useRestaurantOps';
import {
  RestaurantFloor, RestaurantKitchen, RestaurantLiveOrders, RestaurantModes, restaurantKpis, useRestaurantAttention,
} from './widgets';

const productPath = (id: string) => `/restaurant-menu-items/${id}`;

function useRestaurantActions(): QuickAction[] {
  const { data } = useOverview();
  const { orders, tables, kitchen, deliveries } = useRestaurantOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Order lein' },
    { to: '/restaurant/orders/new', icon: Plus, label: 'Naya order', hint: 'Table ya takeaway' },
    { to: '/restaurant/orders', icon: ShoppingBag, label: 'Orders', hint: orders.open.length ? `${orders.open.length} chaalu` : 'Sab orders' },
    { to: '/restaurant/tables', icon: Utensils, label: 'Tables', hint: tables.total ? `${tables.available} khaali` : 'Tables banayein' },
    { to: '/restaurant/kot', icon: Timer, label: 'Kitchen (KOT)', hint: kitchen.active ? `${kitchen.active} queue me` : 'Queue khaali' },
    { to: '/restaurant/menu', icon: ChefHat, label: 'Menu', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/restaurant-menu-items/new', icon: Plus, label: 'Nayi dish', hint: 'Menu me daalein' },
    { to: '/restaurant/modifiers', icon: Sparkles, label: 'Modifiers', hint: 'Extra cheese, size' },
    { to: '/restaurant/delivery', icon: MapPin, label: 'Delivery', hint: deliveries ? `${deliveries} raste me` : 'Tracking' },
    { to: '/restaurant/riders', icon: Bike, label: 'Riders', hint: 'Delivery staff' },
    { to: '/restaurant/recipes', icon: BookOpen, label: 'Recipes', hint: 'Cost aur saamaan' },
    { to: '/restaurant/happy-hours', icon: Zap, label: 'Happy hours', hint: 'Waqt wali deals' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const restaurantDashboard = createDashboard({
  label: 'Restaurant',
  productPath,
  openFrom: 10,
  primaryAction: { to: '/pos', label: 'POS', icon: ShoppingCart },
  kpis: restaurantKpis,
  defaultKpis: ['restaurant-live', 'restaurant-tables', 'restaurant-kitchen', 'profit', 'average', 'cash'],
  useAttention: useRestaurantAttention,
  widgets: [
    { id: 'restaurant-orders', title: 'Chaalu orders', description: 'Khule orders, late aur tayyar sab se upar', size: 'half', sizes: ANY_SIZE, Component: RestaurantLiveOrders },
    { id: 'restaurant-floor', title: 'Table floor', description: 'Har table ka haal — bhari, khaali, reserved, safai', size: 'half', sizes: ['half', 'wide', 'full'], Component: RestaurantFloor },
    { id: 'restaurant-kitchen', title: 'Kitchen', description: 'KOT queue aur banane/serve ka ausat waqt', size: 'third', sizes: ['third', 'half'], Component: RestaurantKitchen },
    { id: 'restaurant-modes', title: 'Order type', description: 'Dine-in, takeaway aur delivery ke khule orders', size: 'third', sizes: ['third', 'half'], Component: RestaurantModes },
  ],
  useQuickActions: useRestaurantActions,
  moneyMap: { productsPath: '/restaurant/menu' },
  guide: [
    { icon: ChefHat, title: 'Chaalu orders', text: 'Jo order apne waqt se zyada kitchen me hai wo "Late" dikhta hai, aur jo tayyar pada hai wo upar aata hai — taake khana thanda na ho.' },
    { icon: Utensils, title: 'Table floor', text: 'Hara khaali, laal bhara, peela reserved, neela safai. Agle ghante ki reservation "Aaj ka kaam" me bhi aati hai.' },
  ],
});
