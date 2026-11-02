import {
  LayoutDashboard, Baby, Cake, Gift, ShieldAlert, Sparkles,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import ToystoreDashboard from './dashboard/ToystoreDashboard';
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
import { t } from '@core/i18n';

export const ToystorePack: IndustryPack = {
  id: 'toystore',
  name: 'Toy Store',
  shortName: t('Toys'),
  emoji: '🧸',
  priority: 76,
  description:
    t('Age-appropriate filtering, safety certifications, gift packs, birthday reminders, RC toys, educational focus.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('TOY') || type.includes('KIDS') || type.includes('CHILDREN');
  },

  navGroups: [
    {
      label: t('Toy store'),
      icon: Baby,
      emoji: '🧸',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/toystore/dashboard', label: t('Dashboard'), icon: LayoutDashboard },
        { to: '/toystore/gift-finder', label: t('Gift finder'), icon: Sparkles },
        { to: '/toystore/gift-packs', label: t('Gift packs'), icon: Gift },
        { to: '/toystore/birthdays', label: t('Birthdays'), icon: Cake },
        { to: '/toystore/safety-review', label: t('Safety review'), icon: ShieldAlert },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: ToystorePosPage },

    { path: '/toystore-products/new', element: ToyProductWizardPage },
    { path: '/toystore-products/:id/edit', element: ToyProductWizardPage },
    { path: '/toystore-products/:id', element: ToyProductDetailPage },
    { path: '/toystore-products', element: ToyProductsPage },
    // Older links.
    { path: '/toy-products/new', element: ToyProductWizardPage },
    { path: '/toy-products/:id/edit', element: ToyProductWizardPage },
    { path: '/toy-products/:id', element: ToyProductDetailPage },

    { path: '/toystore', element: ToystoreDashboard },
    { path: '/toystore/dashboard', element: ToystoreDashboard },

    { path: '/toystore/gift-finder', element: GiftFinderPage },

    { path: '/toystore/birthdays', element: BirthdayRemindersPage },
    { path: '/toystore/birthdays/:id', element: BirthdayDetailPage },
    { path: '/toystore/birthday-reminders', element: BirthdayRemindersPage },
    { path: '/toystore/birthday-reminders/:id', element: BirthdayDetailPage },

    { path: '/toystore/gift-packs', element: ToyGiftPacksPage },
    { path: '/toystore/gift-packs/new', element: GiftPackFormPage },
    { path: '/toystore/gift-packs/:id/edit', element: GiftPackFormPage },

    { path: '/toystore/safety-review', element: ToySafetyReviewPage },
  ],

  dashboardComponent: ToystoreDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '🧸', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🎁', group: t('Count') },
      { value: 'pack', label: t('Pack'), hint: '📦', group: t('Count') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'toystoreBirthdayReminders', label: t('Birthday Reminders'), defaultEnabled: true },
    { key: 'toystoreGiftPacks', label: t('Gift Packs'), defaultEnabled: true },
    { key: 'toystoreSafetyReview', label: t('Safety Certification Review'), defaultEnabled: true },
    { key: 'toystoreAgeFilter', label: t('Age-Appropriate Filter'), defaultEnabled: true },
  ],
};
