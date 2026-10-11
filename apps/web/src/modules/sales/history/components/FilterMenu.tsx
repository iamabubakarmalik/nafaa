/** Pill-shaped filter button that opens a small option list; closes on outside click or Escape. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
}

export function FilterMenu<T extends string>({
  icon: Icon, label, value, options, onChange, active, align = 'left', footer, width = 'w-64',
}: {
  icon: LucideIcon;
  label: string;
  value: T;
  options: Array<FilterOption<T>>;
  onChange: (v: T) => void;
  /** Highlights the button when the filter narrows the list. */
  active?: boolean;
  align?: 'left' | 'right';
  /** Extra content under the options, e.g. custom date inputs. */
  footer?: (close: () => void) => ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox"
        className={cn('inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-medium transition',
          active ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70',
          open && 'ring-2 ring-brand-500')}>
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-slate-500')} />
        <span className="hidden text-slate-500 sm:inline">{label}</span>
        <span className="max-w-[9rem] truncate font-semibold">{current?.label ?? '—'}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="listbox" className={cn('absolute top-full z-40 mt-2 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200', width, align === 'right' ? 'right-0' : 'left-0')}>
          <div className="max-h-80 overflow-y-auto">
            {options.map((o) => {
              const on = o.value === value;
              const OIcon = o.icon;
              return (
                <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => { onChange(o.value); setOpen(false); }}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[0.8125rem] transition', on ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                  {OIcon ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={o.color ? { backgroundColor: `${o.color}17`, color: o.color } : undefined}>
                      <OIcon className="h-4 w-4" />
                    </span>
                  ) : o.color ? <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} /> : null}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate', on ? 'font-semibold text-slate-900' : 'text-slate-700')}>{o.label}</span>
                    {o.hint && <span className="block truncate text-[0.6875rem] text-slate-500">{o.hint}</span>}
                  </span>
                  {on && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>
          {footer?.(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
