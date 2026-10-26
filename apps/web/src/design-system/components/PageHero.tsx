/**
 * Accent-coloured page header used by the main list pages (sales, products…)
 * so they share one height and layout: title, a chip (date range, count),
 * a muted meta line and actions on the first row; headline numbers below,
 * the first one large. The glow sits in its own clipped layer so menus
 * opened from the actions can drop below the header.
 *
 * Its look follows Settings → Appearance → Header (style, pattern, size,
 * stats layout), read from useAppearance(). Colors are CSS variables per
 * style in styles/hero.css.
 */

import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { useAppearance } from '../theme/store';
import { PLAIN_HERO_STYLES, type HeroLook, type HeroPattern as HeroPatternName } from '../tokens/hero';

export interface HeroStat {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}

/**
 * Class names for buttons placed in a PageHero's actions. Colors come from
 * the header's style variables (styles/hero.css), so the same button reads
 * correctly on every header style; a page may still add its own utilities.
 */
export const heroButton = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--hero-btn-bg)] px-2.5 text-[0.8125rem] font-semibold text-[color:var(--hero-btn-fg)] ring-1 ring-[color:var(--hero-btn-ring)] backdrop-blur transition hover:bg-[color:var(--hero-btn-hover)] disabled:opacity-60';
export const heroIconButton = 'flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--hero-btn-bg)] text-[color:var(--hero-btn-fg)] ring-1 ring-[color:var(--hero-btn-ring)] transition hover:bg-[color:var(--hero-btn-hover)]';
export const heroPrimaryButton = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--hero-primary-bg)] px-3 text-[0.8125rem] font-bold text-[color:var(--hero-primary-fg)] shadow-sm transition hover:bg-[color:var(--hero-primary-hover)]';

/** Background texture tiles, drawn with currentColor (the style's pattern color). */
function HeroPattern({ pattern }: { pattern: HeroPatternName }) {
  const id = `hero-${pattern}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (pattern === 'none') return null;
  return (
    <svg className="nafaa-hero-pattern absolute inset-0 h-full w-full">
      <defs>
        {pattern === 'dots' && <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" /></pattern>}
        {pattern === 'grid' && <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="currentColor" strokeWidth="1" /></pattern>}
        {pattern === 'lines' && <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" /></pattern>}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * The decorative layer of a header: glow, pattern and the accent edge (Soft).
 * Clipped on its own so menus opened from the actions are not cut off.
 * `small` sizes the glow for miniature previews.
 */
export function HeroBackdrop({ pattern, small }: { pattern: HeroPatternName; small?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <span className={cn('nafaa-hero-glow absolute rounded-full', small ? '-right-6 -top-8 h-16 w-16 blur-xl' : '-right-20 -top-24 h-56 w-56 blur-3xl')} />
      <HeroPattern pattern={pattern} />
      <span className={cn('nafaa-hero-edge absolute inset-y-0 left-0', small ? 'w-0.5' : 'w-1')} />
    </span>
  );
}

export function PageHero({ title, subtitle, back, backLabel = 'Wapas', chip, meta, busy, actions, stats, loading, look }: {
  title: ReactNode;
  /** Second line under the title, for detail and form pages. */
  subtitle?: ReactNode;
  /** Back button before the title: a path to link to, or a handler. */
  back?: string | (() => void);
  backLabel?: string;
  chip?: ReactNode;
  meta?: ReactNode;
  /** Shows a small pulse in the chip while data refreshes. */
  busy?: boolean;
  actions?: ReactNode;
  stats?: HeroStat[];
  loading?: boolean;
  /** Overrides the appearance settings; used by the Settings → Appearance preview. */
  look?: Partial<HeroLook>;
}) {
  const a = useAppearance();
  const style = look?.style ?? a.heroStyle;
  const pattern = PLAIN_HERO_STYLES.includes(style) ? 'none' : (look?.pattern ?? a.heroPattern);
  const compact = (look?.size ?? a.heroSize) === 'compact';
  const cards = (look?.stats ?? a.heroStats) === 'cards';

  return (
    <div
      className={cn('nafaa-hero relative z-20 rounded-3xl', compact ? 'px-3.5 py-2.5 sm:px-5' : 'px-4 py-4 sm:px-6')}
      data-hero-style={style}
      data-hero-size={compact ? 'compact' : 'comfortable'}
      data-hero-stats={cards ? 'cards' : 'inline'}
    >
      <HeroBackdrop pattern={pattern} />
      <div className={cn('relative flex flex-wrap items-center justify-between', compact ? 'gap-2' : 'gap-3')}>
        <div className={cn('flex min-w-0 flex-1 items-center', compact ? 'gap-2.5' : 'gap-3')}>
          {typeof back === 'string' && (
            <Link to={back} aria-label={backLabel} title={backLabel} className={heroIconButton}><ArrowLeft className="h-4 w-4" /></Link>
          )}
          {typeof back === 'function' && (
            <button type="button" onClick={back} aria-label={backLabel} title={backLabel} className={heroIconButton}><ArrowLeft className="h-4 w-4" /></button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className={cn('nafaa-hero-title min-w-0 truncate font-bold tracking-tight', compact ? 'text-lg sm:text-[1.1875rem]' : 'text-xl sm:text-[1.375rem]')}>{title}</h1>
              {chip && (
                <span className="nafaa-hero-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ring-1 [&_svg]:h-3.5 [&_svg]:w-3.5">
                  {chip}
                  {busy && <span className="nafaa-hero-dot h-1.5 w-1.5 animate-pulse rounded-full" aria-label="Taaza ho raha hai" />}
                </span>
              )}
              {meta && <span className="nafaa-hero-subtle hidden text-[0.75rem] md:inline">{meta}</span>}
            </div>
            {subtitle && <p className="nafaa-hero-soft mt-0.5 text-[0.8125rem]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className={cn('relative',
          cards ? cn('grid grid-cols-2 gap-2 sm:flex sm:flex-wrap', compact ? 'mt-2' : 'mt-3')
            : cn('flex flex-wrap items-end', compact ? 'mt-2 gap-x-5 gap-y-2 sm:gap-x-6' : 'mt-3 gap-x-6 gap-y-3 sm:gap-x-8'))}>
          {stats.map((x, i) => {
            const big = i === 0;
            return (
              <div key={i} className={cn('min-w-0',
                cards ? cn('nafaa-hero-tile rounded-2xl sm:min-w-[9rem]', compact ? 'px-2.5 py-1.5' : 'px-3 py-2', big && 'col-span-2 sm:col-span-1')
                  : i > 0 && cn('nafaa-hero-line border-l', compact ? 'pl-3.5 sm:pl-5' : 'pl-4 sm:pl-6'))}>
                <p className="nafaa-hero-muted text-[0.75rem] font-medium">{x.label}</p>
                {loading ? <span className={cn('nafaa-hero-skeleton mt-1 block animate-pulse rounded-lg', big ? (compact ? 'h-7 w-32' : 'h-9 w-40') : 'h-6 w-24')} /> : (
                  <p className={cn('font-bold leading-tight tabular-nums',
                    big ? (compact ? 'text-[1.375rem] tracking-tight' : 'text-[1.875rem] tracking-tight') : (compact ? 'text-base' : 'text-[1.125rem]'))}>
                    {x.value}{x.hint && <span className="nafaa-hero-subtle ml-1.5 text-[0.6875rem] font-medium">{x.hint}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
