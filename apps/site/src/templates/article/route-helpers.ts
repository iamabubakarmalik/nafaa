/**
 * Shared plumbing for the thin S5 route files: load the entry for a path,
 * check it is the type the route serves, and build its metadata. Unknown
 * paths go through the redirect table, then 404 (ARCH 7.5).
 */
import type { Metadata } from 'next';
import { SITE_PATH_PATTERN, type CmsEntryType, type PublicEntity, type PublicEntry, type SiteSettings } from '@/lib/cms/contract/cms-contract';
import { getEntity, getLayout } from '@/lib/cms/client';
import { redirectOrNotFound } from '@/lib/cms/redirects';
import { buildEntryMetadata } from '@/lib/seo/metadata';
import { OG_CONTENT_TYPE, OG_SIZE, renderEntryOgImage } from '@/lib/og';
import { loadEntry } from './data';

export interface LoadedPage {
  entry: PublicEntry;
  site: SiteSettings;
  entity: PublicEntity | null;
}

/** Paths the API would reject (upper case, underscores, dots) never reach it; they can only be redirects. */
async function entryAt(path: string): Promise<PublicEntry | null> {
  return SITE_PATH_PATTERN.test(path) ? loadEntry(path) : null;
}

function accepts(entry: PublicEntry | null, types: readonly CmsEntryType[]): entry is PublicEntry {
  return entry !== null && types.includes(entry.type);
}

/** The entry at `path` when it has one of `types`; otherwise redirect or 404. */
export async function loadPage(path: string, types: readonly CmsEntryType[]): Promise<LoadedPage> {
  const entry = await entryAt(path);
  if (!accepts(entry, types)) return redirectOrNotFound(path);
  const [{ site }, entity] = await Promise.all([getLayout(entry.locale), getEntity(entry.locale)]);
  return { entry, site, entity };
}

/** `hasOgRoute: false` on routes that cannot have an opengraph-image file (optional catch-all). */
export async function pageMetadata(path: string, types: readonly CmsEntryType[], options: { hasOgRoute?: boolean } = {}): Promise<Metadata> {
  const entry = await entryAt(path);
  return accepts(entry, types) ? buildEntryMetadata(entry, options) : {};
}

/** Body of an `opengraph-image.tsx` for an S5 route. */
export async function ogImageFor(path: string, types: readonly CmsEntryType[]) {
  const entry = await entryAt(path);
  return renderEntryOgImage(accepts(entry, types) ? entry : null);
}

export const ogImageConfig = { size: OG_SIZE, contentType: OG_CONTENT_TYPE };

/** Joins catch-all slug segments into a CMS path under a prefix. */
export function pathFrom(prefix: string, slug: string | string[] | undefined): string {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  return parts.length ? `${prefix}/${parts.join('/')}` : prefix;
}
