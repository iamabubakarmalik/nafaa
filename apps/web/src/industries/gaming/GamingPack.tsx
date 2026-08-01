import {
  LayoutDashboard, Gamepad2, Monitor, Timer, CreditCard,
  Trophy, PackageOpen, Joystick,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import GamingDashboardPage from './pages/GamingDashboardPage';
import GamingProductsPage from './pages/GamingProductsPage';
import GamingProductWizardPage from './pages/GamingProductWizardPage';
import GamingProductDetailPage from './pages/GamingProductDetailPage';
import GamingPosPage from './pages/GamingPosPage';
import GamingRentalsPage from './pages/GamingRentalsPage';
import GamingTopupsPage from './pages/GamingTopupsPage';
import GamingStationsPage from './pages/GamingStationsPage';
import GamingCafeLivePage from './pages/GamingCafeLivePage';
import GamingTournamentsPage from './pages/GamingTournamentsPage';

export const GamingPack: IndustryPack = {
  id: 'gaming',
  name: 'Gaming Shop & Cyber Cafe',
  shortName: 'Gaming',
  emoji: '🎮',
  themeColor: '#7c3aed',
  priority: 78,
  description:
    'Consoles, games, PC parts, console rentals, PSN/Xbox/PUBG top-ups, LAN cafe live billing, tournaments.',

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
      label: 'Gaming',
      icon: Gamepad2,
      emoji: '🎮',
      color: '#7c3aed',
      order: 20,
      items: [
        { to: '/gaming/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/gaming/cafe', label: 'Cafe Live', icon: Timer, badge: 'LIVE' },
        { to: '/gaming/stations', label: 'Stations', icon: Monitor },
        { to: '/gaming/rentals', label: 'Rentals', icon: PackageOpen },
        { to: '/gaming/topups', label: 'Digital Top-ups', icon: CreditCard },
        { to: '/gaming/tournaments', label: 'Tournaments', icon: Trophy },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: GamingPosPage },

    { path: '/gaming-products/new', element: GamingProductWizardPage },
    { path: '/gaming-products/:id/edit', element: GamingProductWizardPage },
    { path: '/gaming-products/:id', element: GamingProductDetailPage },
    { path: '/gaming-products', element: GamingProductsPage },

    { path: '/gaming', element: GamingDashboardPage },
    { path: '/gaming/dashboard', element: GamingDashboardPage },

    { path: '/gaming/cafe', element: GamingCafeLivePage },
    { path: '/gaming/stations', element: GamingStationsPage },
    { path: '/gaming/rentals', element: GamingRentalsPage },
    { path: '/gaming/topups', element: GamingTopupsPage },
    { path: '/gaming/tournaments', element: GamingTournamentsPage },
  ],

  dashboardComponent: GamingDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🎮', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Count' },
      { value: 'hour', label: 'Hour', hint: '⏱️', group: 'Time' },
    ],
  },

  featureFlags: [
    { key: 'gamingCafe', label: 'LAN / Cyber Cafe Billing', defaultEnabled: true },
    { key: 'gamingRentals', label: 'Console Rentals', defaultEnabled: true },
    { key: 'gamingTopups', label: 'Digital Top-ups (PSN/UC/Robux)', defaultEnabled: true },
    { key: 'gamingTournaments', label: 'Tournaments', defaultEnabled: true },
    { key: 'gamingTradeIn', label: 'Pre-owned Trade-in', defaultEnabled: true },
  ],
};
