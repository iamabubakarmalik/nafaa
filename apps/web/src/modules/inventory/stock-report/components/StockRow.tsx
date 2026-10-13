/** One product line of the stock report: stock, value, sales in the period, age and marks. */

import { ChevronRight, Package } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { StockLine } from '../api/stock-report.api';
import { FLAG_META, LINE_STATUS, ageText, coverText, qty } from './meta';

export const STOCK_GRID = 'lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_1.5rem]';

export function StockRow({ l, money, cost, groupLabel, shopName, onOpen }: {
  l: StockLine;
  money: (n: number) => string;
  cost: (n: number) => string;
  groupLabel?: (id: string) => string;
  shopName?: (id: string) => string;
  onOpen: () => void;
}) {
  const flags = l.flags.filter((f) => FLAG_META[f]);
  const split = l.shops?.filter((s) => s.stock !== 0) ?? [];
  return (
    <li>
      <button type="button" onClick={onOpen}
        className={cn('grid w-full grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition hover:bg-slate-50 lg:gap-y-0', STOCK_GRID)}>
        <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
          {l.image
            ? <img src={l.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
            : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></span>}
          <div className="min-w-0">
            <p className="truncate text-[0.875rem] font-semibold text-slate-900">{l.name}</p>
            <p className="truncate text-[0.75rem] text-slate-500">
              {[l.category?.name, l.brand?.name, l.group && groupLabel ? groupLabel(l.group) : null, l.detail, l.sku].filter(Boolean).join(' · ') || '—'}
            </p>
            {flags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {flags.slice(0, 4).map((f) => (
                  <span key={f} className={cn('rounded-full px-1.5 py-px text-[0.625rem] font-semibold ring-1', FLAG_META[f]!.tone)}>{FLAG_META[f]!.label}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[0.6875rem] text-slate-500 lg:hidden">Stock</p>
          <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold tabular-nums text-slate-900">
            {qty(l.stock)} <span className="font-normal text-slate-500">{l.unit}</span>
            <span className={cn('rounded-full px-1.5 py-px text-[0.625rem] font-semibold ring-1', LINE_STATUS[l.status].tone)}>{LINE_STATUS[l.status].label}</span>
          </p>
          <p className="truncate text-[0.6875rem] text-slate-500">
            {l.devices ? `${l.devices.count} ${l.devices.label}` : l.rolls ? `${l.rolls.rolls} roll · ${l.rolls.pieces} piece` : `alert ${qty(l.alert)}`}
            {split.length > 1 && shopName ? ` · ${split.map((s) => `${shopName(s.shopId)} ${qty(s.stock)}`).join(', ')}` : ''}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[0.6875rem] text-slate-500 lg:hidden">Cost · bechne par</p>
          <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{cost(l.valueAtCost)}</p>
          <p className="truncate text-[0.6875rem] tabular-nums text-slate-500">bechne par {money(l.retail)}{l.margin != null ? ` · ${l.margin.toFixed(0)}%` : ''}</p>
        </div>

        <div className="min-w-0">
          <p className="text-[0.6875rem] text-slate-500 lg:hidden">Sale</p>
          <p className="text-[0.875rem] tabular-nums text-slate-900">{l.sold.qty ? `${qty(l.sold.qty)} ${l.unit}` : <span className="text-slate-400">nahi biki</span>}</p>
          <p className="truncate text-[0.6875rem] text-slate-500">{l.sold.qty ? `${money(l.sold.revenue)} · ${coverText(l.cover)}` : ''}</p>
        </div>

        <div className="min-w-0">
          <p className="text-[0.6875rem] text-slate-500 lg:hidden">Aakhri sale</p>
          <p className={cn('text-[0.875rem] tabular-nums', l.flags.includes('dead') ? 'font-semibold text-violet-700' : 'text-slate-900')}>{ageText(l.saleAge)}</p>
          <p className="truncate text-[0.6875rem] text-slate-500">maal aaya {ageText(l.stockAge, '—')}</p>
        </div>

        <ChevronRight className="hidden h-4 w-4 text-slate-300 lg:block" />
      </button>
    </li>
  );
}
