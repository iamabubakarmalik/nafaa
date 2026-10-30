/**
 * The standard list-page layout, taken from Sales history: page width,
 * KPI cards under the hero, the white filter bar with its search box, the
 * pill tabs and the "filters applied" strip. Every list page uses these so
 * spacing, sizes and look stay the same across the app.
 */

import { forwardRef, type ElementType, type ReactNode } from 'react';
import { Search, X, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Kbd } from './Kbd';
import { onTabsKeyDown } from '../keyboard/useMenuKeys';
import { t } from '@core/i18n';

/** Page container: same rhythm on every page; width follows Settings → Appearance → Page width. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(PAGE_WIDTH_CLASS, 'space-y-4 pb-12', className)}>{children}</div>;
}

/** For pages that build their own container: width follows the Appearance setting. */
export const PAGE_WIDTH_CLASS = 'mx-auto w-full max-w-[var(--page-max,96rem)]';

/** Row of KPI cards under the hero (2 → 3 → 5 per row, or set cols). */
export function KpiRow({ children, cols = 5 }: { children: ReactNode; cols?: 3 | 4 | 5 }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3', cols === 5 && 'xl:grid-cols-5', cols === 4 && 'xl:grid-cols-4', cols === 3 && 'md:grid-cols-3')}>
      {children}
    </div>
  );
}

export function KpiCard({ icon: Icon, color, label, value, hint, onClick, active }: {
  icon: LucideIcon; color: string; label: ReactNode; value: ReactNode; hint?: ReactNode; onClick?: () => void; active?: boolean;
}) {
  const Tag: ElementType = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={cn('flex min-w-0 flex-col rounded-2xl bg-white px-4 py-3 text-start shadow-sm ring-1 transition',
        active ? 'ring-2 ring-brand-500' : 'ring-slate-200/80', onClick && 'hover:-translate-y-0.5 hover:shadow-md')}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[0.8125rem] font-medium text-slate-500">{label}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-0.5 truncate text-[1.1875rem] font-bold tabular-nums tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[0.75rem] text-slate-500">{hint}</div>}
    </Tag>
  );
}

/** White card holding search + filter menus; `chips` shows the applied filters below. */
export function FilterBar({ search, children, chips, onClear }: {
  search?: ReactNode; children?: ReactNode; chips?: ReactNode; onClear?: () => void;
}) {
  return (
    <div className="relative z-10 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
      {/* The search keeps a usable width; when the filters do not fit beside it they move to their own line. */}
      <div className="flex flex-wrap items-center gap-2">
        {search && <div className="flex min-w-0 flex-[1_1_20rem]">{search}</div>}
        {children && <div className="flex max-w-full flex-wrap items-center gap-2">{children}</div>}
      </div>
      {chips && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="me-1 text-[0.75rem] font-medium text-slate-500">{t('Lage filter:')}</span>
          {chips}
          {onClear && (
            <button type="button" onClick={onClear} className="ms-auto inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50">
              <X className="h-3.5 w-3.5" />{t('Saaf karein')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 ps-2.5 pe-1 text-[0.75rem] font-semibold text-brand-800 ring-1 ring-brand-100">
      {children}
      <button type="button" onClick={onRemove} aria-label={t('Hatayein')} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-100"><X className="h-3 w-3" /></button>
    </span>
  );
}

/**
 * The big search box of the filter bar; shows the "/" hint or a clear button.
 * "/" focuses it from anywhere on the page, ↓ moves into the results, Esc
 * clears it and a second Esc leaves it.
 */
export const SearchField = forwardRef<HTMLInputElement, {
  value: string; onChange: (v: string) => void; placeholder: string; label?: string;
  onEnter?: () => void; trailing?: ReactNode;
}>(function SearchField({ value, onChange, placeholder, label, onEnter, trailing }, ref) {
  return (
    <div className="flex min-w-0 flex-1 gap-2">
      <label className="group relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
        <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} data-page-search
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter();
            if (e.key === 'Escape') {
              e.preventDefault();
              // First Esc clears (and does not close a surrounding dialog); the next one leaves the box.
              if (value) { e.stopPropagation(); onChange(''); } else e.currentTarget.blur();
            }
          }}
          placeholder={placeholder} aria-label={label ?? placeholder} aria-keyshortcuts="/"
          className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 ps-12 pe-16 text-[0.9375rem] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
        {value
          ? <button type="button" onClick={() => onChange('')} aria-label={t('Saaf')} className="absolute end-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
          : <Kbd className="absolute end-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
      </label>
      {trailing}
    </div>
  );
});

export interface ViewTab<T extends string> { id: T; label: ReactNode; icon?: LucideIcon; count?: number | null }

/** Pill tabs (Bill | Analytics) with an optional hint on the right. */
export function ViewTabs<T extends string>({ tabs, value, onChange, hint, right }: {
  tabs: ViewTab<T>[]; value: T; onChange: (id: T) => void; hint?: ReactNode; right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" onKeyDown={onTabsKeyDown} className="inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
            className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition', value === id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
            {Icon && <Icon className="h-4 w-4" />}{label}
            {count != null && <span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', value === id ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{count}</span>}
          </button>
        ))}
      </div>
      {right ?? (hint && <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex">{hint}</p>)}
    </div>
  );
}
