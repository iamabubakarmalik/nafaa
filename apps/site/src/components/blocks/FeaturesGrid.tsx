/**
 * featuresGrid (API-CONTRACT 4.3): 3-12 features in 2, 3 or 4 columns, each
 * with a CMS icon, a title (H3), inline Markdown body, an optional link and
 * the feature status badge. Titles also feed SoftwareApplication
 * `featureList` (lib/seo/graph.ts).
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { CmsIcon } from '@/lib/icons';
import { BlockHeading } from './parts/BlockHeading';
import { FeatureBadge } from './parts/FeatureBadge';
import { SmartLink } from './parts/SmartLink';
import { InlineMarkdown } from './rich-text/Markdown';
import { linkKind } from './lib/links';
import { reveal } from './lib/reveal';
import { strings } from './lib/i18n';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

const COLUMNS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

export function FeaturesGrid({ block, ctx }: BlockProps<'featuresGrid'>) {
  const t = strings(ctx.locale);
  return (
    <Container>
      <BlockHeading id={ctx.headingId} title={block.heading} intro={block.intro} index={ctx.index} />
      <ul className={cx('mt-12 grid gap-4 md:gap-5', COLUMNS[block.columns])} {...reveal(ctx.index, 'stagger')}>
        {block.items.map((item, i) => {
          const linked = linkKind(item.href) !== 'none';
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-inset ring-accent/15 ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/20"
                >
                  <CmsIcon name={item.icon} size={20} />
                </span>
                <FeatureBadge status={item.status} locale={ctx.locale} />
              </div>
              <h3 className="mt-5 text-h4 text-fg-strong">{item.title}</h3>
              <p className="mt-2 text-small text-fg-muted">
                <InlineMarkdown text={item.body} opts={{ plainLinks: linked }} />
              </p>
              {linked ? (
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-small font-medium text-link">
                  {t.readMore}
                  <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.arrow}>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              ) : null}
            </>
          );
          const card = 'flex h-full flex-col rounded-lg border border-line bg-surface p-6 shadow-e1 ink:shadow-none';
          return (
            <li key={i}>
              {linked ? (
                <SmartLink
                  href={item.href}
                  className={cx(card, styles.lift, 'hover:border-line-strong hover:shadow-e2 ink:hover:bg-surface-2')}
                >
                  {body}
                </SmartLink>
              ) : (
                <div className={card}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
