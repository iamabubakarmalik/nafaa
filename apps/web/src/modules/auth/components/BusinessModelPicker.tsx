/**
 * "Aap kaise bechte hain?" — multi-select cards for how the business sells.
 * Used at sign-up, in onboarding and in Settings → Business type. One card
 * always stays selected, so the question never blocks anyone.
 */

import { Check } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { BUSINESS_MODEL_OPTIONS, cleanModels, type BusinessModel } from '@core/lib/business-models';

interface BusinessModelPickerProps {
  value: readonly BusinessModel[];
  onChange: (models: BusinessModel[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** Two columns everywhere (narrow containers). */
  compact?: boolean;
}

export function BusinessModelPicker({
  value, onChange, label = 'Aap kaise bechte hain?', hint = 'Ek se zyada chun sakte hain', disabled, compact,
}: BusinessModelPickerProps) {
  const toggle = (id: BusinessModel) => {
    const on = value.includes(id);
    if (on && value.length === 1) return;
    onChange(cleanModels(on ? value.filter((m) => m !== id) : [...value, id]));
  };

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[0.8125rem] font-medium text-slate-700">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </legend>
      <div className={cn('grid grid-cols-2 gap-2', !compact && 'sm:grid-cols-4')}>
        {BUSINESS_MODEL_OPTIONS.map((o) => {
          const active = value.includes(o.id);
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(o.id)}
              data-model={o.id}
              className={cn(
                'relative flex min-h-[6.25rem] flex-col items-start gap-1.5 rounded-xl border bg-white p-3 text-left transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-60',
                active ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ color: o.color, backgroundColor: `${o.color}1a` }}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-[0.8125rem] font-semibold leading-tight text-slate-900">{o.title}</span>
              <span className="text-[0.6875rem] leading-snug text-slate-500">{o.hint}</span>
              <span
                aria-hidden
                className={cn(
                  'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md border transition',
                  active ? 'border-brand-600 bg-brand-600 text-brand-fg' : 'border-slate-300 bg-white',
                )}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
