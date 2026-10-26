/**
 * Help center: /help and every PAGE below it (topic pages at /help/{topic},
 * task articles at /help/{topic}/{article}). Rendered with the docs template
 * and its tree, like /developers. The tree is the root's children (topics)
 * plus each topic's children (articles), in the API's `order` sort.
 *
 * Next allows no opengraph-image file under a catch-all, so these pages use
 * the editor's OG image or the root card (hasOgRoute: false).
 */
import type { Metadata } from 'next';
import type { CmsEntryType, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { loadCards, loadEntry, staticSlugs } from '@/templates/article/data';
import { loadPage, pageMetadata, pathFrom } from '@/templates/article/route-helpers';
import { DocsTemplate, HELP_CENTER } from '@/templates/docs/DocsTemplate';

export const revalidate = 86400;
export const dynamicParams = true;

const PREFIX = HELP_CENTER.rootPath;
const TYPES: readonly CmsEntryType[] = ['PAGE'];
type Params = Promise<{ slug?: string[] }>;

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  // The root (/help) renders on its first request and is then cached like the rest.
  const slugs = await staticSlugs('PAGE', PREFIX);
  return slugs.filter((slug) => slug.length > 0).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata(pathFrom(PREFIX, slug), TYPES, { hasOgRoute: false });
}

function cardOf(entry: PublicEntry): EntryCard {
  return {
    id: entry.id,
    type: entry.type,
    locale: entry.locale,
    path: entry.path,
    url: entry.url,
    title: entry.title,
    summary: entry.summary,
    image: entry.image,
    contentUpdatedAt: entry.dateModified,
  };
}

/** Root, topics and articles as one card list for the docs tree. */
async function helpCards(entry: PublicEntry): Promise<EntryCard[]> {
  const root = entry.path === PREFIX ? entry : await loadEntry(PREFIX, entry.locale);
  if (!root) return [];
  const topics = root.children;
  const articles = await Promise.all(
    topics.map((topic) => loadCards({ type: 'PAGE', locale: entry.locale, parentId: topic.id, sort: 'order', limit: 100 })),
  );
  return [cardOf(root), ...topics.flatMap((topic, i) => [topic, ...(articles[i] ?? [])])];
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await loadPage(pathFrom(PREFIX, slug), TYPES);
  const docs = await helpCards(page.entry);
  return <DocsTemplate {...page} docs={docs} section={HELP_CENTER} />;
}
