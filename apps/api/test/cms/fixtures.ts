/**
 * Shared test fixtures for the CMS specs (apps/api/src/admin-marketing/cms/**\/*.spec.ts).
 *
 * Rows and snapshots follow the Prisma `CmsEntry` model and the contract's
 * `PublishedSnapshot`. Nothing here touches a database: specs pass fake
 * Prisma clients built from these values.
 */
import type { CmsEntry } from '@prisma/client';
import { PUBLISHED_SNAPSHOT_FORMAT, type PublishedSnapshot } from '../../src/admin-marketing/cms/contract/cms-contract';
import type { TokenContext } from '../../src/admin-marketing/cms/content/tokens';

export const FIXED_NOW = new Date('2026-10-20T08:00:00.000Z');

/** `n` distinct words, so word counts and 5-gram similarity are predictable. */
export function words(n: number, seed = 'w'): string {
  return Array.from({ length: n }, (_, i) => `${seed}${i}`).join(' ');
}

export function entryRow(overrides: Partial<CmsEntry> = {}): CmsEntry {
  return {
    id: 'entry-1',
    type: 'GLOSSARY_TERM',
    locale: 'en',
    translationKey: null,
    slug: 'gst',
    path: '/glossary/gst',
    parentId: null,
    status: 'DRAFT',
    title: 'GST',
    summary: null,
    blocks: [],
    data: {},
    relations: [],
    faqIds: [],
    imageId: null,
    seoTitle: null,
    seoDescription: null,
    focusKeyword: null,
    canonicalUrl: null,
    noindex: false,
    nofollow: false,
    ogImageId: null,
    schemaExtra: null,
    seoScore: null,
    wordCount: 0,
    authorId: null,
    reviewerId: null,
    factCheckedAt: null,
    factCheckedById: null,
    published: null,
    publishedPath: null,
    publishedRevisionId: null,
    publishedAt: null,
    firstPublishedAt: null,
    contentUpdatedAt: null,
    publishAt: null,
    scheduledRevisionId: null,
    hasUnpublishedChanges: false,
    publishedById: null,
    archivedAt: null,
    sortOrder: 0,
    featured: false,
    version: 1,
    createdById: null,
    updatedById: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

export function publishedSnapshot(overrides: Partial<PublishedSnapshot> = {}): PublishedSnapshot {
  const base: PublishedSnapshot = {
    format: PUBLISHED_SNAPSHOT_FORMAT,
    id: 'entry-1',
    type: 'GLOSSARY_TERM',
    locale: 'en',
    path: '/glossary/gst',
    slug: 'gst',
    parentId: null,
    translationKey: null,
    template: 'glossary',
    title: 'GST (live)',
    summary: 'Live summary',
    blocks: [{ id: 'blk-rich-1', type: 'richText', markdown: 'Live body' }],
    data: { type: 'GLOSSARY_TERM', term: 'GST', definition: 'General sales tax.', definitionRomanUrdu: 'Sales tax.', alsoKnownAs: [] },
    relations: [],
    faqIds: [],
    imageId: null,
    authorId: null,
    reviewerId: null,
    factCheckedAt: null,
    featureStatus: null,
    seo: {
      title: 'What is GST? Meaning in Urdu & Business Use',
      titleIncludesBrand: false,
      description: 'Live description',
      canonicalUrl: null,
      robots: { index: true, follow: true },
      ogImageId: null,
      schemaExtra: [],
      focusKeyword: 'internal keyword',
    },
    quality: { wordCount: 200, gate: 120, passed: true },
    mediaIds: [],
    referencedIds: [],
    draftHash: 'hash-0',
    sortOrder: 0,
    featured: false,
    publishedAt: FIXED_NOW.toISOString(),
    firstPublishedAt: FIXED_NOW.toISOString(),
    contentUpdatedAt: FIXED_NOW.toISOString(),
    revisionId: 'rev-1',
  };
  return { ...base, ...overrides, seo: { ...base.seo, ...(overrides.seo ?? {}) } };
}

/** A live row: published snapshot, published path and PUBLISHED status. */
export function liveRow(overrides: Partial<CmsEntry> = {}, snap: Partial<PublishedSnapshot> = {}): CmsEntry {
  const row = entryRow({ status: 'PUBLISHED', publishedAt: FIXED_NOW, firstPublishedAt: FIXED_NOW, ...overrides });
  const published = publishedSnapshot({ id: row.id, type: row.type, locale: row.locale, path: row.publishedPath ?? row.path, slug: row.slug, ...snap });
  return { ...row, publishedPath: overrides.publishedPath === undefined ? published.path : overrides.publishedPath, published: published as unknown as CmsEntry['published'] };
}

export const tokenContext: TokenContext = {
  plans: [
    { slug: 'free-trial', priceMonthly: 0, priceQuarterly: 0, priceYearly: 0 },
    { slug: 'basic', priceMonthly: 1500, priceQuarterly: 4200, priceYearly: 15000 },
  ],
  counts: { industries: 3, cities: 2, integrations: 1, glossary: 10, posts: 0 },
  entity: { brandName: 'Nafaa' },
  year: 2026,
};
