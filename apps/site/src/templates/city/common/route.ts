/**
 * Helpers that keep the S4 route files thin: static params from
 * GET /public/site/paths, typed entry lookup, metadata and the OG card.
 *
 * Typed routes serve the default locale. `/ur/...` paths go through the
 * catch-all while Urdu is prepared; the templates take any locale.
 */
import type { Metadata } from 'next';
import { SLUG_PATTERN, type CmsEntryType, type PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getPaths } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { renderEntryOgImage } from '@/lib/og';
import { buildEntryMetadata } from '@/lib/seo/metadata';
import { loadEntry } from './data';

/** Published paths of a type, mapped to route params. Fails the production build when the API is down (ARCH 7.1). */
export async function staticParamsFor<P>(type: CmsEntryType, toParams: (segments: string[]) => P | null): Promise<P[]> {
  try {
    const items = await getPaths(type, DEFAULT_LOCALE);
    return items
      .filter((item) => item.locale === DEFAULT_LOCALE)
      .map((item) => toParams(item.path.split('/').filter(Boolean)))
      .filter((params): params is P => params !== null);
  } catch (error) {
    if (isProduction) throw error;
    return [];
  }
}

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** The entry at `path` when it is one of `types`; null otherwise (the route then tries redirects). */
export async function typedEntry(path: string, types: readonly CmsEntryType[]): Promise<PublicEntry | null> {
  const entry = await loadEntry(path, DEFAULT_LOCALE);
  return entry && types.includes(entry.type) ? entry : null;
}

export async function typedMetadata(path: string, types: readonly CmsEntryType[]): Promise<Metadata> {
  const entry = await typedEntry(path, types);
  return entry ? buildEntryMetadata(entry) : {};
}

export async function typedOgImage(path: string, types: readonly CmsEntryType[]) {
  return renderEntryOgImage(await typedEntry(path, types));
}
