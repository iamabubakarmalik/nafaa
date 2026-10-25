/**
 * Sitemap XML (ARCH 9). The index lists one file per section and locale:
 * `/sitemaps/<section>.xml` for English and `/sitemaps/<locale>-<section>.xml`
 * for every other live locale. A section with no indexable URLs is left out.
 * Entries carry <lastmod>, <image:image> and, once a translation exists,
 * xhtml:link alternates (en-PK, ur-PK and x-default → English, the same set
 * as the pages' hreflang). No changefreq or priority.
 */
import {
  SITEMAP_SECTION_KEYS,
  type SitemapItem,
  type SitemapSection,
} from '@/lib/cms/contract/cms-contract';
import { absoluteUrl } from '@/lib/cms/env';
import { DEFAULT_LOCALE, hreflangFor, isKnownLocale, localizePath } from '@/lib/cms/locale';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sitemapFileName(section: SitemapSection, locale: string): string {
  return locale === DEFAULT_LOCALE ? `${section}.xml` : `${locale}-${section}.xml`;
}

/** "ur-pages.xml" → { locale: 'ur', section: 'pages' }; null for anything else. */
export function parseSitemapFileName(file: string): { section: SitemapSection; locale: string } | null {
  const match = /^(?:([a-z]{2})-)?([a-z]+)\.xml$/.exec(file);
  if (!match) return null;
  const locale = match[1] ?? DEFAULT_LOCALE;
  const section = match[2] as SitemapSection;
  if (!(SITEMAP_SECTION_KEYS as string[]).includes(section)) return null;
  if (locale !== DEFAULT_LOCALE && !isKnownLocale(locale)) return null;
  return { section, locale };
}

/**
 * hreflang alternates for each item: the API's list (keyed by locale code)
 * in BCP 47 with x-default on the English URL, or, when the API has not
 * linked the translations yet, built from `paired` (CMS paths published in
 * English and Urdu; see getPairedPaths).
 */
export function withAlternates(items: SitemapItem[], locale: string, paired: readonly string[]): SitemapItem[] {
  const pairs = new Set(paired);
  return items.map((item) => {
    let alts = item.alternates.filter((alt) => alt.hreflang !== 'x-default').map((alt) => ({ locale: alt.hreflang.replace(/-.*/, ''), url: alt.url }));
    if (alts.length < 2) {
      const path = cmsPathOfUrl(item.url, locale);
      alts = path && pairs.has(path) ? [DEFAULT_LOCALE, 'ur'].map((l) => ({ locale: l, url: absoluteUrl(localizePath(l, path)) })) : [];
    }
    if (alts.length < 2) return { ...item, alternates: [] };
    const english = alts.find((alt) => alt.locale === DEFAULT_LOCALE);
    return {
      ...item,
      alternates: [
        ...alts.map((alt) => ({ hreflang: hreflangFor(alt.locale), url: alt.url })),
        ...(english ? [{ hreflang: 'x-default', url: english.url }] : []),
      ],
    };
  });
}

/** CMS path of a sitemap URL: "https://nafaa.pk/ur/pricing" in ur → "/pricing". */
function cmsPathOfUrl(url: string, locale: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return null;
  }
  if (locale === DEFAULT_LOCALE) return pathname;
  const prefix = `/${locale}`;
  if (pathname === prefix) return '/';
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : null;
}

export function renderSitemapIndex(files: { url: string; lastmod: string | null }[]): string {
  const body = files
    .map((f) => `  <sitemap><loc>${escapeXml(f.url)}</loc>${f.lastmod ? `<lastmod>${escapeXml(f.lastmod)}</lastmod>` : ''}</sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function renderUrlset(items: SitemapItem[]): string {
  const body = items
    .map((item) => {
      const parts = [`<loc>${escapeXml(item.url)}</loc>`, `<lastmod>${escapeXml(item.lastmod)}</lastmod>`];
      for (const alt of item.alternates) {
        parts.push(`<xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.url)}"/>`);
      }
      for (const image of item.images) {
        parts.push(
          `<image:image><image:loc>${escapeXml(image.url)}</image:loc>${image.title ? `<image:title>${escapeXml(image.title)}</image:title>` : ''}</image:image>`,
        );
      }
      return `  <url>${parts.join('')}</url>`;
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${body}\n</urlset>\n`
  );
}

export const XML_HEADERS = { 'content-type': 'application/xml; charset=utf-8' } as const;
