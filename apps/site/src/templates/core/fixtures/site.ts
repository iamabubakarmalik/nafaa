/**
 * Development fixtures: settings and plans.
 *
 * Used only by `next dev` when the CMS API has no data yet (see ../data.ts).
 * Production builds never import this folder. Values mirror what the CMS
 * seed and the Plan seed would put in the database, so pages look the way
 * they will with real data:
 * - site, entity, pricing, industry groups: apps/api/prisma/seed-marketing-cms/content/settings.ts
 * - plans: seedDefaultPlans() in apps/api/src/modules/billing/plans/plans.service.ts
 * Feature labels are empty in the seed (plan contents are not final), so the
 * fixture plans carry no feature rows either; pages show the plan limits.
 */
import type { PublicPlan, SiteSettings } from '@/lib/cms/contract/cms-contract';

export const FIXTURE_UPDATED_AT = '2026-10-20T07:00:00.000Z';

export const fixtureSite: SiteSettings = {
  name: 'Nafaa',
  baseUrl: 'https://nafaa.pk',
  appUrl: 'https://app.nafaa.pk',
  signupUrl: 'https://app.nafaa.pk/register',
  demoPath: '/demo',
  locales: ['en'],
  whatsapp: { number: '923241772933', message: 'Assalam-o-Alaikum, mujhe Nafaa ke baare me maloomat chahiye.' },
  social: [],
};

/** Entity settings as seeded, without the computed parts (added in index.ts). */
export const fixtureEntitySettings = {
  brandName: 'Nafaa',
  disambiguatingDescription: 'Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds',
  description:
    'Nafaa is POS, stock and khata software for shops and businesses in Pakistan, with apps for each industry and billing that keeps working without internet.',
  founderIds: [] as string[],
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
  sameAs: [] as string[],
};

export const fixtureIndustryGroups = [
  { key: 'retail', label: 'Retail shops', sortOrder: 1 },
  { key: 'food', label: 'Food & beverage', sortOrder: 2 },
  { key: 'health', label: 'Health & medical', sortOrder: 3 },
  { key: 'service', label: 'Services', sortOrder: 4 },
  { key: 'specialty', label: 'Specialty trade', sortOrder: 5 },
  { key: 'lifestyle', label: 'Lifestyle & leisure', sortOrder: 6 },
];

function plan(p: Omit<PublicPlan, 'currency' | 'features' | 'display'> & { display?: Partial<PublicPlan['display']> }): PublicPlan {
  return { ...p, currency: 'PKR', features: [], display: { highlight: false, ...p.display } };
}

/** The Plan seed rows with the seeded pricing display (only the trial has a tagline). */
export const fixturePlans: PublicPlan[] = [
  plan({
    id: 'fx-plan-trial',
    slug: 'free-trial',
    name: 'Free Trial',
    description: '7 din free trial — koi credit card nahi chahiye',
    priceMonthly: 0,
    priceQuarterly: 0,
    priceYearly: 0,
    trialDays: 7,
    sortOrder: 1,
    limits: { maxProducts: 30, maxUsers: 2, maxShops: 1, maxSalesPerMonth: 100 },
    display: { tagline: '7 din Free Trial', ctaLabel: 'Start free trial', ctaHref: 'https://app.nafaa.pk/register' },
  }),
  plan({
    id: 'fx-plan-basic',
    slug: 'basic',
    name: 'Basic',
    description: 'Chhoti dukan ke liye perfect',
    priceMonthly: 1500,
    priceQuarterly: 4000,
    priceYearly: 15000,
    trialDays: 0,
    sortOrder: 2,
    limits: { maxProducts: 500, maxUsers: 3, maxShops: 1, maxSalesPerMonth: 2000 },
  }),
  plan({
    id: 'fx-plan-pro',
    slug: 'pro',
    name: 'Pro',
    description: 'Bari shops aur multi-branch ke liye',
    priceMonthly: 3500,
    priceQuarterly: 9500,
    priceYearly: 36000,
    trialDays: 0,
    sortOrder: 3,
    limits: { maxProducts: 5000, maxUsers: 10, maxShops: 3, maxSalesPerMonth: 10000 },
  }),
  plan({
    id: 'fx-plan-enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited everything + 24/7 support',
    priceMonthly: 9500,
    priceQuarterly: 27000,
    priceYearly: 99000,
    trialDays: 0,
    sortOrder: 4,
    limits: { maxProducts: 999999, maxUsers: 999, maxShops: 999, maxSalesPerMonth: 999999 },
  }),
];
