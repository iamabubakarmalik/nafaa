/** Bill discount, as a percentage or a fixed amount, with a live total. */

import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PosDiscountMode } from '../lib/posCart';

const PCT = [5, 10, 15, 20, 25, 50];
const RS = [50, 100, 200, 500, 1000];

export function PosDiscountModal({ subtotal, mode: initMode, pct: initPct, rs: initRs, onApply, onClose }: {
  subtotal: number;
  mode: PosDiscountMode;
  pct: number;
  rs: number;
  onApply: (mode: PosDiscountMode, pct: number, rs: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<PosDiscountMode>(initMode);
  const [pct, setPct] = useState(initPct ? String(initPct) : '');
  const [rs, setRs] = useState(initRs ? String(initRs) : '');

  const pctNum = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const rsNum = Math.max(Math.min(Number(rs) || 0, subtotal), 0);
  const amount = mode === 'pct' ? (subtotal * pctNum) / 100 : rsNum;
  const final = Math.max(subtotal - amount, 0);
  const apply = useCallback(() => onApply(mode, mode === 'pct' ? pctNum : 0, mode === 'rs' ? rsNum : 0), [mode, pctNum, rsNum, onApply]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply]);

  const value = mode === 'pct' ? pct : rs;
  const setValue = mode === 'pct' ? setPct : setRs;
  const presets = mode === 'pct' ? PCT : RS.filter((n) => n < subtotal);

  return (
    <Modal open onClose={onClose} size="sm" title="Discount" description={`Bill ${formatPKR(subtotal)}`}
      footer={
        <>
          {(initPct > 0 || initRs > 0) && <Button variant="ghost" onClick={() => onApply(mode, 0, 0)}>Hatayein</Button>}
          <Button onClick={apply}>Lagayein</Button>
        </>
      }>
      <div className="space-y-4">
        <Segmented label="Discount ki qisam" value={mode} onChange={setMode} className="w-full [&>button]:flex-1"
          items={[{ value: 'pct', label: 'Percent %' }, { value: 'rs', label: 'Rupay' }]} />
        <div className="relative">
          <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0" aria-label="Discount"
            className="h-14 w-full rounded-xl border border-slate-300 px-4 pr-12 text-right text-2xl font-bold tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">{mode === 'pct' ? '%' : 'Rs'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((n) => (
            <button key={n} type="button" onClick={() => setValue(String(n))}
              className={cn('h-9 rounded-lg border px-3 text-[0.8125rem] font-semibold tabular-nums transition',
                Number(value) === n ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:border-slate-300')}>
              {mode === 'pct' ? `${n}%` : `Rs ${n}`}
            </button>
          ))}
        </div>
        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.875rem]">
          <div className="flex justify-between text-amber-700"><dt>Discount</dt><dd className="tabular-nums">−{formatPKR(amount)}{mode === 'rs' && subtotal > 0 && amount > 0 ? ` (${((amount / subtotal) * 100).toFixed(1)}%)` : ''}</dd></div>
          <div className="flex items-baseline justify-between"><dt className="font-medium text-slate-900">Naya total</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{formatPKR(final)}</dd></div>
        </dl>
      </div>
    </Modal>
  );
}
