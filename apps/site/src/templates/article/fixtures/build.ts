/**
 * Builds contract-shaped PublicEntry / EntryCard objects from short fixture
 * specs, doing the parts the API does on read: final SEO title from the
 * default title patterns, breadcrumbs, cards for tags and related entries,
 * DOC children, and `{{year}}` tokens.
 *
 * Development only (see ../data.ts). Every fixture is noindex, has an id
 * starting with FIXTURE_ID_PREFIX and shows a visible ribbon.
 */
import {
  DEFAULT_TITLE_PATTERNS,
  ENTRY_TYPE_META,
  patternIncludesBrand,
  titlePatternFor,
  titlePatternVariant,
  type Block,
  type CmsEntryType,
  type EntryCard,
  type EntryData,
  type PublicEntry,
  type PublicFaq,
  type PublicMedia,
} from '@/lib/cms/contract/cms-contract';
import { siteUrl } from '@/lib/cms/env';
import { FIXTURE_ID_PREFIX } from '../fixture-id';

export const FIXTURE_UPDATED_AT = '2026-10-20T09:00:00.000Z';

export interface FixtureSpec {
  type: CmsEntryType;
  path: string;
  title: string;
  summary: string;
  data: EntryData;
  blocks?: Block[];
  faqs?: { q: string; a: string }[];
  /** TAG relations, by path. */
  tags?: string[];
  /** RELATED cards, by path. */
  related?: string[];
  /** Author PERSON path. */
  author?: string;
  reviewer?: string;
  media?: PublicMedia[];
  image?: PublicMedia;
  sortOrder?: number;
  featured?: boolean;
  published?: string;
  updated?: string;
}

let blockSeq = 0;
/** A stable-enough block id for fixtures (BLOCK_ID_PATTERN: 6-32 chars). */
export function bid(): string {
  blockSeq += 1;
  return `fxblk${String(blockSeq).padStart(5, '0')}`;
}

const year = String(new Date().getUTCFullYear());

function resolveYear(text: string): string {
  return text.replace(/\{\{\s*year\s*\}\}/g, year);
}

function fillPattern(pattern: string, spec: FixtureSpec): string {
  const data = spec.data as unknown as Record<string, unknown>;
  return pattern
    .replace(/\{title\}/g, spec.title)
    .replace(/\{year\}/g, year)
    .replace(/\{data\.([a-zA-Z]+)\}/g, (_, key: string) => String(data[key] ?? ''));
}

function url(path: string): string {
  return `${siteUrl()}${path === '/' ? '' : path}` || siteUrl();
}

export function cardOf(spec: FixtureSpec): EntryCard {
  const data = spec.data as unknown as Record<string, unknown>;
  return {
    id: `${FIXTURE_ID_PREFIX}${spec.path}`,
    type: spec.type,
    locale: 'en',
    path: spec.path,
    url: url(spec.path),
    title: spec.title,
    summary: spec.summary,
    image: spec.image ?? null,
    icon: typeof data.icon === 'string' ? data.icon : undefined,
    shortName: typeof data.shortName === 'string' ? data.shortName : undefined,
    contentUpdatedAt: spec.updated ?? FIXTURE_UPDATED_AT,
  };
}

/** Breadcrumbs the way the API builds them: Home › type hub (when it exists) › parents › page. */
function breadcrumbsOf(spec: FixtureSpec, byPath: Map<string, FixtureSpec>): PublicEntry['breadcrumbs'] {
  const crumbs: PublicEntry['breadcrumbs'] = [{ name: 'Home', path: '/', url: url('/') }];
  const segments = spec.path.split('/').filter(Boolean);
  for (let i = 1; i < segments.length; i += 1) {
    const path = `/${segments.slice(0, i).join('/')}`;
    const parent = byPath.get(path);
    if (parent) crumbs.push({ name: parent.type === 'PAGE' ? parent.title : parent.title, path, url: url(path) });
    else if (i === 1) {
      const meta = Object.values(ENTRY_TYPE_META).find((m) => m.prefix === segments[0]);
      if (meta && path !== spec.path) crumbs.push({ name: meta.labelPlural, path, url: url(path) });
    }
  }
  crumbs.push({ name: spec.title, path: spec.path, url: url(spec.path) });
  return crumbs;
}

function personCard(spec: FixtureSpec | undefined) {
  if (!spec || spec.data.type !== 'PERSON') return null;
  return { ...cardOf(spec), role: spec.data.role, photo: null, sameAs: spec.data.sameAs };
}

export function entryOf(spec: FixtureSpec, all: readonly FixtureSpec[]): PublicEntry {
  const byPath = new Map(all.map((s) => [s.path, s]));
  const pattern = titlePatternFor(DEFAULT_TITLE_PATTERNS, spec.type, titlePatternVariant(spec.type, spec.data));
  const seoTitle = resolveYear(fillPattern(pattern, spec));
  const faqs: PublicFaq[] = (spec.faqs ?? []).map((f, i) => ({ id: `${FIXTURE_ID_PREFIX}faq${i}${spec.path}`, question: f.q, answer: resolveYear(f.a), topic: null }));
  const tags: PublicEntry['tags'] = {};
  for (const path of spec.tags ?? []) {
    const target = byPath.get(path);
    if (!target) continue;
    (tags[target.type] ??= []).push(cardOf(target));
  }
  const children =
    spec.type === 'DOC' || spec.type === 'PAGE'
      ? all
          .filter((s) => s.type === spec.type && s.path !== spec.path && s.path.startsWith(spec.path === '/' ? '/' : `${spec.path}/`))
          .filter((s) => s.path.slice(spec.path.length + 1).split('/').length === 1)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(cardOf)
      : [];
  const parentPath = spec.path.split('/').slice(0, -1).join('/') || null;
  const parent = parentPath && byPath.get(parentPath)?.type === spec.type ? cardOf(byPath.get(parentPath)!) : null;
  const media: Record<string, PublicMedia> = {};
  for (const m of [...(spec.media ?? []), ...(spec.image ? [spec.image] : [])]) media[m.id] = m;

  return {
    id: `${FIXTURE_ID_PREFIX}${spec.path}`,
    type: spec.type,
    locale: 'en',
    path: spec.path,
    url: url(spec.path),
    title: spec.title,
    summary: resolveYear(spec.summary),
    blocks: spec.blocks ?? [],
    data: spec.data,
    seo: {
      title: seoTitle,
      titleIncludesBrand: patternIncludesBrand(pattern),
      description: resolveYear(spec.summary).slice(0, 155),
      canonical: url(spec.path),
      robots: { index: false, follow: false, reason: 'site_not_indexable' },
      ogImage: null,
      schemaExtra: [],
    },
    image: spec.image ?? null,
    author: personCard(spec.author ? byPath.get(spec.author) : undefined),
    reviewer: personCard(spec.reviewer ? byPath.get(spec.reviewer) : undefined),
    factCheckedAt: null,
    datePublished: spec.published ?? '2026-10-01T09:00:00.000Z',
    dateModified: spec.updated ?? FIXTURE_UPDATED_AT,
    breadcrumbs: breadcrumbsOf(spec, byPath),
    parent,
    children,
    tags,
    related: (spec.related ?? []).map((p) => byPath.get(p)).filter((s): s is FixtureSpec => Boolean(s)).map(cardOf),
    faqs,
    alternates: [{ locale: 'en', path: spec.path, url: url(spec.path) }],
    media,
    quality: { wordCount: 0, gate: null, passed: false },
  };
}
