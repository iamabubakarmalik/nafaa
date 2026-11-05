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
import { titleFor } from '@/lib/seo/metadata';

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

/** Below this length a help hub or topic title says too little in search results. */
const SHORT_TITLE = 35;

/**
 * The search title for the help root and topic pages. Their CMS titles are
 * section names ("Getting started", 15 characters), which say nothing about
 * the page in a results list. While the SEO title is that short, it is
 * extended with what the page holds: "Getting started: 4 step-by-step Nafaa
 * help guides". A longer SEO title set in the CMS is used as it is, and task
 * articles keep theirs ("How to create your Nafaa account").
 */
function helpSearchTitle(entry: PublicEntry, depth: number): string | null {
  const title = entry.seo.title.trim();
  if (title.length >= SHORT_TITLE || entry.locale !== 'en') return null;
  if (depth === 0) return `${title}: guides for billing, stock and khata`;
  if (depth !== 1) return null;
  const count = entry.children.length;
  return `${entry.title.trim()}: ${count > 1 ? `${count} ` : ''}step-by-step Nafaa help guides`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const path = pathFrom(PREFIX, slug);
  const metadata = await pageMetadata(path, TYPES, { hasOgRoute: false });
  const entry = metadata.title ? await loadEntry(path) : null;
  const title = entry ? helpSearchTitle(entry, slug?.length ?? 0) : null;
  if (!title) return metadata;
  return {
    ...metadata,
    title: titleFor(title, entry?.seo.titleIncludesBrand || /\bNafaa\b/.test(title)),
    openGraph: { ...metadata.openGraph, title },
    twitter: { ...metadata.twitter, title },
  };
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
