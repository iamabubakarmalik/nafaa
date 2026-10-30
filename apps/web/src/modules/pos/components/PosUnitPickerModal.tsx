/**
 * Which pack is being sold — piece, dozen or carton? Each unit shows its own
 * rate and how many base units it takes from stock.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Package } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { Product } from '@modules/inventory/products/api/products.api';
import { isWeightUnit, type PosUnitOption } from '../lib/posUnits';
import { t } from '@core/i18n';

const PRESETS: Record<string, number[]> = {
  pcs: [1, 2, 3, 5, 10, 12], piece: [1, 2, 3, 5, 10, 12],
  box: [1, 2, 3, 5], carton: [1, 2, 5], dozen: [1, 2, 3], packet: [1, 2, 5, 10], bag: [1, 2, 5],
};

export function PosUnitPickerModal({ product, units, stock, onConfirm, onClose }: {
  product: Product;
  units: PosUnitOption[];
  /** Sellable stock in base units; Infinity to allow selling without stock. */
  stock?: number;
  onConfirm: (unit: PosUnitOption, qty: number) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(units.find((u) => u.isBase)?.id ?? units[0]?.id ?? '');
  const [qtyStr, setQtyStr] = useState('1');
  const unit = units.find((u) => u.id === selectedId) ?? units[0];
  const qty = Number(qtyStr) || 0;
  const available = stock ?? Number(product.stock || 0);
  const weight = isWeightUnit(unit?.unitName ?? '');
  const baseQty = qty * (unit?.conversionRate ?? 1);
  const exceeds = !weight && baseQty > available;
  const canAdd = weight || (qty > 0 && !exceeds);

  useEffect(() => { setQtyStr('1'); }, [selectedId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canAdd && unit) { e.preventDefault(); onConfirm(unit, qty || 1); }
      const n = Number(e.key);
      if (!e.ctrlKey && !e.metaKey && n >= 1 && n <= units.length && !(e.target instanceof HTMLInputElement)) setSelectedId(units[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd, unit, qty, units, onConfirm]);

  if (!unit) return null;
  const img = product.images?.[0]?.url;

  return (
    <Modal open onClose={onClose} size="md"
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{product.name}</span>
            <span className="block text-[0.75rem] font-normal text-slate-500">
              {t('Stock {{value}}', { value: Number.isFinite(available) ? `${Number(available.toFixed(2))} ${product.unit}` : t('bina hadd') })}
            </span>
          </span>
        </span>
      }
      footer={
        <Button fullWidth size="lg" disabled={!canAdd} onClick={() => onConfirm(unit, qty || 1)}>
          {weight ? t('Wazan likhein — {{unitName}}', { unitName: unit.unitName }) : t('{{qty}} {{unitName}} · {{value}} — bill mein daalein', { qty, unitName: unit.unitName, value: formatPKR(qty * unit.price) })}
        </Button>
      }>
      <div className="space-y-4">
        <div role="radiogroup" aria-label={t('Unit')} className="grid gap-2 sm:grid-cols-2">
          {units.map((u, i) => {
            const on = u.id === unit.id;
            return (
              <button key={u.id} type="button" role="radio" aria-checked={on} onClick={() => setSelectedId(u.id)}
                className={cn('flex items-center gap-3 rounded-xl border p-3 text-start transition',
                  on ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300')}>
                <span className="text-xl">{u.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-semibold text-slate-900">{u.label}</span>
                  <span className="block text-[0.75rem] text-slate-500">
                    {u.conversionRate !== 1 ? `= ${Number(u.conversionRate.toFixed(3))} ${product.unit}` : t('Base unit')}
                  </span>
                </span>
                <span className="text-end">
                  <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(u.price)}</span>
                  <span className="hidden text-[0.625rem] text-slate-400 sm:block">{i + 1}</span>
                </span>
                {on && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>

        {!weight && (
          <div>
            <div className="mb-1.5 text-[0.75rem] font-medium text-slate-500">{t('Kitne {{unitName}}?', { unitName: unit.unitName })}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <input autoFocus inputMode="decimal" value={qtyStr} onChange={(e) => setQtyStr(e.target.value.replace(/[^\d.]/g, ''))}
                onFocus={(e) => e.target.select()} aria-label={t('Qty')}
                className="h-11 w-24 rounded-lg border border-slate-300 text-center text-lg font-bold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              {(PRESETS[unit.unitName.toLowerCase()] ?? [1, 2, 5, 10]).map((n) => (
                <button key={n} type="button" onClick={() => setQtyStr(String(n))}
                  className={cn('h-11 min-w-11 rounded-lg border px-3 text-[0.875rem] font-semibold tabular-nums transition',
                    qty === n ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:border-slate-300')}>
                  {n}
                </button>
              ))}
            </div>
            {unit.conversionRate !== 1 && qty > 0 && (
              <p className="mt-2 text-[0.75rem] text-slate-500">{t('Stock se {{value}} {{unit}} kam honge', { value: Number(baseQty.toFixed(3)), unit: product.unit })}</p>
            )}
            {exceeds && (
              <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium text-rose-700">
                <AlertTriangle className="h-4 w-4" /> {' '}{t('Stock kam hai — sirf {{value}} {{unit}}', { value: Number(available.toFixed(2)), unit: product.unit })}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
