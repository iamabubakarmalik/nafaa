/**
 * StageHero: the hero of the showcase templates. It renders a CMS `hero`
 * block (eyebrow, H1, sub, CTAs, badges, media) on an aurora backdrop, with
 * the screenshot on a "stage": a browser frame that tilts flat as the page
 * scrolls, an optional phone screenshot overlapping it, and up to three
 * floating chips taken from the block's badges.
 *
 * ARCH 4.4 hero rule: the H1, the sub and the screenshot are always in the
 * server HTML and never hidden; only transforms move. The screenshot is the
 * LCP image (priority). Diagrams render as in the stock Hero.
 */
import type { ReactNode } from 'react';
import { CtaButton } from '@/components/blocks/parts/CtaButton';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { Diagram } from '@/components/diagrams';
import { PhoneFrame, Screenshot } from '@/components/frames';
import type { Block, PublicEntry, PublicMedia } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { CmsImage, mediaById } from '@/lib/media';
import styles from './showcase.module.css';

type HeroBlock = Extract<Block, { type: 'hero' }>;

const CHIP_ICONS = ['circle-check', 'zap', 'shield-check'];

/** Splits a heading so its last words can carry the accent gradient. */
function splitTail(heading: string): [string, string] {
  const words = heading.trim().split(/\s+/);
  if (words.length < 4) return ['', heading];
  const n = Math.min(3, Math.ceil(words.length / 3));
  return [words.slice(0, -n).join(' ') + ' ', words.slice(-n).join(' ')];
}

/** Badge text without Markdown, for the floating chips. */
function plain(text: string): string {
  return text.replace(/\*\*|__|\*|_|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

export interface StageHeroProps {
  block: HeroBlock;
  entry: PublicEntry;
  headingId: string;
  /** A phone screenshot that overlaps the main one (centered layout). */
  companion?: PublicMedia | null;
  /** Accent the last words of the H1 (default true). */
  accentTail?: boolean;
  /** Pill text before the eyebrow (e.g. "New", "Worldwide"). */
  pill?: string;
  /** Decorative art for the stage when the block has no media. */
  art?: ReactNode;
}

export function StageHero({ block, entry, headingId, companion, accentTail = true, pill, art }: StageHeroProps) {
  const heading = block.heading?.trim() || entry.title;
  const [head, tail] = accentTail ? splitTail(heading) : [heading, ''];
  const badges = (block.badges ?? []).filter(Boolean);
  const media = block.media;
  const shot = media && media.kind !== 'diagram' ? mediaById(entry.media, media.mediaId) : null;
  // A diagram needs the full width to stay legible, so diagram heroes are always centered.
  const split = block.layout === 'split' && Boolean(media) && media?.kind !== 'diagram';
  const chips = shot ? badges.slice(0, 3).map(plain) : [];

  const text = (
    <div className={cx(split ? 'max-w-[38rem]' : 'mx-auto max-w-[56rem] text-center')}>
      {block.eyebrow || pill ? (
        <p className={cx('mb-7 flex', !split && 'justify-center')}>
          <span className={styles.pill}>
            {pill ? <span className={styles.pillDot}>{pill}</span> : <span className={styles.pillDot}>Nafaa</span>}
            {block.eyebrow}
          </span>
        </p>
      ) : null}
      <h1 id={headingId} className="text-[clamp(2.375rem,1.5rem+3.4vw,4.25rem)] font-650 leading-[1.04] tracking-[-0.035em] text-fg-strong">
        {head ? <span className={styles.gradientText}>{head}</span> : null}
        {tail ? <span className={styles.accentText}>{tail}</span> : null}
      </h1>
      <p className={cx('mt-6 text-body-lg text-fg-muted md:text-[1.25rem] md:leading-[1.6]', !split && 'mx-auto max-w-[42rem]')}>
        <InlineMarkdown text={block.sub} />
      </p>
      <div className={cx('mt-9 flex flex-wrap items-center gap-3', !split && 'justify-center')}>
        <CtaButton cta={block.primaryCta} size="lg" fallbackVariant="primary" area="hero" />
        {block.secondaryCta ? <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="hero" /> : null}
      </div>
      {badges.length && !chips.length ? (
        <ul className={cx('mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-small text-fg-muted', !split && 'justify-center')}>
          {badges.map((badge, i) => (
            <li key={i} className="inline-flex items-center gap-2">
              <CmsIcon name="circle-check" size={16} className="text-link" />
              <InlineMarkdown text={badge} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  let stage: ReactNode = null;
  if (!media && art) {
    stage = <div className="mt-16 md:mt-20">{art}</div>;
  } else if (media?.kind === 'diagram') {
    stage = (
      <div className={cx(styles.stageWrap, !split && 'mx-auto mt-16 max-w-[64rem]')}>
        <div aria-hidden className={styles.stageGlow} />
        <div className="rounded-xl bg-surface/80 p-4 shadow-e3 ring-1 ring-line backdrop-blur md:p-6">
          <Diagram spec={media.diagram} caption={entry.title} showCaption={false} tone="default" bare />
        </div>
      </div>
    );
  } else if (shot) {
    const sizes = split ? '(min-width: 1280px) 680px, (min-width: 1024px) 55vw, 100vw' : '(min-width: 1280px) 1200px, 100vw';
    const frame = media && media.kind === 'screenshot' ? media.frame : 'none';
    const narrow = frame === 'phone' || frame === 'receipt';
    stage = (
      <div className={cx(styles.stageWrap, !split && 'mx-auto mt-16 max-w-[72rem] md:mt-20', narrow && 'mx-auto max-w-[22rem]')}>
        <div aria-hidden className={styles.stageGlow} />
        <div className={styles.stage}>
          {media?.kind === 'screenshot' ? (
            <Screenshot frame={media.frame} url={media.url} animate={false} className={narrow ? undefined : styles.stageInner}>
              <CmsImage media={shot} sizes={sizes} priority className="block h-auto w-full" />
            </Screenshot>
          ) : (
            <CmsImage media={shot} sizes={sizes} priority className={cx('h-auto w-full rounded-xl', styles.stageInner)} />
          )}
        </div>
        {companion && !narrow ? (
          <div className={cx(styles.stagePhone, split && styles.stageSplitPhone)}>
            <PhoneFrame>
              <CmsImage media={companion} sizes="200px" className="block h-auto w-full" />
            </PhoneFrame>
          </div>
        ) : null}
        {chips.map((chip, i) => (
          <span key={i} aria-hidden className={cx(styles.chip, [styles.chip0, styles.chip1, styles.chip2][i])}>
            <span className={styles.chipIcon}>
              <CmsIcon name={CHIP_ICONS[i]} size={15} strokeWidth={2.25} />
            </span>
            {chip}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cx(styles.hero, 'pb-16 pt-12 md:pb-24 md:pt-16')}>
      <div aria-hidden className={styles.aurora} />
      <div aria-hidden className={styles.heroGrid} />
      <Container>
        {split ? (
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
            {text}
            {stage}
          </div>
        ) : (
          <>
            {text}
            {stage}
          </>
        )}
        {chips.length ? (
          <ul className="sr-only">
            {badges.map((badge, i) => (
              <li key={i}>{plain(badge)}</li>
            ))}
          </ul>
        ) : null}
      </Container>
    </div>
  );
}
