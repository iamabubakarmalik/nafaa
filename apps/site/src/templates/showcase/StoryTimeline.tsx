/**
 * StoryTimeline: a `steps` block as a two-column story. The title and intro
 * stay pinned on the left on large screens; the steps run down a rail on the
 * right that fills with colour as it scrolls past (scroll-driven, CSS only).
 * A step with a screenshot (`mediaId`) shows it framed under its text.
 */
import { Markdown, InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { scopedSlugger } from '@/components/blocks/rich-text/slug';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { cx } from '@/components/ui/cx';
import type { Block, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { CmsImage, mediaById } from '@/lib/media';
import { Kicker } from './kit';
import styles from './showcase.module.css';

type StepsBlock = Extract<Block, { type: 'steps' }>;

export function StoryTimeline({ block, entry, headingId, kicker = 'How it works' }: { block: StepsBlock; entry: PublicEntry; headingId: string; kicker?: string }) {
  return (
    <Container>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Kicker className="mb-4">{kicker}</Kicker>
          <h2 id={headingId} className="text-h2 text-fg-strong">
            {block.heading}
          </h2>
          {block.intro ? (
            <p className="mt-4 max-w-[30rem] text-body-lg text-fg-muted">
              <InlineMarkdown text={block.intro} />
            </p>
          ) : null}
          <p aria-hidden className="mt-10 hidden font-mono text-[5.5rem] font-semibold leading-none tracking-tight text-fg-strong/[0.06] lg:block">
            {String(block.items.length).padStart(2, '0')}
          </p>
        </div>
        <div className={styles.timeline}>
          <span aria-hidden className={styles.rail}>
            <span className={styles.railFill} />
          </span>
          <ol className="space-y-6">
          {block.items.map((item, i) => {
            const media = item.mediaId ? mediaById(entry.media, item.mediaId) : null;
            return (
              <li key={i} className="relative flex gap-5 md:gap-6">
                <span className={styles.node}>{i + 1}</span>
                <div className={cx(styles.stepCard, 'min-w-0 flex-1')} data-reveal="fade-up">
                  <h3 className="text-h4 text-fg-strong">{item.title}</h3>
                  <Prose className="mt-1.5 text-fg-muted [&>*]:text-[0.9375rem]">
                    <Markdown text={item.body} opts={{ media: entry.media, locale: entry.locale, slugger: scopedSlugger(`${block.id}-${i}`), idPrefix: `${block.id}-${i}` }} />
                  </Prose>
                  {media ? (
                    <div className="mt-5 overflow-hidden rounded-lg ring-1 ring-line">
                      <CmsImage media={media} sizes="(min-width: 1024px) 560px, 100vw" className="block h-auto w-full" />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </Container>
  );
}
