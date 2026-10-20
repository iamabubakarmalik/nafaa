/**
 * Builders for development fixtures (see ../data.ts). They produce complete
 * `PublicEntry` and `EntryCard` objects in the contract shape, so templates
 * are exercised exactly as the public API would feed them. Every fixture is
 * noindex (robots reason `editor`) and its id starts with FIXTURE_ID_PREFIX.
 */
import {
  ENTRY_TYPE_META,
  countWords,
  type Block,
  type CmsEntryType,
  type EntryCard,
  type EntryData,
  type PublicEntry,
  type PublicFaq,
} from '@/lib/cms/contract/cms-contract';
import { absoluteUrl } from '@/lib/cms/env';
import { FIXTURE_ID_PREFIX } from '../data';

/** Date the fixtures were written; shown as "Updated" and "checked" dates. */
export const FIXTURE_DATE = '2026-10-20';

type BlockInput = Block extends infer B ? (B extends { id: string } ? Omit<B, 'id'> : never) : never;

export function fixtureId(type: CmsEntryType, path: string): string {
  return `${FIXTURE_ID_PREFIX}${type.toLowerCase()}${path.replace(/[^a-z0-9]+/g, '-')}`.slice(0, 64);
}

export function withBlockIds(key: string, blocks: BlockInput[]): Block[] {
  const base = key.replace(/[^A-Za-z0-9]/g, '').slice(-16);
  return blocks.map((block, i) => ({ ...block, id: `fx${base}${String(i).padStart(2, '0')}` }) as Block);
}

export interface CardInput {
  type: CmsEntryType;
  path: string;
  title: string;
  summary?: string | null;
  icon?: string;
  color?: string;
  group?: string;
  shortName?: string;
}

export function card(input: CardInput): EntryCard {
  return {
    id: fixtureId(input.type, input.path),
    type: input.type,
    locale: 'en',
    path: input.path,
    url: absoluteUrl(input.path),
    title: input.title,
    summary: input.summary ?? null,
    image: null,
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.color ? { color: input.color } : {}),
    ...(input.group ? { group: input.group } : {}),
    ...(input.shortName ? { shortName: input.shortName } : {}),
    contentUpdatedAt: FIXTURE_DATE,
  };
}

/** Home › type hub › parent chain › page, the way A2 builds breadcrumbs. */
function breadcrumbsFor(type: CmsEntryType, path: string, title: string, parent: EntryCard | null) {
  const crumbs = [{ name: 'Home', path: '/', url: absoluteUrl('/') }];
  const prefix = ENTRY_TYPE_META[type].prefix ?? (parent ? ENTRY_TYPE_META[parent.type].prefix : null);
  if (prefix) {
    const hubPath = `/${prefix}`;
    const hubType = ENTRY_TYPE_META[type].prefix ? type : (parent?.type ?? type);
    crumbs.push({ name: ENTRY_TYPE_META[hubType].labelPlural, path: hubPath, url: absoluteUrl(hubPath) });
  }
  if (parent) crumbs.push({ name: parent.title, path: parent.path, url: parent.url });
  crumbs.push({ name: title, path, url: absoluteUrl(path) });
  return crumbs;
}

export interface EntryInput {
  type: CmsEntryType;
  path: string;
  title: string;
  /** Final <title> text (the API fills title patterns). */
  seoTitle: string;
  titleIncludesBrand?: boolean;
  summary: string;
  data: EntryData;
  blocks: BlockInput[];
  faqs?: PublicFaq[];
  parent?: EntryCard | null;
  tags?: PublicEntry['tags'];
  related?: EntryCard[];
  /** Word gate for the type (ARCH 5.5); `passed` follows from the word count unless forced. */
  gate?: number | null;
  forcePassed?: boolean;
  factChecked?: boolean;
}

function textOf(blocks: readonly Block[], data: EntryData): string {
  const parts: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(blocks);
  walk(data);
  return parts.join(' ');
}

export function entry(input: EntryInput): PublicEntry {
  const blocks = withBlockIds(input.path || 'home', input.blocks);
  const parent = input.parent ?? null;
  const wordCount = countWords(textOf(blocks, input.data));
  const gate = input.gate ?? null;
  return {
    id: fixtureId(input.type, input.path),
    type: input.type,
    locale: 'en',
    path: input.path,
    url: absoluteUrl(input.path),
    title: input.title,
    summary: input.summary,
    blocks,
    data: input.data,
    seo: {
      title: input.seoTitle,
      titleIncludesBrand: input.titleIncludesBrand ?? false,
      description: input.summary.slice(0, 155),
      canonical: absoluteUrl(input.path),
      robots: { index: false, follow: false, reason: 'editor' },
      ogImage: null,
      schemaExtra: [],
    },
    image: null,
    author: null,
    reviewer: null,
    factCheckedAt: input.factChecked ? FIXTURE_DATE : null,
    datePublished: FIXTURE_DATE,
    dateModified: FIXTURE_DATE,
    breadcrumbs: breadcrumbsFor(input.type, input.path, input.title, parent),
    parent,
    children: [],
    tags: input.tags ?? {},
    related: input.related ?? [],
    faqs: input.faqs ?? [],
    alternates: [{ locale: 'en', path: input.path, url: absoluteUrl(input.path) }],
    media: {},
    quality: { wordCount, gate, passed: input.forcePassed ?? (gate === null || wordCount >= gate) },
  };
}

export function cardOf(full: PublicEntry): EntryCard {
  const data = full.data as Record<string, unknown>;
  return {
    id: full.id,
    type: full.type,
    locale: full.locale,
    path: full.path,
    url: full.url,
    title: full.title,
    summary: full.summary,
    image: null,
    ...(typeof data.icon === 'string' ? { icon: data.icon } : {}),
    ...(typeof data.shortName === 'string' ? { shortName: data.shortName } : {}),
    contentUpdatedAt: full.dateModified,
  };
}
