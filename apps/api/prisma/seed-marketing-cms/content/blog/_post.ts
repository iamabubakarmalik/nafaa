/**
 * Shared shape and builder for blog posts. Each post lives in its own file
 * under `posts/` and exports a PostSpec; `index.ts` turns the list into seed
 * entries. Posts are written as blocks (prose, screenshots, steps, diagrams,
 * callouts, sources) in reading order.
 */

import type { DraftBlock, Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { richText, withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';

export type Block = Omit<DraftBlock, 'id'>;

/** Date the current text and its sources were last checked. */
export const CHECKED_ON = '2026-10-26';
const IMPORT_CHECKED_ON = '2026-10-20';
const ORIGIN = 'apps/marketing/src/lib/data/blog/posts.ts';
export const FAKE_AUTHOR = 'Fake author persona from blog/types.ts (no such person on record).';

export interface PostSpec {
  slug: string;
  title: string;
  summary?: string;
  category: 'guides' | 'industry' | 'compliance' | 'business' | 'product';
  /** TAG relations (shown as topics). */
  tags?: EntryRef[];
  /** RELATED relations (further reading). */
  related?: EntryRef[];
  /** Legacy: the whole post as one markdown body. */
  body?: string;
  /** The post as blocks in reading order (preferred). */
  blocks?: Block[];
  outline: string[];
  dropped: string[];
  needsOwner?: string[];
  noindex?: boolean;
  evidence?: string[];
  /** Official or vendor pages opened while writing, with the date. */
  sources?: Source[];
  /** What was checked, for factCheck.note. */
  factNote?: string;
  /** True for posts written new (no source in apps/marketing). */
  isNew?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

/** An official source opened on CHECKED_ON. */
export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

/** The "rules change" note every tax or legal post carries. */
export function checkRules(body: string): Block {
  return {
    type: 'callout',
    tone: 'warning',
    title: `Check the latest rules (checked on ${formatDate(CHECKED_ON)})`,
    body,
  };
}

export function sourcesBlock(items: Source[], heading = 'Official sources'): Block {
  return { type: 'sources', heading, items };
}

export function tip(body: string, title?: string): Block {
  return { type: 'callout', tone: 'tip', ...(title ? { title } : {}), body };
}

export function note(body: string, title?: string): Block {
  return { type: 'callout', tone: 'info', ...(title ? { title } : {}), body };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}

export function post(p: PostSpec, index: number): SeedEntry {
  const key = `BLOG_POST:${p.slug}`;
  const content: Block[] = p.blocks ?? (p.body ? [richText(p.body)] : []);
  const written = content.length > 0;
  const notes = `Outline: ${p.outline.join(' · ')}.\n\nEvery number needs a source with a date. No fake authors, customers or surveys.`;
  return {
    type: 'BLOG_POST',
    slug: p.slug,
    title: p.title,
    ...(p.summary ? { summary: p.summary } : {}),
    data: { toc: true },
    blocks: withIds(key, [...content, writerNotes(notes)]),
    relations: [
      { ref: `BLOG_CATEGORY:${p.category}`, kind: 'TAG' },
      ...(p.tags ?? []).map((ref) => ({ ref, kind: 'TAG' as const })),
      ...(p.related ?? []).map((ref) => ({ ref, kind: 'RELATED' as const })),
    ],
    ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
    ...(p.focusKeyword ? { focusKeyword: p.focusKeyword } : {}),
    ...(p.noindex ? { noindex: true } : {}),
    ...(written ? {} : { stub: true }),
    sortOrder: index + 1,
    origin: p.isNew ? 'new' : `${ORIGIN}#${p.slug}`,
    evidence: p.evidence ?? [],
    ...(p.sources?.length ? { sources: p.sources } : {}),
    factCheck: {
      checkedOn: p.blocks ? CHECKED_ON : IMPORT_CHECKED_ON,
      note:
        p.factNote ??
        (written
          ? 'Product statements checked against the code (see evidence); general trade knowledge only; no invented numbers, customers or surveys.'
          : 'Stub: title and outline only.'),
    },
    dropped: p.dropped,
    needsOwner: ['Author: a real PERSON entry (O4).', ...(p.needsOwner ?? [])],
  };
}
