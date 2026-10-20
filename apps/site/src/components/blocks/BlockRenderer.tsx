/**
 * BlockRenderer: renders an entry's blocks (API-CONTRACT 4) in order, each
 * in its own themed <section>.
 *
 *   <BlockRenderer blocks={entry.blocks} entry={entry} />
 *
 * - Hidden blocks are skipped (the public API already drops them).
 * - A block that has nothing real to show (no FAQs, no consented quotes, no
 *   stats, an empty list) renders no section at all, so no empty bands.
 * - Headings: the hero renders the page H1; every other block titles itself
 *   with H2 and nests H3/H4 below it. A template that renders its own H1
 *   simply passes blocks without a hero.
 * - Section ids: a block's `anchor` becomes the section id (for #links);
 *   its title gets `h-<block id>` (aria-labelledby, tables of contents).
 * - Data: `source` defaults to the public site API (cache-tagged). Only the
 *   /_dev/blocks gallery passes another one.
 * - Unknown block types (a newer contract) render nothing.
 */
import type { ReactNode } from 'react';
import { Section } from '@/components/ui/Section';
import { cx } from '@/components/ui/cx';
import type { Block, BlockType, ToolKey } from '@/lib/cms/contract/cms-contract';
import { AnswerBox } from './AnswerBox';
import { Callout } from './Callout';
import { CityFacts } from './CityFacts';
import { CodeSample } from './CodeSample';
import { ComparisonTable } from './ComparisonTable';
import { CtaBand } from './CtaBand';
import { DiagramBlock } from './DiagramBlock';
import { EntryGrid } from './EntryGrid';
import { Faq } from './Faq';
import { FeaturesGrid } from './FeaturesGrid';
import { Hero } from './Hero';
import { LeadFormBlock } from './LeadFormBlock';
import { LogoCloud } from './LogoCloud';
import { PricingTable } from './PricingTable';
import { RelatedLinks } from './RelatedLinks';
import { RichText } from './RichText';
import { ScreenshotBlock } from './ScreenshotBlock';
import { SourcesBlock } from './SourcesBlock';
import { Stats } from './Stats';
import { Steps } from './Steps';
import { Testimonials } from './Testimonials';
import { ToolBlock } from './ToolBlock';
import { cmsSource } from './lib/source';
import { markdownHeadings } from './rich-text/Markdown';
import { createSlugger, type Slugger } from './rich-text/slug';
import type { BlockContext, BlockDataSource, BlockEntry } from './types';

type AnyRenderer = (props: { block: Block; ctx: BlockContext }) => ReactNode | Promise<ReactNode>;

const RENDERERS: Record<BlockType, AnyRenderer> = {
  hero: Hero as AnyRenderer,
  answerBox: AnswerBox as AnyRenderer,
  featuresGrid: FeaturesGrid as AnyRenderer,
  diagram: DiagramBlock as AnyRenderer,
  screenshot: ScreenshotBlock as AnyRenderer,
  faq: Faq as AnyRenderer,
  comparisonTable: ComparisonTable as AnyRenderer,
  cta: CtaBand as AnyRenderer,
  richText: RichText as AnyRenderer,
  steps: Steps as AnyRenderer,
  stats: Stats as AnyRenderer,
  testimonial: Testimonials as AnyRenderer,
  logoCloud: LogoCloud as AnyRenderer,
  pricingTable: PricingTable as AnyRenderer,
  codeSample: CodeSample as AnyRenderer,
  cityFacts: CityFacts as AnyRenderer,
  entryGrid: EntryGrid as AnyRenderer,
  relatedLinks: RelatedLinks as AnyRenderer,
  sources: SourcesBlock as AnyRenderer,
  callout: Callout as AnyRenderer,
  leadForm: LeadFormBlock as AnyRenderer,
  tool: ToolBlock as AnyRenderer,
};

/** Text blocks that read as one column of prose: they sit closer together. */
const FLOW: ReadonlySet<BlockType> = new Set(['richText', 'callout', 'codeSample', 'sources']);
/** Blocks with less vertical weight than a full section. */
const COMPACT: ReadonlySet<BlockType> = new Set(['answerBox', 'logoCloud', 'stats', 'relatedLinks', 'sources', 'callout', 'codeSample']);

export function blockHeadingId(block: Pick<Block, 'id'>): string {
  return `h-${block.id}`;
}

export interface BlockRendererProps {
  blocks: readonly Block[];
  entry: BlockEntry;
  /** Defaults to the public site API. */
  source?: BlockDataSource;
  /** Supplied by the Tool template to render `tool` blocks. */
  renderTool?: (toolKey: ToolKey) => ReactNode;
  /** Block types the template renders itself (they are skipped here). */
  exclude?: readonly BlockType[];
  /** Override the locale (defaults to the entry's). */
  locale?: string;
}

export async function BlockRenderer({ blocks, entry, source = cmsSource, renderTool, exclude, locale }: BlockRendererProps) {
  const visible = blocks.filter((block) => block.hidden !== true && !exclude?.includes(block.type) && block.type in RENDERERS);
  const slugger: Slugger = createSlugger();
  for (const block of visible) {
    if (block.anchor) slugger.reserve(block.anchor);
    slugger.reserve(blockHeadingId(block));
  }

  const rendered = await Promise.all(
    visible.map(async (block, index) => {
      const theme = block.theme ?? 'default';
      const ctx: BlockContext = {
        entry,
        locale: locale ?? entry.locale,
        source,
        slugger,
        index,
        theme,
        renderTool,
        headingId: blockHeadingId(block),
      };
      const render = RENDERERS[block.type];
      const content = await render({ block, ctx });
      return { block, content };
    }),
  );

  const shown = rendered.filter((item) => item.content !== null && item.content !== undefined && item.content !== false);

  return (
    <>
      {shown.map(({ block, content }, i) => {
        const prev = shown[i - 1]?.block;
        const theme = block.theme ?? 'default';
        const joinsPrev = Boolean(prev && FLOW.has(block.type) && FLOW.has(prev.type) && (prev.theme ?? 'default') === theme);
        const isHero = block.type === 'hero';
        return (
          <Section
            key={block.id}
            id={block.anchor}
            theme={theme}
            spacing={isHero ? 'none' : COMPACT.has(block.type) || FLOW.has(block.type) ? 'compact' : 'default'}
            className={cx(
              'overflow-x-clip',
              isHero && 'pb-16 pt-12 md:pb-24 md:pt-20',
              joinsPrev && '!pt-0',
            )}
          >
            <div data-block={block.type} className="contents">
              {content}
            </div>
          </Section>
        );
      })}
    </>
  );
}

/**
 * The page outline the blocks will render, for a table of contents: each
 * block's own title (id `h-<block id>`) and the H2/H3 headings inside
 * richText blocks, with the same ids the renderer gives them.
 */
export function blockOutline(blocks: readonly Block[]): { level: 2 | 3; text: string; id: string }[] {
  const visible = blocks.filter((block) => block.hidden !== true);
  const slugger = createSlugger();
  for (const block of visible) {
    if (block.anchor) slugger.reserve(block.anchor);
    slugger.reserve(blockHeadingId(block));
  }
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  for (const block of visible) {
    if (block.type === 'richText') out.push(...markdownHeadings(block.markdown, slugger));
    else if (block.type !== 'hero' && 'heading' in block && typeof block.heading === 'string' && block.heading.trim()) {
      out.push({ level: 2, text: block.heading.trim(), id: blockHeadingId(block) });
    }
  }
  return out;
}
