/**
 * Small drawing of each counter layout, for choosing one in Settings and in
 * the counter's own settings. Drawn with boxes so it follows the theme.
 */

import { Check } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { POS_LAYOUTS, type PosLayout } from '../lib/posCounterConfig';
import { t } from '@core/i18n';

const tile = 'rounded-[3px] bg-slate-300/80';
const line = 'h-1.5 rounded-sm bg-slate-300/80';

function Tiles({ n, cols, big }: { n: number; cols: number; big?: boolean }) {
  return (
    <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: n }, (_, i) => <span key={i} className={cn(tile, big ? 'h-6' : 'h-4')} />)}
    </div>
  );
}

function Bill({ rows, wide, side }: { rows: number; wide?: boolean; side?: boolean }) {
  return (
    <div className={cn('flex min-h-0 flex-col gap-1 rounded-md bg-white p-1.5 ring-1 ring-slate-200', wide ? 'flex-1' : 'w-[38%]')}>
      <div className={cn('flex min-h-0 flex-1 gap-1.5', side ? 'flex-row' : 'flex-col')}>
        <div className="flex flex-1 flex-col gap-1">
          {wide && <span className="h-1.5 rounded-sm bg-slate-400/70" />}
          {Array.from({ length: rows }, (_, i) => <span key={i} className={line} />)}
        </div>
        <div className={cn('flex flex-col justify-end gap-1', side && 'w-[38%]')}>
          <span className="h-2 rounded-sm bg-slate-400/70" />
          <span className="h-3 rounded-sm bg-brand-500" />
        </div>
      </div>
    </div>
  );
}

export function PosLayoutDrawing({ layout }: { layout: PosLayout }) {
  return (
    <div className="flex aspect-[16/10] w-full gap-1.5 rounded-lg bg-slate-100 p-1.5">
      {layout === 'classic' && (
        <>
          <div className="flex flex-1 flex-col gap-1">
            <span className="h-2 rounded-sm bg-white ring-1 ring-slate-200" />
            <Tiles n={9} cols={3} />
          </div>
          <Bill rows={6} />
        </>
      )}
      {layout === 'express' && (
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="h-3 rounded-sm bg-white ring-2 ring-brand-400" />
          <Bill rows={6} wide side />
        </div>
      )}
      {layout === 'cartfocus' && (
        <>
          <Bill rows={8} wide />
          <div className="flex w-[30%] flex-col gap-1">
            <span className="h-2 rounded-sm bg-white ring-1 ring-slate-200" />
            {Array.from({ length: 7 }, (_, i) => <span key={i} className={line} />)}
          </div>
        </>
      )}
      {layout === 'touch' && (
        <>
          <Tiles n={6} cols={3} big />
          <Bill rows={4} />
        </>
      )}
    </div>
  );
}

/** Layout cards with a drawing each; `value` null means "shop default" when `allowDefault`. */
export function PosLayoutPicker({ value, onChange, allowDefault, defaultLayout, disabled }: {
  value: PosLayout | null;
  onChange: (v: PosLayout | null) => void;
  allowDefault?: boolean;
  defaultLayout?: PosLayout;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={t('POS layout')} className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {POS_LAYOUTS.map((l) => {
        const on = value === l.id || (value === null && allowDefault && defaultLayout === l.id);
        return (
          <button key={l.id} type="button" role="radio" aria-checked={on} disabled={disabled}
            onClick={() => onChange(allowDefault && value === l.id ? null : l.id)}
            className={cn('group relative flex flex-col gap-1.5 rounded-xl border p-2 text-start transition disabled:cursor-not-allowed disabled:opacity-60',
              on ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30' : 'border-slate-200 bg-white hover:border-slate-300')}>
            <PosLayoutDrawing layout={l.id} />
            <span className="flex items-center justify-between gap-1">
              <span className="text-[0.8125rem] font-semibold text-slate-900">{l.label}</span>
              {on && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-brand-fg"><Check className="h-3 w-3" /></span>}
            </span>
            <span className="line-clamp-2 text-[0.6875rem] leading-snug text-slate-500">{l.hint}</span>
            {allowDefault && value === null && defaultLayout === l.id && (
              <span className="absolute start-3 top-3 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-white">{t('Dukaan ka')}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
