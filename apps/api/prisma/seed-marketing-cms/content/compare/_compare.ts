/**
 * Shared shape and builder for compare pages. Each page lives in `pages/`.
 *
 * Competitor facts come only from the competitor's own site, opened on
 * CHECKED_ON and listed in `sources` and on the comparison table. Anything
 * that could not be confirmed there goes to `needsOwner`. COMPARE is a
 * fact-check type: the API blocks publishing (NOT_FACT_CHECKED) until the
 * owner stamps the page in the admin, so these pages stay unpublished until
 * the facts listed in needsOwner are verified.
 */

import type { DraftBlock, Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';

export type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';
const ORIGIN = 'apps/marketing/src/lib/data/compare.ts';

export interface CompareSpec {
  slug: string;
  title: string;
  competitorName: string;
  competitorUrl?: string;
  verdict: string;
  summary: string;
  blocks: Block[];
  relations: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  sources: Source[];
  evidence: string[];
  factNote: string;
  topics: string[];
  dropped: string[];
  needsOwner: string[];
  seoDescription?: string;
}

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

/** Two-column comparison with its sources and check date (COMPETITOR_UNDATED). */
export function compareTable(
  heading: string,
  caption: string,
  competitorLabel: string,
  rows: [label: string, nafaa: string, them: string][],
  sources: Source[],
): Block {
  return {
    type: 'comparisonTable',
    heading,
    caption,
    columns: [
      { key: 'nafaa', label: 'Nafaa', highlight: true },
      { key: 'them', label: competitorLabel },
    ],
    rows: rows.map(([label, nafaa, them]) => ({ label, cells: { nafaa: { value: nafaa }, them: { value: them } } })),
    sources,
    checkedAt: CHECKED_ON,
  } as Block;
}

export function comparePage(p: CompareSpec, index: number): SeedEntry {
  const key = `COMPARE:${p.slug}`;
  return {
    type: 'COMPARE',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: {
      competitorName: p.competitorName,
      ...(p.competitorUrl ? { competitorUrl: p.competitorUrl } : {}),
      verdict: p.verdict,
    },
    blocks: withIds(key, [
      ...p.blocks,
      writerNotes(
        [
          `Comparison topics: ${p.topics.join(', ')}.`,
          `Competitor facts were read on the vendor's own site on ${CHECKED_ON} (see sources). Nafaa cells are backed by the files in evidence.`,
          'Before publishing: verify every item in needsOwner, then stamp fact-check in the admin (NOT_FACT_CHECKED blocks publish until then).',
        ].join('\n\n'),
      ),
    ]),
    relations: p.relations,
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
    sortOrder: index + 1,
    origin: `${ORIGIN}#${p.slug}`,
    evidence: p.evidence,
    ...(p.sources.length ? { sources: p.sources } : {}),
    factCheck: { checkedOn: CHECKED_ON, note: p.factNote },
    dropped: p.dropped,
    needsOwner: p.needsOwner,
  };
}
