/**
 * CMS settings seeded only when the key is still empty. Values are owner facts
 * or taken from the live site (apps/marketing contact page); anything not
 * confirmed is left out and listed in `needsOwner`. Prices and plan features
 * are never here: they come from the Plan table.
 */

import {
  DEFAULT_ANALYTICS_SETTINGS,
  DEFAULT_SEO_SETTINGS,
} from '../../../src/admin-marketing/cms/contract/cms-contract';
import type { SeedSetting } from '../lib/types';

export const settings: SeedSetting[] = [
  {
    key: 'industry-groups',
    value: [
      { key: 'retail', label: 'Retail shops', sortOrder: 1 },
      { key: 'food', label: 'Food & beverage', sortOrder: 2 },
      { key: 'health', label: 'Health & medical', sortOrder: 3 },
      { key: 'service', label: 'Services', sortOrder: 4 },
      { key: 'specialty', label: 'Specialty trade', sortOrder: 5 },
      { key: 'lifestyle', label: 'Lifestyle & leisure', sortOrder: 6 },
    ],
    needsOwner: ['PLAN 2.3 shows 5 groups (no "Lifestyle"); the 6 categories of the live site were kept. Merge in Settings if wanted.'],
  },
  {
    key: 'site',
    value: {
      name: 'Nafaa',
      baseUrl: 'https://nafaa.pk',
      appUrl: 'https://app.nafaa.pk',
      signupUrl: 'https://app.nafaa.pk/register',
      demoPath: '/demo',
      locales: ['en'],
      whatsapp: { number: '923241772933', message: 'Assalam-o-Alaikum, mujhe Nafaa ke baare me maloomat chahiye.' },
      social: [],
    },
    needsOwner: [
      'Social and app-store profiles that really exist (O5); none are seeded.',
      'Add "ur" to locales when the Urdu pages are ready.',
    ],
  },
  {
    key: 'entity',
    value: {
      brandName: 'Nafaa',
      disambiguatingDescription: 'Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds',
      description:
        'Nafaa is business software from Pakistan: POS, stock, khata, purchasing, staff and reports for shops, restaurants, service businesses and multi-branch companies, with online orders and a marketplace for e-commerce sellers, and billing that keeps working without internet.',
      founderIds: [],
      offices: [],
      contact: { email: 'info@nafaa.pk', phone: '+92 324 1772933' },
      compliance: {
        fbrPra: {
          text: 'FBR & PRA approved POS integrator',
          evidenceRef: 'Owner statement (20 Oct 2026). Approval letter or licence number to be filed before launch (O2).',
        },
      },
      platforms: ['Web browser'],
      languages: ['English', 'Roman Urdu'],
      sameAs: [],
    },
    needsOwner: [
      'O2: evidence for the FBR & PRA wording.',
      'O4: real office address(es), founder name and founding year.',
      'O5: add Windows, macOS, Android and iOS to platforms once the apps are publicly downloadable.',
      'Contact email and phone are copied from the live contact page; confirm they are current.',
    ],
  },
  {
    key: 'pricing',
    value: {
      plans: {
        'free-trial': { tagline: '7 din Free Trial', ctaLabel: 'Start free trial', ctaHref: 'signup' },
      },
      featureLabels: {},
    },
    needsOwner: ['What each plan includes is not final; feature labels are left empty so nothing is hard-coded.'],
  },
  // The old site served this IndexNow key at /nafaa-2026-indexnow.txt; keeping it keeps the key verified.
  { key: 'seo', value: { ...DEFAULT_SEO_SETTINGS, indexNowKey: 'nafaa-2026-indexnow' }, needsOwner: ['Set INDEXNOW_KEY=nafaa-2026-indexnow on the site (Vercel) until the public layout carries seo.indexNowKey.'] },
  { key: 'analytics', value: DEFAULT_ANALYTICS_SETTINGS, needsOwner: ['GTM and Clarity ids (copy from the live site env when cutting over).'] },
];
