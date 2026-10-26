/**
 * Shared shape and builder for the free tools (TOOL entries, /tools/{slug}).
 *
 * A tool page is the calculator island (placed by the Tool template right
 * under the H1, from `data.toolKey`), then an answer box, "how to use"
 * steps (HowTo schema), the formula, a worked example in rupees, notes,
 * sources and the tool's own FAQs. Each FAQ belongs to one tool only, so it
 * counts towards that page's quality gate.
 *
 * Copy rules: amounts in text are written as "1,200 rupees" (typed "Rs"
 * prices are reserved for plan price tokens), and the calculators run in
 * the browser, so no claim here depends on Nafaa features beyond the
 * evidence files listed per tool.
 */

import type { DraftBlock, Source, ToolKey } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';

type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';
const ORIGIN = 'new (free tools pass, 26 Oct 2026)';

export interface ToolFaq {
  q: string;
  a: string;
}

export interface ToolSpec {
  slug: string;
  toolKey: ToolKey;
  /** Short kind for the default title pattern ("Break-even"). */
  kind: string;
  title: string;
  /** 40-60 words: the answer-first intro under the H1. */
  summary: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  facts: [string, string][];
  romanUrdu: string;
  steps: [string, string][];
  /** Markdown sections after the steps: formula, worked example, notes. */
  sections: string[];
  callout?: { tone: 'info' | 'tip' | 'warning'; title?: string; body: string };
  sources?: Source[];
  faqs: ToolFaq[];
  relations: EntryRef[];
  evidence: string[];
  factNote: string;
  sortOrder: number;
  featured?: boolean;
  needsOwner?: string[];
}

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

export function faqKey(slug: string, i: number): string {
  return `tool-${slug}-${i + 1}`;
}

export function toolFaqs(spec: ToolSpec): SeedFaq[] {
  return spec.faqs.map((f, i) => ({
    key: faqKey(spec.slug, i),
    topic: 'tools',
    question: f.q,
    answer: f.a,
    sourceNote: spec.factNote,
    origin: ORIGIN,
    evidence: spec.evidence,
  }));
}

export function toolEntry(spec: ToolSpec): SeedEntry {
  const key = `TOOL:${spec.slug}`;
  const blocks: Block[] = [
    { type: 'answerBox', facts: spec.facts.map(([label, value]) => ({ label, value })), romanUrdu: spec.romanUrdu } as Block,
    { type: 'steps', heading: `How to use the ${spec.title.toLowerCase()}`, items: spec.steps.map(([title, body]) => ({ title, body })), howTo: true } as Block,
    ...spec.sections.map((markdown) => ({ type: 'richText', markdown }) as Block),
  ];
  if (spec.callout) blocks.push({ type: 'callout', tone: spec.callout.tone, ...(spec.callout.title ? { title: spec.callout.title } : {}), body: spec.callout.body } as Block);
  if (spec.sources?.length) blocks.push({ type: 'sources', heading: 'Sources', items: spec.sources } as Block);
  blocks.push({ type: 'faq', heading: 'Common questions' } as Block);
  return {
    type: 'TOOL',
    slug: spec.slug,
    title: spec.title,
    summary: spec.summary,
    data: { toolKey: spec.toolKey, kind: spec.kind },
    blocks: withIds(key, blocks),
    faqKeys: spec.faqs.map((_, i) => faqKey(spec.slug, i)),
    relations: spec.relations.map((ref) => ({ ref, kind: 'RELATED' as const })),
    seoTitle: spec.seoTitle,
    seoDescription: spec.seoDescription,
    focusKeyword: spec.focusKeyword,
    sortOrder: spec.sortOrder,
    ...(spec.featured ? { featured: true } : {}),
    origin: ORIGIN,
    evidence: spec.evidence,
    sources: spec.sources ?? [],
    factCheck: { checkedOn: CHECKED_ON, note: spec.factNote },
    dropped: [],
    needsOwner: spec.needsOwner ?? [],
  };
}
