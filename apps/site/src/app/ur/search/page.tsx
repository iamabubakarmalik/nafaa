/** /ur/search: site search in Urdu (Urdu results). 404 until Urdu is live. */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLayout } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { searchStrings } from '@/lib/i18n/search';
import { pageAlternates } from '@/lib/site/alternates';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { SearchPage } from '@/components/search/SearchPage';

export const revalidate = 86400;

async function urduLive(): Promise<boolean> {
  const { site } = await getLayout(DEFAULT_LOCALE);
  return site.locales.includes('ur');
}

export async function generateMetadata(): Promise<Metadata> {
  if (!(await urduLive())) return {};
  const t = searchStrings('ur');
  const base = buildPageMetadata({ title: t.metaTitle, description: t.metaDescription, path: '/search', locale: 'ur', noindex: true });
  return { ...base, alternates: { ...base.alternates, languages: await pageAlternates('/search') } };
}

export default async function Page() {
  if (!(await urduLive())) notFound();
  return <SearchPage locale="ur" />;
}
