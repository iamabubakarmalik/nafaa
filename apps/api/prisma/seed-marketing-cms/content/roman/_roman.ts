/**
 * Roman Urdu search pages: top-level PAGE entries (en locale, template
 * `default`) written for the way shop owners in Pakistan search, such as
 * "udhaar likhne wali app" or "dukaan ka munafa kaise nikalein".
 *
 * Each page answers the searcher's question first (how to do it by hand,
 * what to look for, which free tool or template helps), then shows how
 * Nafaa does it with real screenshots. The body is simple Roman Urdu with
 * business terms in English (Sale, Profit, Cost, Expense, Stock, Discount);
 * the entry summary is a short English abstract shown in the answer box.
 * Roman Urdu is Latin script, so the pages stay in the `en` locale and the
 * site keeps lang="en".
 *
 * Amounts in copy are written as "1,200 rupay"; typed "Rs" prices are kept
 * for plan price tokens only.
 */

import type { DraftBlock } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';
import { page, type HeroSpec } from '../main-pages/_build';

type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';
const ORIGIN = 'new (Roman Urdu search pages, 26 Oct 2026)';
export const HUB_SLUG = 'hisaab-kitaab';

const PRIMARY = { label: 'Free Trial shuru karein', href: 'signup', trackAs: 'hero_signup' };
const SECONDARY = { label: 'WhatsApp par poochein', href: 'whatsapp', trackAs: 'whatsapp' };

export interface RomanSpec {
  slug: string;
  /** Natural page name, e.g. "Udhaar Likhne Wali App". */
  title: string;
  /** English abstract, 40-60 words (shown in the answer box). */
  summary: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  hero: Omit<HeroSpec, 'primary' | 'secondary' | 'layout'>;
  /** Answer-box facts in Roman Urdu. */
  facts: [string, string][];
  /** One Roman Urdu line under the facts. */
  romanLine: string;
  body: Block[];
  /** FAQs as people type them, answered in Roman Urdu (40-80 words). */
  faqs: [question: string, answer: string][];
  cta: { heading: string; body: string };
  relations: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  evidence: string[];
  sortOrder: number;
  needsOwner?: string[];
}

const faqKey = (slug: string, i: number): string => `roman-${slug}-${i + 1}`;

/** Expands a spec into the PAGE entry. */
export function romanPage(spec: RomanSpec): SeedEntry {
  const base = page({
    type: 'PAGE',
    slug: spec.slug,
    title: spec.title,
    summary: spec.summary,
    data: { template: 'default' },
    seoTitle: spec.seoTitle,
    seoDescription: spec.seoDescription,
    focusKeyword: spec.focusKeyword,
    hero: { ...spec.hero, layout: 'split', primary: PRIMARY, secondary: SECONDARY },
    answer: { heading: 'Seedha jawab', facts: spec.facts, romanUrdu: spec.romanLine },
    body: spec.body,
    faqKeys: spec.faqs.map((_, i) => faqKey(spec.slug, i)),
    cta: { heading: spec.cta.heading, body: spec.cta.body, primary: PRIMARY, secondary: SECONDARY },
    relations: [...spec.relations, ...(spec.slug === HUB_SLUG ? [] : [{ ref: `PAGE:${HUB_SLUG}` as EntryRef, kind: 'RELATED' as const }])],
    sortOrder: spec.sortOrder,
    evidence: spec.evidence,
    needsOwner: spec.needsOwner ?? [],
  });
  return {
    ...base,
    blocks: base.blocks?.map((b) => (b.type === 'faq' ? { ...b, heading: 'Log ye bhi poochte hain' } : b)) as DraftBlock[],
    origin: ORIGIN,
    factCheck: {
      checkedOn: CHECKED_ON,
      note: 'Every Nafaa claim checked against apps/web/src (see evidence) and the matching English product and industry pages. Prices only through {{price:...}} tokens. No outside facts are cited.',
    },
  };
}

/** The page's own FAQs. */
export function romanFaqs(spec: RomanSpec): SeedFaq[] {
  return spec.faqs.map(([question, answer], i) => ({
    key: faqKey(spec.slug, i),
    topic: 'roman-urdu',
    question,
    answer,
    sourceNote: `Roman Urdu page /${spec.slug}; feature claims checked against the evidence files of that entry.`,
    origin: ORIGIN,
    evidence: spec.evidence.slice(0, 2),
  }));
}

/** Flow diagram with Roman Urdu labels (ids are generated from the order). */
export function flow(nodes: [label: string, icon: string, note?: string][]): Record<string, unknown> {
  const ids = nodes.map((_, i) => `n${i + 1}`);
  return {
    kind: 'flow',
    nodes: nodes.map(([label, icon, note], i) => ({ id: ids[i], label, icon, ...(note ? { note } : {}) })),
    edges: ids.slice(1).map((id, i) => ({ from: ids[i], to: id })),
    animate: true,
  };
}
