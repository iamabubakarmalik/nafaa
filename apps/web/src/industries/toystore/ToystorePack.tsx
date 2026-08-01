import {
  LayoutDashboard, Baby, Cake, Gift, ShieldAlert, Package, Sparkles,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import ToystoreDashboardPage from './pages/ToystoreDashboardPage';
import ToyProductsPage from './pages/ToyProductsPage';
import ToyProductWizardPage from './pages/ToyProductWizardPage';
import ToyProductDetailPage from './pages/ToyProductDetailPage';
import ToystorePosPage from './pages/ToystorePosPage';
import ToyGiftPacksPage from './pages/ToyGiftPacksPage';
import GiftPackFormPage from './pages/GiftPackFormPage';
import BirthdayRemindersPage from './pages/BirthdayRemindersPage';
import BirthdayDetailPage from './pages/BirthdayDetailPage';
import ToySafetyReviewPage from './pages/ToySafetyReviewPage';
import GiftFinderPage from './pages/GiftFinderPage';

export const ToystorePack: IndustryPack = {
  id: 'toystore',
  name: 'Toy Store',
  shortName: 'Toys',
  emoji: '🧸',
  themeColor: '#ec4899',
  priority: 76,
  description:
    'Age-appropriate filtering, safety certifications, gift packs, birthday reminders, RC toys, educational focus.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('TOY') || type.includes('KIDS') || type.includes('CHILDREN');
  },

  navGroups: [
    {
      label: 'Toy Store',
      icon: Baby,
      emoji: '🧸',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/toystore/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/toystore/gift-finder', label: 'Gift Finder', icon: Sparkles, badge: 'AI' },
        { to: '/toystore/birthdays', label: 'Birthdays', icon: Cake, badge: 'HOT' },
        { to: '/toystore/gift-packs', label: 'Gift Packs', icon: Gift },
        { to: '/toystore/safety-review', label: 'Safety Review', icon: ShieldAlert },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: ToystorePosPage },

    { path: '/toy-products/new', element: ToyProductWizardPage },
    { path: '/toy-products/:id/edit', element: ToyProductWizardPage },
    { path: '/toy-products/:id', element: ToyProductDetailPage },
    { path: '/toy-products', element: ToyProductsPage },

    { path: '/toystore', element: ToystoreDashboardPage },
    { path: '/toystore/dashboard', element: ToystoreDashboardPage },

    { path: '/toystore/gift-finder', element: GiftFinderPage },

    { path: '/toystore/birthdays', element: BirthdayRemindersPage },
    { path: '/toystore/birthdays/:id', element: BirthdayDetailPage },

    { path: '/toystore/gift-packs', element: ToyGiftPacksPage },
    { path: '/toystore/gift-packs/new', element: GiftPackFormPage },
    { path: '/toystore/gift-packs/:id/edit', element: GiftPackFormPage },

    { path: '/toystore/safety-review', element: ToySafetyReviewPage },
  ],

  dashboardComponent: ToystoreDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🧸', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🎁', group: 'Count' },
      { value: 'pack', label: 'Pack', hint: '📦', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'toystoreBirthdayReminders', label: 'Birthday Reminders', defaultEnabled: true },
    { key: 'toystoreGiftPacks', label: 'Gift Packs', defaultEnabled: true },
    { key: 'toystoreSafetyReview', label: 'Safety Certification Review', defaultEnabled: true },
    { key: 'toystoreAgeFilter', label: 'Age-Appropriate Filter', defaultEnabled: true },
  ],
};
