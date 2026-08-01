import { LayoutDashboard, Trophy, Users, Wrench, Package, Dumbbell, ShoppingBag } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import SportsDashboardPage from './pages/SportsDashboardPage';
import SportsProductsPage from './pages/SportsProductsPage';
import SportsProductWizardPage from './pages/SportsProductWizardPage';
import SportsProductDetailPage from './pages/SportsProductDetailPage';
import SportsPosPage from './pages/SportsPosPage';
import SportsBrandsPage from './pages/SportsBrandsPage';
import TeamOrdersPage from './pages/TeamOrdersPage';
import TeamOrderFormPage from './pages/TeamOrderFormPage';
import RepairServicesPage from './pages/RepairServicesPage';

export const SportsPack: IndustryPack = {
  id: 'sports',
  name: 'Sports Shop',
  shortName: 'Sports',
  emoji: '🏏',
  themeColor: '#10b981',
  priority: 76,
  description: 'Cricket bats, footballs, gym equipment, team orders with jerseys, repair services.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('SPORTS') || type.includes('GYM') || type.includes('CRICKET');
  },

  navGroups: [{
    label: 'Sports',
    icon: Dumbbell,
    emoji: '🏏',
    color: '#10b981',
    order: 20,
    items: [
      { to: '/sports/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/sports/brands', label: 'Brands', icon: Trophy },
      { to: '/sports/team-orders', label: 'Team Orders', icon: Users, badge: 'NEW' },
      { to: '/sports/repair-services', label: 'Repairs', icon: Wrench },
    ],
  }],

  routes: [
    { path: '/pos', element: SportsPosPage },
    { path: '/sports-products/new', element: SportsProductWizardPage },
    { path: '/sports-products/:id/edit', element: SportsProductWizardPage },
    { path: '/sports-products/:id', element: SportsProductDetailPage },
    { path: '/sports-products', element: SportsProductsPage },
    { path: '/sports', element: SportsDashboardPage },
    { path: '/sports/dashboard', element: SportsDashboardPage },
    { path: '/sports/brands', element: SportsBrandsPage },
    { path: '/sports/team-orders', element: TeamOrdersPage },
    { path: '/sports/team-orders/new', element: TeamOrderFormPage },
    { path: '/sports/team-orders/:id/edit', element: TeamOrderFormPage },
    { path: '/sports/repair-services', element: RepairServicesPage },
  ],

  dashboardComponent: SportsDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🏏', group: 'Count' },
      { value: 'pair', label: 'Pair', hint: '👟', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
      { value: 'kg', label: 'Kilogram', hint: '🏋️', group: 'Weight' },
    ],
  },

  featureFlags: [
    { key: 'sportsTeamOrders', label: 'Team Orders with Jersey Customization', defaultEnabled: true },
    { key: 'sportsRepairServices', label: 'Bat / Racket Repair Services', defaultEnabled: true },
    { key: 'sportsBulkDiscount', label: 'Bulk / Team Discount', defaultEnabled: true },
  ],
};
