/**
 * Sale by weight or volume (kg, gram, liter, ml). Counters hear both
 * "half a kilo" and "give me Rs 100 worth", so both inputs sit side by side:
 * fill one and the other is worked out. A connected scale can fill the
 * weight directly.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Scale } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { ScaleChip } from '@core/hardware/ScaleChip';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { PosUnitOption } from '../lib/posUnits';
import { t } from '@core/i18n';

export function PosWeighModal({ product, unit, prefillMoney, stock, onConfirm, onClose }: {
  product: Product;
  unit: PosUnitOption;
  prefillMoney?: number;
  /** Sellable stock in the product's base unit; Infinity to allow selling without stock. */
  stock?: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const base = unit.unitName.toLowerCase();
  const price = unit.price;

  const subUnits = useMemo(() => {
    if (base === 'kg') return [{ k: 'kg', l: 'KG', toBase: 1 }, { k: 'g', l: t('Gram'), toBase: 0.001 }];
    if (base === 'gram' || base === 'g') return [{ k: 'g', l: t('Gram'), toBase: 1 }, { k: 'kg', l: 'KG', toBase: 1000 }];
    if (base === 'liter' || base === 'litre' || base === 'l') return [{ k: 'l', l: t('Liter'), toBase: 1 }, { k: 'ml', l: 'ml', toBase: 0.001 }];
    if (base === 'ml') return [{ k: 'ml', l: 'ml', toBase: 1 }, { k: 'l', l: t('Liter'), toBase: 1000 }];
    return [{ k: base, l: unit.unitName.toUpperCase(), toBase: 1 }];
  }, [base, unit.unitName]);

  const [mode, setMode] = useState<'money' | 'weight'>(prefillMoney ? 'money' : 'weight');
  const [sub, setSub] = useState(subUnits[0].k);
  const [weight, setWeight] = useState('');
  const [money, setMoney] = useState(prefillMoney ? String(prefillMoney) : '');

  const active = subUnits.find((s) => s.k === sub) ?? subUnits[0];
  const qty = mode === 'weight'
    ? (Number(weight) || 0) * active.toBase
    : price > 0 ? (Number(money) || 0) / price : 0;
  const amount = mode === 'weight' ? qty * price : Number(money) || 0;
  const available = (stock ?? Number(product.stock || 0)) / unit.conversionRate;
  const over = qty > 0 && qty > available;
  const canAdd = qty > 0 && !over;
  const fmtQty = (n: number) => String(Number(n.toFixed(3)));

  const submit = useCallback(() => { if (canAdd) onConfirm(Number(qty.toFixed(4))); }, [canAdd, qty, onConfirm]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && canAdd) { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd, submit]);

  const weightPresets = base === 'gram' || base === 'g' || sub === 'g' || sub === 'ml' ? [100, 250, 500, 750] : [0.25, 0.5, 1, 2, 5];
  const moneyPresets = [20, 50, 100, 200, 500, 1000];

  return (
    <Modal open onClose={onClose} size="sm"
      title={<span className="flex items-center gap-2"><Scale className="h-4 w-4 text-brand-600" />{product.name}</span>}
      description={`${formatPKR(price)} / ${unit.unitName}${Number.isFinite(available) ? ` · stock ${fmtQty(available)} ${unit.unitName}` : ''}`}
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={!canAdd}>
          {qty > 0 ? t('{{qty}} {{unitName}} · {{amount}} — bill mein daalein', { qty: fmtQty(qty), unitName: unit.unitName, amount: formatPKR(amount) }) : t('Wazan ya amount likhein')}
        </Button>
      }>
      <div className="space-y-4">
        {(base === 'kg' || base === 'gram' || base === 'g') && (
          <ScaleChip onUse={(kg) => {
            const inBase = base === 'kg' ? kg : kg * 1000;
            setMode('weight');
            setWeight(String(Number((inBase / active.toBase).toFixed(3))));
          }} />
        )}
        <Segmented label={t('Kaise')} value={mode} onChange={setMode} className="w-full [&>button]:flex-1"
          items={[{ value: 'weight', label: t('Wazan se') }, { value: 'money', label: t('Amount se') }]} />

        {mode === 'weight' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input autoFocus inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0" aria-label={t('Wazan')}
                className="h-14 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 text-end text-2xl font-bold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              {subUnits.length > 1 && (
                <Segmented label={t('Unit')} value={sub} onChange={setSub} items={subUnits.map((s) => ({ value: s.k, label: s.l }))} />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {weightPresets.map((w) => (
                <button key={w} type="button" onClick={() => setWeight(String(w))}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-[0.8125rem] font-semibold tabular-nums text-slate-700 hover:border-brand-300 hover:bg-brand-50">
                  {w} {active.l.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input autoFocus inputMode="decimal" value={money} onChange={(e) => setMoney(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder={t('Rs 0')} aria-label={t('Amount')}
              className="h-14 w-full rounded-xl border border-slate-300 px-4 text-end text-2xl font-bold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            <div className="grid grid-cols-3 gap-1.5">
              {moneyPresets.map((m) => (
                <button key={m} type="button" onClick={() => setMoney(String(m))}
                  className="h-9 rounded-lg border border-slate-200 text-[0.8125rem] font-semibold tabular-nums text-slate-700 hover:border-brand-300 hover:bg-brand-50">
                  Rs {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {qty > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-[0.8125rem] text-slate-500">{mode === 'money' ? t('Itna wazan dein') : t('Itne paise lein')}</span>
            <span className="text-xl font-bold tabular-nums text-slate-900">
              {mode === 'money' ? `${fmtQty(qty)} ${unit.unitName}${base === 'kg' && qty < 1 ? ` (${Math.round(qty * 1000)} g)` : ''}` : formatPKR(amount)}
            </span>
          </div>
        )}
        {over && (
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-rose-700">
            <AlertTriangle className="h-4 w-4" /> {' '}{t('Stock sirf {{available}} {{unitName}}', { available: fmtQty(available), unitName: unit.unitName })}
          </p>
        )}
      </div>
    </Modal>
  );
}

export default PosWeighModal;
