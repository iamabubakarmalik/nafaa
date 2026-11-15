/**
 * Site pages that are code, not CMS entries (the product tour and site
 * search). Both exist in English and Urdu, so they join the CMS paths in
 * getPairedPaths (language menus, hreflang). Only the tour is listed in the
 * sitemap; search result pages are noindex.
 */
export const FIXED_PAIRED_PATHS = ['/search', '/tour'] as const;

/** Fixed pages for the `pages` sitemap section, with the date their content last changed. */
export const FIXED_SITEMAP_PAGES: readonly { path: string; lastmod: string }[] = [{ path: '/tour', lastmod: '2026-11-15T00:00:00.000Z' }];
