/**
 * Board tiles: one per status with its count, grouped as Work, Shipping,
 * Done and Other, in a row that scrolls sideways on narrow screens.
 */

import { cn } from '@core/lib/cn';
import { Skeleton } from '@/design-system/components';
import type { CustomStage } from '../../api/order-board.api';
import { BOARD, BOARD_GROUPS, TILE_KEYS, customEntries, type BoardEntry } from '../../lib/orders';

export function StatusTiles({ counts, active, custom, onPick }: {
  /** Count per tile key; undefined while loading. */
  counts: Record<string, number> | undefined;
  active: string;
  custom: CustomStage[];
  onPick: (key: string) => void;
}) {
  const extra = customEntries(custom);
  const groups = BOARD_GROUPS.map((g) => ({
    ...g,
    tiles: [...BOARD.filter((x) => x.group === g.id && TILE_KEYS.includes(x.key)), ...(g.id === 'other' ? extra : [])],
  }));

  return (
    <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
      {groups.map((g) => (
        <section key={g.id} className="shrink-0 snap-start">
          <p className="mb-1.5 px-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{g.label}</p>
          <div className="flex gap-2">
            {g.tiles.map((x) => <Tile key={x.key} entry={x} count={counts?.[x.key]} loading={!counts} active={active === x.key} onClick={() => onPick(x.key)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tile({ entry: x, count, loading, active, onClick }: { entry: BoardEntry; count?: number; loading: boolean; active: boolean; onClick: () => void }) {
  const Icon = x.icon;
  const empty = !loading && !count;
  return (
    <button type="button" onClick={onClick} title={x.hint} aria-pressed={active}
      className={cn('flex w-[7.25rem] flex-col rounded-2xl bg-white px-3 py-2.5 text-start shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md',
        active ? 'ring-2 ring-brand-500' : 'ring-slate-200/80', empty && !active && 'opacity-60')}>
      <span className="flex items-center justify-between gap-1">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${x.color}17`, color: x.color }}><Icon className="h-3.5 w-3.5" /></span>
        {loading ? <Skeleton className="h-5 w-8 rounded-md" /> : <span className="text-[1.0625rem] font-bold tabular-nums text-slate-900">{(count ?? 0).toLocaleString('en-PK')}</span>}
      </span>
      <span className="mt-1.5 truncate text-[0.75rem] font-semibold text-slate-700">{x.label}</span>
    </button>
  );
}
