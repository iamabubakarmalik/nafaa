/**
 * Page headers for the S5 templates. The H1, the answer-first intro and the
 * breadcrumbs never animate (ARCH 4.4 hero rule); only the decorative grid
 * behind them is drawn by CSS.
 *
 * A `hero` block on the entry, when present, supplies the eyebrow, H1 text
 * and intro, so editors keep control; otherwise the entry title and summary
 * are used. Templates skip the hero block in the body (see Body.tsx).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { markdownToPlain } from '@/lib/seo/text';

export function heroOf(entry: PublicEntry) {
  const hero = entry.blocks.find((block) => block.type === 'hero');
  return hero?.type === 'hero' ? hero : null;
}

export interface PageHeaderProps {
  entry: PublicEntry;
  /** Overrides the H1 text (defaults to the hero heading, then the entry title). */
  title?: string;
  eyebrow?: ReactNode;
  eyebrowHref?: string;
  /** Overrides the intro text (defaults to hero sub, then summary). */
  intro?: ReactNode;
  /** Meta row under the intro (byline, dates). */
  meta?: ReactNode;
  /** Extra content under the intro (search field, chips, buttons). */
  children?: ReactNode;
  align?: 'start' | 'center';
  size?: 'hub' | 'article';
  className?: string;
}

export function PageHeader({ entry, title: titleOverride, eyebrow, eyebrowHref, intro, meta, children, align = 'start', size = 'hub', className }: PageHeaderProps) {
  const hero = heroOf(entry);
  const title = titleOverride || hero?.heading || entry.title;
  const text = intro ?? (hero?.sub ? markdownToPlain(hero.sub) : entry.summary);
  const label = eyebrow ?? hero?.eyebrow;
  const centered = align === 'center';
  return (
    <header className={cx('relative isolate overflow-hidden border-b border-line/70', className)}>
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]" />
      <Container className={cx('pb-12 pt-6 md:pb-16', size === 'hub' ? 'md:pt-8' : 'md:pt-8')}>
        <PageBreadcrumbs crumbs={entry.breadcrumbs} />
        <div className={cx('mt-10 md:mt-14', centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl')}>
          {label ? (
            <p className="mb-4 text-eyebrow uppercase text-link">
              {eyebrowHref ? (
                <Link href={eyebrowHref} className="hover:underline hover:underline-offset-4">
                  {label}
                </Link>
              ) : (
                label
              )}
            </p>
          ) : null}
          <h1 className={cx('text-fg-strong', size === 'hub' ? 'text-h1' : 'text-h1 md:text-[clamp(2.25rem,1.6rem+2vw,3.25rem)]')}>{title}</h1>
          {text ? <p className={cx('mt-5 text-body-lg text-fg-muted', centered ? 'mx-auto max-w-measure' : 'max-w-measure')}>{text}</p> : null}
          {meta ? <div className={cx('mt-7', centered && 'flex justify-center')}>{meta}</div> : null}
          {children ? <div className={cx('mt-8', centered && 'mx-auto max-w-xl')}>{children}</div> : null}
        </div>
      </Container>
    </header>
  );
}
