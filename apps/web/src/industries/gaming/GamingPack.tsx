import {
  LayoutDashboard, Gamepad2, Monitor, Timer, CreditCard,
  Trophy, PackageOpen, Joystick,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import GamingDashboard from './dashboard/GamingDashboard';
import GamingProductsPage from './pages/GamingProductsPage';
import GamingProductWizardPage from './pages/GamingProductWizardPage';
import GamingProductDetailPage from './pages/GamingProductDetailPage';
import GamingPosPage from './pages/GamingPosPage';
import GamingRentalsPage from './pages/GamingRentalsPage';
import GamingTopupsPage from './pages/GamingTopupsPage';
import GamingStationsPage from './pages/GamingStationsPage';
import GamingCafeLivePage from './pages/GamingCafeLivePage';
import GamingTournamentsPage from './pages/GamingTournamentsPage';
import { t } from '@core/i18n';
import { CATEGORY_GROUPS as GAMING_CATEGORY_GROUPS } from './lib/meta';

export const GamingPack: IndustryPack = {
  id: 'gaming',
  name: 'Gaming Shop & Cyber Cafe',
  shortName: t('Gaming'),
  emoji: '🎮',
  priority: 78,
  categoryKinds: GAMING_CATEGORY_GROUPS.flatMap((g) => g.items).filter(([v]) => v !== 'OTHER').map(([value, label]) => ({ value, label })),
  description:
    t('Consoles, games, PC parts, console rentals, PSN/Xbox/PUBG top-ups, LAN cafe live billing, tournaments.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('GAMING') || type.includes('GAME') ||
      type.includes('CYBER') || type.includes('ESPORT')
    );
  },

  navGroups: [
    {
      label: t('Gaming'),
      icon: Gamepad2,
      emoji: '🎮',
      color: '#7c3aed',
      order: 20,
      items: [
        { to: '/gaming/dashboard', label: t('Dashboard'), icon: LayoutDashboard },
        { to: '/gaming/cafe', label: t('Cafe live'), icon: Timer, badge: t('LIVE') },
        { to: '/gaming/stations', label: t('Stations'), icon: Monitor },
        { to: '/gaming/rentals', label: t('Rentals'), icon: PackageOpen },
        { to: '/gaming/topups', label: t('Digital top-ups'), icon: CreditCard },
        { to: '/gaming/tournaments', label: t('Tournaments'), icon: Trophy },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: GamingPosPage },

    { path: '/gaming-products/new', element: GamingProductWizardPage },
    { path: '/gaming-products/:id/edit', element: GamingProductWizardPage },
    { path: '/gaming-products/:id', element: GamingProductDetailPage },
    { path: '/gaming-products', element: GamingProductsPage },

    { path: '/gaming', element: GamingDashboard },
    { path: '/gaming/dashboard', element: GamingDashboard },

    { path: '/gaming/cafe', element: GamingCafeLivePage },
    { path: '/gaming/stations', element: GamingStationsPage },
    { path: '/gaming/rentals', element: GamingRentalsPage },
    { path: '/gaming/topups', element: GamingTopupsPage },
    { path: '/gaming/tournaments', element: GamingTournamentsPage },
  ],

  dashboardComponent: GamingDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '🎮', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Count') },
      { value: 'hour', label: t('Hour'), hint: '⏱️', group: t('Time') },
    ],
  },

  featureFlags: [
    { key: 'gamingCafe', label: t('LAN / Cyber Cafe Billing'), defaultEnabled: true },
    { key: 'gamingRentals', label: t('Console Rentals'), defaultEnabled: true },
    { key: 'gamingTopups', label: t('Digital Top-ups (PSN/UC/Robux)'), defaultEnabled: true },
    { key: 'gamingTournaments', label: t('Tournaments'), defaultEnabled: true },
    { key: 'gamingTradeIn', label: t('Pre-owned Trade-in'), defaultEnabled: true },
  ],
};
