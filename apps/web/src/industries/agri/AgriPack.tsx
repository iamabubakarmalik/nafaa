import { Wheat, LayoutDashboard, Users, Package, Leaf, Calendar, Landmark, Sparkles } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import AgriDashboard from './dashboard/AgriDashboard';
import AgriProductsListPage from './pages/AgriProductsListPage';
import FarmersPage from './pages/FarmersPage';
import BulkOrdersPage from './pages/BulkOrdersPage';
import NewBulkOrderPage from './pages/NewBulkOrderPage';
import AdvisoryPage from './pages/AdvisoryPage';
import SeasonalPlansPage from './pages/SeasonalPlansPage';
import SubsidyPage from './pages/SubsidyPage';
import AgriProductWizardPage from './pages/AgriProductWizardPage';
import AgriProductDetailPage from './pages/AgriProductDetailPage';
import FarmerDetailPage from './pages/FarmerDetailPage';
import FarmerFormPage from './pages/FarmerFormPage';
import { t } from '@core/i18n';

/**
 * Agri / Feed / Seeds / Fertilizer industry pack.
 * Farmer accounts, bulk orders, crop advisory, seasonal planning,
 * government subsidy claims.
 */
export const AgriPack: IndustryPack = {
  id: 'agri',
  name: 'Agri / Feed Store',
  shortName: t('Agri'),
  emoji: '🌾',
  priority: 42,
  description:
    t('Seeds, fertilizer, pesticides, animal feed. Farmer credit, bulk orders, crop advisory, seasonal plans, subsidy claims.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('AGRI') ||
      type.includes('FARM') ||
      type.includes('SEED') ||
      type.includes('FERTILIZER') ||
      type.includes('FEED') ||
      type.includes('PESTICIDE') ||
      type.includes('CROP')
    );
  },

  navGroups: [
    {
      label: t('Agri / feed extras'),
      icon: Wheat,
      emoji: '🌾',
      color: '#65a30d',
      order: 20,
      items: [
        { to: '/agri/farmers', label: t('Farmers'), icon: Users },
        { to: '/agri/bulk-orders', label: t('Bulk orders'), icon: Package },
        { to: '/agri/advisory', label: t('Crop advisory'), icon: Leaf },
        { to: '/agri/seasonal-plans', label: t('Seasonal plans'), icon: Calendar },
        { to: '/agri/subsidy', label: t('Govt subsidies'), icon: Landmark },
      ],
    },
  ],

  routes: [
    // Wizard paths come before the detail path.
    { path: '/agri-products/new', element: AgriProductWizardPage },
    { path: '/agri-products/:id/edit', element: AgriProductWizardPage },

    { path: '/agri', element: AgriDashboard },
    { path: '/agri/dashboard', element: AgriDashboard },
    { path: '/agri/products', element: AgriProductsListPage },

    { path: '/agri-products/:id', element: AgriProductDetailPage },

    { path: '/agri/farmers', element: FarmersPage },
    { path: '/agri/farmers/new', element: FarmerFormPage },
    { path: '/agri/farmers/:id/edit', element: FarmerFormPage },
    { path: '/agri/farmers/:id', element: FarmerDetailPage },
    { path: '/agri/bulk-orders/new', element: NewBulkOrderPage },
    { path: '/agri/bulk-orders', element: BulkOrdersPage },
    { path: '/agri/advisory', element: AdvisoryPage },
    { path: '/agri/seasonal-plans', element: SeasonalPlansPage },
    { path: '/agri/subsidy', element: SubsidyPage },
  ],

  dashboardComponent: AgriDashboard,

  productForm: {
    defaultUnit: 'bag',
    unitOptions: [
      { value: 'bag', label: t('Bag (50 kg)'), hint: '🛍️', group: t('Bulk') },
      { value: 'sack', label: t('Sack'), hint: '🛍️', group: t('Bulk') },
      { value: 'kg', label: t('Kilogram'), hint: '⚖️', group: t('Weight') },
      { value: 'gram', label: t('Gram'), hint: '⚖️', group: t('Weight') },
      { value: 'ton', label: t('Ton'), hint: '⚖️', group: t('Bulk') },
      { value: 'maan', label: t('Maan (40 kg)'), hint: '⚖️', group: t('Weight') },
      { value: 'seer', label: t('Seer'), hint: '⚖️', group: t('Weight') },
      { value: 'liter', label: t('Liter (liquid)'), hint: '🥛', group: t('Volume') },
      { value: 'ml', label: t('Milliliter'), hint: '🥛', group: t('Volume') },
      { value: 'pcs', label: t('Pieces'), hint: '🔢', group: t('Count') },
      { value: 'packet', label: t('Packet'), hint: '📦', group: t('Pack') },
      { value: 'acre', label: t('Per Acre (dose)'), hint: '🌾', group: t('Application') },
    ],
  },

  featureFlags: [
    { key: 'agriFarmers', label: t('Farmer Accounts'), defaultEnabled: true },
    { key: 'agriBulkOrders', label: t('Bulk Orders'), defaultEnabled: true },
    { key: 'agriCredit', label: t('Farmer Credit (Udhar)'), defaultEnabled: true },
    { key: 'agriAdvisory', label: t('Crop Advisory'), defaultEnabled: false },
    { key: 'agriSeasonal', label: t('Seasonal Plans'), defaultEnabled: false },
    { key: 'agriSubsidy', label: t('Govt Subsidy Claims'), defaultEnabled: false },
  ],
};
