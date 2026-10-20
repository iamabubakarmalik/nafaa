/**
 * Development fixture provider (S3). Answers the same questions as the
 * public site API (API-CONTRACT 2.1) from typed, contract-shaped data, so the
 * templates can be built and checked before the CMS has rows.
 *
 * Rules:
 * - Only `templates/core/data.ts` imports this module, and only behind a
 *   `process.env.NODE_ENV !== 'production'` check, so production bundles
 *   never contain it.
 * - Every fixture page is `noindex, nofollow` (see build.ts) and shows a
 *   "Fixture data" bar.
 * - Real API data always wins: fixtures are used only when the API has
 *   nothing for a request.
 */
import type {
  CmsEntryType,
  EntryCard,
  FeatureStatus,
  PublicEntity,
  PublicEntry,
  PublicFaq,
  PublicFaqsResponse,
  PublicPlan,
} from '@/lib/cms/contract/cms-contract';
import { fixtureFaq, fixtureId, setCountsProvider, toCard, toPublicEntry, type FixtureSpec } from './build';
import { integrationFixtures, productFixtures, serviceFixtures, solutionFixtures } from './catalog';
import { FAQ_TOPIC_LABELS, fixtureFaqs } from './faqs';
import { industryFixtures } from './industries';
import { pageFixtures } from './pages';
import { fixtureEntitySettings, fixtureIndustryGroups, fixturePlans, fixtureSite } from './site';

export { fixtureIndustryGroups, fixtureSite };

const ALL: FixtureSpec[] = [...pageFixtures, ...productFixtures, ...industryFixtures, ...solutionFixtures, ...serviceFixtures, ...integrationFixtures];
const BY_PATH = new Map(ALL.map((spec) => [spec.path, spec]));
const BY_ID = new Map(ALL.map((spec) => [fixtureId(spec.path), spec]));

const lookup = (path: string) => BY_PATH.get(path) ?? null;

setCountsProvider(() => ({
  industries: ALL.filter((s) => s.type === 'INDUSTRY').length,
  cities: 0,
  integrations: ALL.filter((s) => s.data.type === 'INTEGRATION' && s.data.status === 'live').length,
  glossary: 0,
  posts: 0,
}));

export function fixtureEntry(path: string): PublicEntry | null {
  const spec = BY_PATH.get(path);
  return spec ? toPublicEntry(spec, lookup) : null;
}

export interface FixtureEntriesQuery {
  type: CmsEntryType;
  tag?: string;
  group?: string;
  featured?: boolean;
  parentId?: string;
  status?: readonly FeatureStatus[];
  sort?: 'order' | 'recent' | 'title';
  limit?: number;
}

export function fixtureEntries(query: FixtureEntriesQuery): EntryCard[] {
  const tagPath = query.tag ? BY_ID.get(query.tag)?.path : undefined;
  let items = ALL.filter((spec) => spec.type === query.type);
  if (query.tag) items = items.filter((spec) => tagPath !== undefined && (spec.tags ?? []).includes(tagPath));
  if (query.featured) items = items.filter((spec) => spec.featured);
  if (query.group) items = items.filter((spec) => (spec.data as { group?: string }).group === query.group);
  let cards = items
    .slice()
    .sort((a, b) => (query.sort === 'title' ? a.title.localeCompare(b.title) : (a.sortOrder ?? 99) - (b.sortOrder ?? 99)))
    .map(toCard);
  if (query.status?.length) cards = cards.filter((card) => card.status && query.status?.includes(card.status));
  return cards.slice(0, query.limit ?? 50);
}

export function fixturePaths(type?: CmsEntryType): { type: CmsEntryType; path: string; locale: string; updatedAt: string }[] {
  return ALL.filter((spec) => !type || spec.type === type).map((spec) => ({
    type: spec.type,
    path: spec.path,
    locale: 'en',
    updatedAt: spec.updatedAt ?? '2026-10-20T07:00:00.000Z',
  }));
}

export function fixturePlansList(): PublicPlan[] {
  return fixturePlans;
}

export function fixtureEntity(): PublicEntity {
  const paid = fixturePlans.filter((p) => p.priceMonthly > 0).map((p) => p.priceMonthly);
  return {
    ...fixtureEntitySettings,
    counts: {
      industries: industryFixtures.length,
      cities: 0,
      integrationsLive: integrationFixtures.filter((s) => s.data.type === 'INTEGRATION' && s.data.status === 'live').length,
      glossaryTerms: 0,
      posts: 0,
    },
    plans: fixturePlans.map((p) => ({ slug: p.slug, name: p.name, priceMonthly: p.priceMonthly })),
    minPaidMonthly: paid.length ? Math.min(...paid) : null,
    generatedAt: new Date().toISOString(),
  };
}

export function fixtureFaqsResponse(topic?: string): PublicFaqsResponse {
  const groups = new Map<string, { key: string; label: string; faqs: PublicFaq[] }>();
  for (const item of fixtureFaqs) {
    if (topic && item.topic !== topic) continue;
    const faq = fixtureFaq(item.key);
    if (!faq) continue;
    const group = groups.get(item.topic) ?? { key: item.topic, label: FAQ_TOPIC_LABELS[item.topic] ?? item.topic, faqs: [] };
    group.faqs.push(faq);
    groups.set(item.topic, group);
  }
  return { topics: [...groups.values()] };
}
