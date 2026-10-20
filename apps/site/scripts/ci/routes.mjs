/**
 * Key routes: one URL per template (ARCH 4.8 "LH CI on one URL per template",
 * ARCH 8). Lighthouse runs on these; the SEO crawl starts from them as well as
 * from the sitemap. The paths exist in the CI fixtures (scripts/ci/fixtures.ts)
 * and are real paths in the seed content, so the same list works on staging.
 *
 * Override with SITE_CI_ROUTES="/,/pricing,..." when a path changes.
 */
export const KEY_ROUTES = [
  { path: '/', template: 'home' },
  { path: '/pricing', template: 'pricing' },
  { path: '/industries', template: 'hub' },
  { path: '/product/pos', template: 'product' },
  { path: '/industries/kiryana', template: 'industry' },
  { path: '/solutions/multi-branch', template: 'solution' },
  { path: '/services/custom-software', template: 'service' },
  { path: '/compliance/fbr-pos-integration', template: 'compliance' },
  { path: '/pos-software/lahore', template: 'city' },
  { path: '/best/pos-software-pakistan', template: 'bestof' },
  { path: '/glossary/pos', template: 'glossary' },
  { path: '/tools/gst-calculator', template: 'tool' },
  { path: '/developers', template: 'docs' },
  { path: '/about', template: 'default' },
];

/** Extra paths the crawl always visits (fixtures only; ignored on staging when they 404 in --lenient mode). */
export const FIXTURE_ONLY_ROUTES = ['/compare/nafaa-vs-placeholder', '/blog/ci-fixture-article', '/team/ci-fixture-author'];

export function keyRoutes() {
  const env = process.env.SITE_CI_ROUTES;
  if (env) return env.split(',').map((p) => p.trim()).filter(Boolean).map((path) => ({ path, template: 'custom' }));
  return KEY_ROUTES;
}
