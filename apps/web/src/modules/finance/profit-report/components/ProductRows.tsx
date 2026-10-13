/**
 * Product lines of the profit report: units kept, sales after discount and
 * returns, cost, profit with the change from the previous period, and
 * margin. A product sold in several variants opens to show each one.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import type { ProfitItem, ProfitVariant } from '../api';
import { change, changeText, pct, qty } from './meta';

const GRID = 'lg:grid-cols-[minmax(0,2.6fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }

export function ProductHeader({ itemWord }: { itemWord: string }) {
  return (
    <div className={cn('hidden gap-x-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 lg:grid', GRID)}>
      <span>{itemWord}</span><span className="text-right">Biki</span><span className="text-right">Sale</span><span className="text-right">Cost</span><span className="text-right">Profit</span><span className="text-right">Margin</span>
    </div>
  );
}

export function ProductRow({ r, fmt }: { r: ProfitItem; fmt: Fmt }) {
  const [open, setOpen] = useState(false);
  const hasVariants = r.variants.length > 1 || (r.variants.length === 1 && !!r.variants[0].variantId);
  const loss = (r.profit ?? 0) < 0;
  const c = change(r.profit, r.prevProfit);

  return (
    <li>
      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-3 sm:px-4', GRID, loss && !fmt.costHidden && 'bg-rose-50/40')}>
        <div className="flex min-w-0 items-center gap-3">
          {hasVariants ? (
            <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Band karein' : 'Variants dekhein'} aria-expanded={open}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : <span className="hidden w-7 shrink-0 sm:block" />}
          <ProductThumb name={r.name} category={r.category?.name} url={r.image} size="sm" />
          <div className="min-w-0">
            {r.productId
              ? <Link to={`/products/${r.productId}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
              : <span className="block truncate font-semibold text-slate-900">{r.name}</span>}
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.75rem] text-slate-500">
              <span className="truncate">{[r.category?.name, r.brand?.name, r.sku].filter(Boolean).join(' · ') || '—'}</span>
              {hasVariants && <Tag tone="violet">{r.variants.length} variants</Tag>}
              {r.discount > 0 && <Tag tone="pink">Discount {fmt.money(r.discount)}</Tag>}
              {r.returnedQty > 0 && <Tag tone="orange">{qty(r.returnedQty)} wapas</Tag>}
              {!fmt.costHidden && loss && <Tag tone="rose">Nuqsan</Tag>}
              {!fmt.costHidden && r.fallbackLines > 0 && <Tag tone="amber" title="Bill par cost save nahi thi — aaj ki cost lagayi">Aaj ki cost</Tag>}
              {!fmt.costHidden && (r.noCostLines ?? 0) > 0 && <Tag tone="slate" title="Cost bhari nahi — profit zyada dikh raha hai">Bina cost</Tag>}
            </div>
          </div>
        </div>

        {/* Phone: profit on the right; the rest below */}
        <div className="text-right lg:hidden">
          <p className={cn('font-bold tabular-nums', loss && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(r.profit ?? 0)}</p>
          <p className="text-[0.75rem] tabular-nums text-slate-500">{fmt.money(r.revenue)} · {qty(r.qty)} {r.unit}</p>
        </div>

        <span className="hidden text-right tabular-nums text-slate-700 lg:block">{qty(r.qty)} <span className="text-[0.75rem] text-slate-400">{r.unit}</span></span>
        <span className="hidden text-right lg:block">
          <span className="block font-medium tabular-nums text-slate-900">{fmt.money(r.revenue)}</span>
          <span className="block text-[0.6875rem] tabular-nums text-slate-400">{r.bills} bill · ausat {fmt.money(r.avgPrice)}</span>
        </span>
        <span className="hidden text-right lg:block">
          <span className="block tabular-nums text-slate-700">{fmt.cost(r.cost ?? 0)}</span>
          {!fmt.costHidden && <span className="block text-[0.6875rem] tabular-nums text-slate-400">fi {r.unit} {fmt.cost(r.avgCost ?? 0)}</span>}
        </span>
        <span className="hidden text-right lg:block">
          <span className={cn('block font-bold tabular-nums', loss && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(r.profit ?? 0)}</span>
          {!fmt.costHidden && <Change c={c} />}
        </span>
        <span className="hidden text-right lg:block"><MarginBar margin={r.margin} hidden={fmt.costHidden} /></span>
      </div>

      {open && (
        <ul className="border-t border-dashed border-slate-200 bg-slate-50/60">
          {r.variants.map((v) => <VariantLine key={v.variantId ?? 'none'} v={v} unit={r.unit} fmt={fmt} />)}
        </ul>
      )}
    </li>
  );
}

function VariantLine({ v, unit, fmt }: { v: ProfitVariant; unit: string; fmt: Fmt }) {
  const loss = (v.profit ?? 0) < 0;
  return (
    <li className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 text-[0.8125rem] sm:px-4', GRID)}>
      <span className="truncate pl-10 text-slate-700 sm:pl-[4.75rem]">↳ {v.name}</span>
      <span className="text-right tabular-nums lg:hidden">{fmt.cost(v.profit ?? 0)}</span>
      <span className="hidden text-right tabular-nums text-slate-600 lg:block">{qty(v.qty)} {unit}</span>
      <span className="hidden text-right tabular-nums text-slate-800 lg:block">{fmt.money(v.revenue)}</span>
      <span className="hidden text-right tabular-nums text-slate-600 lg:block">{fmt.cost(v.cost ?? 0)}</span>
      <span className={cn('hidden text-right font-semibold tabular-nums lg:block', loss && !fmt.costHidden ? 'text-rose-700' : 'text-slate-900')}>{fmt.cost(v.profit ?? 0)}</span>
      <span className="hidden text-right tabular-nums text-slate-600 lg:block">{fmt.costHidden ? '••' : pct(v.margin)}</span>
    </li>
  );
}

export function Change({ c, invert }: { c: number | null; invert?: boolean }) {
  if (c === 0) return <span className="block text-[0.6875rem] text-slate-400">pehle jaisa</span>;
  const up = c === null || c > 0;
  const good = invert ? !up : up;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[0.6875rem] font-medium', good ? 'text-emerald-700' : 'text-rose-700')}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{changeText(c)}
    </span>
  );
}

export function MarginBar({ margin, hidden }: { margin?: number; hidden: boolean }) {
  if (hidden) return <span className="text-slate-400">••</span>;
  const m = margin ?? 0;
  const color = m < 0 ? 'bg-rose-500' : m < 10 ? 'bg-amber-500' : m < 25 ? 'bg-sky-500' : 'bg-emerald-500';
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className={cn('text-[0.8125rem] font-semibold tabular-nums', m < 0 ? 'text-rose-700' : 'text-slate-800')}>{pct(m)}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><span className={cn('block h-full rounded-full', color)} style={{ width: `${Math.min(Math.abs(m), 100)}%` }} /></span>
    </span>
  );
}

const TONES = {
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function Tag({ tone, title, children }: { tone: keyof typeof TONES; title?: string; children: React.ReactNode }) {
  return <span title={title} className={cn('whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1', TONES[tone])}>{children}</span>;
}
