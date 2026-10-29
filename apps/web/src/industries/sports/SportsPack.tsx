import { LayoutDashboard, Plus, Trophy, Users, Wrench, Dumbbell } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import SportsDashboard from './dashboard/SportsDashboard';
import SportsProductsPage from './pages/SportsProductsPage';
import SportsProductWizardPage from './pages/SportsProductWizardPage';
import SportsProductDetailPage from './pages/SportsProductDetailPage';
import SportsBrandsPage from './pages/SportsBrandsPage';
import TeamOrdersPage from './pages/TeamOrdersPage';
import TeamOrderFormPage from './pages/TeamOrderFormPage';
import RepairServicesPage from './pages/RepairServicesPage';

/**
 * Sports shop: equipment by sport, kit and shoes in sizes on the shared
 * counter, team / school orders with name and number printing and an
 * advance on the team's khata, and the repair desk (bat repair, grip,
 * racket stringing) with parts from stock on the delivery bill.
 */
export const SportsPack: IndustryPack = {
  id: 'sports',
  name: 'Sports Shop',
  shortName: 'Sports',
  emoji: '🏏',
  priority: 76,
  description: 'Cricket, football, gym saman; team orders with printing and advance; bat / racket repairs.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    // Gym / fitness centres belong to the Gym pack; only sports goods shops land here.
    return type.includes('SPORTS') || type.includes('CRICKET');
  },

  navGroups: [{
    label: 'Sports',
    icon: Dumbbell,
    emoji: '🏏',
    color: '#10b981',
    order: 20,
    items: [
      { to: '/sports/dashboard', label: 'Sports dashboard', icon: LayoutDashboard },
      { to: '/sports/team-orders/new', label: 'New team order', icon: Plus, permission: PERMISSIONS.POS_USE },
      { to: '/sports/team-orders', label: 'Team orders', icon: Users, permission: PERMISSIONS.POS_USE },
      { to: '/sports/repair-services', label: 'Repairs', icon: Wrench, permission: PERMISSIONS.POS_USE },
      { to: '/sports/brands', label: 'Brands', icon: Trophy, permission: PERMISSIONS.BRANDS_VIEW },
    ],
  }],

  routes: [
    { path: '/sports-products/new', element: SportsProductWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/sports-products/:id/edit', element: SportsProductWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/sports-products/:id', element: SportsProductDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/sports-products', element: SportsProductsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/sports', element: SportsDashboard },
    { path: '/sports/dashboard', element: SportsDashboard },
    { path: '/sports/brands', element: SportsBrandsPage, permission: PERMISSIONS.BRANDS_VIEW },
    { path: '/sports/team-orders', element: TeamOrdersPage, permission: PERMISSIONS.POS_USE },
    { path: '/sports/team-orders/new', element: TeamOrderFormPage, permission: PERMISSIONS.POS_USE },
    { path: '/sports/team-orders/:id/edit', element: TeamOrderFormPage, permission: PERMISSIONS.POS_USE },
    { path: '/sports/repair-services', element: RepairServicesPage, permission: PERMISSIONS.POS_USE },
  ],

  dashboardComponent: SportsDashboard,

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
