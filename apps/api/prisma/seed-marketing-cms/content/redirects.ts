/**
 * Redirects from the old site (PLAN sections 5 and 8, Phase 0 A3), imported
 * with source IMPORT. X3 (Phase 6) checks them against the GSC Pages export
 * and adds what is missing.
 *
 * Launch pass (21 Oct 2026): every URL of the live sitemap (508) was checked
 * with check-redirects.ts. Targets must be live at cutover, so rules no
 * longer point at blog stubs, unbuilt tools or draft compare pages. 302 is
 * used where a real page is planned at that URL (integrations, compare,
 * partners), so browsers do not cache the redirect; an entry published at
 * the path always wins over the rule on the site.
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
  // The planned posts for these are still stubs; point at the live page on the topic.
  ['pharmacy-drap-compliance-guide', '/industries/pharmacy'],
  ['kiryana-store-profit-guide', '/industries/kiryana'],
  ['how-to-start-business-in-pakistan-2026', '/blog/category/business'],
  ['sell-online-pakistan-marketplace-guide', '/marketplace'],
  ['restaurant-foodpanda-integration-profits', '/solutions/restaurants'],
  ['nafaa-bazaar-launch-announcement', '/marketplace'],
];

const merges: [string, string][] = [
  ['/industries/carpet-shop', '/industries/carpet'],
  ['/enterprise', '/solutions/enterprise'],
  ['/recipes', '/integrations'],
  // The tools are not built yet: pricing and the FBR product page answer the same question.
  ['/roi-calculator', '/pricing'],
  ['/cost-predictor', '/pricing'],
  ['/fbr-wizard', '/product/fbr'],
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
  // Launch pass: old pages with no page of their own on the new site.
  ['/security', '/privacy'],
  ['/about', '/contact'],
  ['/careers', '/contact'],
  ['/founder-letter', '/contact'],
  ['/press', '/changelog'],
  ['/academy', '/blog'],
  ['/guides', '/blog/category/guides'],
  ['/help', '/faq'],
  ['/case-studies', '/industries'],
  ['/migrate', '/services/data-migration'],
  ['/api-docs', '/developers'],
  ['/api-explorer', '/developers'],
  ['/playground', '/developers'],
  ['/product/api', '/developers'],
  ['/product/bookings', '/industries/salon'],
  ['/product/fraud-detection', '/product/staff'],
  ['/product/mobile-app', '/product/pos'],
  ['/download', '/product/pos'],
  ['/offline', '/product/offline-pos'],
  ['/quiz', '/pricing'],
  // Old vercel.json rules (ARCH 7.5: imported into the DB instead of the site config).
  ['/home', '/'],
  ['/index', '/'],
  ['/index.html', '/'],
  ['/tos', '/terms'],
  ['/privacy-policy', '/privacy'],
  ['/pricng', '/pricing'],
  ['/prices', '/pricing'],
  ['/features', '/product'],
  ['/pos', '/product/pos'],
  ['/feed.xml', '/blog/feed.xml'],
  ['/blog/feed', '/blog/feed.xml'],
  ['/rss', '/blog/feed.xml'],
  ['/rss.xml', '/blog/feed.xml'],
  ['/atom.xml', '/blog/feed.xml'],
  ['/sitemap-index.xml', '/sitemap.xml'],
  ['/sitemap-images.xml', '/sitemap.xml'],
  ['/sitemap-news.xml', '/sitemap.xml'],
  ['/sitemap-videos.xml', '/sitemap.xml'],
];

/** Pages planned at the same URL (or app links that may move): 302, see the header. */
const temporary: [string, string][] = [
  ['/partners', '/contact'],
  ['/partner-portal', '/contact'],
  ['/status', '/changelog'],
  ['/search', '/'],
  ['/templates', '/blog/category/guides'],
  ['/compare/nafaa-vs-excel', '/compare'],
  ['/compare/nafaa-vs-tally', '/compare'],
  ['/compare/nafaa-vs-quickbooks', '/compare'],
  ['/compare/nafaa-vs-paper-register', '/compare'],
  // Integrations: the closest live page until INTEGRATION entries are published.
  ['/integrations/fbr', '/product/fbr'],
  ['/integrations/pra', '/product/fbr'],
  ['/integrations/srb', '/product/fbr'],
  ['/integrations/shopify', '/changelog/shopify-app-install'],
  ['/integrations/woocommerce', '/product/online-store'],
  ['/integrations/custom-website', '/product/online-store'],
  ['/integrations/daraz', '/product/online-store'],
  ['/integrations/tcs', '/product/online-store'],
  ['/integrations/leopards', '/product/online-store'],
  ['/integrations/postex', '/product/online-store'],
  ['/integrations/callcourier', '/product/online-store'],
  ['/integrations/jazzcash', '/product/payments'],
  ['/integrations/easypaisa', '/product/payments'],
  ['/integrations/raast', '/product/payments'],
  ['/integrations/nayapay', '/product/payments'],
  ['/integrations/sadapay', '/product/payments'],
  ['/integrations/stripe', '/product/payments'],
  ['/integrations/foodpanda', '/solutions/restaurants'],
  ['/integrations/quickbooks', '/product/reports'],
  ['/integrations/whatsapp-business', '/product/whatsapp-sms'],
  ['/integrations/:slug', '/integrations'],
  // Sign-up and sign-in live in the app.
  ['/signup', 'https://app.nafaa.pk/register'],
  ['/sign-up', 'https://app.nafaa.pk/register'],
  ['/register', 'https://app.nafaa.pk/register'],
  ['/login', 'https://app.nafaa.pk/login'],
  ['/dashboard', 'https://app.nafaa.pk'],
];

/** Removed for good: answered with 410 (served as a noindex 404, ARCH 7.5). */
const gone: string[] = ['/ai-plugin.json', '/knowledge-graph.json'];

const oldPrefixes: [string, string][] = [
  ['/posts/:slug', '/blog/:slug'],
  ['/articles/:slug', '/blog/:slug'],
  ['/p/:slug', '/blog/:slug'],
];

export const redirects: SeedRedirect[] = [
  ...cityRules,
  ...oldBlog.map(([slug, to]): SeedRedirect => ({ from: `/blog/${slug}`, to, status: 301, note: 'PLAN Phase 0 A3: old blog.ts slug' })),
  ...merges.map(([from, to]): SeedRedirect => ({ from, to, status: 301, note: 'PLAN 8: merged page' })),
  ...oldPrefixes.map(([from, to]): SeedRedirect => ({ from, to, status: 301, note: 'Old vercel.json: blog aliases' })),
  ...temporary.map(([from, to]): SeedRedirect => ({ from, to, status: 302, note: 'Launch: temporary until a page exists at this URL' })),
  ...gone.map((from): SeedRedirect => ({ from, status: 410, note: 'Launch: old machine-readable file, removed' })),
];

/** Left out until the owner decides (listed in the seed report). */
export const redirectsNeedingOwner = [
  '/api-explorer, /api-docs, /playground → /developers (the developer docs are published, so O7 is taken as public).',
  '/help → /faq for now; point it at an app help page if one becomes public.',
  '/about, /careers, /founder-letter → /contact: there is no company page; add one and repoint.',
];
