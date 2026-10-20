/**
 * screenshot (API-CONTRACT 4.5): a real app screenshot in its device frame,
 * with numbered callouts and their legend, full width or split with text.
 * The media must be in the entry's media dictionary; a missing file renders
 * nothing (the API blocks publish with MEDIA_MISSING).
 */
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { cx } from '@/components/ui/cx';
import { Screenshot } from '@/components/frames';
import { CmsImage, mediaById } from '@/lib/media';
import { Markdown } from './rich-text/Markdown';
import { scopedSlugger } from './rich-text/slug';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

const NARROW_FRAMES = new Set(['phone', 'receipt']);

export function ScreenshotBlock({ block, ctx }: BlockProps<'screenshot'>) {
  const media = mediaById(ctx.entry.media, block.mediaId);
  if (!media) return null;
  const split = block.layout !== 'full';
  const narrow = NARROW_FRAMES.has(block.frame);
  const sizes = split
    ? narrow
      ? '(min-width: 1024px) 320px, 70vw'
      : '(min-width: 1280px) 680px, (min-width: 1024px) 55vw, 100vw'
    : narrow
      ? '(min-width: 768px) 360px, 80vw'
      : '(min-width: 1280px) 1152px, 100vw';

  const figure = (
    <div className={cx(narrow && 'mx-auto w-full max-w-[22rem]')}>
      <Screenshot frame={block.frame} url={block.url} callouts={block.callouts} caption={block.caption}>
        <CmsImage media={media} sizes={sizes} className="block h-auto w-full" />
      </Screenshot>
    </div>
  );

  const text =
    block.heading || block.body ? (
      <div>
        {block.heading ? (
          <h2 id={ctx.headingId} className="text-h2 text-fg-strong">
            {block.heading}
          </h2>
        ) : null}
        {block.body ? (
          <Prose className={cx(block.heading && 'mt-5', 'text-fg-muted')}>
            <Markdown text={block.body} opts={{ media: ctx.entry.media, locale: ctx.locale, slugger: scopedSlugger(block.id), idPrefix: block.id }} />
          </Prose>
        ) : null}
      </div>
    ) : null;

  if (!split || !text) {
    return (
      <Container>
        {text ? <div className="mx-auto mb-12 max-w-measure text-center">{text}</div> : null}
        <div {...reveal(ctx.index, 'scale')}>{figure}</div>
      </Container>
    );
  }

  return (
    <Container size="wide">
      <div
        className={cx(
          'grid items-center gap-10 lg:gap-16',
          narrow ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]',
          block.layout === 'split-left' && (narrow ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'),
        )}
      >
        <div className={cx(block.layout === 'split-left' && 'lg:order-2')} {...reveal(ctx.index)}>
          {text}
        </div>
        <div className={cx(block.layout === 'split-left' && 'lg:order-1')} {...reveal(ctx.index, 'scale')}>
          {figure}
        </div>
      </div>
    </Container>
  );
}
