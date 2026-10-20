/**
 * The frame every core template renders inside: one JSON-LD @graph for the
 * page (lib/seo/graph.ts plus any template nodes), the development fixture
 * bar, and the locale wrapper. Templates pass what their schema needs
 * (plans for offers, cards for ItemList).
 */
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/seo/JsonLd';
import type { PublicEntry, PublicPlan } from '@/lib/cms/contract/cms-contract';
import { DEFAULT_LOCALE, dirFor } from '@/lib/cms/locale';
import { buildEntryGraph, ids } from '@/lib/seo/graph';
import { markdownToPlain } from '@/lib/seo/text';
import { isFixtureEntry, loadEntity, loadSite } from './data';
import { FixtureBar } from './ui';

export interface PageFrameProps {
  entry: PublicEntry;
  plans?: PublicPlan[];
  /** Cards listed on the page (hubs), for ItemList. */
  items?: { name: string; url: string }[];
  /** Extra nodes added to the same @graph (template-specific). */
  nodes?: Record<string, unknown>[];
  children: ReactNode;
}

export async function PageFrame({ entry, plans, items, nodes = [], children }: PageFrameProps) {
  const [site, entity] = await Promise.all([loadSite(entry.locale), loadEntity(entry.locale)]);
  const graph = buildEntryGraph(entry, { site, entity, plans, items });
  if (nodes.length) (graph['@graph'] as unknown[]).push(...nodes);

  const body = (
    <>
      <JsonLd data={graph} />
      {process.env.NODE_ENV !== 'production' && isFixtureEntry(entry) ? <FixtureBar /> : null}
      {children}
    </>
  );
  if (entry.locale === DEFAULT_LOCALE) return body;
  return (
    <div lang={entry.locale} dir={dirFor(entry.locale)}>
      {body}
    </div>
  );
}

/** A WebPage node for templates graph.ts does not cover (roadmap). */
export function webPageNode(entry: PublicEntry, type = 'WebPage', extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    '@type': type,
    '@id': `${entry.url}#webpage`,
    url: entry.url,
    name: entry.seo.title,
    description: entry.seo.description,
    isPartOf: { '@id': ids.website() },
    ...(entry.breadcrumbs.length > 1 ? { breadcrumb: { '@id': `${entry.url}#breadcrumb` } } : {}),
    ...(entry.dateModified ? { dateModified: entry.dateModified } : {}),
    ...extra,
  };
}

/** FAQPage node mirroring exactly the visible FAQ items (for templates graph.ts leaves without one). */
export function faqPageNode(url: string, faqs: readonly { question: string; answer: string }[]): Record<string, unknown> | null {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: markdownToPlain(faq.question),
      acceptedAnswer: { '@type': 'Answer', text: markdownToPlain(faq.answer) },
    })),
  };
}
