/**
 * Locale routing (ARCH 8, PLAN Phase 5).
 *
 * - English is the default and has no prefix: /pricing.
 * - Every other locale lives under its prefix: /ur/pricing.
 * - The CMS stores `path` without the prefix; `url` in API responses already
 *   includes it. Use these helpers only to go from a request path to
 *   (locale, path) and back.
 * - Which locales are live comes from settings `site.locales`. Code knows
 *   `KNOWN_LOCALES`; a prefix that is known but not live is treated as a
 *   normal path (and 404s).
 */
import { DEFAULT_LOCALE, KNOWN_LOCALES } from './contract/cms-contract';

export { DEFAULT_LOCALE, KNOWN_LOCALES };
export type Locale = (typeof KNOWN_LOCALES)[number];

const RTL_LOCALES: ReadonlySet<string> = new Set(['ur']);

/** Open Graph locale per site locale. */
export const OG_LOCALE: Record<string, string> = { en: 'en_PK', ur: 'ur_PK' };

/** BCP 47 tag for hreflang and <html lang>. */
export function hreflangFor(locale: string): string {
  return locale === 'en' ? 'en-PK' : locale === 'ur' ? 'ur-PK' : locale;
}

export function dirFor(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

export function isKnownLocale(value: string): value is Locale {
  return (KNOWN_LOCALES as readonly string[]).includes(value);
}

/**
 * Splits a request path into its locale and the CMS path.
 * `/ur/pricing` → { locale: 'ur', path: '/pricing' } when 'ur' is live.
 */
export function splitLocalePath(
  requestPath: string,
  liveLocales: readonly string[] = [DEFAULT_LOCALE],
): { locale: string; path: string } {
  const segments = requestPath.split('/').filter(Boolean);
  const first = segments[0];
  if (first && first !== DEFAULT_LOCALE && isKnownLocale(first) && liveLocales.includes(first)) {
    const rest = segments.slice(1).join('/');
    return { locale: first, path: rest ? `/${rest}` : '/' };
  }
  return { locale: DEFAULT_LOCALE, path: segments.length ? `/${segments.join('/')}` : '/' };
}

/** Adds the locale prefix to a CMS path: ('ur', '/pricing') → '/ur/pricing'. */
export function localizePath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
