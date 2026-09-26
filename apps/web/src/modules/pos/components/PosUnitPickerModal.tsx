import { useState, useEffect } from 'react';
import { Package, X, Check } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { PosUnitOption } from '../lib/posUnits';

/* ═════════════════════════════════════════════════════════════
   UNIT PICKER — piece, dozen ya carton?
   ─────────────────────────────────────────────────────────────
   Jab ek product ke kai package hon to scan ya click ke baad yehi
   poochta hai ke kaun sa becha ja raha hai. Har unit ka apna rate
   dikhta hai, aur neeche ye bhi ke base units me kitna banega —
   warna dukaan-daar ko khud 24 se zarb deni parti thi.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   📦 UNIT PICKER MODAL
   ═════════════════════════════════════════════════════════════ */
const UNIT_QTY_PRESETS: Record<string, number[]> = {
  kg: [0.25, 0.5, 1, 2, 5], gram: [100, 250, 500, 1000],
  liter: [0.5, 1, 2, 5], ml: [250, 500, 1000],
  pcs: [1, 2, 3, 5, 10, 12], piece: [1, 2, 3, 5, 10, 12],
  box: [1, 2, 3, 5], carton: [1, 2, 5], dozen: [1, 2, 3], packet: [1, 2, 5, 10], bag: [1, 2, 5],
};

export function PosUnitPickerModal({ product, units, onConfirm, onClose }: {
  product: Product; units: PosUnitOption[];
  onConfirm: (unit: PosUnitOption, qty: number) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(units.find((u) => u.isBase)?.id ?? units[0]?.id ?? '');
  const [qtyStr, setQtyStr] = useState('1');
  const unit = units.find((u) => u.id === selectedId) ?? units[0];
  const qty = Number(qtyStr) || 0;
  const presets = UNIT_QTY_PRESETS[(unit?.unitName || '').toLowerCase()] ?? [1, 2, 5, 10];
  const baseQty = qty * (unit?.conversionRate ?? 1);
  const lineTotal = qty * (unit?.price ?? 0);
  const exceeds = baseQty > product.stock;

  useEffect(() => { setQtyStr('1'); }, [selectedId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && qty > 0 && !exceeds) { e.preventDefault(); onConfirm(unit, qty); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qty, exceeds, unit, onConfirm, onClose]);

  if (!unit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white flex items-center gap-4 shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-white/15 overflow-hidden shrink-0 flex items-center justify-center">
            {product.images?.[0]?.url ? <img src={product.images[0].url} alt="" className="w-full h-full object-cover" /> : <Package className="h-8 w-8 text-white/70" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">Kitna chahiye?</div>
            <h3 className="text-2xl font-extrabold leading-tight truncate">{product.name}</h3>
            <div className="text-sm font-bold text-cyan-200">Stock: {Number(product.stock).toFixed(product.stock % 1 === 0 ? 0 : 2)} {product.unit}</div>
          </div>
          <button onClick={onClose} className="h-12 w-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center shrink-0 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {units.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {units.map((u) => {
                const active = selectedId === u.id;
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)}
                    className={['h-[88px] rounded-2xl border-4 transition-all flex flex-col items-center justify-center gap-1 active:scale-95',
                      active ? 'border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/40 scale-105'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-sky-400 shadow-sm'].join(' ')}>
                    <span className="text-2xl">{u.emoji}</span>
                    <span className="text-sm font-extrabold uppercase">{u.unitName}</span>
                    <span className={['text-xs font-bold tabular-nums', active ? 'text-cyan-100' : 'text-emerald-700 dark:text-emerald-400'].join(' ')}>{formatPKR(u.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {presets.map((p) => {
              const active = Number(qtyStr) === p;
              return (
                <button key={p} onClick={() => setQtyStr(String(p))}
                  className={['h-[64px] rounded-2xl border-4 font-extrabold text-lg tabular-nums transition-all active:scale-95',
                    active ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-400 shadow-sm'].join(' ')}>
                  {p}
                  <div className={['text-[10px] font-bold uppercase', active ? 'text-emerald-100' : 'text-slate-500'].join(' ')}>{unit.unitName}</div>
                </button>
              );
            })}
          </div>

          <div className={['rounded-3xl p-4 border-4 transition-colors',
            exceeds ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-400 dark:border-rose-500/40'
            : 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-300 dark:border-emerald-500/40'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider">Quantity</div>
                <input type="number" step="any" value={qtyStr} autoFocus
                  onChange={(e) => setQtyStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                {unit.conversionRate !== 1 && (
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">= {baseQty.toFixed(2)} {product.unit}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider">Total</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-1">{formatPKR(lineTotal)}</div>
              </div>
            </div>
            {exceeds && (
              <div className="mt-2 text-sm font-extrabold text-rose-700 dark:text-rose-400">⚠️ Stock sirf {Number(product.stock).toFixed(2)} {product.unit} hai!</div>
            )}
          </div>

          <button onClick={() => { if (qty > 0 && !exceeds) onConfirm(unit, qty); }}
            disabled={qty <= 0 || exceeds}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-40 font-extrabold text-white text-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2">
            <Check className="h-6 w-6" /> Cart Mein Daalo — {formatPKR(lineTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PosUnitPickerModal;
