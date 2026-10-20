/**
 * Data source for the /_dev/blocks gallery. DEV ONLY (see fixtures.ts).
 *
 * It asks the real public API first and falls back to a fixture only when
 * the API has nothing (or the endpoint is not there yet). `probeGallery()`
 * runs those reads once per request and records where each kind of data
 * came from, so the gallery can label every block "live API" or "fixture".
 * Once the CMS has rows, the gallery switches to them with no code change.
 */
import { cmsSource } from '../lib/source';
import type { BlockDataSource, EntryListQuery } from '../types';
import type { EntryCard, PublicEntry, StatMetric } from '@/lib/cms/contract/cms-contract';
import {
  FIXTURE_CARDS,
  FIXTURE_CITY,
  FIXTURE_CUSTOMERS,
  FIXTURE_GROUPS,
  FIXTURE_PLANS,
  FIXTURE_SITE,
  FIXTURE_STATS,
  FIXTURE_TESTIMONIALS,
} from './fixtures';

export type Origin = 'live' | 'fixture';

export interface GalleryProbe {
  source: BlockDataSource;
  origin: Record<'plans' | 'stats' | 'testimonials' | 'customers' | 'entries' | 'site', Origin>;
}

async function attempt<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

function fixtureCards(query: EntryListQuery): EntryCard[] {
  let cards = FIXTURE_CARDS.filter((c) => c.type === query.type);
  if (query.status?.length) cards = cards.filter((c) => c.status && query.status?.includes(c.status));
  if (query.group) cards = cards.filter((c) => c.group === query.group);
  return query.limit ? cards.slice(0, query.limit) : cards;
}

const ALL_METRICS: StatMetric[] = ['industries.count', 'cities.count', 'plans.count', 'glossary.count', 'integrations.live.count', 'posts.count'];

export async function probeGallery(locale: string): Promise<GalleryProbe> {
  const [plans, stats, testimonials, customers, industries, layoutSite] = await Promise.all([
    attempt(() => cmsSource.plans()),
    attempt(() => cmsSource.stats(ALL_METRICS)),
    attempt(() => cmsSource.testimonials({ locale })),
    attempt(() => cmsSource.customers({ locale })),
    attempt(() => cmsSource.entries({ type: 'INDUSTRY', locale, limit: 1 })),
    attempt(() => cmsSource.site(locale)),
  ]);

  const liveStats = Object.values(stats ?? {}).some((value) => value && value.value > 0);
  const origin: GalleryProbe['origin'] = {
    plans: plans?.length ? 'live' : 'fixture',
    stats: liveStats ? 'live' : 'fixture',
    testimonials: testimonials?.length ? 'live' : 'fixture',
    customers: customers?.length ? 'live' : 'fixture',
    entries: industries?.length ? 'live' : 'fixture',
    // The dev shell's empty layout has no WhatsApp number; the fixture fills it for the lead form.
    site: layoutSite?.whatsapp ? 'live' : 'fixture',
  };

  const source: BlockDataSource = {
    kind: 'gallery',
    plans: async () => (origin.plans === 'live' && plans ? plans : FIXTURE_PLANS),
    stats: async (metrics) => {
      if (origin.stats === 'fixture') return FIXTURE_STATS;
      return cmsSource.stats(metrics);
    },
    testimonials: async (q) => (origin.testimonials === 'live' ? cmsSource.testimonials(q) : FIXTURE_TESTIMONIALS.slice(0, q.limit ?? 12)),
    customers: async (q) => (origin.customers === 'live' ? cmsSource.customers(q) : FIXTURE_CUSTOMERS.slice(0, q.limit ?? 24)),
    entries: async (q) => {
      if (origin.entries === 'live') {
        const live = await cmsSource.entries(q);
        if (live.length) return live;
      }
      return fixtureCards(q);
    },
    entry: async (path, loc): Promise<PublicEntry | null> => (await attempt(() => cmsSource.entry(path, loc))) ?? (path === FIXTURE_CITY.path ? FIXTURE_CITY : null),
    site: async () => (origin.site === 'live' && layoutSite ? layoutSite : { ...(layoutSite ?? FIXTURE_SITE), whatsapp: FIXTURE_SITE.whatsapp }),
    industryGroups: async () => FIXTURE_GROUPS,
  };

  return { source, origin };
}
