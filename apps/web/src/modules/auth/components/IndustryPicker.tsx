/** Industry cards: the most common shops first, the rest behind "Aur dekhein" with search. */

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Input } from '@/design-system/components';
import { POPULAR_COUNT, type IndustryChoice } from '../lib/industry-choices';

interface IndustryPickerProps {
  choices: IndustryChoice[];
  value: string;
  onChange: (businessType: string) => void;
  error?: string;
  label?: string;
}

export function IndustryPicker({ choices, value, onChange, error, label = 'Aap ka kaam kya hai?' }: IndustryPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return choices.filter((c) => `${c.label} ${c.hint ?? ''} ${c.businessType}`.toLowerCase().includes(q));
    if (expanded) return choices;
    const top = choices.slice(0, POPULAR_COUNT);
    const picked = choices.find((c) => c.businessType === value);
    return picked && !top.includes(picked) ? [...top.slice(0, POPULAR_COUNT - 1), picked] : top;
  }, [choices, expanded, query, value]);

  return (
    <fieldset>
      <legend className="mb-2 block text-[0.8125rem] font-medium text-slate-700">{label}</legend>

      {expanded && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: pharmacy, kapre, mobile…"
          aria-label="Kaam search"
          autoFocus
          leftIcon={<Search className="h-4 w-4" aria-hidden />}
          wrapperClassName="mb-3"
        />
      )}

      <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', expanded && 'max-h-[20rem] overflow-y-auto p-0.5')}>
        {visible.map((c) => {
          const active = c.businessType === value;
          const Icon = c.icon;
          return (
            <button
              key={c.businessType}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(c.businessType)}
              className={cn(
                'relative flex min-h-[4.75rem] flex-col items-start justify-between gap-2 rounded-xl border bg-white p-3 text-left transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                active ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: c.color, backgroundColor: `${c.color}1a` }}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-[0.8125rem] font-semibold leading-tight text-slate-900">{c.label}</span>
              {active && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-brand-fg">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
            "{query}" nahi mila. "Koi aur kaam" chun lein — baad me Settings se badal sakte hain.
          </p>
        )}
      </div>

      {!expanded && choices.length > POPULAR_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:text-brand-800"
        >
          Aur dekhein ({choices.length - POPULAR_COUNT}) <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">{error}</p>}
    </fieldset>
  );
}
