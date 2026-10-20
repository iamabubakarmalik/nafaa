/** Maps CmsEntry / CmsMedia rows to the admin DTOs of API-CONTRACT 8. */
import type { CmsEntry, CmsMedia } from '@prisma/client';
import type { AdminEntry, AdminEntryRef, CmsEntryType, CmsStatus, PublicMedia } from '../contract/cms-contract';
import { draftSnapshotOf } from '../publishing/snapshot';

export function toPublicMedia(m: CmsMedia, locale = 'en'): PublicMedia {
  const alts = (m.altTranslations ?? {}) as Record<string, unknown>;
  const alt = locale !== 'en' && typeof alts[locale] === 'string' && alts[locale] ? (alts[locale] as string) : m.alt;
  return {
    id: m.id,
    kind: m.kind,
    publicId: m.publicId,
    url: m.url,
    width: m.width,
    height: m.height,
    alt,
    ...(m.caption ? { caption: m.caption } : {}),
    ...(m.credit ? { credit: m.credit } : {}),
    ...(m.sourceUrl ? { sourceUrl: m.sourceUrl } : {}),
    ...(m.blurDataUrl ? { blurDataUrl: m.blurDataUrl } : {}),
    ...(m.dominantColor ? { dominantColor: m.dominantColor } : {}),
    ...(m.focalX !== null ? { focalX: m.focalX } : {}),
    ...(m.focalY !== null ? { focalY: m.focalY } : {}),
    mimeType: m.mimeType,
    bytes: m.bytes,
  };
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toAdminEntry(
  row: CmsEntry,
  refs: Record<string, AdminEntryRef>,
  mediaRefs: Record<string, PublicMedia>,
  liveUrl: string | null,
): AdminEntry {
  const d = draftSnapshotOf(row);
  return {
    id: row.id,
    type: row.type as CmsEntryType,
    locale: row.locale,
    translationKey: row.translationKey,
    slug: row.slug,
    path: row.path,
    parentId: row.parentId,
    status: row.status as CmsStatus,
    title: row.title,
    summary: row.summary,
    blocks: d.blocks,
    data: { ...d.data, type: row.type } as AdminEntry['data'],
    relations: d.relations,
    faqIds: row.faqIds,
    imageId: row.imageId,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    focusKeyword: row.focusKeyword,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    nofollow: row.nofollow,
    ogImageId: row.ogImageId,
    schemaExtra: d.schemaExtra,
    seoScore: row.seoScore,
    wordCount: row.wordCount,
    authorId: row.authorId,
    reviewerId: row.reviewerId,
    factCheckedAt: iso(row.factCheckedAt),
    factCheckedById: row.factCheckedById,
    publishedPath: row.publishedPath,
    publishedAt: iso(row.publishedAt),
    firstPublishedAt: iso(row.firstPublishedAt),
    contentUpdatedAt: iso(row.contentUpdatedAt),
    publishAt: iso(row.publishAt),
    hasUnpublishedChanges: row.hasUnpublishedChanges,
    sortOrder: row.sortOrder,
    featured: row.featured,
    version: row.version,
    createdById: row.createdById,
    updatedById: row.updatedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    refs,
    mediaRefs,
    liveUrl,
  };
}
