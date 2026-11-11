/**
 * Big tap targets for choosing one option (interest, payout method,
 * partner type). Works as a radio group.
 */

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Choice<T extends string> { value: T; label: ReactNode; help?: ReactNode; icon?: ReactNode; tone?: string }

export function ChoiceGrid<T extends string>({ value, onChange, items, cols = 3, label, compact }: {
  value: T | '' | null | undefined; onChange: (v: T) => void; items: Choice<T>[]; cols?: 1 | 2 | 3 | 4; label?: string;
  /** Short labels: icon above the text, centred, no tick (fits three across on a phone). */
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label}
      className={cn('grid gap-2', cols === 1 && 'grid-cols-1', cols === 2 && 'grid-cols-1 sm:grid-cols-2', cols === 3 && 'grid-cols-3', cols === 4 && 'grid-cols-2 sm:grid-cols-4')}>
      {items.map((it) => {
        const on = value === it.value;
        return (
          <button key={it.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(it.value)}
            className={cn('relative flex min-h-[3.25rem] rounded-2xl ring-1 transition active:scale-[0.98]',
              compact ? 'flex-col items-center justify-center gap-1 px-1.5 py-2 text-center' : 'items-center gap-2.5 px-3.5 py-2.5 text-start',
              on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
            {it.icon && <span className="shrink-0" style={it.tone ? { color: it.tone } : undefined}>{it.icon}</span>}
            <span className={cn('min-w-0', !compact && 'flex-1')}>
              <span className={cn('block font-semibold', compact ? 'text-[0.875rem] leading-tight' : 'text-[0.9375rem]', on ? 'text-brand-800' : 'text-slate-800')}>{it.label}</span>
              {it.help && <span className="mt-0.5 block text-[0.8125rem] font-normal leading-snug text-slate-500">{it.help}</span>}
            </span>
            {on && !compact && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}
