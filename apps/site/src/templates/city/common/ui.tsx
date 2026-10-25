/**
 * Page chrome shared by the S4 templates (city, compliance, best-of,
 * compare): the frame with JSON-LD and the dev-fixture ribbon, the top bar
 * with breadcrumbs and freshness, the sticky jump bar, source notes and the
 * entry card grid used by directories. All server components, zero JS; icons
 * are inline SVG through CmsIcon.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { statusBadge } from '@/components/blocks/lib/i18n';
import type { EntryCard, PublicEntry, Source } from '@/lib/cms/contract/cms-contract';
import { dirFor } from '@/lib/cms/locale';
import { CmsIcon } from '@/lib/icons';
import { localCrumbs } from '../../core/parts';
import { isFixture } from './data';
import { formatDate, isoDay, outboundRel } from './format';
import styles from './s4.module.css';
import { stringsFor } from './strings';

// ─── Frame ───

export function TemplateFrame({ entry, graph, children }: { entry: PublicEntry; graph: Record<string, unknown>; children: ReactNode }) {
  const t = stringsFor(entry.locale);
  const body = (
    <>
      <JsonLd data={graph} />
      {isFixture(entry) ? (
        <div role="note" className="border-b border-amber-600/30 bg-amber-50 px-gutter py-2 text-center text-xs font-medium text-amber-900">
          {t.fixtureRibbon}
        </div>
      ) : null}
      {children}
    </>
  );
  if (entry.locale === 'en') return body;
  return (
    <div lang={entry.locale} dir={dirFor(entry.locale)}>
      {body}
    </div>
  );
}

// ─── Top bar: breadcrumbs + freshness ───

export interface MetaBarProps {
  entry: PublicEntry;
  /** Show the author, reviewer and fact-check stamp (article-like types). */
  byline?: boolean;
  /** Extra chips after the dates (an authority badge, for example). */
  extra?: ReactNode;
}

export function MetaBar({ entry, byline = false, extra }: MetaBarProps) {
  const t = stringsFor(entry.locale);
  const updated = formatDate(entry.dateModified, entry.locale);
  const checked = byline ? formatDate(entry.factCheckedAt, entry.locale) : null;
  return (
    <Container className="pt-6 md:pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageBreadcrumbs crumbs={localCrumbs(entry)} />
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-fg-subtle">
          {extra}
          {byline && entry.author ? (
            <li>
              {t.writtenBy}{' '}
              <Link href={new URL(entry.author.url).pathname} className="font-medium text-fg-muted hover:text-fg-strong">
                {entry.author.title}
              </Link>
            </li>
          ) : null}
          {byline && entry.reviewer ? (
            <li>
              {t.reviewedBy}{' '}
              <Link href={new URL(entry.reviewer.url).pathname} className="font-medium text-fg-muted hover:text-fg-strong">
                {entry.reviewer.title}
              </Link>
            </li>
          ) : null}
          {checked ? (
            <li className="inline-flex items-center gap-1.5">
              <CmsIcon name="shield-check" size={15} className="text-link" />
              {t.factChecked} <time dateTime={isoDay(entry.factCheckedAt)}>{checked}</time>
            </li>
          ) : null}
          {updated ? (
            <li className="inline-flex items-center gap-1.5">
              <CmsIcon name="refresh-cw" size={14} />
              {t.updated} <time dateTime={isoDay(entry.dateModified)}>{updated}</time>
            </li>
          ) : null}
        </ul>
      </div>
    </Container>
  );
}

// ─── Sticky jump bar ───

export interface JumpItem {
  id: string;
  label: string;
}

export function JumpNav({ items, locale }: { items: JumpItem[]; locale: string }) {
  if (items.length < 3) return null;
  const t = stringsFor(locale);
  return (
    <nav aria-label={t.onThisPage} className={cx(styles.jumpbar, 'border-y border-line bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70')}>
      <Container>
        <div className="flex items-center gap-4">
          <span className="hidden shrink-0 text-eyebrow uppercase text-fg-subtle md:inline">{t.onThisPage}</span>
          <ol className={cx(styles.chips, 'flex min-w-0 flex-1 gap-1 overflow-x-auto py-2.5')}>
            {items.map((item) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className="inline-flex h-8 items-center rounded-full px-3 text-small font-medium text-fg-muted transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </nav>
  );
}

// ─── Sources ───

export function SourceNote({ source, locale, className }: { source: Source; locale: string; className?: string }) {
  const t = stringsFor(locale);
  const date = formatDate(source.accessedAt, locale);
  return (
    <span className={cx('text-small text-fg-subtle', className)}>
      {t.source}:{' '}
      <a href={source.url} rel={outboundRel(source.url)} className="font-medium text-fg-muted underline decoration-line-strong underline-offset-[3px] hover:text-fg-strong">
        {source.publisher}
      </a>
      {date ? (
        <>
          , {t.checked} <time dateTime={isoDay(source.accessedAt)}>{date}</time>
        </>
      ) : null}
    </span>
  );
}

// ─── Section shell for template-owned sections ───

export function TemplateSection({
  id,
  eyebrow,
  title,
  intro,
  muted,
  children,
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  muted?: boolean;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cx('relative isolate py-section', muted ? 'theme-muted border-y border-line/70 bg-canvas text-fg' : 'theme-default bg-canvas text-fg')}
    >
      <Container>
        <div data-reveal="fade-up" className="max-w-measure">
          {eyebrow ? <p className="mb-3 text-eyebrow uppercase text-link">{eyebrow}</p> : null}
          <h2 id={headingId} className="text-h2 text-fg-strong">
            {title}
          </h2>
          {intro ? <p className="mt-4 text-body-lg text-fg-muted">{intro}</p> : null}
        </div>
        <div className="mt-10 md:mt-12">{children}</div>
      </Container>
    </section>
  );
}

// ─── Entry cards ───

function relativePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export interface CardGridProps {
  cards: readonly EntryCard[];
  locale: string;
  /** Small label above each title, per card. */
  meta?: (card: EntryCard) => ReactNode;
  columns?: 2 | 3 | 4;
  headingAs?: 'h3' | 'h4';
  fallbackIcon?: string;
}

const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' } as const;

export function CardGrid({ cards, locale, meta, columns = 3, headingAs: H = 'h3', fallbackIcon = 'arrow-up-right' }: CardGridProps) {
  if (cards.length === 0) return null;
  return (
    <ul data-reveal="stagger" className={cx('grid gap-4', COLS[columns])}>
      {cards.map((card) => {
        const badge = statusBadge(card.status, locale);
        return (
          <li key={card.id}>
            <Link
              href={relativePath(card.url)}
              prefetch={false}
              className="group/card flex h-full flex-col rounded-lg border border-line bg-surface p-5 shadow-e1 transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 ink:shadow-none"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300">
                  <CmsIcon name={card.icon ?? fallbackIcon} size={20} />
                </span>
                {badge ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/25">{badge}</span>
                ) : null}
              </span>
              {meta ? <span className="mt-5 text-eyebrow uppercase text-fg-subtle">{meta(card)}</span> : null}
              <H className={cx('text-h4 text-fg-strong', meta ? 'mt-1.5' : 'mt-5')}>{card.title}</H>
              {card.summary ? <p className="mt-2 line-clamp-3 text-small text-fg-muted">{card.summary}</p> : null}
              <span aria-hidden className="mt-auto flex justify-end pt-4 text-fg-subtle transition-[transform,color] duration-fast ease-out group-hover/card:translate-x-0.5 group-hover/card:text-link">
                <CmsIcon name="arrow-right" size={18} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Pill showing a tax authority (or any short code), with an optional long name for screen readers. */
export function CodePill({ code, title }: { code: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-md bg-surface-3 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-fg-strong ring-1 ring-inset ring-line-strong/60"
    >
      {code}
      {title ? <span className="sr-only"> ({title})</span> : null}
    </span>
  );
}
