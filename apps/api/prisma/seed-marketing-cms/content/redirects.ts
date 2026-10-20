/**
 * Redirects from the old site (PLAN sections 5 and 8, Phase 0 A3), imported
 * with source IMPORT. X3 (Phase 6) checks them against the GSC Pages export
 * and adds what is missing.
 */

import type { SeedRedirect } from '../lib/types';

const CITY_SLUGS = [
  'karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'multan',
  'peshawar', 'quetta', 'gujranwala', 'sialkot', 'hyderabad', 'bahawalpur',
];

const cityRules: SeedRedirect[] = CITY_SLUGS.flatMap((city): SeedRedirect[] => [
  { from: `/${city}`, to: `/pos-software/${city}`, status: 301, note: 'PLAN 5: old city URL to the city hub' },
  { from: `/${city}/:industry`, to: `/pos-software/${city}`, status: 301, note: 'PLAN 5: the 372 city×industry doorway pages fold into the hub' },
]);

const oldBlog: [string, string][] = [
  ['digital-khata-complete-guide', '/blog/digital-khata-vs-paper-ledger'],
  ['fbr-pos-integration-guide-pakistan', '/blog/fbr-e-invoicing-complete-guide-2026'],
  ['pharmacy-drap-compliance-guide', '/blog/drap-compliance-pharmacy'],
  ['kiryana-store-profit-guide', '/blog/how-to-start-kiryana-store-pakistan'],
  ['how-to-start-business-in-pakistan-2026', '/blog/how-to-start-kiryana-store-pakistan'],
  ['sell-online-pakistan-marketplace-guide', '/marketplace'],
  ['restaurant-foodpanda-integration-profits', '/blog/restaurant-kot-system-guide'],
  ['nafaa-bazaar-launch-announcement', '/marketplace'],
];

const merges: [string, string][] = [
  ['/industries/carpet-shop', '/industries/carpet'],
  ['/enterprise', '/solutions/enterprise'],
  ['/partner-portal', '/partners'],
  ['/recipes', '/integrations'],
  ['/roi-calculator', '/tools/pos-cost-calculator'],
  ['/cost-predictor', '/tools/pos-cost-calculator'],
  ['/fbr-wizard', '/tools/fbr-tier-1-checker'],
  ['/solutions/coming-from-tally', '/compare/nafaa-vs-tally'],
  ['/solutions/coming-from-excel', '/compare/nafaa-vs-excel'],
  ['/solutions/small-business', '/solutions/single-shop'],
  ['/solutions/multi-location', '/solutions/retail-chains'],
  ['/solutions/franchise', '/solutions/retail-chains'],
  ['/solutions/online-first', '/solutions/ecommerce'],
  ['/solutions/wholesale', '/solutions/wholesale-distribution'],
  ['/product/analytics', '/product/reports'],
  ['/product/notifications', '/product/whatsapp-sms'],
  ['/product/marketplace-selling', '/marketplace'],
  ['/gdpr', '/privacy'],
];

export const redirects: SeedRedirect[] = [
  ...cityRules,
  ...oldBlog.map(([slug, to]): SeedRedirect => ({ from: `/blog/${slug}`, to, status: 301, note: 'PLAN Phase 0 A3: old blog.ts slug' })),
  ...merges.map(([from, to]): SeedRedirect => ({ from, to, status: 301, note: 'PLAN 8: merged page' })),
];

/** Left out until the owner decides (listed in the seed report). */
export const redirectsNeedingOwner = [
  '/api-explorer and /api-docs → /developers, or noindex if the API is not public (O7).',
  '/help → app docs or /faq (no target decided).',
];
