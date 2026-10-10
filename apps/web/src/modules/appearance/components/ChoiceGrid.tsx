/**
 * Single-choice option cards with an optional visual preview, used for mode,
 * background, sidebar, density, corners and text size.
 */

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@core/lib/cn';

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
  visual?: ReactNode;
  icon?: ReactNode;
}

interface ChoiceGridProps<T extends string> {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4 | 5;
}

const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' };

export function ChoiceGrid<T extends string>({ label, value, options, onChange, columns = 3 }: ChoiceGridProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2.5', COLS[columns])}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            {o.visual && <div className="border-b border-slate-200 bg-slate-50">{o.visual}</div>}
            <div className="flex items-start gap-2 p-3">
              {o.icon && <span className={cn('mt-0.5 shrink-0', active ? 'text-brand-600' : 'text-slate-500')}>{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-semibold text-slate-900">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">{o.description}</span>}
              </span>
              {active && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-brand-fg">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
