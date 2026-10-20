/**
 * Cards for lists of entries (entryGrid, relatedLinks). Every card is one
 * link to the entry's published path; industry colour tints the icon tile
 * through --accent (RGB channels, the only inline style the site allows).
 */
import { cx } from '@/components/ui/cx';
import { ENTRY_TYPE_META, type EntryCard } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { CmsImage } from '@/lib/media';
import { hexToChannels } from '../lib/format';
import { FeatureBadge } from './FeatureBadge';
import { SmartLink } from './SmartLink';
import styles from '../blocks.module.css';

function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx(styles.arrow, className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** RGB channels of the card's colour for --accent; undefined leaves the brand accent. */
function accentOf(card: EntryCard): string | undefined {
  return hexToChannels(card.color) ?? undefined;
}

/** Site-relative href (cards carry both `path` and the absolute `url`; `url` has the locale prefix). */
export function cardHref(card: EntryCard): string {
  try {
    return new URL(card.url).pathname;
  } catch {
    return card.path;
  }
}

export function EntryCardItem({ card, locale, showType = false, headingAs: H = 'h3' }: { card: EntryCard; locale: string; showType?: boolean; headingAs?: 'h3' | 'h4' }) {
  return (
    <SmartLink
      href={cardHref(card)}
      className={cx(
        styles.lift,
        'group/card flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-e1 hover:border-line-strong hover:shadow-e2 ink:shadow-none ink:hover:bg-surface-2',
      )}
    >
      {card.image && !card.icon ? (
        <CmsImage media={card.image} sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" aspectRatio="16:9" className="aspect-[16/9] h-auto w-full border-b border-line object-cover" />
      ) : null}
      <span className="flex flex-1 flex-col p-6" style={{ '--accent': accentOf(card) }}>
        <span className="flex items-start justify-between gap-3">
          {card.icon ? (
            <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-inset ring-accent/15 ink:bg-brand-400/10 ink:text-brand-300 ink:ring-brand-400/20">
              <CmsIcon name={card.icon} size={20} />
            </span>
          ) : showType ? (
            <span className="text-eyebrow uppercase text-fg-subtle">{ENTRY_TYPE_META[card.type].label}</span>
          ) : (
            <span />
          )}
          <FeatureBadge status={card.status} locale={locale} />
        </span>
        {card.icon && showType ? <span className="mt-5 text-eyebrow uppercase text-fg-subtle">{ENTRY_TYPE_META[card.type].label}</span> : null}
        <H className={cx('text-h4 text-fg-strong', card.icon && !showType ? 'mt-5' : 'mt-2')}>{card.shortName || card.title}</H>
        {card.summary ? <span className="mt-2 line-clamp-3 text-small text-fg-muted">{card.summary}</span> : null}
        <span className="mt-auto flex justify-end pt-5 text-link">
          <Arrow />
        </span>
      </span>
    </SmartLink>
  );
}

export function EntryRow({ card, locale }: { card: EntryCard; locale: string }) {
  return (
    <SmartLink href={cardHref(card)} className="group/row flex items-center gap-4 py-4 transition-colors duration-fast hover:text-link">
      {card.icon ? (
        <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-3 text-fg-muted group-hover/row:text-link" style={{ '--accent': accentOf(card) }}>
          <CmsIcon name={card.icon} size={18} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-medium text-fg-strong group-hover/row:text-link">
          {card.title}
          <FeatureBadge status={card.status} locale={locale} />
        </span>
        {card.summary ? <span className="mt-0.5 block truncate text-small text-fg-muted">{card.summary}</span> : null}
      </span>
      <Arrow className="shrink-0 text-fg-subtle group-hover/row:text-link" />
    </SmartLink>
  );
}
