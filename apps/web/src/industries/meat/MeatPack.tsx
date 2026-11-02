import {
  Beef, Building2, CalendarClock, Gauge, Heart, LayoutDashboard, Package, Plus, Scissors, ShieldCheck,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';
import MeatProductsPage from './pages/MeatProductsPage';
import MeatProductWizardPage from './pages/MeatProductWizardPage';
import MeatProductDetailPage from './pages/MeatProductDetailPage';
import MeatRatesPage from './pages/MeatRatesPage';
import LiveAnimalsPage from './pages/LiveAnimalsPage';
import SlaughterLogPage from './pages/SlaughterLogPage';
import CuttingJobsPage from './pages/CuttingJobsPage';
import WeightOrdersPage from './pages/WeightOrdersPage';
import NewWeightOrderPage from './pages/NewWeightOrderPage';
import QurbaniPage from './pages/QurbaniPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import WholesalePage from './pages/WholesalePage';
import MeatDashboard from './dashboard/MeatDashboard';
import { t } from '@core/i18n';

/**
 * Meat shop, butcher and chicken shop: mandi purchase, slaughter and
 * cutting into stock, sale by kg, daily rates, weight orders and delivery,
 * restaurant khata, qurbani bookings and supply plans.
 */
export const MeatPack: IndustryPack = {
  id: 'meat',
  name: 'Meat / Butcher / Halal',
  shortName: t('Meat'),
  emoji: '🥩',
  priority: 65,
  description:
    t('Halal certification, livestock tracking, slaughter logs, cutting jobs, weight-based orders, wholesale accounts.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('MEAT') ||
      type.includes('BUTCHER') ||
      type.includes('HALAL') ||
      type.includes('POULTRY') ||
      type.includes('SLAUGHTER')
    );
  },

  navGroups: [
    {
      label: t('Meat shop'),
      icon: Beef,
      emoji: '🥩',
      color: '#dc2626',
      order: 20,
      items: [
        { to: '/meat/dashboard', label: t('Meat dashboard'), icon: LayoutDashboard },
        { to: '/meat/rates', label: t('Today\'s rates'), icon: Gauge, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
        { to: '/meat/weight-orders', label: t('Weight orders'), icon: Package, permission: PERMISSIONS.SALES_VIEW },
        { to: '/meat/weight-orders/new', label: t('New order'), icon: Plus, permission: PERMISSIONS.POS_USE },
        { to: '/meat/live-animals', label: t('Livestock'), icon: Heart, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/meat/slaughter', label: t('Slaughter (halal)'), icon: ShieldCheck, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/meat/cutting', label: t('Cutting'), icon: Scissors, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/meat/wholesale', label: t('Restaurants / hotels'), icon: Building2, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/meat/subscriptions', label: t('Supply plans'), icon: CalendarClock, permission: PERMISSIONS.CUSTOMERS_VIEW, featureFlag: 'meatSubscriptions' },
        { to: '/meat/qurbani', label: t('Qurbani / aqeeqa bookings'), icon: Beef, permission: PERMISSIONS.SALES_VIEW, featureFlag: 'meatQurbani' },
        { to: '/meat/products', label: t('Items'), icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      ],
    },
  ],

  routes: [
    { path: '/meat-products/new', element: MeatProductWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/meat-products/:id/edit', element: MeatProductWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/meat-products/:id', element: MeatProductDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/meat/products', element: MeatProductsPage, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/meat', element: MeatDashboard },
    { path: '/meat/dashboard', element: MeatDashboard },

    { path: '/meat/rates', element: MeatRatesPage, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
    { path: '/meat/weight-orders/new', element: NewWeightOrderPage, permission: PERMISSIONS.POS_USE },
    { path: '/meat/weight-orders', element: WeightOrdersPage, permission: PERMISSIONS.SALES_VIEW },
    { path: '/meat/live-animals', element: LiveAnimalsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/meat/slaughter', element: SlaughterLogPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/meat/cutting', element: CuttingJobsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/meat/cutting-jobs', element: CuttingJobsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/meat/wholesale', element: WholesalePage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/meat/subscriptions', element: SubscriptionsPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/meat/qurbani', element: QurbaniPage, permission: PERMISSIONS.SALES_VIEW },
  ],

  dashboardComponent: MeatDashboard,

  productForm: {
    defaultUnit: 'kg',
    unitOptions: [
      { value: 'kg', label: t('Kilograms'), hint: '⚖️', group: t('Weight') },
      { value: 'gram', label: t('Grams'), hint: '⚖️', group: t('Weight') },
      { value: 'pound', label: t('Pounds'), hint: '⚖️', group: t('Weight') },
      { value: 'piece', label: t('Piece'), hint: '🔢', group: t('Count') },
      { value: 'dozen', label: t('Dozen'), hint: '📦', group: t('Count') },
      { value: 'whole', label: t('Whole'), hint: '🥩', group: t('Portion') },
      { value: 'half', label: t('Half'), hint: '🥩', group: t('Portion') },
      { value: 'quarter', label: t('Quarter'), hint: '🥩', group: t('Portion') },
    ],
  },

  featureFlags: [
    { key: 'meatHalal', label: t('Halal Certification'), defaultEnabled: true },
    { key: 'meatLivestock', label: t('Live Animals'), defaultEnabled: true },
    { key: 'meatSlaughter', label: t('Slaughter Logs'), defaultEnabled: true },
    { key: 'meatCutting', label: t('Cutting Jobs'), defaultEnabled: true },
    { key: 'meatWholesale', label: t('Wholesale Accounts'), defaultEnabled: true },
    { key: 'meatQurbani', label: t('Qurbani Bookings'), defaultEnabled: false },
    { key: 'meatSubscriptions', label: t('Meat Subscriptions'), defaultEnabled: true },
  ],
};
