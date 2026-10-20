/**
 * Catch-all route (ARCH 3, 7.5): PAGE entries at free paths (about, contact,
 * legal, marketplace, ...), every /ur/... path while Urdu is prepared, and
 * the redirect fallback for any path no other route owns.
 *
 * Order: split the locale prefix (only for live locales) → published entry
 * (or the draft in preview) → redirect table → 404.
 */
import type { Metadata } from 'next';
import { getEntry, getLayout, getPaths } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { DEFAULT_LOCALE, dirFor, localizePath, splitLocalePath } from '@/lib/cms/locale';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { buildEntryMetadata } from '@/lib/seo/metadata';
import { PageView } from './PageView';

export const revalidate = 86400;
export const dynamicParams = true;

type Params = Promise<{ slug: string[] }>;

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  try {
    const items = await getPaths('PAGE');
    return items
      .filter((item) => item.path !== '/')
      .map((item) => ({ slug: localizePath(item.locale, item.path).split('/').filter(Boolean) }));
  } catch (error) {
    // Production builds fail when the API is down (ARCH 7.1); local work renders on demand.
    if (isProduction) throw error;
    return [];
  }
}

async function resolve(params: Params) {
  const { slug } = await params;
  const requestPath = `/${slug.join('/')}`;
  const { site } = await getLayout(DEFAULT_LOCALE);
  const { locale, path } = splitLocalePath(requestPath, site.locales);
  const entry = await getEntry(path, locale);
  return { requestPath, locale, entry };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { entry } = await resolve(params);
  // No opengraph-image file under a catch-all (Next forbids it): the editor's OG
  // image is set here, otherwise the root card is inherited.
  return entry ? buildEntryMetadata(entry, { hasOgRoute: false }) : {};
}

export default async function CatchAllPage({ params }: { params: Params }) {
  const { requestPath, locale, entry } = await resolve(params);
  if (!entry) return redirectOrNotFound(requestPath);

  const view = <PageView entry={entry} />;
  if (locale === DEFAULT_LOCALE) return view;
  return (
    <div lang={locale} dir={dirFor(locale)}>
      {view}
    </div>
  );
}
