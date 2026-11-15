/**
 * Builder for the Urdu blog posts written after the first Urdu batch. It
 * produces the same entry shape as the older hand-exported files (cover
 * block, text blocks with stable ids, hidden writer notes, Urdu relations),
 * so a post only has to supply its text. Urdu entries link only to Urdu
 * entries (`@ur`) and to `/ur/...` paths.
 */
import type { DraftBlock, Source } from '../../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../../lib/blocks';
import { mediaRef } from '../../../lib/media';
import type { EntryRef, SeedEntry, SeedFaq } from '../../../lib/types';
import { CHECKED_ON } from '../../blog/_post';

export const faqs: SeedFaq[] = [];

type Block = Omit<DraftBlock, 'id'>;

export interface UrPost {
  /** Same slug as the English post. */
  slug: string;
  title: string;
  summary: string;
  seoDescription: string;
  category: 'guides' | 'industry' | 'business';
  /** Media key of the cover (without the `media_` prefix), as in the English post. */
  cover: string;
  /** Urdu caption for the cover, ending with the photo credit. */
  coverCaption: string;
  tags?: string[];
  related?: string[];
  blocks: Block[];
  sources?: Source[];
  sortOrder: number;
  evidence: string[];
}

export function md(markdown: string): Block {
  return { type: 'richText', markdown } as Block;
}

export function tipUr(title: string, body: string): Block {
  return { type: 'callout', tone: 'tip', title, body } as Block;
}

export function stepsUr(heading: string, items: [string, string][], intro?: string): Block {
  return {
    type: 'steps',
    heading,
    ...(intro ? { intro } : {}),
    items: items.map(([title, body]) => ({ title, body })),
    howTo: true,
  } as Block;
}

export function shotUr(mediaId: string, heading: string, body: string, caption: string, url?: string): Block {
  return {
    type: 'screenshot',
    heading,
    body,
    mediaId,
    frame: 'browser',
    ...(url ? { url } : {}),
    layout: 'full',
    caption,
  } as Block;
}

export function sourcesUr(items: Source[], heading = 'ذرائع'): Block {
  return { type: 'sources', heading, items } as Block;
}

/** Markdown table as a text block (comparison table blocks are not allowed on blog posts). */
export function tableUr(heading: string, intro: string, head: string[], rows: string[][]): Block {
  const header = `| ${head.join(' | ')} |`;
  const sep = `| ${head.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, '/')).join(' | ')} |`).join('\n');
  return md(`### ${heading}\n\n${intro}\n\n${header}\n${sep}\n${body}`);
}

export function urPost(p: UrPost): SeedEntry {
  const key = `BLOG_POST:${p.slug}@ur`;
  const cover: Block = {
    type: 'screenshot',
    mediaId: mediaRef(p.cover),
    frame: 'none',
    layout: 'full',
    caption: p.coverCaption,
  } as Block;
  const toRef = (r: string): EntryRef => `${r}@ur` as EntryRef;
  return {
    type: 'BLOG_POST',
    locale: 'ur',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: { toc: true },
    blocks: withIds(key, [cover, ...p.blocks, writerNotes(`Translation of content/blog/posts/${p.slug}.ts. Same claims as the English post; no invented numbers, customers or surveys.`)]),
    relations: [
      { ref: `BLOG_CATEGORY:${p.category}@ur` as EntryRef, kind: 'TAG' },
      ...(p.tags ?? []).map((r) => ({ ref: toRef(r), kind: 'TAG' as const })),
      ...(p.related ?? []).map((r) => ({ ref: toRef(r), kind: 'RELATED' as const })),
    ],
    imageId: mediaRef(p.cover),
    ogImageId: mediaRef(p.cover),
    seoDescription: p.seoDescription,
    sortOrder: p.sortOrder,
    origin: `translation of content/blog/posts/${p.slug}.ts (15 Nov 2026)`,
    evidence: p.evidence,
    ...(p.sources?.length ? { sources: p.sources } : {}),
    factCheck: { checkedOn: CHECKED_ON, note: 'Urdu translation of the English entry; claims unchanged.' },
    dropped: [],
    needsOwner: ['Author: a real PERSON entry (O4).'],
  };
}
