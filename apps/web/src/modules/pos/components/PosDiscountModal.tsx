/**
 * Bill discount: a percentage, a fixed amount, or "round it off" to the
 * nearest 10/50/100 — the way discounts are usually given at the counter.
 * Callers can add sections below (discount code, loyalty points).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Percent, Tag } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PosDiscountMode } from '../lib/posCart';

const PCT = [5, 10, 15, 20, 25, 50];
const RS = [10, 20, 50, 100, 200, 500];
const ROUND = [10, 50, 100];

export function PosDiscountModal({ subtotal, mode: initMode, pct: initPct, rs: initRs, onApply, onClose, extra }: {
  subtotal: number;
  mode: PosDiscountMode;
  pct: number;
  rs: number;
  onApply: (mode: PosDiscountMode, pct: number, rs: number) => void;
  onClose: () => void;
  /** Extra sections under the manual discount (discount code, loyalty points). */
  extra?: ReactNode;
}) {
  const [mode, setMode] = useState<PosDiscountMode>(initMode);
  const [pct, setPct] = useState(initPct ? String(initPct) : '');
  const [rs, setRs] = useState(initRs ? String(initRs) : '');

  const pctNum = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const rsNum = Math.max(Math.min(Number(rs) || 0, subtotal), 0);
  const amount = mode === 'pct' ? (subtotal * pctNum) / 100 : rsNum;
  const final = Math.max(subtotal - amount, 0);
  const share = subtotal > 0 ? (amount / subtotal) * 100 : 0;
  const apply = useCallback(() => onApply(mode, mode === 'pct' ? pctNum : 0, mode === 'rs' ? rsNum : 0), [mode, pctNum, rsNum, onApply]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply]);

  const value = mode === 'pct' ? pct : rs;
  const setValue = mode === 'pct' ? setPct : setRs;
  const presets = mode === 'pct' ? PCT : RS.filter((n) => n < subtotal);
  const roundTo = (step: number) => { const off = subtotal % step; if (off > 0) { setMode('rs'); setRs(String(Number(off.toFixed(2)))); } };

  return (
    <Modal open onClose={onClose} size="sm" title="Discount" description="Percent, rupay, ya bill gol karein"
      footer={
        <div className="flex w-full gap-2">
          {(initPct > 0 || initRs > 0) && <Button variant="secondary" onClick={() => onApply(mode, 0, 0)}>Hatayein</Button>}
          <Button className="flex-1" size="lg" onClick={apply}>{amount > 0 ? `${formatPKR(amount)} discount lagayein` : 'Lagayein'}</Button>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/70">
          <div className="min-w-0 flex-1">
            <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">Bill</div>
            <div className={cn('text-lg font-semibold tabular-nums', amount > 0 ? 'text-slate-400 line-through' : 'text-slate-900')}>{formatPKR(subtotal)}</div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-slate-300" />
          <div className="min-w-0 flex-1 text-right">
            <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">Naya total</div>
            <div className="text-2xl font-bold tabular-nums text-slate-900">{formatPKR(final)}</div>
          </div>
        </div>
        {amount > 0 && (
          <p className="flex items-center justify-center gap-1.5 rounded-xl bg-success-50 py-2 text-[0.8125rem] font-semibold text-success-700">
            <Tag className="h-4 w-4" /> Customer ki bachat {formatPKR(amount)} · {share.toFixed(1)}%
          </p>
        )}

        <Segmented label="Discount ki type" value={mode} onChange={setMode} className="w-full [&>button]:flex-1"
          items={[{ value: 'pct', label: 'Percent %' }, { value: 'rs', label: 'Rupay' }]} />
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            {mode === 'pct' ? <Percent className="h-4 w-4" /> : <span className="text-[0.75rem] font-bold">Rs</span>}
          </span>
          <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0" aria-label="Discount"
            className="h-16 w-full rounded-2xl border-0 bg-slate-100/80 pl-16 pr-5 text-right text-3xl font-bold tabular-nums text-slate-900 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((n) => {
            const on = Number(value) === n;
            return (
              <button key={n} type="button" onClick={() => setValue(String(n))}
                className={cn('h-11 rounded-xl text-[0.875rem] font-semibold tabular-nums transition',
                  on ? 'bg-brand-600 text-brand-fg shadow-md shadow-brand-600/25' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-300')}>
                {mode === 'pct' ? `${n}%` : `Rs ${n}`}
              </button>
            );
          })}
        </div>
        <div>
          <p className="mb-1.5 text-[0.75rem] font-medium text-slate-500">Bill gol karein</p>
          <div className="grid grid-cols-3 gap-2">
            {ROUND.map((step) => {
              const off = subtotal % step;
              return (
                <button key={step} type="button" disabled={off === 0} onClick={() => roundTo(step)}
                  className="rounded-xl bg-amber-50 py-2 text-center ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-40">
                  <div className="text-[0.875rem] font-semibold tabular-nums text-amber-900">{formatPKR(subtotal - off)}</div>
                  <div className="text-[0.6875rem] text-amber-700">{off > 0 ? `−${formatPKR(off)}` : 'Pehle se gol'}</div>
                </button>
              );
            })}
          </div>
        </div>
        {extra}
      </div>
    </Modal>
  );
}
