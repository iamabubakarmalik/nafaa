/**
 * Tabs (underlined, for switching page sections) and Segmented (a compact
 * pill toggle for filters and modes). Both are controlled.
 */

import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
  /** Colors the count: e.g. danger for errors, warning for items needing attention. */
  tone?: 'default' | 'warning' | 'danger' | 'success';
  disabled?: boolean;
}

const COUNT_TONE = {
  default: '',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
  success: 'bg-success-50 text-success-700',
};

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: readonly TabItem<T>[];
  label?: string;
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, items, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('-mb-px flex gap-5 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]', className)}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-sm font-semibold transition disabled:opacity-50',
              active ? 'border-brand-600 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                'rounded-md px-1.5 py-px text-[0.6875rem] tabular-nums',
                t.tone && t.tone !== 'default' ? COUNT_TONE[t.tone] : active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500',
              )}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, items, label, className }: TabsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold transition disabled:opacity-50',
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="tabular-nums text-slate-400">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
