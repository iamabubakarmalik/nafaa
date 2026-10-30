/**
 * Pill-shaped filter button that opens a small option list; closes on outside
 * click or Escape. On phones the list opens as a bottom sheet so it never runs
 * off the screen; on wider screens it flips to stay inside the viewport.
 *
 * Keyboard: ↓ / Enter / Space on the button opens it with focus on the chosen
 * option; ↑ ↓ Home End and type-ahead move; Enter picks; Esc closes. Focus
 * goes back to the button when the list closes.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { handleMenuKey, useMenuFocus } from '../keyboard';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
}

export function FilterMenu<T extends string>({
  icon: Icon, label, value, options, onChange, active, align = 'left', footer, width = 'w-64', valueLabel,
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
  /** Text on the button instead of the chosen option's label, e.g. a count for a multi-pick menu. */
  valueLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>(align);
  const [sheet, setSheet] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  useMenuFocus(open, menuRef, triggerRef);
  const onMenuKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Tab' && !menuRef.current?.querySelector('input')) { setOpen(false); return; }
    if (menuRef.current && handleMenuKey(e, menuRef.current, '[role="option"]')) e.preventDefault();
  };
  const onTriggerKey = (e: ReactKeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); toggle(); }
  };
  const toggle = () => {
    if (!open) {
      const r = ref.current?.getBoundingClientRect();
      setSheet(window.innerWidth < 640);
      // 18rem is the widest menu; flip when it would cross the screen edge.
      if (r) setSide(align === 'right' ? (r.right - 288 < 8 ? 'left' : 'right') : (r.left + 288 > window.innerWidth - 8 ? 'right' : 'left'));
    }
    setOpen((v) => !v);
  };
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !sheetRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  const list = (
    <div className={sheet ? undefined : 'max-h-80 overflow-y-auto'}>
      {options.map((o) => {
        const on = o.value === value;
        const OIcon = o.icon;
        return (
          <button key={o.value} type="button" role="option" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => { onChange(o.value); setOpen(false); }}
            className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 text-start text-[0.8125rem] transition', sheet ? 'py-3' : 'py-2', on ? 'bg-slate-100' : 'hover:bg-slate-50', 'focus-visible:bg-brand-50')}>
            {OIcon ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={o.color ? { backgroundColor: `${o.color}17`, color: o.color } : undefined}>
                <OIcon className="h-4 w-4" />
              </span>
            ) : o.color ? <span className="ms-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} /> : null}
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate', on ? 'font-semibold text-slate-900' : 'text-slate-700')}>{o.label}</span>
              {o.hint && <span className="block truncate text-[0.6875rem] text-slate-500">{o.hint}</span>}
            </span>
            {on && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button ref={triggerRef} type="button" onClick={toggle} onKeyDown={onTriggerKey} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? listId : undefined}
        className={cn('inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-medium transition',
          active ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70',
          open && 'ring-2 ring-brand-500')}>
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-slate-500')} />
        {/* On phones an unset filter shows its name ("Brand"), a set one its value; wider screens show both. */}
        <span className={cn('text-slate-500', active ? 'hidden sm:inline' : 'max-sm:font-semibold max-sm:text-inherit')}>{label}</span>
        <span className={cn('max-w-[10rem] truncate font-semibold', !active && 'max-sm:hidden')}>{valueLabel ?? current?.label ?? '—'}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && !sheet && (
        <div ref={menuRef} id={listId} role="listbox" aria-label={label} onKeyDown={onMenuKey} className={cn('absolute top-full z-40 mt-2 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200', width, side === 'right' ? 'end-0' : 'start-0')}>
          {list}
          {footer?.(() => setOpen(false))}
        </div>
      )}
      {open && sheet && createPortal(
        <div className="fixed inset-0 z-[95] flex items-end bg-slate-950/40" role="dialog" aria-modal="true" aria-label={label}>
          <div ref={(el) => { sheetRef.current = el; menuRef.current = el; }} id={listId} role="listbox" aria-label={label} onKeyDown={onMenuKey} className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-2 mt-1 h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
            <p className="px-3 pb-2 text-[0.8125rem] font-semibold text-slate-500">{label}</p>
            {list}
            {footer?.(() => setOpen(false))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
