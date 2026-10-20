/**
 * Turns fixture specs into contract-shaped public responses, doing what the
 * API does on read: token resolution ({{price:..}}, {{fact:..}}, {{count:..}},
 * {{year}}), CTA keywords, breadcrumbs, final SEO title from the default
 * title patterns, cards for related/tag links, and FAQ lookup.
 *
 * Pure data (no Next imports), so a scratch mock API can serve the same
 * fixtures over HTTP for production-build checks.
 */
import {
  DEFAULT_TITLE_PATTERNS,
  ENTRY_TYPE_META,
  TOKEN_REGEX,
  featureStatusOf,
  parseToken,
  patternIncludesBrand,
  titlePatternFor,
  titlePatternVariant,
  visibleBlocks,
  type Block,
  type CmsEntryType,
  type EntryCard,
  type EntryData,
  type PublicEntry,
  type PublicFaq,
  type PublicPlan,
} from '@/lib/cms/contract/cms-contract';
import { siteUrl } from '@/lib/cms/env';
import { FIXTURE_UPDATED_AT, fixtureEntitySettings, fixturePlans, fixtureSite } from './site';
import { fixtureFaqs } from './faqs';

export interface FixtureSpec {
  type: CmsEntryType;
  /** CMS path without locale prefix. */
  path: string;
  title: string;
  summary: string;
  data: EntryData;
  blocks: Block[];
  faqKeys?: string[];
  /** RELATED cards, by path, in order. */
  related?: string[];
  /** TAG relations, by path. */
  tags?: string[];
  featured?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt?: string;
}

/** Base URL used in fixture `url` fields (the dev or mock site origin). */
export function fixtureOrigin(): string {
  return siteUrl();
}

// ─── Tokens and keywords ───

function formatPkr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function minPaid(plans: readonly PublicPlan[]): number | null {
  const paid = plans.map((p) => p.priceMonthly).filter((n) => n > 0);
  return paid.length ? Math.min(...paid) : null;
}

export interface TokenCounts {
  industries: number;
  cities: number;
  integrations: number;
  glossary: number;
  posts: number;
}

let countsProvider: () => TokenCounts = () => ({ industries: 0, cities: 0, integrations: 0, glossary: 0, posts: 0 });
export function setCountsProvider(fn: () => TokenCounts): void {
  countsProvider = fn;
}

function factValue(path: string): string | null {
  let current: unknown = fixtureEntitySettings;
  for (const key of path.split('.')) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  if (typeof current === 'string') return current;
  if (current && typeof current === 'object' && typeof (current as { text?: unknown }).text === 'string') {
    return (current as { text: string }).text;
  }
  if (Array.isArray(current)) return current.join(', ');
  return null;
}

export function resolveTokens(text: string): string {
  return text.replace(TOKEN_REGEX, (raw, inner: string) => {
    const token = parseToken(inner);
    if (!token) return raw;
    switch (token.kind) {
      case 'year':
        return String(new Date().getFullYear());
      case 'priceMin': {
        const min = minPaid(fixturePlans);
        return min === null ? raw : formatPkr(min);
      }
      case 'price': {
        const plan = fixturePlans.find((p) => p.slug === token.planSlug);
        if (!plan) return raw;
        const amount = token.period === 'monthly' ? plan.priceMonthly : token.period === 'quarterly' ? plan.priceQuarterly : plan.priceYearly;
        return formatPkr(amount);
      }
      case 'count':
        return countsProvider()[token.key].toLocaleString('en-US');
      case 'fact':
        return factValue(token.path) ?? raw;
    }
  });
}

function resolveHref(href: string): string {
  if (href === 'signup') return fixtureSite.signupUrl;
  if (href === 'demo') return fixtureSite.demoPath;
  if (href === 'whatsapp' && fixtureSite.whatsapp) {
    return `https://wa.me/${fixtureSite.whatsapp.number}?text=${encodeURIComponent(fixtureSite.whatsapp.message)}`;
  }
  return href;
}

/** Deep-resolves tokens in every string and CTA keywords in `href`/`ctaHref` fields. */
export function resolveDeep<T>(value: T, key?: string): T {
  if (typeof value === 'string') {
    const resolved = resolveTokens(value);
    return (key === 'href' || key === 'ctaHref' ? resolveHref(resolved) : resolved) as T;
  }
  if (Array.isArray(value)) return value.map((item) => resolveDeep(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, k)])) as T;
  }
  return value;
}

// ─── Cards, FAQs, breadcrumbs, SEO ───

export function toCard(spec: FixtureSpec): EntryCard {
  const data = spec.data as Record<string, unknown>;
  const status = featureStatusOf(spec.type, spec.data);
  const pick = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : undefined);
  return {
    id: fixtureId(spec.path),
    type: spec.type,
    locale: 'en',
    path: spec.path,
    url: `${fixtureOrigin()}${spec.path === '/' ? '' : spec.path}`,
    title: spec.title,
    summary: resolveTokens(spec.summary),
    image: null,
    ...(pick('icon') ? { icon: pick('icon') } : {}),
    ...(pick('color') ? { color: pick('color') } : {}),
    ...(pick('group') ? { group: pick('group') } : {}),
    ...(pick('shortName') ? { shortName: pick('shortName') } : {}),
    ...(status ? { status } : {}),
    contentUpdatedAt: spec.type === 'PAGE' ? null : (spec.updatedAt ?? FIXTURE_UPDATED_AT),
  };
}

export function fixtureId(path: string): string {
  return `fx${path.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home'}`.slice(0, 64);
}

export function fixtureFaq(key: string): PublicFaq | null {
  const faq = fixtureFaqs.find((f) => f.key === key);
  if (!faq) return null;
  return { id: `fxfaq-${faq.key}`, question: faq.question, answer: resolveTokens(faq.answer), topic: faq.topic };
}

const HUB_NAMES: Record<string, string> = {
  product: 'Product',
  industries: 'Industries',
  solutions: 'Solutions',
  services: 'Services',
  integrations: 'Integrations',
};

function breadcrumbs(spec: FixtureSpec): PublicEntry['breadcrumbs'] {
  const origin = fixtureOrigin();
  const home = { name: 'Home', path: '/', url: `${origin}/` };
  if (spec.path === '/') return [home];
  const segments = spec.path.split('/').filter(Boolean);
  const crumbs = [home];
  if (segments.length > 1 && segments[0] && HUB_NAMES[segments[0]]) {
    crumbs.push({ name: HUB_NAMES[segments[0]] as string, path: `/${segments[0]}`, url: `${origin}/${segments[0]}` });
  }
  crumbs.push({ name: spec.title, path: spec.path, url: `${origin}${spec.path}` });
  return crumbs;
}

function fillPattern(pattern: string, spec: FixtureSpec): string {
  const data = spec.data as Record<string, unknown>;
  const min = minPaid(fixturePlans);
  return pattern.replace(/\{([a-zA-Z]+(?:\.[a-zA-Z]+)?)\}/g, (raw, name: string) => {
    if (name === 'title') return spec.title;
    if (name === 'year') return String(new Date().getFullYear());
    if (name === 'minPrice') return min === null ? '' : formatPkr(min);
    if (name.startsWith('data.')) {
      const v = data[name.slice(5)];
      return typeof v === 'string' ? v : raw;
    }
    return raw;
  });
}

function wordCount(blocks: readonly Block[], summary: string): number {
  const text = JSON.stringify(blocks) + summary;
  return text.replace(/"[a-zA-Z]+":/g, ' ').split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
}

/** The full PublicEntry for a spec. `lookup` turns related/tag paths into specs. */
export function toPublicEntry(spec: FixtureSpec, lookup: (path: string) => FixtureSpec | null): PublicEntry {
  const origin = fixtureOrigin();
  const url = `${origin}${spec.path === '/' ? '' : spec.path}`;
  const pattern = spec.seoTitle ?? titlePatternFor(DEFAULT_TITLE_PATTERNS, spec.type, titlePatternVariant(spec.type, spec.data));
  const title = fillPattern(pattern, spec);
  const status = featureStatusOf(spec.type, spec.data);
  const tags: PublicEntry['tags'] = {};
  for (const path of spec.tags ?? []) {
    const target = lookup(path);
    if (!target) continue;
    (tags[target.type] ??= []).push(toCard(target));
  }
  const related = (spec.related ?? []).map(lookup).filter((s): s is FixtureSpec => s !== null).map(toCard);
  const parentSegment = spec.path.split('/').filter(Boolean)[0];
  const parent = spec.type !== 'PAGE' && parentSegment ? lookup(`/${parentSegment}`) : null;
  const children: EntryCard[] = [];
  const blocks = visibleBlocks(resolveDeep(spec.blocks));
  const description = resolveTokens(spec.seoDescription ?? spec.summary);
  const updated = spec.type === 'PAGE' && (spec.data as { template?: string }).template !== 'legal' ? null : (spec.updatedAt ?? FIXTURE_UPDATED_AT);

  return {
    id: fixtureId(spec.path),
    type: spec.type,
    locale: 'en',
    path: spec.path,
    url,
    title: spec.title,
    summary: resolveTokens(spec.summary),
    blocks,
    data: resolveDeep(spec.data),
    seo: {
      title,
      titleIncludesBrand: patternIncludesBrand(title),
      description: description.length > 155 ? `${description.slice(0, 152).replace(/\s+\S*$/, '')}…` : description,
      canonical: url,
      // Fixtures are never indexable.
      robots: { index: false, follow: false, reason: status === 'coming' ? 'coming' : 'editor' },
      ogImage: null,
      schemaExtra: [],
    },
    image: null,
    author: null,
    reviewer: null,
    factCheckedAt: null,
    datePublished: '2026-10-20T07:00:00.000Z',
    dateModified: updated ?? FIXTURE_UPDATED_AT,
    breadcrumbs: breadcrumbs(spec),
    parent: parent ? toCard(parent) : null,
    children,
    tags,
    related,
    faqs: (spec.faqKeys ?? []).map(fixtureFaq).filter((f): f is PublicFaq => f !== null),
    alternates: [{ locale: 'en', path: spec.path, url }],
    media: {},
    quality: { wordCount: wordCount(blocks, spec.summary), gate: null, passed: false },
  };
}

/** Type prefix → hub path ("/industries"), for hubs and sibling navigation. */
export function hubPathFor(type: CmsEntryType): string | null {
  const prefix = ENTRY_TYPE_META[type].prefix;
  return prefix ? `/${prefix}` : null;
}
