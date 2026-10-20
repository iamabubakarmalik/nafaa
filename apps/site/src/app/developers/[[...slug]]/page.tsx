/**
 * Developer docs: /developers and every DOC below it (ARCH 5.2: the root DOC
 * has slug "" → /developers; children nest by parent chain). The sidebar tree
 * is built from all published DOC cards (`type:<locale>:DOC` tag).
 *
 * Next allows no opengraph-image file under a catch-all, so these pages use
 * the editor's OG image or the root card (hasOgRoute: false).
 */
import type { Metadata } from 'next';
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { loadCards, staticSlugs } from '@/templates/article/data';
import { loadPage, pageMetadata, pathFrom } from '@/templates/article/route-helpers';
import { DocsTemplate } from '@/templates/docs/DocsTemplate';

export const revalidate = 86400;
export const dynamicParams = true;

const PREFIX = '/developers';
const TYPES: readonly CmsEntryType[] = ['DOC'];
type Params = Promise<{ slug?: string[] }>;

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  // The root (/developers) renders on its first request and is then cached like the rest.
  const slugs = await staticSlugs('DOC', PREFIX);
  return slugs.filter((slug) => slug.length > 0).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata(pathFrom(PREFIX, slug), TYPES, { hasOgRoute: false });
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await loadPage(pathFrom(PREFIX, slug), TYPES);
  const docs = await loadCards({ type: 'DOC', locale: page.entry.locale, sort: 'order', limit: 200 });
  return <DocsTemplate {...page} docs={docs} />;
}
