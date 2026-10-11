/**
 * Accent-coloured page header used by the main list pages (sales, products…)
 * so they share one height and layout: title, a chip (date range, count),
 * a muted meta line and actions on the first row; headline numbers below,
 * the first one large. The glow sits in its own clipped layer so menus
 * opened from the actions can drop below the header.
 */

import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';

export interface HeroStat {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}

/** Class names for buttons placed in a PageHero's actions. */
export const heroButton = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 disabled:opacity-60';
export const heroIconButton = 'flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25';
export const heroPrimaryButton = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-bold text-brand-800 shadow-sm transition hover:bg-brand-50';

export function PageHero({ title, chip, meta, busy, actions, stats, loading }: {
  title: ReactNode;
  chip?: ReactNode;
  meta?: ReactNode;
  /** Shows a small pulse in the chip while data refreshes. */
  busy?: boolean;
  actions?: ReactNode;
  stats?: HeroStat[];
  loading?: boolean;
}) {
  return (
    <div className="relative z-20 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-4 text-white shadow-lg shadow-brand-900/15 sm:px-6">
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
        <span className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.06]"><defs><pattern id="hero-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs><rect width="100%" height="100%" fill="url(#hero-dots)" /></svg>
      </span>
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-[1.375rem]">{title}</h1>
          {chip && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.75rem] font-medium text-white/90 ring-1 ring-white/20 [&_svg]:h-3.5 [&_svg]:w-3.5">
              {chip}
              {busy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-label="Taaza ho raha hai" />}
            </span>
          )}
          {meta && <span className="hidden text-[0.75rem] text-white/60 md:inline">{meta}</span>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="relative mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 sm:gap-x-8">
          {stats.map((x, i) => (
            <div key={i} className={cn('min-w-0', i > 0 && 'border-l border-white/20 pl-4 sm:pl-6')}>
              <p className="text-[0.75rem] font-medium text-white/70">{x.label}</p>
              {loading ? <span className={cn('mt-1 block animate-pulse rounded-lg bg-white/15', i === 0 ? 'h-9 w-40' : 'h-6 w-24')} /> : (
                <p className={cn('font-bold leading-tight tabular-nums', i === 0 ? 'text-[1.875rem] tracking-tight' : 'text-[1.125rem]')}>
                  {x.value}{x.hint && <span className="ml-1.5 text-[0.6875rem] font-medium text-white/60">{x.hint}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
