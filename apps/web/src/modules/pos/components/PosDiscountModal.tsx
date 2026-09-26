import { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Percent, Banknote, Check, Tag, Calculator } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { PosDiscountMode } from '../lib/posCart';

/* ═════════════════════════════════════════════════════════════
   DISCOUNT — percent ya seedha rupay
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Dukaan-daar dono tarah sochta
   hai — "10 percent kam kar do" aur "200 rupay chhor do" — is liye
   dono raste khule hain aur doosra number saath saath dikhta hai.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   💎 DISCOUNT MODAL
   ═════════════════════════════════════════════════════════════ */
export function PosDiscountModal({ subtotal, mode: initMode, pct: initPct, rs: initRs, onApply, onClose }: {
  subtotal: number; mode: PosDiscountMode; pct: number; rs: number;
  onApply: (mode: PosDiscountMode, pct: number, rs: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<PosDiscountMode>(initMode);
  const [pct, setPct] = useState<string>(initPct ? String(initPct) : '');
  const [rs, setRs] = useState<string>(initRs ? String(initRs) : '');

  const pctNum = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const rsNum = Math.max(Math.min(Number(rs) || 0, subtotal), 0);
  const amount = mode === 'pct' ? (subtotal * pctNum) / 100 : rsNum;
  const finalTotal = Math.max(subtotal - amount, 0);
  const effectivePct = subtotal > 0 ? (amount / subtotal) * 100 : 0;

  const apply = useCallback(() => onApply(mode, pctNum, rsNum), [mode, pctNum, rsNum, onApply]);

  const numpadPress = (key: string) => {
    const setter = mode === 'pct' ? setPct : setRs;
    if (key === 'C') return setter('');
    if (key === '⌫') return setter((v) => v.slice(0, -1));
    if (key === '.' && (mode === 'pct' ? pct : rs).includes('.')) return;
    setter((v) => (v === '0' ? key : v + key).slice(0, mode === 'pct' ? 5 : 10));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 relative px-5 py-4 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30">
                <Tag className="h-3 w-3" /> Discount
              </div>
              <div className="mt-2 text-xs font-bold text-white/85">Subtotal</div>
              <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(subtotal)}</div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="shrink-0 px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button onClick={() => setMode('pct')}
              className={['h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition',
                mode === 'pct' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-md' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
              <Percent className="h-4 w-4" /> Percent (%)
            </button>
            <button onClick={() => setMode('rs')}
              className={['h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition',
                mode === 'rs' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-md' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
              <Banknote className="h-4 w-4" /> Rupees (Rs)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className={['rounded-2xl border-2 p-4 text-center',
            mode === 'pct' ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10'
            : 'border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10'].join(' ')}>
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-1">
              {mode === 'pct' ? 'Kitne % Discount' : 'Kitne Rs Discount'}
            </div>
            <div className="flex items-baseline justify-center gap-1">
              {mode === 'rs' && <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">Rs</span>}
              <div className={['text-6xl font-extrabold tabular-nums leading-none',
                mode === 'pct' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'].join(' ')}>
                {mode === 'pct' ? (pct || '0') : (rs || '0')}
              </div>
              {mode === 'pct' && <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-300">%</span>}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {mode === 'pct'
              ? [5, 10, 15, 20, 25].map((v) => (
                  <button key={v} onClick={() => setPct(String(v))}
                    className={['h-11 rounded-xl text-sm font-extrabold tabular-nums transition active:scale-95 border-2',
                      Number(pct) === v ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400'].join(' ')}>
                    {v}%
                  </button>
                ))
              : [50, 100, 200, 500, 1000].map((v) => (
                  <button key={v} onClick={() => setRs(String(v))}
                    className={['h-11 rounded-xl text-xs font-extrabold tabular-nums transition active:scale-95 border-2',
                      Number(rs) === v ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400'].join(' ')}>
                    {v}
                  </button>
                ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
              <button key={k} onClick={() => numpadPress(k)}
                className={['h-12 rounded-xl text-lg font-extrabold transition active:scale-95 border-2 tabular-nums',
                  k === '⌫' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400'].join(' ')}>
                {k}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2 flex items-center gap-1">
              <Calculator className="h-3 w-3" /> Live Hisaab
            </div>
            <div className="space-y-1.5 text-sm font-bold">
              <div className="flex justify-between">
                <span className="text-white/70">Subtotal</span>
                <span className="tabular-nums">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>Discount {mode === 'rs' && amount > 0 ? `(${effectivePct.toFixed(1)}%)` : ''}</span>
                <span className="tabular-nums">− {formatPKR(amount)}</span>
              </div>
              <div className="h-px bg-white/20 my-1.5" />
              <div className="flex justify-between text-lg font-extrabold">
                <span>Final Total</span>
                <span className="tabular-nums text-emerald-300">{formatPKR(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-3 grid grid-cols-3 gap-2">
          <button onClick={() => onApply(mode, 0, 0)}
            className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 transition inline-flex items-center justify-center gap-1">
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
          <button onClick={onClose}
            className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">
            Cancel
          </button>
          <button onClick={apply}
            className={['h-14 rounded-2xl font-extrabold text-white shadow-lg inline-flex items-center justify-center gap-1.5 transition active:scale-95',
              mode === 'pct' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/40'
              : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/40'].join(' ')}>
            <Check className="h-5 w-5" /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default PosDiscountModal;
