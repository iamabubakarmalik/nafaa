/** /search: site search (components/search). Noindex; the WebSite SearchAction points here. */
import type { Metadata } from 'next';
import { searchStrings } from '@/lib/i18n/search';
import { pageAlternates } from '@/lib/site/alternates';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { SearchPage } from '@/components/search/SearchPage';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const t = searchStrings('en');
  const base = buildPageMetadata({ title: t.metaTitle, description: t.metaDescription, path: '/search', noindex: true });
  return { ...base, alternates: { ...base.alternates, languages: await pageAlternates('/search') } };
}

export default function Page() {
  return <SearchPage locale="en" />;
}
