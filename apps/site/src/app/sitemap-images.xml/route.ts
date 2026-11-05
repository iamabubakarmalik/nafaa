/**
 * /sitemap-images.xml: image sitemap at the old site's address. Every
 * indexable English page that has images (screenshots, covers), each with its
 * <image:image> entries, gathered from the section sitemaps. The section
 * files already carry the same images; this file keeps the old address
 * answering with real content. Cached under the `sitemap` tag (via the
 * section fetches).
 */
import { SITEMAP_SECTION_KEYS } from '@/lib/cms/contract/cms-contract';
import { getSitemap } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { XML_HEADERS, renderUrlset } from '@/lib/seo/sitemap';

export const revalidate = 86400;

export async function GET() {
  const sections = await Promise.all(SITEMAP_SECTION_KEYS.map((section) => getSitemap(section, DEFAULT_LOCALE)));
  const seen = new Set<string>();
  const items = sections
    .flatMap(({ items: list }) => list)
    .filter((item) => item.images.length > 0 && !seen.has(item.url) && seen.add(item.url))
    .map((item) => ({ ...item, alternates: [] }));
  return new Response(renderUrlset(items), { headers: XML_HEADERS });
}
