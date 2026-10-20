/**
 * Data access for the S4 templates: the S1 fetchers, plus a development-only
 * fixture fallback.
 *
 * The local database has no CMS rows yet, so in `next dev` a path with no
 * published entry renders a typed fixture instead of a 404 (fixtures/). The
 * switch is per entry and per list: as soon as the API returns a real entry
 * or a non-empty list, that is what renders.
 *
 * Fixtures never reach production:
 * - the dynamic import sits inside a constant `process.env.NODE_ENV` branch,
 *   so the production bundle drops it and the fixture files entirely;
 * - fixture entries are noindex, carry a visible ribbon and are not listed in
 *   generateStaticParams, the sitemap or llms files.
 * Set SITE_FIXTURES=off to see what the real API alone renders in dev.
 */
import type { PublicEntity, PublicEntriesResponse, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getEntity, getEntries, getEntry, type EntriesQuery } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';

export const FIXTURE_ID_PREFIX = 'fixture__';

export function isFixture(entry: Pick<PublicEntry, 'id'>): boolean {
  return entry.id.startsWith(FIXTURE_ID_PREFIX);
}

async function fixtures() {
  // Written as a constant condition so the production compiler removes the import (and the fixture files).
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.SITE_FIXTURES !== 'off') return import('./fixtures');
  }
  return null;
}

/** The published entry at a CMS path, or (dev only) a fixture. */
export async function loadEntry(path: string, locale: string = DEFAULT_LOCALE): Promise<PublicEntry | null> {
  try {
    const live = await getEntry(path, locale);
    if (live) return live;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    console.warn(`[s4] entry ${path} unavailable, trying fixtures: ${(error as Error).message}`);
  }
  const fx = await fixtures();
  return fx ? fx.fixtureEntry(path, locale) : null;
}

/** A list of published entries, or (dev only) fixture cards when the API list is empty. */
export async function loadEntries(query: EntriesQuery): Promise<PublicEntriesResponse> {
  let live: PublicEntriesResponse = { items: [], nextCursor: null };
  try {
    live = await getEntries(query);
  } catch (error) {
    if (process.env.NODE_ENV === 'production') throw error;
    console.warn(`[s4] entries ${query.type} unavailable, trying fixtures: ${(error as Error).message}`);
  }
  if (live.items.length) return live;
  const fx = await fixtures();
  return fx ? { items: fx.fixtureCards(query), nextCursor: null } : live;
}

/** Entity facts, or (dev only) the seed's entity settings when the API has none yet. */
export async function loadEntity(locale: string = DEFAULT_LOCALE): Promise<PublicEntity | null> {
  const live = await getEntity(locale);
  if (live) return live;
  const fx = await fixtures();
  return fx ? fx.fixtureEntity() : null;
}

/** Full entries for a list of cards (for data the cards do not carry, such as a city's province). */
export async function loadEntriesFor(cards: readonly { path: string; locale: string }[]): Promise<PublicEntry[]> {
  const entries = await Promise.all(cards.map((card) => loadEntry(card.path, card.locale)));
  return entries.filter((entry): entry is PublicEntry => entry !== null);
}
