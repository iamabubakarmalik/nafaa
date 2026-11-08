/**
 * The row "Status" dropdown: shows where the order is and jumps it to any
 * board status in one pick. Also used by the bulk bar (without a current
 * status).
 */

import { useRef, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { useDismissible } from '@core/print/useDismissible';
import type { BoardStatus, CustomStage } from '../../api/order-board.api';
import { BOARD_GROUPS, boardEntry, moveTargets } from '../../lib/orders';
import { t } from '@core/i18n';

export function StatusMenu({ current, custom, busy, disabled, onPick, label, dark, align = 'end', up }: {
  current?: string;
  custom: CustomStage[];
  busy?: boolean;
  disabled?: boolean;
  onPick: (to: BoardStatus) => void;
  /** Button text when there is no current status (bulk bar). */
  label?: string;
  /** Style for the dark bulk bar. */
  dark?: boolean;
  align?: 'start' | 'end';
  /** Open upwards (bulk bar at the bottom of the screen). */
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissible(ref, open, () => setOpen(false));
  const cur = current ? boardEntry(current, custom) : undefined;
  const targets = moveTargets(custom);
  const groups = BOARD_GROUPS.map((g) => ({ ...g, items: targets.filter((x) => x.group === g.id) })).filter((g) => g.items.length);

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled || busy} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        className={cn('inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold transition disabled:opacity-60',
          dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-slate-300')}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cur ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cur.color }} /> : null}
        <span className="truncate">{cur?.short ?? label ?? t('Status')}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {open && (
        <div role="menu" className={cn('absolute z-40 max-h-[22rem] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-xl',
          align === 'end' ? 'end-0' : 'start-0', up ? 'bottom-full mb-1' : 'top-full mt-1')}>
          <p className="px-2.5 pb-1 pt-1.5 text-[0.6875rem] text-slate-500">{t('Kisi bhi status par seedha le jayein')}</p>
          {groups.map((g) => (
            <div key={g.id} className="py-0.5">
              <p className="px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
              {g.items.map((x) => (
                <button key={x.key} type="button" role="menuitem" disabled={x.key === current}
                  onClick={() => { setOpen(false); onPick(x.key as BoardStatus); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-[0.8125rem] font-medium hover:bg-slate-50 disabled:cursor-default disabled:bg-slate-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${x.color}17`, color: x.color }}><x.icon className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate">{x.label}</span>
                  {x.key === current && <Check className="h-3.5 w-3.5 text-brand-600" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
