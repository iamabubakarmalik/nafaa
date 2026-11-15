/**
 * /sitemaps/<section>.xml and /sitemaps/<locale>-<section>.xml (ARCH 9).
 * Only published, indexable, self-canonical entries (the API filters).
 */
import { SITEMAP_SECTION_KEYS, type SitemapItem } from '@/lib/cms/contract/cms-contract';
import { absoluteUrl } from '@/lib/cms/env';
import { FIXED_SITEMAP_PAGES } from '@/lib/site/fixed-routes';
import { getLayout, getPairedPaths, getSitemap } from '@/lib/cms/client';
import { DEFAULT_LOCALE, localizePath } from '@/lib/cms/locale';
import { XML_HEADERS, parseSitemapFileName, renderUrlset, sitemapFileName, withAlternates } from '@/lib/seo/sitemap';

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return SITEMAP_SECTION_KEYS.map((section) => ({ file: sitemapFileName(section, DEFAULT_LOCALE) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const parsed = parseSitemapFileName((await params).file);
  if (!parsed) return notFoundResponse();
  if (parsed.locale !== DEFAULT_LOCALE) {
    const { site } = await getLayout(DEFAULT_LOCALE);
    if (!site.locales.includes(parsed.locale)) return notFoundResponse();
  }
  const [{ items: cms }, paired] = await Promise.all([getSitemap(parsed.section, parsed.locale), getPairedPaths()]);
  // Code pages (the product tour) join the pages section.
  const fixed: SitemapItem[] =
    parsed.section === 'pages'
      ? FIXED_SITEMAP_PAGES.map((page) => ({ url: absoluteUrl(localizePath(parsed.locale, page.path)), lastmod: page.lastmod, images: [], alternates: [] }))
      : [];
  const items = [...cms, ...fixed.filter((item) => !cms.some((c) => c.url === item.url))];
  return new Response(renderUrlset(withAlternates(items, parsed.locale, paired)), { headers: XML_HEADERS });
}

function notFoundResponse() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
