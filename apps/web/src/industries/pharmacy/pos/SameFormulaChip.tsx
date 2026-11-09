/**
 * Cart-line chip for medicines: how many other brands on the shelf have the
 * same salts and strength. Opening it lists them with price difference and
 * stock, so the counter can tell the customer about a cheaper option and
 * swap the line or add the alternative.
 */

import { useState } from 'react';
import { ArrowRightLeft, Beaker, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PosCartLine } from '@modules/pos/lib/posCart';
import type { PosLineExtraContext } from '@modules/pos/engine';
import { t } from '@core/i18n';
import { substitutesFor } from './substitutes';

export function SameFormulaChip({ line, ctx }: { line: PosCartLine; ctx: PosLineExtraContext }) {
  const [open, setOpen] = useState(false);
  const item = ctx.item;
  if (!item?.meta?.salts) return null;
  const options = substitutesFor(item, ctx.items, { includeEmpty: true });
  if (!options.length) return null;
  const inStock = options.filter((o) => o.stock > 0);
  const cheaper = inStock.filter((o) => o.price < line.unitPrice).length;

  return (
    <div className="w-full">
      <button type="button" onClick={(ev) => { ev.stopPropagation(); setOpen((v) => !v); }}
        className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1',
          cheaper ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-cyan-50 text-cyan-800 ring-cyan-200')}>
        <Beaker className="h-3 w-3" />
        {cheaper
          ? t('Same formula: {{count}} ({{cheaper}} sasti)', { count: options.length, cheaper })
          : t('Same formula: {{count}}', { count: options.length })}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mt-1.5 divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200" onClick={(ev) => ev.stopPropagation()}>
          {String(item.meta?.generic ?? '') && (
            <li className="bg-slate-50 px-2.5 py-1 text-[0.6875rem] text-slate-500">{t('Formula: {{generic}}', { generic: String(item.meta?.generic) })}</li>
          )}
          {options.map((o) => {
            const diff = o.price - line.unitPrice;
            const empty = o.stock <= 0;
            return (
              <li key={o.id} className={cn('flex items-center gap-2 px-2.5 py-1.5', empty && 'opacity-60')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.75rem] font-semibold text-slate-900">{o.name}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">
                    {[o.meta?.manufacturer as string | undefined, empty ? t('Stock khatam') : t('{{qty}} {{unit}} shelf par', { qty: Number(o.stock.toFixed(2)), unit: o.unit })].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {!ctx.hidePrices && (
                  <span className="shrink-0 text-end">
                    <span className="block text-[0.75rem] font-bold tabular-nums text-slate-900">{formatPKR(o.price)}</span>
                    {diff !== 0 && (
                      <span className={cn('block text-[0.625rem] font-semibold tabular-nums', diff < 0 ? 'text-emerald-700' : 'text-rose-600')}>
                        {diff < 0 ? t('{{amount}} sasti', { amount: formatPKR(-diff) }) : t('{{amount}} mehngi', { amount: formatPKR(diff) })}
                      </span>
                    )}
                  </span>
                )}
                {!empty && (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" title={t('Is line ki jagah ye dein')} onClick={() => { setOpen(false); ctx.swap(o); }}
                      className="inline-flex h-7 items-center gap-1 rounded-lg bg-brand-600 px-2 text-[0.6875rem] font-semibold text-white hover:bg-brand-700">
                      <ArrowRightLeft className="h-3 w-3" />{t('Badlo')}
                    </button>
                    <button type="button" title={t('Bill me alag se jorein')} onClick={() => ctx.addItem(o)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
