/**
 * steps (API-CONTRACT 4.10): 2-10 numbered steps as an ordered list. Steps
 * with screenshots alternate text and image; text-only steps form a
 * connected vertical sequence. `howTo: true` makes lib/seo/graph.ts emit
 * HowTo schema from the same items.
 */
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { cx } from '@/components/ui/cx';
import { Screenshot } from '@/components/frames';
import { CmsImage, mediaById } from '@/lib/media';
import { BlockHeading } from './parts/BlockHeading';
import { Markdown } from './rich-text/Markdown';
import { scopedSlugger } from './rich-text/slug';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

export function Steps({ block, ctx }: BlockProps<'steps'>) {
  const t = strings(ctx.locale);
  const slugger = scopedSlugger(block.id);
  const withMedia = block.items.some((item) => mediaById(ctx.entry.media, item.mediaId));

  if (withMedia) {
    return (
      <Container size="wide">
        <BlockHeading id={ctx.headingId} title={block.heading} intro={block.intro} align="center" className="mx-auto" index={ctx.index} />
        <ol className="mt-16 space-y-20 md:space-y-28">
          {block.items.map((item, i) => {
            const media = mediaById(ctx.entry.media, item.mediaId);
            const flip = i % 2 === 1;
            return (
              <li key={i} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <div className={cx(flip && 'lg:order-2')} {...reveal(ctx.index)}>
                  <p className="flex items-center gap-3 text-eyebrow uppercase text-link">
                    <span className={styles.stepNum} aria-hidden>
                      {i + 1}
                    </span>
                    <span>
                      {t.stepLabel} {i + 1}
                    </span>
                  </p>
                  <h3 className="mt-5 text-h3 text-fg-strong">{item.title}</h3>
                  <Prose className="mt-4 text-fg-muted">
                    <Markdown text={item.body} opts={{ media: ctx.entry.media, locale: ctx.locale, slugger, idPrefix: `${block.id}-${i}` }} />
                  </Prose>
                </div>
                <div className={cx(flip && 'lg:order-1')} {...reveal(ctx.index, 'scale')}>
                  {media ? (
                    <Screenshot frame="none">
                      <CmsImage media={media} sizes="(min-width: 1280px) 600px, (min-width: 1024px) 46vw, 100vw" className="block h-auto w-full" />
                    </Screenshot>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    );
  }

  return (
    <Container>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <BlockHeading id={ctx.headingId} title={block.heading} intro={block.intro} className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start" index={ctx.index} />
        <ol className={styles.steps} {...reveal(ctx.index, 'stagger')}>
          {block.items.map((item, i) => (
            <li key={i} className={cx(styles.stepRow, 'flex gap-5 pb-10 last:pb-0')}>
              <span className={styles.stepNum} aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0 pt-1">
                <h3 className="text-h4 text-fg-strong">
                  <span className="sr-only">
                    {t.stepLabel} {i + 1}:{' '}
                  </span>
                  {item.title}
                </h3>
                <Prose className="mt-2 text-[0.975rem] text-fg-muted">
                  <Markdown text={item.body} opts={{ media: ctx.entry.media, locale: ctx.locale, slugger, idPrefix: `${block.id}-${i}` }} />
                </Prose>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  );
}
