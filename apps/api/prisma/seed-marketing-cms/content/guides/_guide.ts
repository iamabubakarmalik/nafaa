/**
 * Shared shape and builder for pillar guides (/guides/{slug}). Each guide
 * lives in `pages/` and exports a GuideSpec. Guides are long, practical and
 * link out to the blog posts, glossary terms, products and comparison pages
 * that go deeper on each chapter; the article template lists the RELATED
 * entries as "Posts in this guide" and the GLOSSARY_TERM tags as terms.
 * GUIDE allows no faq or comparisonTable block: the template shows the
 * entry's FAQs by itself, and tables are written in markdown.
 */

import type { DraftBlock, Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';

export type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

export function tip(body: string, title?: string): Block {
  return { type: 'callout', tone: 'tip', ...(title ? { title } : {}), body } as Block;
}

export function note(body: string, title?: string): Block {
  return { type: 'callout', tone: 'info', ...(title ? { title } : {}), body } as Block;
}

export interface GuideSpec {
  slug: string;
  title: string;
  summary: string;
  /** The guide in reading order. FAQs are shown by the template after the body. */
  blocks: Block[];
  faqs: [string, string][];
  /** Glossary terms used in the guide (TAG). */
  terms: string[];
  /** Posts, products and pages that go deeper (RELATED), most useful first. */
  related: EntryRef[];
  outline: string[];
  evidence: string[];
  sources?: Source[];
  factNote: string;
  needsOwner?: string[];
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

function faqKey(slug: string, i: number): string {
  return `guide-${slug}-${i + 1}`;
}

export function guideFaqs(p: GuideSpec): SeedFaq[] {
  return p.faqs.map(([question, answer], i) => ({
    key: faqKey(p.slug, i),
    topic: 'guides',
    question,
    answer,
    sourceNote: `Written for /guides/${p.slug}; product answers checked against the code on ${CHECKED_ON}.`,
    origin: 'new',
    evidence: p.evidence.slice(0, 2),
  }));
}

export function guidePage(p: GuideSpec, index: number): SeedEntry {
  const key = `GUIDE:${p.slug}`;
  return {
    type: 'GUIDE',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: { toc: true },
    blocks: withIds(key, [
      ...p.blocks,
      writerNotes(`Outline: ${p.outline.join(' · ')}.\n\nEvery number needs a source with a date. No fake authors, customers or surveys. Worked examples use round figures and say so.`),
    ]),
    faqKeys: p.faqs.map((_, i) => faqKey(p.slug, i)),
    relations: [
      ...p.terms.map((t) => ({ ref: `GLOSSARY_TERM:${t}` as EntryRef, kind: 'TAG' as const })),
      ...p.related.map((ref) => ({ ref, kind: 'RELATED' as const })),
    ],
    ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
    ...(p.focusKeyword ? { focusKeyword: p.focusKeyword } : {}),
    sortOrder: index + 1,
    origin: 'new (pillar guides, 26 Oct 2026)',
    evidence: p.evidence,
    ...(p.sources?.length ? { sources: p.sources } : {}),
    factCheck: { checkedOn: CHECKED_ON, note: p.factNote },
    dropped: [],
    needsOwner: ['Author: a real PERSON entry (O4).', ...(p.needsOwner ?? [])],
  };
}
