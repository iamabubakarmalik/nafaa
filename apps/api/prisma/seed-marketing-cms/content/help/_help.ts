/**
 * Help center (/help): short "how to do X in Nafaa" articles, one per task.
 *
 * The help center is a PAGE tree rendered by the docs template (site route
 * app/help): the root PAGE `help` (/help), one topic PAGE per group
 * (/help/{topic}) and the task articles under each topic
 * (/help/{topic}/{article}). PAGE has no word gate, so a task article stays
 * short (350-700 words) and still indexes.
 *
 * Every article opens with what the task is for, then numbered steps
 * (`howTo: true`, emitted as HowTo schema), then screenshots and tips, a
 * short FAQ where one is natural, and links to the product page, glossary
 * terms and other help articles. UI labels are quoted exactly as the app
 * shows them (many are Roman Urdu); each article's `evidence` lists the
 * apps/web/src files the steps were checked against.
 */

import type { DraftBlock } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';
import { HELP_SHOT, type HelpShotKey } from './shots';

export type Block = Omit<DraftBlock, 'id'>;

export const CHECKED_ON = '2026-10-26';
export const ORIGIN = 'new (help center, 26 Oct 2026)';

/** Topic slugs (PAGE children of /help), in display order. */
export const TOPICS = [
  'getting-started',
  'products-and-stock',
  'pos-counter',
  'khata-and-customers',
  'reports-and-cash',
  'grow',
  'by-business-type',
] as const;
export type HelpTopic = (typeof TOPICS)[number];

export interface HelpArticle {
  /** Unique among PAGE slugs (the seed keys PAGEs by slug). */
  slug: string;
  /** "How to …" or a task name; under 50 characters (the site adds " | Nafaa"). */
  title: string;
  /** 40-60 words: what the reader can do after this article. */
  summary: string;
  seoDescription?: string;
  focusKeyword?: string;
  /** Opening markdown: what the task is for, when you need it, where it lives in the app. */
  intro: string;
  /** The task as numbered steps (HowTo schema). */
  steps: { heading: string; intro?: string; items: [title: string, body: string][] };
  /** Blocks after the steps: screenshots (`helpShot`), tips, notes, short prose. */
  more?: Block[];
  /** Short FAQ shown after the body ([question, answer] in markdown). */
  faqs?: [string, string][];
  /** Glossary term slugs used in the article (TAG relations). */
  terms?: string[];
  /** Product page first, then other help articles, guides, templates (RELATED). */
  related: EntryRef[];
  /** apps/web/src (and apps/api/src) files the steps were checked against. */
  evidence: string[];
  needsOwner?: string[];
}

export function tip(body: string, title?: string): Block {
  return { type: 'callout', tone: 'tip', ...(title ? { title } : {}), body } as Block;
}

export function note(body: string, title?: string): Block {
  return { type: 'callout', tone: 'info', ...(title ? { title } : {}), body } as Block;
}

export function warn(body: string, title?: string): Block {
  return { type: 'callout', tone: 'warning', ...(title ? { title } : {}), body } as Block;
}

export function prose(markdown: string): Block {
  return { type: 'richText', markdown } as Block;
}

/** A full-width app screenshot with optional numbered callouts (x/y in % of the image). */
export function helpShot(
  key: HelpShotKey,
  caption: string,
  opts: { heading?: string; body?: string; callouts?: { x: number; y: number; label: string }[]; url?: string } = {},
): Block {
  return {
    type: 'screenshot',
    ...(opts.heading ? { heading: opts.heading } : {}),
    ...(opts.body ? { body: opts.body } : {}),
    mediaId: HELP_SHOT[key],
    frame: 'browser',
    ...(opts.url ? { url: opts.url } : {}),
    ...(opts.callouts ? { callouts: opts.callouts } : {}),
    layout: 'full',
    caption,
  } as Block;
}

/** Site path of a help article, for in-text links. */
export function helpPath(topic: HelpTopic, slug: string): string {
  return `/help/${topic}/${slug}`;
}

function faqKey(slug: string, i: number): string {
  return `help-${slug}-${i + 1}`;
}

export function helpFaqs(a: HelpArticle): SeedFaq[] {
  return (a.faqs ?? []).map(([question, answer], i) => ({
    key: faqKey(a.slug, i),
    topic: 'help',
    question,
    answer,
    sourceNote: `Written for the help article ${a.slug}; checked against the app code on ${CHECKED_ON}.`,
    origin: ORIGIN,
    evidence: a.evidence.slice(0, 2),
  }));
}

export function helpArticle(topic: HelpTopic, a: HelpArticle, index: number): SeedEntry {
  const key = `PAGE:${a.slug}`;
  const hasFaqs = (a.faqs?.length ?? 0) > 0;
  const blocks: Block[] = [
    prose(a.intro),
    { type: 'steps', heading: a.steps.heading, ...(a.steps.intro ? { intro: a.steps.intro } : {}), items: a.steps.items.map(([title, body]) => ({ title, body })), howTo: true } as Block,
    ...(a.more ?? []),
    ...(hasFaqs ? [{ type: 'faq', heading: 'Questions' } as Block] : []),
    { type: 'relatedLinks', heading: 'Related', source: 'related', limit: 6 } as Block,
    ...(a.terms?.length ? [{ type: 'relatedLinks', heading: 'Terms used here', source: 'tags', tagType: 'GLOSSARY_TERM', limit: 6 } as Block] : []),
    writerNotes(`Help article under /help/${topic}. Steps checked against: ${a.evidence.join(', ')}. Re-check labels when the screen changes.`),
  ];
  return {
    type: 'PAGE',
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    parent: `PAGE:${topic}`,
    data: { template: 'default' },
    blocks: withIds(key, blocks),
    ...(hasFaqs ? { faqKeys: (a.faqs ?? []).map((_, i) => faqKey(a.slug, i)) } : {}),
    relations: [
      ...a.related.map((ref) => ({ ref, kind: 'RELATED' as const })),
      ...(a.terms ?? []).map((t) => ({ ref: `GLOSSARY_TERM:${t}` as EntryRef, kind: 'TAG' as const })),
    ],
    ...(a.seoDescription ? { seoDescription: a.seoDescription } : {}),
    ...(a.focusKeyword ? { focusKeyword: a.focusKeyword } : {}),
    sortOrder: index + 1,
    origin: ORIGIN,
    evidence: a.evidence,
    factCheck: { checkedOn: CHECKED_ON, note: 'Steps, labels, menu paths and keys checked against the app code and the local demo shops.' },
    dropped: [],
    needsOwner: a.needsOwner ?? [],
  };
}

export interface HelpTopicSpec {
  slug: HelpTopic;
  title: string;
  summary: string;
  /** Short markdown intro; the template lists the articles below it. */
  intro: string;
  related: EntryRef[];
  evidence: string[];
}

export function helpTopic(t: HelpTopicSpec, index: number): SeedEntry {
  return {
    type: 'PAGE',
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    parent: 'PAGE:help',
    data: { template: 'default' },
    blocks: withIds(`PAGE:${t.slug}`, [prose(t.intro), { type: 'relatedLinks', heading: 'Related', source: 'related', limit: 6 } as Block]),
    relations: t.related.map((ref) => ({ ref, kind: 'RELATED' as const })),
    sortOrder: index + 1,
    origin: ORIGIN,
    evidence: t.evidence,
    factCheck: { checkedOn: CHECKED_ON, note: 'Topic page; the articles below carry the checked steps.' },
    dropped: [],
    needsOwner: [],
  };
}
