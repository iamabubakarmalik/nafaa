/**
 * Shared shape and builder for alternative pages (/alternatives/{slug}).
 * Each page lives in `pages/` and exports an AlternativeSpec.
 *
 * Facts about the thing being replaced come from its maker's own pages
 * (Excel) or a public reference (paper ledgers, desktop POS), opened on
 * CHECKED_ON and listed with every comparison table, as the API requires
 * (COMPETITOR_UNDATED). ALTERNATIVE is a fact-check type, so the pages stay
 * unpublished until the owner stamps them.
 */

import type { DraftBlock, Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';

export type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

/** Nafaa against the thing being replaced, with sources and check date. */
export function altTable(
  heading: string,
  caption: string,
  otherLabel: string,
  rows: [label: string, nafaa: string, other: string][],
  sources: Source[],
): Block {
  return {
    type: 'comparisonTable',
    heading,
    caption,
    columns: [
      { key: 'nafaa', label: 'Nafaa', highlight: true },
      { key: 'other', label: otherLabel },
    ],
    rows: rows.map(([label, nafaa, other]) => ({ label, cells: { nafaa: { value: nafaa }, other: { value: other } } })),
    sources,
    checkedAt: CHECKED_ON,
  } as Block;
}

export interface AlternativeSpec {
  slug: string;
  title: string;
  competitorName: string;
  competitorUrl: string;
  verdict: string;
  summary: string;
  /** Hero first, in reading order. The FAQ block is added at the end. */
  blocks: Block[];
  faqs: [string, string][];
  relations: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  sources: Source[];
  evidence: string[];
  factNote: string;
  needsOwner: string[];
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

function faqKey(slug: string, i: number): string {
  return `alt-${slug}-${i + 1}`;
}

export function alternativeFaqs(p: AlternativeSpec): SeedFaq[] {
  return p.faqs.map(([question, answer], i) => ({
    key: faqKey(p.slug, i),
    topic: 'buying',
    question,
    answer,
    sourceNote: `Sources on /alternatives/${p.slug}, checked ${CHECKED_ON}; Nafaa answers checked against the code.`,
    origin: 'new',
    evidence: p.evidence.slice(0, 2),
  }));
}

export function alternativePage(p: AlternativeSpec, index: number): SeedEntry {
  const key = `ALTERNATIVE:${p.slug}`;
  return {
    type: 'ALTERNATIVE',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: { competitorName: p.competitorName, competitorUrl: p.competitorUrl, verdict: p.verdict },
    blocks: withIds(key, [
      ...p.blocks,
      { type: 'faq', heading: 'Common questions' } as Block,
      writerNotes(
        [
          `Facts about ${p.competitorName} were read on ${CHECKED_ON} in the sources listed. Nafaa claims are backed by the files in evidence.`,
          'Before publishing: re-open the sources, read the page for fairness, then stamp fact-check in the admin.',
        ].join('\n\n'),
      ),
    ]),
    faqKeys: p.faqs.map((_, i) => faqKey(p.slug, i)),
    relations: p.relations,
    ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
    ...(p.focusKeyword ? { focusKeyword: p.focusKeyword } : {}),
    sortOrder: index + 1,
    origin: 'new (alternative pages, 26 Oct 2026)',
    evidence: p.evidence,
    sources: p.sources,
    factCheck: { checkedOn: CHECKED_ON, note: p.factNote },
    dropped: [],
    needsOwner: ['Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).', ...p.needsOwner],
  };
}
