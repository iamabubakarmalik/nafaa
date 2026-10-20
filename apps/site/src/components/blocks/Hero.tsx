/**
 * hero (API-CONTRACT 4.1): the page H1, the 25-60 word sub, two CTAs,
 * optional badges and media (framed screenshot, diagram or image).
 *
 * ARCH 4.4 hero rule: the H1, the sub and the screenshot never animate and
 * are never hidden in the server HTML; only a diagram beside them may move.
 * The screenshot or image is the LCP candidate, so it loads with priority.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { Diagram } from '@/components/diagrams';
import { Screenshot } from '@/components/frames';
import { CmsImage, mediaById } from '@/lib/media';
import { InlineMarkdown } from './rich-text/Markdown';
import { CtaButton } from './parts/CtaButton';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

const SPLIT_SIZES = '(min-width: 1280px) 640px, (min-width: 1024px) 52vw, 100vw';
const CENTER_SIZES = '(min-width: 1280px) 1152px, 100vw';

function HeroMedia({ block, ctx }: BlockProps<'hero'>) {
  const media = block.media;
  if (!media) return null;
  const sizes = block.layout === 'split' ? SPLIT_SIZES : CENTER_SIZES;
  if (media.kind === 'diagram') {
    return <Diagram spec={media.diagram} caption={ctx.entry.title} showCaption={false} tone={ctx.theme} bare />;
  }
  const item = mediaById(ctx.entry.media, media.mediaId);
  if (!item) return null;
  if (media.kind === 'image') {
    return <CmsImage media={item} sizes={sizes} priority className="h-auto w-full rounded-xl" />;
  }
  return (
    <Screenshot frame={media.frame} url={media.url} animate={false}>
      <CmsImage media={item} sizes={sizes} priority className="block h-auto w-full" />
    </Screenshot>
  );
}

export function Hero({ block, ctx }: BlockProps<'hero'>) {
  const heading = block.heading?.trim() || ctx.entry.title;
  const isHome = ctx.entry.path === '/';
  const split = block.layout === 'split' && Boolean(block.media);
  const badges = (block.badges ?? []).filter(Boolean);

  const text = (
    <div className={cx(split ? 'max-w-[36rem]' : 'mx-auto max-w-[48rem] text-center')}>
      {block.eyebrow ? <p className="mb-5 text-eyebrow uppercase text-link">{block.eyebrow}</p> : null}
      <h1 id={ctx.headingId} className={cx(isHome ? 'text-display' : 'text-h1', 'text-fg-strong')}>
        {heading}
      </h1>
      <p className={cx('mt-6 text-body-lg text-fg-muted', !split && 'mx-auto max-w-[40rem]')}>
        <InlineMarkdown text={block.sub} />
      </p>
      <div className={cx('mt-9 flex flex-wrap items-center gap-3', !split && 'justify-center')}>
        <CtaButton cta={block.primaryCta} size="lg" fallbackVariant="primary" area="hero" />
        {block.secondaryCta ? <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="hero" /> : null}
      </div>
      {badges.length ? (
        <ul className={cx('mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-small text-fg-muted', !split && 'justify-center')}>
          {badges.map((badge, i) => (
            <li key={i} className="inline-flex items-center gap-2">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="size-4 shrink-0 text-link">
                <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.14" />
                <path d="M5 8.2 7 10l4-4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <InlineMarkdown text={badge} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <div className="relative">
      <div aria-hidden className={styles.heroGlow} />
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]" />
      <Container size={split ? 'wide' : 'default'}>
        {split ? (
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
            {text}
            <div className={styles.heroMedia}>
              <HeroMedia block={block} ctx={ctx} />
            </div>
          </div>
        ) : (
          <>
            {text}
            {block.media ? (
              <div className={cx(styles.heroMedia, 'mx-auto mt-16 max-w-[64rem]')}>
                <HeroMedia block={block} ctx={ctx} />
              </div>
            ) : null}
          </>
        )}
      </Container>
    </div>
  );
}
