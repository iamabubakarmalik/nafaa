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
import { t } from '@core/i18n';

/**
 * Sports shop: equipment by sport, kit and shoes in sizes on the shared
 * counter, team / school orders with name and number printing and an
 * advance on the team's khata, and the repair desk (bat repair, grip,
 * racket stringing) with parts from stock on the delivery bill.
 */
export const SportsPack: IndustryPack = {
  id: 'sports',
  name: 'Sports Shop',
  shortName: t('Sports'),
  emoji: '🏏',
  priority: 76,
  description: t('Cricket, football, gym saman; team orders with printing and advance; bat / racket repairs.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    // Gym / fitness centres belong to the Gym pack; only sports goods shops land here.
    return type.includes('SPORTS') || type.includes('CRICKET');
  },

  navGroups: [{
    label: t('Sports'),
    icon: Dumbbell,
    emoji: '🏏',
    color: '#10b981',
    order: 20,
    items: [
      { to: '/sports/dashboard', label: t('Sports dashboard'), icon: LayoutDashboard },
      { to: '/sports/team-orders/new', label: t('New team order'), icon: Plus, permission: PERMISSIONS.POS_USE },
      { to: '/sports/team-orders', label: t('Team orders'), icon: Users, permission: PERMISSIONS.POS_USE },
      { to: '/sports/repair-services', label: t('Repairs'), icon: Wrench, permission: PERMISSIONS.POS_USE },
      { to: '/sports/brands', label: t('Brands'), icon: Trophy, permission: PERMISSIONS.BRANDS_VIEW },
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
      { value: 'pcs', label: t('Pieces'), hint: '🏏', group: t('Count') },
      { value: 'pair', label: t('Pair'), hint: '👟', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
      { value: 'kg', label: t('Kilogram'), hint: '🏋️', group: t('Weight') },
    ],
  },

  featureFlags: [
    { key: 'sportsTeamOrders', label: t('Team Orders with Jersey Customization'), defaultEnabled: true },
    { key: 'sportsRepairServices', label: t('Bat / Racket Repair Services'), defaultEnabled: true },
    { key: 'sportsBulkDiscount', label: t('Bulk / Team Discount'), defaultEnabled: true },
  ],
};
