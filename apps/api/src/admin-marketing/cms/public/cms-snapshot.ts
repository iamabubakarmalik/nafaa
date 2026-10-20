/**
 * An entry's content as the public API serves it, in one of two modes:
 * - `published`: the live snapshot (`CmsEntry.published`, contract
 *   `PublishedSnapshot`, written by A1's publish step). Public responses
 *   use only this.
 * - `draft`: the draft columns plus A1's preview-mode checks (final title,
 *   robots, quality), for preview links.
 *
 * Tokens and `entry:` links are still raw here; the public service resolves
 * them at read time so price and slug changes show without republishing.
 */
import type { CmsEntry, Prisma } from '@prisma/client';
import type { FeatureStatus, PublicRobots, SiteTemplate } from '../contract/cms-contract';
import { readPublished } from '../publishing/snapshot';
import type { PreparedEntry } from '../seo/cms-checks.service';
import { isRecord } from './cms-http';

export type ContentMode = 'published' | 'draft';

export interface EntryRelationRef {
  entryId: string;
  kind: 'TAG' | 'RELATED';
  sortOrder: number;
}

export interface EntryContent {
  template: SiteTemplate | null;
  title: string;
  summary: string | null;
  blocks: Record<string, unknown>[];
  data: Record<string, unknown>;
  relations: EntryRelationRef[];
  faqIds: string[];
  imageId: string | null;
  ogImageId: string | null;
  /** Final title (may hold tokens) and whether it already contains the brand. */
  seoTitle: string;
  titleIncludesBrand: boolean;
  seoDescription: string;
  /** Null means self. */
  canonicalUrl: string | null;
  robots: PublicRobots;
  schemaExtra: Record<string, unknown>[];
  authorId: string | null;
  reviewerId: string | null;
  factCheckedAt: string | null;
  featureStatus: FeatureStatus | null;
  quality: { wordCount: number; gate: number | null; passed: boolean };
  mediaIds: string[];
  sortOrder: number;
  featured: boolean;
}

/** Columns needed to build public responses. */
export const ENTRY_ROW_SELECT = {
  id: true, type: true, locale: true, translationKey: true, slug: true, path: true, parentId: true, status: true,
  title: true, summary: true, blocks: true, data: true, relations: true, faqIds: true, imageId: true,
  seoTitle: true, seoDescription: true, canonicalUrl: true, noindex: true, nofollow: true, ogImageId: true,
  schemaExtra: true, wordCount: true, authorId: true, reviewerId: true, factCheckedAt: true,
  published: true, publishedPath: true, publishedAt: true, firstPublishedAt: true, contentUpdatedAt: true,
  sortOrder: true, featured: true, updatedAt: true,
} as const;

export type EntryRow = Pick<CmsEntry, keyof typeof ENTRY_ROW_SELECT>;

/**
 * Prisma filter for entries that are live: a published path, and PUBLISHED
 * or SCHEDULED (a live entry with a scheduled update stays live until the
 * update goes out).
 */
export const LIVE_WHERE = {
  publishedPath: { not: null },
  status: { in: ['PUBLISHED', 'SCHEDULED'] },
} satisfies Prisma.CmsEntryWhereInput;

function relationsOf(v: unknown): EntryRelationRef[] {
  if (!Array.isArray(v)) return [];
  const out: EntryRelationRef[] = [];
  for (const r of v) {
    if (!isRecord(r) || typeof r.entryId !== 'string') continue;
    if (r.kind !== 'TAG' && r.kind !== 'RELATED') continue;
    out.push({ entryId: r.entryId, kind: r.kind, sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : 0 });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Published content, or null when the entry is not live or its snapshot has an unknown format. */
export function publishedContent(row: EntryRow): EntryContent | null {
  if (row.publishedPath === null) return null;
  const snap = readPublished(row);
  if (!snap) return null;
  return {
    template: snap.template,
    title: snap.title,
    summary: snap.summary,
    blocks: (snap.blocks as unknown as Record<string, unknown>[]).filter((b) => isRecord(b) && b.hidden !== true),
    data: { ...(snap.data as unknown as Record<string, unknown>) },
    relations: relationsOf(snap.relations),
    faqIds: strings(snap.faqIds),
    imageId: snap.imageId,
    ogImageId: snap.seo.ogImageId,
    seoTitle: snap.seo.title,
    titleIncludesBrand: snap.seo.titleIncludesBrand,
    seoDescription: snap.seo.description,
    canonicalUrl: snap.seo.canonicalUrl,
    robots: snap.seo.robots,
    schemaExtra: snap.seo.schemaExtra,
    authorId: snap.authorId,
    reviewerId: snap.reviewerId,
    factCheckedAt: snap.factCheckedAt,
    featureStatus: snap.featureStatus,
    quality: { wordCount: snap.quality.wordCount, gate: snap.quality.gate, passed: snap.quality.passed },
    mediaIds: strings(snap.mediaIds),
    sortOrder: snap.sortOrder,
    featured: snap.featured,
  };
}

/** Draft content for previews. `prepared` comes from A1's checks in `preview` mode. */
export function draftContent(row: EntryRow, prepared: PreparedEntry | null): EntryContent {
  const rawBlocks: unknown[] = prepared ? (prepared.blocks as unknown[]) : Array.isArray(row.blocks) ? row.blocks : [];
  const blocks = rawBlocks.filter(isRecord);
  const data = prepared ? prepared.data : isRecord(row.data) ? row.data : {};
  return {
    template: prepared?.template ?? null,
    title: row.title,
    summary: row.summary,
    blocks: blocks.filter((b) => b.hidden !== true),
    data: { ...data },
    relations: relationsOf(row.relations),
    faqIds: row.faqIds,
    imageId: row.imageId,
    ogImageId: row.ogImageId,
    seoTitle: prepared?.seoTitle ?? row.seoTitle ?? row.title,
    titleIncludesBrand: prepared?.titleIncludesBrand ?? false,
    seoDescription: prepared?.description ?? row.seoDescription ?? row.summary ?? '',
    canonicalUrl: row.canonicalUrl,
    // What the page would get when published; the preview itself is never crawled (draft mode).
    robots: prepared?.robots ?? { index: false, follow: false, reason: 'editor' },
    schemaExtra: Array.isArray(row.schemaExtra) ? (row.schemaExtra as unknown[]).filter(isRecord) : [],
    authorId: row.authorId,
    reviewerId: row.reviewerId,
    factCheckedAt: row.factCheckedAt?.toISOString() ?? null,
    featureStatus: prepared?.featureStatus ?? null,
    quality: prepared?.quality ?? { wordCount: row.wordCount, gate: null, passed: true },
    mediaIds: prepared?.mediaIds ?? [],
    sortOrder: row.sortOrder,
    featured: row.featured,
  };
}

/** True when the live page may be listed in sitemaps, llms.txt and the search index. */
export function isIndexable(content: EntryContent): boolean {
  return content.robots.index && content.canonicalUrl === null;
}

/** String field of `data`, when present. */
export function dataString(content: EntryContent, key: string): string | undefined {
  const v = content.data[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
