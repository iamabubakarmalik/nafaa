import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, AlertTriangle, Scale } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { PosUnitOption } from '../lib/posUnits';

/* ═════════════════════════════════════════════════════════════
   WAZAN WALI SALE — kilo, liter, meter
   ─────────────────────────────────────────────────────────────
   Do taraf se hisaab: "aadha kilo do" (wazan se) aur "sau rupay
   ka de do" (paise se). Counter par dono jumle barabar aam hain,
   is liye dono khane saath saath chalte hain — ek bharo, doosra
   khud ban jata hai.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   ⚖️ WEIGH SALE MODAL
   ═════════════════════════════════════════════════════════════ */
export function PosWeighModal({ product, unit, prefillMoney, onConfirm, onClose }: {
  product: Product; unit: PosUnitOption; prefillMoney?: number;
  onConfirm: (qty: number) => void; onClose: () => void;
}) {
  const base = unit.unitName.toLowerCase();
  const pricePerUnit = unit.price;

  const subUnits = useMemo(() => {
    if (base === 'kg') return [{ k: 'kg', l: 'KG', toBase: 1 }, { k: 'g', l: 'Gram', toBase: 0.001 }];
    if (base === 'gram' || base === 'g') return [{ k: 'g', l: 'Gram', toBase: 1 }, { k: 'kg', l: 'KG', toBase: 1000 }];
    if (base === 'liter' || base === 'litre' || base === 'l') return [{ k: 'l', l: 'Liter', toBase: 1 }, { k: 'ml', l: 'ml', toBase: 0.001 }];
    if (base === 'ml') return [{ k: 'ml', l: 'ml', toBase: 1 }, { k: 'l', l: 'Liter', toBase: 1000 }];
    return [{ k: base, l: unit.unitName.toUpperCase(), toBase: 1 }];
  }, [base, unit.unitName]);

  const [mode, setMode] = useState<'weight' | 'money'>('money');
  const [subUnit, setSubUnit] = useState(subUnits[0].k);
  const [weightInput, setWeightInput] = useState<number | ''>('');
  const [moneyInput, setMoneyInput] = useState<number | ''>(prefillMoney ?? '');

  const activeSub = subUnits.find((s) => s.k === subUnit) || subUnits[0];
  const baseQty = mode === 'weight' ? Number(weightInput || 0) * activeSub.toBase : 0;
  const weightPrice = baseQty * pricePerUnit;
  const moneyBaseQty = mode === 'money' && pricePerUnit > 0 ? Number(moneyInput || 0) / pricePerUnit : 0;
  const finalBaseQty = mode === 'weight' ? baseQty : moneyBaseQty;
  const finalPrice = mode === 'weight' ? weightPrice : Number(moneyInput || 0);
  const stockBase = Number(product.stock || 0) / unit.conversionRate;
  const overStock = finalBaseQty > 0 && finalBaseQty > stockBase;
  const canAdd = finalBaseQty > 0 && !overStock;

  const weightPresets = base === 'gram' || base === 'g' ? [100, 250, 500, 1000] : [0.25, 0.5, 1, 2, 5];
  const moneyPresets = [20, 50, 100, 200, 500];

  const submit = useCallback(() => { if (canAdd) onConfirm(Number(finalBaseQty.toFixed(4))); }, [canAdd, finalBaseQty, onConfirm]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && canAdd) { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd, submit, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Scale className="h-3 w-3" /> Weigh Machine Sale
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{product.name}</h3>
            <div className="text-xs text-white/85 font-bold">
              {formatPKR(pricePerUnit)} / {unit.unitName} • Stock {stockBase.toFixed(stockBase % 1 === 0 ? 0 : 2)}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('money')}
              className={['py-3.5 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'money' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'].join(' ')}>
              💰 Paise Se
              <div className="text-[10px] font-bold opacity-70">"100 ka aata de do"</div>
            </button>
            <button onClick={() => setMode('weight')}
              className={['py-3.5 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'weight' ? 'border-amber-600 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'].join(' ')}>
              ⚖️ Wazan Se
              <div className="text-[10px] font-bold opacity-70">"250 gram daal"</div>
            </button>
          </div>

          {subUnits.length > 1 && (
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-max mx-auto">
              {subUnits.map((s) => (
                <button key={s.k} onClick={() => setSubUnit(s.k)}
                  className={['px-4 py-1.5 rounded-lg text-xs font-extrabold transition',
                    subUnit === s.k ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
                  {s.l}
                </button>
              ))}
            </div>
          )}

          {mode === 'weight' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Kitna wazan? ({activeSub.l})</label>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0} value={weightInput}
                onChange={(e) => setWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-16 w-full rounded-2xl border-2 border-amber-400 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-600 transition" />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {weightPresets.map((w) => (
                  <button key={w} onClick={() => setWeightInput(w)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 hover:border-amber-400 text-amber-800 dark:text-amber-300 text-xs font-extrabold transition tabular-nums">
                    {w} {activeSub.k === 'g' ? 'g' : activeSub.k === 'ml' ? 'ml' : activeSub.l}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Kitne paise ka? (Rs)</label>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0} value={moneyInput}
                onChange={(e) => setMoneyInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-16 w-full rounded-2xl border-2 border-emerald-400 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 transition" />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {moneyPresets.map((m) => (
                  <button key={m} onClick={() => setMoneyInput(m)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/40 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition tabular-nums">
                    Rs {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-4 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2 flex items-center gap-1">
              <Scale className="h-3 w-3" /> Live Hisaab
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/60">Wazan</div>
                <div className="text-2xl font-extrabold tabular-nums leading-none">
                  {(mode === 'weight' ? baseQty : moneyBaseQty).toFixed(3).replace(/\.?0+$/, '')}
                  <span className="text-sm font-bold text-white/60"> {unit.unitName}</span>
                </div>
              </div>
              <div className="text-2xl text-amber-300">=</div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-extrabold text-white/60">Paise</div>
                <div className="text-3xl font-extrabold tabular-nums text-emerald-300 leading-none">{formatPKR(finalPrice)}</div>
              </div>
            </div>
          </div>

          {overStock && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stock sirf {stockBase.toFixed(2)} {unit.unitName} hai
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">Cancel</button>
          <button onClick={submit} disabled={!canAdd}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 disabled:opacity-40 text-white font-extrabold shadow-lg shadow-amber-500/40 inline-flex items-center justify-center gap-2 transition">
            <Plus className="h-4 w-4" /> Cart Me Daalo ({formatPKR(finalPrice)})
          </button>
        </div>
      </div>
    </div>
  );
}

export default PosWeighModal;
