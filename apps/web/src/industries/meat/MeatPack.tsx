import {
  Beef, Sparkles, Heart, ShieldCheck, Scissors, Users, Building2,
  LayoutDashboard, Package, Calendar, RefreshCw,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

// Existing pages
import MeatProductsPage from './pages/MeatProductsPage';
import LiveAnimalsPage from './pages/LiveAnimalsPage';
import SlaughterLogPage from './pages/SlaughterLogPage';
import CuttingJobsPage from './pages/CuttingJobsPage';
import WholesalePage from './pages/WholesalePage';

// Wizard + Detail
import MeatProductWizardPage from './pages/MeatProductWizardPage';
import MeatProductDetailPage from './pages/MeatProductDetailPage';

/**
 * Meat / Butcher / Halal industry pack.
 * Livestock, slaughter, halal certification, cutting jobs, weight-based orders.
 */
export const MeatPack: IndustryPack = {
  id: 'meat',
  name: 'Meat / Butcher / Halal',
  shortName: 'Meat',
  emoji: '🥩',
  themeColor: '#dc2626',
  priority: 65,
  description:
    'Halal certification, livestock tracking, slaughter logs, cutting jobs, weight-based orders, wholesale accounts.',

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
      label: 'Meat Industry',
      icon: Beef,
      emoji: '🥩',
      color: '#dc2626',
      order: 20,
      items: [
        { to: '/meat-products/new', label: '+ Add Meat Product', icon: Sparkles, badge: 'FAST' },
        { to: '/meat/products', label: 'Meat Products', icon: Beef },
        { to: '/meat/live-animals', label: 'Live Animals', icon: Heart },
        { to: '/meat/slaughter', label: 'Slaughter Log', icon: ShieldCheck },
        { to: '/meat/cutting', label: 'Cutting Jobs', icon: Scissors },
        { to: '/meat/wholesale', label: 'Wholesale Accounts', icon: Building2 },
      ],
    },
  ],

  routes: [
    // Wizard + Detail — highest priority meat routes
    { path: '/meat-products/new', element: MeatProductWizardPage },
    { path: '/meat-products/:id/edit', element: MeatProductWizardPage },
    { path: '/meat-products/:id', element: MeatProductDetailPage },

    // Existing pages
    { path: '/meat/products', element: MeatProductsPage },
    { path: '/meat/live-animals', element: LiveAnimalsPage },
    { path: '/meat/slaughter', element: SlaughterLogPage },
    { path: '/meat/cutting', element: CuttingJobsPage },
    { path: '/meat/wholesale', element: WholesalePage },
  ],

  productForm: {
    defaultUnit: 'kg',
    unitOptions: [
      { value: 'kg', label: 'Kilograms', hint: '⚖️', group: 'Weight' },
      { value: 'gram', label: 'Grams', hint: '⚖️', group: 'Weight' },
      { value: 'pound', label: 'Pounds', hint: '⚖️', group: 'Weight' },
      { value: 'piece', label: 'Piece', hint: '🔢', group: 'Count' },
      { value: 'dozen', label: 'Dozen', hint: '📦', group: 'Count' },
      { value: 'whole', label: 'Whole', hint: '🥩', group: 'Portion' },
      { value: 'half', label: 'Half', hint: '🥩', group: 'Portion' },
      { value: 'quarter', label: 'Quarter', hint: '🥩', group: 'Portion' },
    ],
  },

  featureFlags: [
    { key: 'meatHalal', label: 'Halal Certification', defaultEnabled: true },
    { key: 'meatLivestock', label: 'Live Animals', defaultEnabled: true },
    { key: 'meatSlaughter', label: 'Slaughter Logs', defaultEnabled: true },
    { key: 'meatCutting', label: 'Cutting Jobs', defaultEnabled: true },
    { key: 'meatWholesale', label: 'Wholesale Accounts', defaultEnabled: false },
    { key: 'meatQurbani', label: 'Qurbani Bookings', defaultEnabled: false },
    { key: 'meatSubscriptions', label: 'Meat Subscriptions', defaultEnabled: false },
  ],
};
