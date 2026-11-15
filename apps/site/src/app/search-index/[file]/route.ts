/**
 * /search-index/en.json and /search-index/ur.json: the compact site search
 * index (lib/search/build). Static, rebuilt with the sitemap tag; the
 * search panel fetches it only when search opens.
 */
import { getLayout } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import type { SiteLocale } from '@/lib/i18n/shell';
import { buildSearchIndex } from '@/lib/search/build';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ file: 'en.json' }, { file: 'ur.json' }];
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const locale = (await params).file.replace(/\.json$/, '') as SiteLocale;
  if (locale === 'ur') {
    const { site } = await getLayout(DEFAULT_LOCALE);
    if (!site.locales.includes('ur')) return Response.json({ v: 1, rows: [] });
  }
  const index = await buildSearchIndex(locale === 'ur' ? 'ur' : 'en');
  return Response.json(index, { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } });
}
