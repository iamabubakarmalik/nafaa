/** Discount code and loyalty points sections for the counter's discount dialog. */

import { useState } from 'react';
import { Award, CloudOff, Loader2, Tag, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';

export function PosPerks({ promo, codeDiscount, onApplyCode, onRemoveCode, loyalty, loyaltyDiscount, customerName }: {
  promo: { code: string; discount: number; offline?: boolean } | null;
  codeDiscount: number;
  onApplyCode: (code: string) => Promise<unknown>;
  onRemoveCode: () => void;
  loyalty: { on: boolean; available: number; max: number; min: number; rate: number; used: number; wanted: number; setWanted: (n: number) => void };
  loyaltyDiscount: number;
  customerName?: string;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true); setError('');
    try { await onApplyCode(code.trim()); setCode(''); } catch (e) { setError((e as Error).message || 'Code nahi chala'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <div>
        <p className="mb-1.5 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-500"><Tag className="h-3.5 w-3.5" />Discount code</p>
        {promo ? (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 ring-1 ring-violet-200">
            <span className="font-mono font-bold tracking-wider text-violet-800">{promo.code}</span>
            {promo.offline && <span className="inline-flex items-center gap-1 text-[0.6875rem] text-sky-700"><CloudOff className="h-3 w-3" />offline</span>}
            <span className="ml-auto font-semibold tabular-nums text-violet-800">−{formatPKR(codeDiscount)}</span>
            <button type="button" onClick={onRemoveCode} aria-label="Code hatayein" className="flex h-7 w-7 items-center justify-center rounded-lg text-violet-700 hover:bg-violet-100"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void apply(); }}>
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/\s+/g, '')); setError(''); }} placeholder="EID2026"
              onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
              className={cn('h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 font-mono font-bold tracking-wider outline-none focus:ring-2 focus:ring-brand-500/20', error ? 'border-rose-400' : 'border-slate-200 focus:border-brand-500')} />
            <button type="submit" disabled={!code || busy} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[0.875rem] font-semibold text-white disabled:opacity-40">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Lagayein
            </button>
          </form>
        )}
        {error && <p className="mt-1 text-[0.75rem] font-medium text-rose-600">{error}</p>}
      </div>
      {loyalty.on && (
        <div>
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-500"><Award className="h-3.5 w-3.5" />{customerName ?? 'Customer'} ke points: <strong className="text-slate-800">{loyalty.available}</strong> ({formatPKR(loyalty.available * loyalty.rate)})</p>
          {loyalty.max <= 0 ? <p className="text-[0.8125rem] text-slate-500">Is bill par points istemal nahi ho sakte</p> : (
            <>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={loyalty.max} value={Math.min(loyalty.wanted, loyalty.max)} onChange={(e) => loyalty.setWanted(Number(e.target.value))} className="flex-1 accent-[rgb(var(--brand-600))]" />
                <button type="button" onClick={() => loyalty.setWanted(loyalty.max)} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">Sab ({loyalty.max})</button>
              </div>
              <p className="mt-1 text-[0.8125rem]">
                {loyalty.used > 0 ? <><strong className="tabular-nums">{loyalty.used}</strong> points = <strong className="tabular-nums text-violet-700">−{formatPKR(loyaltyDiscount)}</strong></>
                  : loyalty.wanted > 0 && loyalty.min > 0 ? <span className="text-amber-700">Kam se kam {loyalty.min} points istemal hote hain</span>
                    : <span className="text-slate-500">Points istemal nahi ho rahe</span>}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
