/**
 * Small pieces shared by the core templates: the freshness stamp, the
 * development fixture bar, entry card tiles for internal links, and a
 * section title. Server components, no client JS (icons are inline SVG).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FeatureBadge } from '@/components/blocks/parts/FeatureBadge';
import { formatDate, hexToChannels, isoDate } from '@/components/blocks/lib/format';
import { cx } from '@/components/ui/cx';
import type { EntryCard } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';

/** Visible "Updated {date}" (ARCH 8 freshness rule), in Asia/Karachi. */
export function Updated({ date, label = 'Updated', className }: { date: string | null | undefined; label?: string; className?: string }) {
  if (!date) return null;
  return (
    <p className={cx('text-small text-fg-subtle', className)}>
      {label} <time dateTime={isoDate(date)}>{formatDate(date)}</time>
    </p>
  );
}

/** Development-only notice on pages rendered from fixtures. Never rendered in production. */
export function FixtureBar() {
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div role="note" className="border-b border-amber-300/60 bg-amber-50 px-gutter py-2 text-center text-xs font-medium text-amber-900">
      Fixture data (development only): the CMS has no published entry here yet. This page is noindex and never built for production.
    </div>
  );
}

/** A small arrow used by link tiles and text links. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** A section title row (eyebrow, H2, optional intro and a trailing link). */
export function SectionTitle({
  id,
  eyebrow,
  title,
  intro,
  link,
  align = 'start',
  size = 'h2',
  className,
}: {
  size?: 'h2' | 'h3';
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  link?: { href: string; label: string };
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-6 md:flex-row md:items-end md:justify-between', align === 'center' && 'items-center text-center md:flex-col md:items-center', className)}>
      <div className={cx('max-w-[42rem]', align === 'center' && 'mx-auto')}>
        {eyebrow ? <p className="mb-3 text-eyebrow uppercase text-link">{eyebrow}</p> : null}
        <h2 id={id} className={cx(size === 'h3' ? 'text-h3' : 'text-h2', 'text-fg-strong')}>
          {title}
        </h2>
        {intro ? <p className="mt-4 text-body-lg text-fg-muted">{intro}</p> : null}
      </div>
      {link ? (
        <Link href={link.href} prefetch={false} className="group inline-flex shrink-0 items-center gap-1.5 text-small font-medium text-link">
          {link.label}
          <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * One entry as a link tile: icon on the entry's accent colour, title, a
 * two-line summary and the feature-status badge. Used for related links,
 * sibling navigation and hub lists the template owns.
 */
export function EntryTile({ card, headingAs: H = 'h3', compact = false, className }: { card: EntryCard; headingAs?: 'h2' | 'h3' | 'h4'; compact?: boolean; className?: string }) {
  return (
    <Link
      href={card.path}
      prefetch={false}
      style={{ '--accent': hexToChannels(card.color) ?? undefined }}
      className={cx(
        'group relative flex h-full gap-4 rounded-lg border border-line bg-surface p-5 shadow-e1 ink:shadow-none',
        'transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2',
        compact ? 'items-center' : 'items-start',
        className,
      )}
    >
      <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-inset ring-accent/15 ink:bg-brand-400/10 ink:text-brand-300">
        <CmsIcon name={card.icon ?? 'circle'} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <H className="text-h4 text-fg-strong">{card.title}</H>
          <FeatureBadge status={card.status} locale={card.locale} />
        </span>
        {!compact && card.summary ? <span className="mt-1.5 line-clamp-2 text-small text-fg-muted">{card.summary}</span> : null}
      </span>
      <Arrow className="mt-1 text-fg-subtle transition-[transform,color] duration-fast ease-out group-hover:translate-x-0.5 group-hover:text-link" />
    </Link>
  );
}

/** A titled grid of entry tiles (related products, industries, siblings). Renders nothing when empty. */
export function TileSection({
  id,
  title,
  intro,
  cards,
  link,
  compact,
  columns = 3,
}: {
  id: string;
  title: string;
  intro?: string;
  cards: readonly EntryCard[];
  link?: { href: string; label: string };
  compact?: boolean;
  columns?: 2 | 3 | 4;
}) {
  if (cards.length === 0) return null;
  const cols = columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <section aria-labelledby={id} className="py-10 md:py-12">
      <div className="mx-auto box-content max-w-container px-gutter">
        <SectionTitle id={id} title={title} intro={intro} link={link} size="h3" />
        <ul className={cx('mt-6 grid gap-4', cols)} data-reveal="stagger">
          {cards.map((card) => (
            <li key={card.id}>
              <EntryTile card={card} compact={compact} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Removes duplicates (by id) and the page itself from a card list. */
export function uniqueCards(cards: readonly EntryCard[], exceptId?: string): EntryCard[] {
  const seen = new Set<string>(exceptId ? [exceptId] : []);
  return cards.filter((card) => (seen.has(card.id) ? false : (seen.add(card.id), true)));
}
