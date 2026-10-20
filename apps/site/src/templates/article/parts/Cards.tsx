/**
 * Cards for the content hubs: posts, guides, tools, templates, people and
 * docs. Server components, zero JS. Each card is one link (the title) with a
 * stretched hit area, so the markup stays a clean heading + text for crawlers
 * and screen readers. Pass `filter` to make a card searchable by ListFilter.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { EntryCard } from '@/lib/cms/contract/cms-contract';
import { cx } from '@/components/ui/cx';
import { CmsIcon } from '@/lib/icons';
import { CmsImage } from '@/lib/media';
import { filterText, formatDate, isoDate } from './format';

export function relativePath(card: Pick<EntryCard, 'url' | 'path'>): string {
  try {
    return new URL(card.url).pathname;
  } catch {
    return card.path;
  }
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export interface ContentCardProps {
  card: EntryCard;
  eyebrow?: ReactNode;
  /** Defaults to the card's contentUpdatedAt. Pass null to hide. */
  date?: string | null;
  meta?: ReactNode;
  headingAs?: 'h2' | 'h3';
  icon?: string;
  variant?: 'default' | 'featured' | 'row';
  filter?: boolean;
  className?: string;
}

export function ContentCard({ card, eyebrow, date, meta, headingAs: H = 'h3', icon, variant = 'default', filter, className }: ContentCardProps) {
  const href = relativePath(card);
  const when = date === null ? null : (date ?? card.contentUpdatedAt);
  const filterAttrs = filter ? { 'data-filter-item': '', 'data-filter-text': filterText(card.title, card.summary, typeof eyebrow === 'string' ? eyebrow : null) } : {};

  if (variant === 'row') {
    return (
      <li {...filterAttrs} className={cx('group/card relative', className)}>
        <div className="flex items-baseline justify-between gap-6 border-b border-line py-5 transition-colors duration-fast group-hover/card:border-line-strong">
          <div className="min-w-0">
            {eyebrow ? <p className="mb-1 text-eyebrow uppercase text-fg-subtle">{eyebrow}</p> : null}
            <H className="text-h4 text-fg-strong">
              <Link href={href} className="after:absolute after:inset-0 group-hover/card:text-link">
                {card.title}
              </Link>
            </H>
            {card.summary ? <p className="mt-1 line-clamp-2 max-w-measure text-small text-fg-muted">{card.summary}</p> : null}
          </div>
          <span className="flex shrink-0 items-center gap-3 text-small text-fg-subtle">
            {when ? <time dateTime={isoDate(when)}>{formatDate(when)}</time> : null}
            <Arrow className="transition-transform duration-fast ease-out group-hover/card:translate-x-0.5" />
          </span>
        </div>
      </li>
    );
  }

  const featured = variant === 'featured';
  return (
    <li
      {...filterAttrs}
      className={cx(
        'group/card relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-e1',
        'transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 ink:shadow-none',
        featured && 'md:col-span-2 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
        className,
      )}
    >
      {card.image ? (
        <div className={cx('relative overflow-hidden border-b border-line bg-surface-2', featured ? 'md:order-2 md:border-b-0 md:border-l' : 'aspect-[16/9]')}>
          <CmsImage media={card.image} sizes={featured ? '(min-width: 768px) 560px, 100vw' : '(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw'} aspectRatio="16:9" className="h-full w-full object-cover" alt="" />
        </div>
      ) : featured ? (
        <div aria-hidden className="relative hidden min-h-56 overflow-hidden border-l border-line bg-surface-2 md:order-2 md:block">
          <div className="bg-grid absolute inset-0 opacity-70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex size-20 items-center justify-center rounded-xl border border-line bg-surface text-link shadow-e2">
              <CmsIcon name={icon ?? card.icon ?? 'book-open'} size={36} strokeWidth={1.5} />
            </span>
          </div>
        </div>
      ) : null}
      <div className={cx('flex flex-1 flex-col', featured ? 'p-7 md:p-9' : 'p-6')}>
        {icon && !featured ? (
          <span aria-hidden className="mb-5 inline-flex size-10 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/20">
            <CmsIcon name={icon} size={20} />
          </span>
        ) : null}
        {eyebrow ? <p className="mb-2 text-eyebrow uppercase text-fg-subtle">{eyebrow}</p> : null}
        <H className={cx('text-fg-strong', featured ? 'text-h3' : 'text-h4')}>
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-[rgb(var(--c-ring))]">
            {card.title}
          </Link>
        </H>
        {card.summary ? <p className={cx('mt-2 text-fg-muted', featured ? 'text-body line-clamp-4' : 'line-clamp-3 text-small')}>{card.summary}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-small text-fg-subtle">
          <span className="flex min-w-0 items-center gap-2">
            {meta}
            {when ? <time dateTime={isoDate(when)}>{formatDate(when)}</time> : null}
          </span>
          <Arrow className="shrink-0 text-link transition-transform duration-fast ease-out group-hover/card:translate-x-0.5" />
        </div>
      </div>
    </li>
  );
}

/** A responsive card grid list. */
export function CardGrid({ children, id, columns = 3, className }: { children: ReactNode; id?: string; columns?: 2 | 3; className?: string }) {
  return (
    <ul id={id} role="list" className={cx('grid gap-5 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3', className)}>
      {children}
    </ul>
  );
}
