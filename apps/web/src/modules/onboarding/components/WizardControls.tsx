/** Small controls shared by the onboarding steps: option cards and toggle chips. */

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@core/lib/cn';

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Radio-style card. Wrap a group in an element with role="radiogroup". */
export function ChoiceCard({ selected, onSelect, title, description, icon, className }: ChoiceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-xl border bg-white p-3.5 text-start transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        selected ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
        className,
      )}
    >
      {icon && (
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 pe-5">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          'absolute end-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border',
          selected ? 'border-brand-600 bg-brand-600 text-brand-fg' : 'border-slate-300 bg-white',
        )}
      >
        {selected && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </span>
    </button>
  );
}

interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}

/** Multi-select chip (checkbox semantics). */
export function Chip({ selected, onToggle, children, disabled }: ChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60',
        selected ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  );
}

/** Section title inside a step. */
export function StepSection({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
