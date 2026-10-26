/**
 * Shared shape and builder for best-of pages (/best/{slug}). Each page lives
 * in `pages/` and exports a BestOfSpec.
 *
 * Competitor facts come only from each vendor's own site, opened on
 * CHECKED_ON and listed in `sources` and on the quick-pick table. Where a
 * vendor's site does not say something, the page says "not stated" rather
 * than guessing. Nafaa is on every list and is disclosed as ours; the
 * template adds its own disclosure too. BEST_OF is a fact-check type, so the
 * pages stay unpublished until the owner stamps them.
 */

import type { DraftBlock, Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';

export type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

export interface BestOfItemSpec {
  name: string;
  isNafaa: boolean;
  url?: string;
  price?: string;
  priceSource?: Source;
  strengths: string[];
  weaknesses: string[];
  bestFor: string;
}

/** Quick-pick table with competitor columns: sources and the check date are required (COMPETITOR_UNDATED). */
export function quickPick(
  heading: string,
  caption: string,
  columns: { key: string; label: string; highlight?: boolean }[],
  rows: [string, ...string[]][],
  sources: Source[],
): Block {
  return {
    type: 'comparisonTable',
    heading,
    caption,
    columns,
    rows: rows.map(([label, ...cells]) => ({ label, cells: Object.fromEntries(columns.map((c, i) => [c.key, { value: cells[i] ?? '' }])) })),
    sources,
    checkedAt: CHECKED_ON,
  } as Block;
}

export interface BestOfSpec {
  slug: string;
  title: string;
  category: string;
  summary: string;
  methodology: string;
  items: BestOfItemSpec[];
  /** Hero, intro, quick-pick table, buyer guidance, in reading order. The FAQ block is added at the end. */
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
  return `best-${slug}-${i + 1}`;
}

export function bestOfFaqs(p: BestOfSpec): SeedFaq[] {
  return p.faqs.map(([question, answer], i) => ({
    key: faqKey(p.slug, i),
    topic: 'buying',
    question,
    answer,
    sourceNote: `Vendor sites listed on /best/${p.slug}, checked ${CHECKED_ON}; Nafaa answers checked against the code.`,
    origin: 'new',
    evidence: p.evidence.slice(0, 2),
  }));
}

export function bestOfPage(p: BestOfSpec, index: number): SeedEntry {
  const key = `BEST_OF:${p.slug}`;
  return {
    type: 'BEST_OF',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: { category: p.category, methodology: p.methodology, items: p.items },
    blocks: withIds(key, [
      ...p.blocks,
      { type: 'faq', heading: 'Common questions' } as Block,
      writerNotes(
        [
          `Competitor facts were read on each vendor's own site on ${CHECKED_ON} (see sources). Nafaa facts are backed by the files in evidence.`,
          'Before publishing: re-open each vendor page, check every strength, weakness and price line, then stamp fact-check in the admin.',
        ].join('\n\n'),
      ),
    ]),
    faqKeys: p.faqs.map((_, i) => faqKey(p.slug, i)),
    relations: p.relations,
    ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
    ...(p.focusKeyword ? { focusKeyword: p.focusKeyword } : {}),
    sortOrder: index + 1,
    origin: 'new (best-of pages, 26 Oct 2026)',
    evidence: p.evidence,
    sources: p.sources,
    factCheck: { checkedOn: CHECKED_ON, note: p.factNote },
    dropped: [],
    needsOwner: ['Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).', ...p.needsOwner],
  };
}
