/**
 * Board tiles: one compact tile per status with its count, one line per
 * group (Work, Shipping, Done, Other). Tiles wrap instead of scrolling, so
 * every label shows in full at any width. Empty tiles are quieter, and the
 * rarely used Other tiles with nothing in them fold behind "+N more".
 */

import { useState } from 'react';
import { cn } from '@core/lib/cn';
import { Skeleton } from '@/design-system/components';
import { t } from '@core/i18n';
import type { CustomStage } from '../../api/order-board.api';
import { BOARD, BOARD_GROUPS, TILE_KEYS, customEntries, type BoardEntry } from '../../lib/orders';
import { useCommerceSetup } from '../../hooks/useCommerceSetup';

export function StatusTiles({ counts, active, custom, onPick }: {
  /** Count per tile key; undefined while loading. */
  counts: Record<string, number> | undefined;
  active: string;
  custom: CustomStage[];
  onPick: (key: string) => void;
}) {
  const [more, setMore] = useState(false);
  const extra = customEntries(custom);
  // Tiles the seller hid in Online store settings stay out of sight while empty.
  const hidden = new Set(useCommerceSetup().data?.hiddenTiles ?? []);
  const shown = (key: string) => !hidden.has(key) || key === active || !counts || (counts[key] ?? 0) > 0;
  const groups = BOARD_GROUPS.map((g) => ({
    ...g,
    tiles: [...BOARD.filter((x) => x.group === g.id && TILE_KEYS.includes(x.key) && shown(x.key)), ...(g.id === 'other' ? extra : [])],
  })).filter((g) => g.tiles.length > 0);

  return (
    <section aria-label={t('Status')} className="divide-y divide-slate-100 rounded-3xl bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200/80 sm:px-4">
      {groups.map((g) => {
        // Other: only tiles with orders (or the open one) show until "+N more".
        const folded = g.id === 'other' && !more && !!counts;
        const visible = folded ? g.tiles.filter((x) => x.key === active || (counts?.[x.key] ?? 0) > 0) : g.tiles;
        const rest = g.tiles.length - visible.length;
        return (
          <div key={g.id} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start sm:gap-3">
            <p className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 sm:w-20 sm:pt-2">{g.label}</p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {visible.map((x) => <Tile key={x.key} entry={x} count={counts?.[x.key]} loading={!counts} active={active === x.key} onClick={() => onPick(x.key)} />)}
              {rest > 0 && (
                <button type="button" onClick={() => setMore(true)}
                  className="inline-flex h-9 items-center rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-500 border border-dashed border-slate-300 transition hover:bg-slate-50 hover:text-slate-800">
                  {t('+{{count}} aur', { count: rest })}
                </button>
              )}
              {g.id === 'other' && more && (
                <button type="button" onClick={() => setMore(false)} className="inline-flex h-9 items-center rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                  {t('Kam dikhayein')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Tile({ entry: x, count, loading, active, onClick }: { entry: BoardEntry; count?: number; loading: boolean; active: boolean; onClick: () => void }) {
  const Icon = x.icon;
  const empty = !loading && !count;
  return (
    <button type="button" onClick={onClick} title={x.hint} aria-pressed={active}
      className={cn('inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl ps-2 pe-3 text-[0.8125rem] font-semibold ring-1 transition',
        active ? 'bg-slate-900 text-white ring-slate-900 shadow-sm'
          : empty ? 'bg-white text-slate-400 ring-slate-200/70 hover:bg-slate-50 hover:text-slate-600'
            : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300')}>
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg', empty && !active && 'opacity-60')}
        style={{ backgroundColor: active ? 'rgb(255 255 255 / 0.14)' : `${x.color}17`, color: active ? '#fff' : x.color }}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>{x.label}</span>
      {loading ? <Skeleton className="h-4 w-6 rounded" />
        : <span className={cn('min-w-[1.25rem] text-end tabular-nums', active ? 'text-white' : empty ? 'font-medium' : 'text-slate-900')}>{(count ?? 0).toLocaleString('en-PK')}</span>}
    </button>
  );
}
