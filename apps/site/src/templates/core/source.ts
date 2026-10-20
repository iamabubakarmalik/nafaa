/**
 * Block data source for the core templates: S2's BlockDataSource contract,
 * read through ./data.ts so blocks (pricing, entry grids, related cards) get
 * the same development fixtures as the template around them. In production
 * it is exactly the public API with contract cache tags.
 */
import type { BlockDataSource } from '@/components/blocks/types';
import { getCustomers, getStats, getTestimonials } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { loadCards, loadEntry, loadIndustryGroups, loadPlans, loadSite } from './data';

async function soft<T>(read: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (isProduction) throw error;
    return empty;
  }
}

export const templateSource: BlockDataSource = {
  kind: 'cms',
  plans: () => loadPlans(),
  // Stats, testimonials and logos are real-only: no fixtures, empty when the API has none.
  stats: (metrics) => soft(() => getStats(metrics), {}),
  testimonials: (q) => soft(() => getTestimonials({ locale: q.locale, ids: q.ids, industry: q.industry, city: q.city, limit: q.limit }), []),
  customers: (q) => soft(() => getCustomers({ ids: q.ids, industry: q.industry, city: q.city, limit: q.limit }), []),
  entries: (q) => loadCards(q),
  entry: (path, locale) => loadEntry(path, locale),
  site: (locale) => loadSite(locale),
  industryGroups: (locale) => loadIndustryGroups(locale),
};
