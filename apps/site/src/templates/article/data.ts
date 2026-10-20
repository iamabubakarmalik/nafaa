/**
 * Data access for the S5 templates (blog, guides, glossary, tools,
 * templates, team, changelog, customers, developer docs): the S1 fetchers,
 * plus a development-only fixture fallback.
 *
 * The local database has no CMS rows yet, so in `next dev` a path with no
 * published entry renders a typed fixture (./fixtures) instead of a 404. The
 * switch is per entry and per list: as soon as the API returns a real entry
 * or a non-empty list, that is what renders.
 *
 * Fixtures never reach production:
 * - every fixture branch checks `process.env.NODE_ENV` inline, so the
 *   production bundle drops the dynamic import entirely;
 * - fixture entries are noindex, carry a visible ribbon and are never in
 *   generateStaticParams, the sitemap, the RSS feed or llms files.
 * Set SITE_FIXTURES=off to see what the real API alone renders in dev.
 */
import type { CmsEntryType, EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getEntries, getEntry, getPaths, type EntriesQuery } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { FIXTURE_ID_PREFIX } from './fixture-id';

export { isFixture } from './fixture-id';

const isFixtureId = (id: string) => id.startsWith(FIXTURE_ID_PREFIX);

async function fixtures() {
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.SITE_FIXTURES === 'off') return null;
  return import('./fixtures');
}

/** The published entry at a CMS path (or the draft in preview), or, in development only, a fixture. */
export async function loadEntry(path: string, locale: string = DEFAULT_LOCALE): Promise<PublicEntry | null> {
  try {
    const live = await getEntry(path, locale);
    if (live) return live;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    console.warn(`[s5] entry ${path} unavailable, trying fixtures: ${(error as Error).message}`);
  }
  const fx = await fixtures();
  return fx ? fx.fixtureEntry(path, locale) : null;
}

/** Published cards of one type, or, in development only, fixture cards while the API list is empty. */
export async function loadCards(query: EntriesQuery): Promise<EntryCard[]> {
  let live: EntryCard[] = [];
  // A fixture id as a filter only exists in development; never send it to the API.
  const fixtureFilter = [query.tag, query.parentId].some((id) => id && isFixtureId(id));
  try {
    if (!fixtureFilter) live = (await getEntries(query)).items;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    console.warn(`[s5] entries ${query.type} unavailable, trying fixtures: ${(error as Error).message}`);
  }
  if (live.length) return live;
  const fx = await fixtures();
  return fx ? fx.fixtureCards(query) : live;
}

/** Full entries for cards, for data a card does not carry (a changelog date, a glossary term's definition). */
export async function loadEntriesFor(cards: readonly Pick<EntryCard, 'path' | 'locale'>[]): Promise<PublicEntry[]> {
  const entries = await Promise.all(cards.map((card) => loadEntry(card.path, card.locale)));
  return entries.filter((entry): entry is PublicEntry => entry !== null);
}

/**
 * generateStaticParams helper: the published paths of a type, as slug lists
 * relative to `prefix` (for example '/blog' → [['khata-guide'], ...]). English
 * only; other locales render on demand through the catch-all.
 */
export async function staticSlugs(type: CmsEntryType, prefix: string): Promise<string[][]> {
  try {
    const items = await getPaths(type, DEFAULT_LOCALE);
    return items
      .filter((item) => item.locale === DEFAULT_LOCALE && item.path.startsWith(`${prefix}/`))
      .map((item) => item.path.slice(prefix.length + 1).split('/').filter(Boolean));
  } catch (error) {
    // Production builds fail when the API is down (ARCH 7.1); local work renders on demand.
    if (isProduction) throw error;
    return [];
  }
}
