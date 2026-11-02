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
import { t } from '@core/i18n';

const productPath = (id: string) => `/restaurant-menu-items/${id}`;

function useRestaurantActions(): QuickAction[] {
  const { data } = useOverview();
  const { orders, tables, kitchen, deliveries } = useRestaurantOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Order lein') },
    { to: '/restaurant/orders/new', icon: Plus, label: t('Naya order'), hint: t('Table ya takeaway') },
    { to: '/restaurant/orders', icon: ShoppingBag, label: t('Orders'), hint: orders.open.length ? t('{{count}} chaalu', { count: orders.open.length }) : t('Sab orders') },
    { to: '/restaurant/tables', icon: Utensils, label: t('Tables'), hint: tables.total ? t('{{available}} khaali', { available: tables.available }) : t('Tables banayein') },
    { to: '/restaurant/kot', icon: Timer, label: t('Kitchen (KOT)'), hint: kitchen.active ? t('{{active}} queue me', { active: kitchen.active }) : t('Queue khaali') },
    { to: '/restaurant/menu', icon: ChefHat, label: t('Menu'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/restaurant-menu-items/new', icon: Plus, label: t('Nayi dish'), hint: t('Menu me daalein') },
    { to: '/restaurant/modifiers', icon: Sparkles, label: t('Modifiers'), hint: t('Extra cheese, size') },
    { to: '/restaurant/delivery', icon: MapPin, label: t('Delivery'), hint: deliveries ? t('{{deliveries}} raste me', { deliveries }) : t('Tracking') },
    { to: '/restaurant/riders', icon: Bike, label: t('Riders'), hint: t('Delivery staff') },
    { to: '/restaurant/recipes', icon: BookOpen, label: t('Recipes'), hint: t('Cost aur saamaan') },
    { to: '/restaurant/happy-hours', icon: Zap, label: t('Happy hours'), hint: t('Waqt wali deals') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const restaurantDashboard = createDashboard({
  label: t('Restaurant'),
  productPath,
  openFrom: 10,
  primaryAction: { to: '/pos', label: t('POS'), icon: ShoppingCart },
  kpis: restaurantKpis,
  defaultKpis: ['restaurant-live', 'restaurant-tables', 'restaurant-kitchen', 'profit', 'average', 'cash'],
  useAttention: useRestaurantAttention,
  widgets: [
    { id: 'restaurant-orders', title: t('Chaalu orders'), description: t('Khule orders, late aur tayyar sab se upar'), size: 'half', sizes: ANY_SIZE, Component: RestaurantLiveOrders },
    { id: 'restaurant-floor', title: t('Table floor'), description: t('Har table ka haal — bhari, khaali, reserved, safai'), size: 'half', sizes: ['half', 'wide', 'full'], Component: RestaurantFloor },
    { id: 'restaurant-kitchen', title: t('Kitchen'), description: t('KOT queue aur banane/serve ka ausat waqt'), size: 'third', sizes: ['third', 'half'], Component: RestaurantKitchen },
    { id: 'restaurant-modes', title: t('Order type'), description: t('Dine-in, takeaway aur delivery ke khule orders'), size: 'third', sizes: ['third', 'half'], Component: RestaurantModes },
  ],
  useQuickActions: useRestaurantActions,
  moneyMap: { productsPath: '/restaurant/menu' },
  guide: [
    { icon: ChefHat, title: t('Chaalu orders'), text: t('Jo order apne waqt se zyada kitchen me hai wo "Late" dikhta hai, aur jo tayyar pada hai wo upar aata hai — taake khana thanda na ho.') },
    { icon: Utensils, title: t('Table floor'), text: t('Hara khaali, laal bhara, peela reserved, neela safai. Agle ghante ki reservation "Aaj ka kaam" me bhi aati hai.') },
  ],
});
