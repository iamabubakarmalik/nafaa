/**
 * /sitemaps/<section>.xml and /sitemaps/<locale>-<section>.xml (ARCH 9).
 * Only published, indexable, self-canonical entries (the API filters).
 */
import { SITEMAP_SECTION_KEYS } from '@/lib/cms/contract/cms-contract';
import { getLayout, getSitemap } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { XML_HEADERS, parseSitemapFileName, renderUrlset, sitemapFileName } from '@/lib/seo/sitemap';

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
  const { items } = await getSitemap(parsed.section, parsed.locale);
  return new Response(renderUrlset(items), { headers: XML_HEADERS });
}

function notFoundResponse() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
