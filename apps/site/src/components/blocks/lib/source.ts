/**
 * The production data source for blocks: the public site API through
 * lib/cms/client (every fetch carries its contract cache tags).
 *
 * Errors: in production a failed read throws, so a build or ISR render fails
 * instead of publishing a page with a silently missing pricing table. In
 * development the block logs a warning and renders as if there were no data,
 * so pages still render while API endpoints are being built.
 */
import {
  getCustomers,
  getEntries,
  getEntry,
  getLayout,
  getPlans,
  getStats,
  getTestimonials,
  type EntriesQuery,
} from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import type { BlockDataSource, EntryListQuery } from '../types';

async function soft<T>(label: string, read: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (isProduction) throw error;
    console.warn(`[blocks] ${label} unavailable, rendering without it: ${(error as Error).message}`);
    return empty;
  }
}

/**
 * `status` is part of GET /public/site/entries (contract 1.1.0) but not yet
 * of the client's EntriesQuery type; the client passes every key through to
 * the query string, so it is added here until lib/cms picks it up.
 */
function entriesQuery(query: EntryListQuery): EntriesQuery {
  const { status, ...rest } = query;
  const withStatus: EntriesQuery & { status?: string } = { ...rest, status: status?.length ? status.join(',') : undefined };
  return withStatus;
}

export const cmsSource: BlockDataSource = {
  kind: 'cms',
  plans: () => soft('plans', () => getPlans(), []),
  stats: (metrics) => soft('stats', () => getStats(metrics), {}),
  testimonials: (q) =>
    soft('testimonials', () => getTestimonials({ locale: q.locale, ids: q.ids, industry: q.industry, city: q.city, limit: q.limit }), []),
  customers: (q) => soft('customers', () => getCustomers({ ids: q.ids, industry: q.industry, city: q.city, limit: q.limit }), []),
  entries: (q) => soft(`entries ${q.type}`, async () => (await getEntries(entriesQuery(q))).items, []),
  entry: (path, locale) => soft(`entry ${path}`, () => getEntry(path, locale), null),
  site: async (locale) => (await getLayout(locale)).site,
  industryGroups: async () => [],
};
