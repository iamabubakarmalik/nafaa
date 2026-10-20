/**
 * Fixture lookups used by ../data.ts in development only. Mirrors the public
 * API: an entry by path, and cards by type with the tag, parent, sort and
 * limit filters of GET /public/site/entries.
 */
import type { EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import type { EntriesQuery } from '@/lib/cms/client';
import { FIXTURE_ID_PREFIX } from '../fixture-id';
import { cardOf, entryOf, FIXTURE_UPDATED_AT } from './build';
import { FIXTURE_SPECS } from './content';

export function fixtureEntry(path: string, locale: string): PublicEntry | null {
  if (locale !== 'en') return null;
  const spec = FIXTURE_SPECS.find((s) => s.path === path);
  return spec ? entryOf(spec, FIXTURE_SPECS) : null;
}

export function fixtureCards(query: EntriesQuery): EntryCard[] {
  let specs = FIXTURE_SPECS.filter((s) => s.type === query.type);
  if (query.tag) {
    const tagPath = query.tag.startsWith(FIXTURE_ID_PREFIX) ? query.tag.slice(FIXTURE_ID_PREFIX.length) : null;
    specs = tagPath ? specs.filter((s) => s.tags?.includes(tagPath)) : [];
  }
  if (query.parentId) {
    const parentPath = query.parentId.startsWith(FIXTURE_ID_PREFIX) ? query.parentId.slice(FIXTURE_ID_PREFIX.length) : null;
    specs = parentPath ? specs.filter((s) => s.path.startsWith(`${parentPath}/`)) : [];
  }
  if (query.featured) specs = specs.filter((s) => s.featured);
  const sorted = [...specs].sort((a, b) => {
    if (query.sort === 'title') return a.title.localeCompare(b.title);
    if (query.sort === 'recent') return (b.updated ?? FIXTURE_UPDATED_AT).localeCompare(a.updated ?? FIXTURE_UPDATED_AT);
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
  return sorted.slice(0, query.limit ?? 50).map(cardOf);
}
