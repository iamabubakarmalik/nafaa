/**
 * Data access for the core templates (S3).
 *
 * Everything goes through lib/cms/client (contract cache tags). In
 * development only, when the API has nothing for a request (unreachable, a
 * 404 or an empty list), the typed fixtures in ./fixtures answer instead, so
 * templates render before the CMS has rows. Real data always wins, and the
 * switch is automatic: once the API serves an entry, the fixture for that
 * path is never used.
 *
 * Production: the `process.env.NODE_ENV !== 'production'` guards are
 * replaced at build time, so the fixture import is dead code and never ships.
 * API errors then throw (ARCH 7.1: a build fails instead of shipping an empty
 * page). Set SITE_FIXTURES=off to see the bare API in development.
 */
import { cache } from 'react';
import {
  CmsError,
  getEntity,
  getEntries,
  getEntry,
  getFaqs,
  getLayout,
  getPaths,
  getPlans,
  type EntriesQuery,
  type SiteLayout,
} from '@/lib/cms/client';
import type {
  CmsEntryType,
  EntryCard,
  FeatureStatus,
  PublicEntity,
  PublicEntry,
  PublicFaqsResponse,
  PublicPlan,
  SiteSettings,
} from '@/lib/cms/contract/cms-contract';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';

type Fixtures = typeof import('./fixtures');

const fixturesOn = process.env.NODE_ENV !== 'production' && process.env.SITE_FIXTURES !== 'off';

/** The fixture module, or null in production and when switched off. */
async function fixtures(): Promise<Fixtures | null> {
  if (process.env.NODE_ENV !== 'production' && fixturesOn) return import('./fixtures');
  return null;
}

/** Entries that came from fixtures (dev only), for the "Fixture data" bar. */
const FIXTURE_ENTRIES = new WeakSet<object>();

export function isFixtureEntry(entry: object): boolean {
  return FIXTURE_ENTRIES.has(entry);
}

/** True when an API read failed in a way development should paper over. */
function devMiss(error: unknown): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return error instanceof CmsError || error instanceof TypeError;
}

export const loadEntry = cache(async (path: string, locale: string = DEFAULT_LOCALE): Promise<PublicEntry | null> => {
  let entry: PublicEntry | null = null;
  try {
    entry = await getEntry(path, locale);
  } catch (error) {
    if (!devMiss(error)) throw error;
  }
  if (entry) return entry;
  const fx = await fixtures();
  const fallback = fx?.fixtureEntry(path) ?? null;
  if (fallback) FIXTURE_ENTRIES.add(fallback);
  return fallback;
});

export interface CardsQuery {
  type: CmsEntryType;
  locale?: string;
  tag?: string;
  group?: string;
  featured?: boolean;
  parentId?: string;
  status?: readonly FeatureStatus[];
  sort?: 'order' | 'recent' | 'title';
  limit?: number;
}

/** Published cards of a type (GET /public/site/entries), with the dev fallback. */
export const loadCards = cache(async (query: CardsQuery): Promise<EntryCard[]> => {
  const { status, ...rest } = query;
  const q: EntriesQuery & { status?: string } = { ...rest, locale: query.locale ?? DEFAULT_LOCALE, status: status?.length ? status.join(',') : undefined };
  let items: EntryCard[] = [];
  let failed = false;
  try {
    items = (await getEntries(q)).items;
  } catch (error) {
    if (!devMiss(error)) throw error;
    failed = true;
  }
  if (items.length || (!failed && !fixturesOn)) return items;
  const fx = await fixtures();
  return fx?.fixtureEntries(query) ?? items;
});

/** Published paths of a type for generateStaticParams (fixture paths in dev when the API is down). */
export async function loadPaths(type: CmsEntryType): Promise<string[]> {
  try {
    const items = await getPaths(type);
    if (items.length || process.env.NODE_ENV === 'production') return items.filter((i) => i.locale === DEFAULT_LOCALE).map((i) => i.path);
  } catch (error) {
    if (!devMiss(error)) throw error;
  }
  const fx = await fixtures();
  return fx?.fixturePaths(type).map((i) => i.path) ?? [];
}

export const loadPlans = cache(async (): Promise<PublicPlan[]> => {
  try {
    const plans = await getPlans();
    if (plans.length || !fixturesOn) return plans;
  } catch (error) {
    if (!devMiss(error)) throw error;
  }
  const fx = await fixtures();
  return fx?.fixturePlansList() ?? [];
});

export const loadEntity = cache(async (locale: string = DEFAULT_LOCALE): Promise<PublicEntity | null> => {
  const entity = await getEntity(locale);
  if (entity) return entity;
  const fx = await fixtures();
  return fx?.fixtureEntity() ?? null;
});

/** True for S1's empty development shell (the API had no layout). */
function isDevShell(layout: SiteLayout): boolean {
  return layout.updatedAt === new Date(0).toISOString();
}

export const loadLayout = cache(async (locale: string = DEFAULT_LOCALE): Promise<SiteLayout> => getLayout(locale));

/** Site settings for templates (CTA targets, WhatsApp); the seed's values in the dev shell. */
export const loadSite = cache(async (locale: string = DEFAULT_LOCALE): Promise<SiteSettings> => {
  const layout = await loadLayout(locale);
  if (!isDevShell(layout)) return layout.site;
  const fx = await fixtures();
  return fx?.fixtureSite ?? layout.site;
});

export const loadFaqs = cache(async (locale: string = DEFAULT_LOCALE): Promise<PublicFaqsResponse> => {
  try {
    const res = await getFaqs(locale);
    if (res.topics.length || !fixturesOn) return res;
  } catch (error) {
    if (!devMiss(error)) throw error;
  }
  const fx = await fixtures();
  return fx?.fixtureFaqsResponse() ?? { topics: [] };
});

/** Industry group labels (settings `industry-groups`, served on the layout); fixtures in dev when none are saved. */
export async function loadIndustryGroups(locale: string = DEFAULT_LOCALE): Promise<{ key: string; label: string; sortOrder: number }[]> {
  const layout = await loadLayout(locale);
  if (layout.industryGroups?.length || !fixturesOn) return layout.industryGroups ?? [];
  const fx = await fixtures();
  return fx?.fixtureIndustryGroups ?? [];
}


/**
 * The subset of site paths that have a published entry, so templates only
 * link to pages that exist (the SEO crawl fails on internal 404s).
 */
export async function livePaths(paths: readonly string[], locale: string = DEFAULT_LOCALE): Promise<Set<string>> {
  const found = await Promise.all(paths.map(async (path) => ((await loadEntry(path, locale)) ? path : null)));
  return new Set(found.filter((p): p is string => p !== null));
}
