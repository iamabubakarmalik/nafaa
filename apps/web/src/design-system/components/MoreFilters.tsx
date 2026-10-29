/**
 * "Aur filters" button for the filters a page uses less often. It opens a
 * panel with one group per filter, each a row of option pills; on phones the
 * panel opens as a bottom sheet. The button shows how many of these filters
 * are set, so a narrowed list is never hidden behind a closed menu.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, SlidersHorizontal, X, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Button } from './Button';
import type { FilterOption } from './FilterMenu';

export interface FilterGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  value: string;
  /** The value that means "not filtered"; any other value counts as active. */
  empty: string;
  options: Array<FilterOption<string>>;
  onChange: (v: string) => void;
}

export function MoreFilters({ groups, label = 'Aur filters', align = 'left' }: {
  groups: FilterGroup[];
  label?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [side, setSide] = useState(align);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeCount = groups.filter((g) => g.value !== g.empty).length;

  const toggle = () => {
    if (!open) {
      const r = ref.current?.getBoundingClientRect();
      setSheet(window.innerWidth < 640);
      // 24rem is the panel width; flip when it would cross the screen edge.
      if (r) setSide(align === 'right' ? (r.right - 384 < 8 ? 'left' : 'right') : (r.left + 384 > window.innerWidth - 8 ? 'right' : 'left'));
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  if (groups.length === 0) return null;

  const body = (
    <>
      <div className={cn('space-y-4', !sheet && 'max-h-[min(28rem,70vh)] overflow-y-auto')}>
        {groups.map((g) => {
          const GIcon = g.icon;
          return (
            <fieldset key={g.id} className="min-w-0">
              <legend className="mb-2 flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-500">
                {GIcon && <GIcon className="h-3.5 w-3.5" />}{g.label}
              </legend>
              <div role="radiogroup" aria-label={g.label} className="flex flex-wrap gap-1.5">
                {g.options.map((o) => {
                  const on = o.value === g.value;
                  return (
                    <button key={o.value} type="button" role="radio" aria-checked={on} title={o.hint} onClick={() => g.onChange(o.value)}
                      className={cn('inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-left text-[0.8125rem] font-medium transition',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        on ? 'bg-brand-600 text-brand-fg shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80')}>
                      {o.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />}
                      <span className="break-words">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <button type="button" disabled={activeCount === 0} onClick={() => groups.forEach((g) => { if (g.value !== g.empty) g.onChange(g.empty); })}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[0.8125rem] font-semibold text-rose-700 hover:bg-rose-50 disabled:text-slate-400 disabled:hover:bg-transparent">
          <X className="h-3.5 w-3.5" />Saaf karein
        </button>
        <Button size="sm" onClick={() => setOpen(false)}>Theek hai</Button>
      </div>
    </>
  );

  return (
    <div ref={ref} className="relative">
      <button ref={triggerRef} type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog"
        className={cn('inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition',
          activeCount > 0 ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70',
          open && 'ring-2 ring-brand-500')}>
        <SlidersHorizontal className={cn('h-4 w-4 shrink-0', activeCount > 0 ? 'text-brand-600' : 'text-slate-500')} />
        {label}
        {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.6875rem] font-bold tabular-nums text-white">{activeCount}</span>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && !sheet && (
        <div ref={panelRef} role="dialog" aria-label={label}
          className={cn('absolute top-full z-40 mt-2 w-96 max-w-[calc(100vw-1rem)] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200', side === 'right' ? 'right-0' : 'left-0')}>
          {body}
        </div>
      )}
      {open && sheet && createPortal(
        <div className="fixed inset-0 z-[95] flex items-end bg-slate-950/40" role="dialog" aria-modal="true" aria-label={label}>
          <div ref={panelRef} className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
            <p className="pb-3 text-[0.9375rem] font-bold text-slate-900">{label}</p>
            {body}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
