/**
 * ShowcaseBody: the block-driven body of the showcase templates (product,
 * solution, service, industry, city, pricing). Same contract as
 * core/Standard's StandardBody (meta row, status notice, the entry's blocks
 * in the editor's order, a slot after the hero, closing sections before the
 * last CTA), but the hero, feature grids, steps, screenshots and CTA bands
 * render with the showcase kit. Every other block goes to the stock
 * BlockRenderer unchanged.
 */
import type { ReactNode } from 'react';
import { blockHeadingId } from '@/components/blocks/BlockRenderer';
import type { Block, PublicEntry, PublicMedia } from '@/lib/cms/contract/cms-contract';
import { mediaById } from '@/lib/media';
import { Segments, segment } from '../core/Blocks';
import { MetaRow, StatusNotice } from '../core/parts';
import { Bento } from './Bento';
import { FinalCta } from './FinalCta';
import { ShotPanel } from './ShotPanel';
import { StageHero } from './StageHero';
import { StoryTimeline } from './StoryTimeline';
import { DEFAULT_TRUST, ShowcaseSection, type TrustItem } from './kit';

export interface ShowcaseKickers {
  featuresGrid?: string;
  steps?: string;
  screenshot?: string;
}

export interface ShowcaseBodyProps {
  entry: PublicEntry;
  afterHero?: ReactNode;
  beforeEnd?: ReactNode;
  showUpdated?: boolean;
  /** Small label above section titles, by block type. */
  kickers?: ShowcaseKickers;
  /** Pill text in the hero eyebrow. */
  pill?: string;
  /** Facts under the closing CTA buttons. */
  ctaFacts?: TrustItem[];
  /** Phone screenshot that overlaps the hero screenshot; defaults to the first phone screenshot block. */
  companion?: PublicMedia | null;
  /** Blocks this template renders elsewhere (by id). */
  skip?: ReadonlySet<string>;
  /** Replaces the breadcrumb row (templates with their own meta bar). */
  meta?: ReactNode;
  /** Decorative stage art for a hero without media. */
  heroArt?: ReactNode;
  /** Template hook: return a node to render a block itself, or undefined for the default. */
  render?: (block: Block) => ReactNode | undefined;
}

/** The first phone-framed screenshot in the entry, for the hero stage. */
export function firstPhoneShot(entry: PublicEntry): PublicMedia | null {
  const block = entry.blocks.find((b) => b.type === 'screenshot' && b.frame === 'phone');
  return block && block.type === 'screenshot' ? mediaById(entry.media, block.mediaId) ?? null : null;
}

function section(block: Block, node: ReactNode, spacing: 'default' | 'compact' | 'snug' = 'snug'): ReactNode {
  return (
    <ShowcaseSection id={block.anchor} labelledBy={blockHeadingId(block)} theme={block.theme ?? 'default'} spacing={spacing}>
      <div data-block={block.type} className="contents">
        {node}
      </div>
    </ShowcaseSection>
  );
}

export function ShowcaseBody({
  entry,
  afterHero,
  beforeEnd,
  showUpdated = true,
  kickers = {},
  pill,
  ctaFacts = DEFAULT_TRUST.slice(0, 3),
  companion,
  skip,
  render,
  heroArt,
  meta,
}: ShowcaseBodyProps) {
  const visible = entry.blocks.filter((b) => b.hidden !== true && !skip?.has(b.id));
  const lastCta = [...visible].reverse().find((b) => b.type === 'cta');
  const phone = companion === undefined ? firstPhoneShot(entry) : companion;
  let firstFeatures = true;
  let firstShot = true;

  const segments = segment(visible, (block) => {
    const headingId = blockHeadingId(block);
    const custom = render?.(block);
    if (custom !== undefined) return custom;
    let node: ReactNode | undefined;
    switch (block.type) {
      case 'hero':
        node = (
          <>
            <section aria-labelledby={headingId} data-block="hero" className="theme-default relative isolate bg-transparent text-fg">
              <StageHero block={block} entry={entry} headingId={headingId} companion={phone} pill={pill} art={heroArt} />
            </section>
            {afterHero}
          </>
        );
        break;
      case 'featuresGrid':
        node = section(block, <Bento block={block} headingId={headingId} locale={entry.locale} kicker={firstFeatures ? kickers.featuresGrid : undefined} />);
        firstFeatures = false;
        break;
      case 'steps':
        node = section(block, <StoryTimeline block={block} entry={entry} headingId={headingId} kicker={kickers.steps} />);
        break;
      case 'screenshot':
        node = section(block, <ShotPanel block={block} entry={entry} headingId={headingId} kicker={firstShot ? kickers.screenshot : undefined} />);
        firstShot = false;
        break;
      case 'cta':
        node = section(block, <FinalCta block={block} headingId={headingId} facts={block === lastCta ? ctaFacts : []} />, 'compact');
        if (block === lastCta && beforeEnd) node = (
          <>
            {beforeEnd}
            {node}
          </>
        );
        break;
      default:
        return undefined;
    }
    return node;
  });
  if (!lastCta && beforeEnd) segments.push({ kind: 'own', key: 'before-end', node: beforeEnd });

  return (
    <>
      {meta ?? <MetaRow entry={entry} showUpdated={showUpdated} />}
      <StatusNotice entry={entry} />
      <Segments entry={entry} segments={segments} />
    </>
  );
}
