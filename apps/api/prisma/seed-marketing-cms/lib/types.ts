/**
 * Shapes of the marketing CMS seed content.
 *
 * Content files under `content/` export these objects. They are typed with the
 * shared CMS contract and checked by `lib/validate.ts` before anything is sent
 * to the API. Every entry records where it came from, what was checked and
 * what was dropped, so the content can be reviewed in git.
 */

import type {
  CmsEntryType,
  DraftBlock,
  MenuItem,
  RedirectStatus,
  SettingKey,
  Source,
} from '../../../src/admin-marketing/cms/contract/cms-contract';

/** Reference to another seeded entry: `<TYPE>:<slug>`, e.g. `INDUSTRY:kiryana`. */
export type EntryRef = `${CmsEntryType}:${string}`;

export interface FactCheck {
  /** ISO date the check was made. */
  checkedOn: string;
  /** What was compared against what. */
  note: string;
}

export interface SeedEntry {
  type: CmsEntryType;
  /** Defaults to "en". */
  locale?: string;
  slug: string;
  title: string;
  summary?: string;
  /** Draft `data` without `type`; the runner adds it. */
  data: Record<string, unknown>;
  /** Complete blocks (checked with the publish block schema). Omit to keep the API's starter layout. */
  blocks?: DraftBlock[];
  /** Keys of seeded FAQs, in display order. */
  faqKeys?: string[];
  relations?: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  /** Parent entry (DOC pages under /developers). */
  parent?: EntryRef;
  /** Card / OG image as `media_<key>` (see lib/media.ts). */
  imageId?: string;
  ogImageId?: string;
  /** Outline or placeholder only: seeded as a draft, never published by publish-all. */
  stub?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  noindex?: boolean;
  sortOrder?: number;
  featured?: boolean;
  /** Where the content came from (file and key in apps/marketing, or "new"). */
  origin: string;
  /** Code files that prove the product claims (apps/web/src, apps/api/src). */
  evidence: string[];
  /** Outside sources (official sites, Wikidata) that were opened on `accessedAt`. */
  sources?: Source[];
  factCheck: FactCheck;
  /** What was removed from the source and why. */
  dropped: string[];
  /** Claims left out until the owner confirms them. */
  needsOwner: string[];
}

export interface SeedFaq {
  /** Stable key used by entries (`faqKeys`) and for de-duplication. */
  key: string;
  locale?: string;
  topic: string;
  question: string;
  /** Markdown. Prices only as {{price:...}} tokens. */
  answer: string;
  /** Short note for editors: where the answer was checked. */
  sourceNote: string;
  origin: string;
  evidence: string[];
}

export interface SeedRedirect {
  from: string;
  to?: string;
  status: RedirectStatus;
  note: string;
}

export interface SeedSetting {
  key: SettingKey;
  value: unknown;
  needsOwner: string[];
}

export interface SeedMenu {
  key: 'header' | 'footer' | 'legal' | 'mobile';
  title: string;
  items: MenuItem[];
}

/** A source item that was not imported at all. */
export interface DroppedItem {
  origin: string;
  what: string;
  why: string;
}
