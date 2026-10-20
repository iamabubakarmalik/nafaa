/**
 * ShotPanel: a `screenshot` block on a lit gradient panel. Full width puts
 * the title above and lets the framed screenshot rise out of the panel's
 * lower edge; split layouts pair the text with the panel; phone and receipt
 * shots sit centred on concentric rings. Callouts and captions come from the
 * stock Screenshot frame.
 */
import { Markdown } from '@/components/blocks/rich-text/Markdown';
import { scopedSlugger } from '@/components/blocks/rich-text/slug';
import { Screenshot } from '@/components/frames';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { cx } from '@/components/ui/cx';
import type { Block, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { CmsImage, mediaById } from '@/lib/media';
import { Kicker, RingsArt } from './kit';
import styles from './showcase.module.css';

type ShotBlock = Extract<Block, { type: 'screenshot' }>;
const NARROW = new Set(['phone', 'receipt']);

export function ShotPanel({ block, entry, headingId, kicker }: { block: ShotBlock; entry: PublicEntry; headingId: string; kicker?: string }) {
  const media = mediaById(entry.media, block.mediaId);
  if (!media) return null;
  const narrow = NARROW.has(block.frame);
  const split = block.layout !== 'full';
  const hasText = Boolean(block.heading || block.body);
  // The shot may run off the panel edge only when nothing below it (legend, caption) would be cut.
  const bleed = !block.callouts?.length && !block.caption;

  const text = hasText ? (
    <div className={cx(!split && 'mx-auto max-w-[44rem] text-center')}>
      {kicker ? <Kicker className={cx('mb-4', !split && 'justify-center')}>{kicker}</Kicker> : null}
      {block.heading ? (
        <h2 id={headingId} className="text-h2 text-fg-strong">
          {block.heading}
        </h2>
      ) : null}
      {block.body ? (
        <Prose className={cx(block.heading && 'mt-5', 'text-fg-muted', !split && 'mx-auto')}>
          <Markdown text={block.body} opts={{ media: entry.media, locale: entry.locale, slugger: scopedSlugger(block.id), idPrefix: block.id }} />
        </Prose>
      ) : null}
    </div>
  ) : null;

  const sizes = narrow ? '(min-width: 768px) 340px, 75vw' : split ? '(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw' : '(min-width: 1280px) 1100px, 100vw';
  const shot = (
    <Screenshot frame={block.frame} url={block.url} callouts={block.callouts} caption={block.caption} className={narrow ? undefined : styles.panelShot}>
      <CmsImage media={media} sizes={sizes} className="block h-auto w-full" />
    </Screenshot>
  );

  const panel = narrow ? (
    <div className={cx(styles.panel, 'flex justify-center px-6 py-12 md:py-16')} data-reveal="scale">
      <RingsArt />
      <div className="w-full max-w-[18rem]">{shot}</div>
    </div>
  ) : split ? (
    bleed ? (
      <div className={cx(styles.panel, 'pl-6 pt-6 md:pl-10 md:pt-10')} data-reveal="scale">
        <div className="-mb-px w-[118%] max-w-none">{shot}</div>
      </div>
    ) : (
      <div className={cx(styles.panel, 'p-5 md:p-8')} data-reveal="scale">
        {shot}
      </div>
    )
  ) : (
    <div className={cx(styles.panel, 'px-4 pt-8 md:px-14 md:pt-14', !bleed && 'pb-8 md:pb-12')} data-reveal="scale">
      <div className="mx-auto max-w-[68rem]">{shot}</div>
    </div>
  );

  if (!split || !text) {
    return (
      <Container>
        {text ? <div className="mb-12">{text}</div> : null}
        {panel}
      </Container>
    );
  }
  return (
    <Container>
      <div className={cx('grid items-center gap-10 lg:gap-16', narrow ? 'lg:grid-cols-2' : 'lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]', block.layout === 'split-left' && !narrow && 'lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]')}>
        <div className={cx(block.layout === 'split-left' && 'lg:order-2')}>{text}</div>
        <div className={cx(block.layout === 'split-left' && 'lg:order-1')}>{panel}</div>
      </div>
    </Container>
  );
}
