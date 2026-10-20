/**
 * Public surface of the blocks folder (S2). Templates import from here:
 *
 *   import { BlockRenderer } from '@/components/blocks';
 *   <BlockRenderer blocks={entry.blocks} entry={entry} />
 *
 * Single blocks are exported for templates that place one block in a fixed
 * spot (they still need a BlockContext; `blockContext()` builds one).
 * Markdown, InlineMarkdown and markdownHeadings render CMS text outside
 * blocks (entry summaries, FAQ hubs, glossary definitions, article TOCs).
 */
import { cmsSource } from './lib/source';
import { createSlugger } from './rich-text/slug';
import type { BlockContext, BlockDataSource, BlockEntry } from './types';

export { BlockRenderer, blockOutline, blockHeadingId, type BlockRendererProps } from './BlockRenderer';
export { Markdown, InlineMarkdown, markdownHeadings, type MarkdownOptions } from './rich-text/Markdown';
export { createSlugger, scopedSlugger, slugify, type Slugger } from './rich-text/slug';
export { CodePanel } from './parts/CodePanel';
export { EntryCardItem, EntryRow, cardHref } from './parts/EntryCards';
export { FeatureBadge } from './parts/FeatureBadge';
export { SourceList } from './parts/Sources';
export { CtaButton } from './parts/CtaButton';
export { strings as blockStrings, statusBadge } from './lib/i18n';
export { formatDate, formatPkr, isoDate } from './lib/format';
export { cmsSource } from './lib/source';
export type { BlockContext, BlockDataSource, BlockEntry, EntryListQuery, ProofListQuery } from './types';

export { Hero } from './Hero';
export { AnswerBox } from './AnswerBox';
export { FeaturesGrid } from './FeaturesGrid';
export { DiagramBlock } from './DiagramBlock';
export { ScreenshotBlock } from './ScreenshotBlock';
export { Faq } from './Faq';
export { ComparisonTable } from './ComparisonTable';
export { CtaBand } from './CtaBand';
export { RichText } from './RichText';
export { Steps } from './Steps';
export { Stats } from './Stats';
export { Testimonials } from './Testimonials';
export { LogoCloud } from './LogoCloud';
export { PricingTable } from './PricingTable';
export { CodeSample } from './CodeSample';
export { CityFacts } from './CityFacts';
export { EntryGrid } from './EntryGrid';
export { RelatedLinks } from './RelatedLinks';
export { SourcesBlock } from './SourcesBlock';
export { Callout } from './Callout';
export { LeadFormBlock } from './LeadFormBlock';
export { ToolBlock } from './ToolBlock';

/** A context for rendering one block outside BlockRenderer. */
export function blockContext(entry: BlockEntry, options: Partial<Omit<BlockContext, 'entry'>> = {}): BlockContext {
  return {
    entry,
    locale: options.locale ?? entry.locale,
    source: options.source ?? (cmsSource as BlockDataSource),
    slugger: options.slugger ?? createSlugger(),
    index: options.index ?? 2,
    theme: options.theme ?? 'default',
    renderTool: options.renderTool,
    headingId: options.headingId ?? 'h-block',
  };
}
