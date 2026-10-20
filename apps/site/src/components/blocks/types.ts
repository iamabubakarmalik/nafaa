/**
 * Shared types for the block renderers (ARCH 6, API-CONTRACT 4).
 *
 * Blocks are server components. Each one receives its block props and a
 * BlockContext: the entry it belongs to, the locale, a data source for the
 * blocks that read extra public data (plans, stats, proof, entry lists), and
 * page-level helpers (heading slugger, tool renderer).
 *
 * Templates normally render `<BlockRenderer blocks={entry.blocks} entry={entry} />`
 * and never build a context by hand.
 */
import type { ReactNode } from 'react';
import type {
  Block,
  BlockType,
  CmsEntryType,
  EntryCard,
  EntrySort,
  FeatureStatus,
  PublicCustomer,
  PublicEntry,
  PublicPlan,
  PublicStatsResponse,
  PublicTestimonial,
  SiteSettings,
  StatMetric,
  ToolKey,
} from '@/lib/cms/contract/cms-contract';
import type { Slugger } from './rich-text/slug';

/** The entry fields blocks read. A full PublicEntry satisfies it. */
export type BlockEntry = Pick<
  PublicEntry,
  'id' | 'type' | 'locale' | 'path' | 'url' | 'title' | 'summary' | 'data' | 'faqs' | 'media' | 'related' | 'tags' | 'parent'
>;

export interface EntryListQuery {
  type: CmsEntryType;
  locale: string;
  tag?: string;
  group?: string;
  featured?: boolean;
  parentId?: string;
  status?: readonly FeatureStatus[];
  sort?: EntrySort;
  limit?: number;
}

export interface ProofListQuery {
  locale: string;
  ids?: readonly string[];
  industry?: string;
  city?: string;
  limit?: number;
}

export interface IndustryGroupLabel {
  key: string;
  label: string;
  sortOrder: number;
}

/**
 * Where blocks read public data. Production pages use `cmsSource` (the
 * public site API through lib/cms/client, with cache tags). The /_dev/blocks
 * gallery wraps it with typed fixtures; fixtures never reach a public page.
 */
export interface BlockDataSource {
  readonly kind: 'cms' | 'gallery';
  plans(): Promise<PublicPlan[]>;
  stats(metrics: readonly StatMetric[]): Promise<PublicStatsResponse>;
  testimonials(query: ProofListQuery): Promise<PublicTestimonial[]>;
  customers(query: ProofListQuery): Promise<PublicCustomer[]>;
  entries(query: EntryListQuery): Promise<EntryCard[]>;
  /** A published entry by path (cityFacts reads the parent CITY of a CITY_INDUSTRY page). */
  entry(path: string, locale: string): Promise<PublicEntry | null>;
  site(locale: string): Promise<SiteSettings>;
  /** Labels for `entryGrid` layout `grouped`. Empty until the public API exposes settings `industry-groups`. */
  industryGroups(locale: string): Promise<IndustryGroupLabel[]>;
}

export interface BlockContext {
  entry: BlockEntry;
  locale: string;
  source: BlockDataSource;
  /** Unique heading ids across the page (rich text, FAQ, sections). */
  slugger: Slugger;
  /** Position of the block among the visible blocks. */
  index: number;
  /** Section theme the block renders on (for diagrams and code panels). */
  theme: 'default' | 'muted' | 'ink';
  /** Renders a `tool` block's island. Supplied by the Tool template; without it the block renders nothing. */
  renderTool?: (toolKey: ToolKey) => ReactNode;
  /** Id of the section heading, for aria-labelledby. */
  headingId: string;
}

export type BlockProps<T extends BlockType> = { block: Extract<Block, { type: T }>; ctx: BlockContext };
