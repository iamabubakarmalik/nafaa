/**
 * /sitemap.xml: the sitemap index (ARCH 9). Lists each section file that has
 * at least one URL, for every live locale, with the newest lastmod.
 * Cached under the `sitemap` tag (via the section fetches).
 */
import { SITEMAP_SECTION_KEYS } from '@/lib/cms/contract/cms-contract';
import { getLayout, getSitemap } from '@/lib/cms/client';
import { absoluteUrl } from '@/lib/cms/env';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { XML_HEADERS, renderSitemapIndex, sitemapFileName } from '@/lib/seo/sitemap';

export const revalidate = 86400;

export async function GET() {
  const { site } = await getLayout(DEFAULT_LOCALE);
  const locales = site.locales.length ? site.locales : [DEFAULT_LOCALE];
  const jobs = locales.flatMap((locale) => SITEMAP_SECTION_KEYS.map((section) => ({ locale, section })));
  const results = await Promise.all(
    jobs.map(async (job) => {
      const { items } = await getSitemap(job.section, job.locale);
      if (items.length === 0) return null;
      const lastmod = items.reduce<string | null>((max, item) => (!max || item.lastmod > max ? item.lastmod : max), null);
      return { url: absoluteUrl(`/sitemaps/${sitemapFileName(job.section, job.locale)}`), lastmod };
    }),
  );
  const files = results.filter((file): file is { url: string; lastmod: string | null } => file !== null);
  return new Response(renderSitemapIndex(files), { headers: XML_HEADERS });
}
