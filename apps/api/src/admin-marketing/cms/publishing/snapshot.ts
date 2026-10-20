/**
 * Draft and published snapshots (contract `DraftSnapshot`, `PublishedSnapshot`).
 */
import { createHash } from 'crypto';
import type { CmsEntry } from '@prisma/client';
import {
  DRAFT_SNAPSHOT_FIELDS,
  PUBLISHED_SNAPSHOT_FORMAT,
  type DraftBlock,
  type DraftRelation,
  type DraftSnapshot,
  type PublishedSnapshot,
} from '../contract/cms-contract';

type Rec = Record<string, unknown>;

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asRecord(v: unknown): Rec {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {};
}

/** The editable draft fields of a row. */
export function draftSnapshotOf(row: CmsEntry): DraftSnapshot {
  return {
    title: row.title,
    summary: row.summary,
    slug: row.slug,
    parentId: row.parentId,
    translationKey: row.translationKey,
    blocks: asArray<DraftBlock>(row.blocks),
    data: asRecord(row.data),
    relations: asArray<DraftRelation>(row.relations),
    faqIds: row.faqIds,
    imageId: row.imageId,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    focusKeyword: row.focusKeyword,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    nofollow: row.nofollow,
    ogImageId: row.ogImageId,
    schemaExtra: Array.isArray(row.schemaExtra) ? (row.schemaExtra as Rec[]) : null,
    authorId: row.authorId,
    reviewerId: row.reviewerId,
    sortOrder: row.sortOrder,
    featured: row.featured,
  };
}

/** Reads the draft fields back from a revision snapshot (missing fields fall back to `fallback`). */
export function draftFromRevision(snapshot: unknown, fallback: DraftSnapshot): DraftSnapshot {
  const s = asRecord(snapshot);
  const out = { ...fallback } as Record<string, unknown>;
  for (const field of DRAFT_SNAPSHOT_FIELDS) if (field in s) out[field] = s[field];
  return out as unknown as DraftSnapshot;
}

/** JSON with sorted object keys, so equal content always hashes the same. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Rec)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Hash of the draft fields; equal to `published.draftHash` when nothing changed since publish. */
export function draftHash(draft: DraftSnapshot): string {
  return createHash('sha1').update(stableStringify(draft)).digest('hex');
}

/** The live snapshot of a row, or null when it is missing or of an unknown format. */
export function readPublished(row: Pick<CmsEntry, 'published'>): PublishedSnapshot | null {
  const p = row.published as Rec | null;
  if (!p || typeof p !== 'object' || p.format !== PUBLISHED_SNAPSHOT_FORMAT) return null;
  return p as unknown as PublishedSnapshot;
}

/** True when the draft differs from what is live. */
export function hasUnpublishedChanges(row: Pick<CmsEntry, 'published'>, draft: DraftSnapshot): boolean {
  const live = readPublished(row);
  return live !== null && live.draftHash !== draftHash(draft);
}
