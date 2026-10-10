/**
 * Font picker: each option is rendered in its own font, so the user sees the
 * real result. Fonts are loaded when the picker mounts (Settings only).
 */

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { ensureFont, type FontOption } from '@/design-system';
import { cn } from '@core/lib/cn';

interface FontPickerProps {
  label: string;
  fonts: readonly FontOption[];
  value: string;
  sample: string;
  rtl?: boolean;
  onChange: (id: string) => void;
}

export function FontPicker({ label, fonts, value, sample, rtl, onChange }: FontPickerProps) {
  useEffect(() => {
    fonts.forEach((f) => ensureFont(f.google, f.id));
  }, [fonts]);

  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {fonts.map((f) => {
        const active = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(f.id)}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-medium text-slate-500">{f.label}</span>
              <span
                dir={rtl ? 'rtl' : undefined}
                className={cn('mt-0.5 block truncate text-[1.0625rem] text-slate-900', rtl && 'leading-loose')}
                style={{ fontFamily: f.stack }}
              >
                {sample}
              </span>
            </span>
            {active && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-brand-fg">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
