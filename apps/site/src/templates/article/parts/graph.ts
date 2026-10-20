/**
 * One JSON-LD @graph per page, built by S1's `buildEntryGraph`. The S5
 * templates add the few nodes it does not emit for their types, through the
 * entry's `schemaExtra` list, so the page still has exactly one graph:
 * - FAQPage on article, glossary and docs pages that show FAQs (it mirrors
 *   the visible FAQ list exactly);
 * - DefinedTermSet with its terms on the glossary hub;
 * - `citation` for Article pages with a sources block.
 */
import type { PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { buildEntryGraph } from '@/lib/seo/graph';
import { markdownToPlain } from '@/lib/seo/text';

type Node = Record<string, unknown>;

export interface S5GraphInput {
  entry: PublicEntry;
  site: SiteSettings;
  entity: PublicEntity | null;
  /** Cards listed on a hub page (ItemList). */
  items?: { name: string; url: string }[];
  /** Extra nodes for this template. */
  extra?: Node[];
  /** Add FAQPage for the visible FAQs (templates whose graph does not include it). */
  faq?: boolean;
}

export function faqPageNode(entry: PublicEntry): Node | null {
  if (!entry.faqs.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${entry.url}#faq`,
    mainEntity: entry.faqs.map((faq) => ({
      '@type': 'Question',
      name: markdownToPlain(faq.question),
      acceptedAnswer: { '@type': 'Answer', text: markdownToPlain(faq.answer) },
    })),
  };
}

/** Outbound sources cited by the entry's `sources` blocks, as schema `citation` items. */
export function citations(entry: PublicEntry): Node[] {
  return entry.blocks.flatMap((block) =>
    block.type === 'sources'
      ? block.items.map((item) => ({ '@type': 'CreativeWork', name: item.title, url: item.url, publisher: { '@type': 'Organization', name: item.publisher } }))
      : [],
  );
}

export function s5Graph({ entry, site, entity, items, extra = [], faq }: S5GraphInput): Record<string, unknown> {
  const nodes = [...extra];
  if (faq) {
    const node = faqPageNode(entry);
    if (node) nodes.push(node);
  }
  const withExtra: PublicEntry = nodes.length ? { ...entry, seo: { ...entry.seo, schemaExtra: [...entry.seo.schemaExtra, ...nodes] } } : entry;
  const graph = buildEntryGraph(withExtra, { site, entity, items });
  // Attach citations and the word count to the article node S1 built.
  const cited = citations(entry);
  const article = (graph['@graph'] as Node[]).find((node) => node['@id'] === `${entry.url}#article`);
  if (article) {
    if (cited.length) article.citation = cited;
    if (entry.quality.wordCount > 0) article.wordCount = entry.quality.wordCount;
  }
  return graph;
}
