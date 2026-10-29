/**
 * Landed cost (import cost) entry: freight, customs/duty, clearing agent,
 * local transport and others, in Rs or a foreign currency with its rate,
 * spread over the lines by value, quantity or weight. Used on the purchase
 * editor and in "Landed cost jorein" on a purchase. The per-unit preview uses
 * the same split as the API (purchases/landed-cost.ts); the API's figure is
 * the one saved.
 */

import { Plus, Trash2 } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { LandedCostPayload, LandedKind, LandedMethod } from '../api/purchases.api';

export interface LandedDraft {
  key: string;
  kind: LandedKind;
  label: string;
  /** PKR, or a foreign currency code. */
  currency: string;
  /** Rs, or the foreign amount. */
  amount: number;
  /** Rs for one unit of the currency. */
  rate: number;
}

export interface LandedLine { id: string; name: string; value: number; qty: number; unit: string; weightKg: number | null }

export const LANDED_KINDS: Array<{ id: LandedKind; label: string }> = [
  { id: 'FREIGHT', label: 'Freight (shipping / cargo)' },
  { id: 'CUSTOMS', label: 'Customs / duty' },
  { id: 'CLEARING', label: 'Clearing agent' },
  { id: 'TRANSPORT', label: 'Local transport' },
  { id: 'OTHER', label: 'Doosra' },
];
export const kindLabel = (k: LandedKind) => LANDED_KINDS.find((x) => x.id === k)?.label ?? k;
const CURRENCIES = ['PKR', 'USD', 'CNY', 'AED', 'EUR', 'GBP'];
export const METHODS: Array<{ value: LandedMethod; label: string }> = [
  { value: 'VALUE', label: 'Value se' }, { value: 'QTY', label: 'Quantity se' }, { value: 'WEIGHT', label: 'Wazan se' },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
export const newLanded = (): LandedDraft => ({ key: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, kind: 'FREIGHT', label: '', currency: 'PKR', amount: 0, rate: 0 });
export const landedRs = (c: LandedDraft) => (c.currency === 'PKR' ? c.amount : r2(c.amount * c.rate));
export const landedTotal = (list: LandedDraft[]) => r2(list.reduce((s, c) => s + landedRs(c), 0));

export const toPayload = (list: LandedDraft[]): LandedCostPayload[] => list.filter((c) => landedRs(c) > 0).map((c) => (c.currency === 'PKR'
  ? { kind: c.kind, label: c.label.trim() || undefined, amount: c.amount }
  : { kind: c.kind, label: c.label.trim() || undefined, currency: c.currency, foreignAmount: c.amount, exchangeRate: c.rate }));

/** Splits `total` over the lines like the API: by the basis, paisa remainder on the biggest line. */
export function allocateLanded(lines: LandedLine[], total: number, method: LandedMethod): Map<string, number> {
  const out = new Map(lines.map((l) => [l.id, 0]));
  if (!(total > 0) || !lines.length) return out;
  const basisOf = (m: LandedMethod) => (l: LandedLine) => Math.max(0, m === 'QTY' ? l.qty : m === 'WEIGHT' ? Number(l.weightKg) || 0 : l.value);
  let basis = lines.map(basisOf(method));
  if (!basis.some((b) => b > 0)) basis = lines.map(basisOf('VALUE'));
  if (!basis.some((b) => b > 0)) basis = lines.map(() => 1);
  const sum = basis.reduce((s, b) => s + b, 0);
  let given = 0; let big = 0;
  lines.forEach((l, i) => { const part = r2((total * basis[i]) / sum); out.set(l.id, part); given += part; if (basis[i] > basis[big]) big = i; });
  const left = r2(total - given);
  if (left) out.set(lines[big].id, r2(out.get(lines[big].id)! + left));
  return out;
}

const field = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export function LandedCostEditor({ costs, onCosts, method, onMethod, lines, onWeight }: {
  costs: LandedDraft[]; onCosts: (c: LandedDraft[]) => void; method: LandedMethod; onMethod: (m: LandedMethod) => void;
  lines: LandedLine[]; onWeight: (lineId: string, kg: number | null) => void;
}) {
  const total = landedTotal(costs);
  const shares = allocateLanded(lines, total, method);
  const patch = (key: string, p: Partial<LandedDraft>) => onCosts(costs.map((c) => (c.key === key ? { ...c, ...p } : c)));
  const noWeight = method === 'WEIGHT' && lines.some((l) => !(Number(l.weightKg) > 0));
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {costs.map((c) => (
          <li key={c.key} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
            <div className="flex gap-2">
              <select value={c.kind} onChange={(e) => patch(c.key, { kind: e.target.value as LandedKind })} aria-label="Cost ki type" className={cn(field, 'min-w-0 flex-1')}>
                {LANDED_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
              <button type="button" onClick={() => onCosts(costs.filter((x) => x.key !== c.key))} aria-label="Hatayein"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
              <select value={c.currency} onChange={(e) => patch(c.key, { currency: e.target.value })} aria-label="Currency" className={field}>
                {CURRENCIES.map((x) => <option key={x} value={x}>{x === 'PKR' ? 'Rs' : x}</option>)}
              </select>
              <input inputMode="decimal" value={c.amount || ''} placeholder="Amount" aria-label="Amount"
                onChange={(e) => patch(c.key, { amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className={cn(field, 'text-right tabular-nums')} />
            </div>
            {c.currency !== 'PKR' && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem] text-slate-600">
                <span>1 {c.currency} =</span>
                <input inputMode="decimal" value={c.rate || ''} placeholder="Rate" aria-label={`${c.currency} ka rate`}
                  onChange={(e) => patch(c.key, { rate: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className={cn(field, 'w-24 text-right tabular-nums')} />
                <span>Rs</span>
                <span className="ml-auto font-semibold text-slate-900">{c.rate > 0 ? formatPKR(landedRs(c)) : 'Rate likhein'}</span>
              </div>
            )}
            <input value={c.label} onChange={(e) => patch(c.key, { label: e.target.value })} maxLength={80} placeholder="Note (agar ho) — maslan GD number, agent ka naam"
              className={cn(field, 'mt-2')} />
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onCosts([...costs, newLanded()])}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
        <Plus className="h-4 w-4" /> Aur cost jorein
      </button>

      {total > 0 && lines.length > 0 && (
        <div className="rounded-xl ring-1 ring-slate-200">
          <div className="space-y-2 border-b border-slate-100 px-3 py-2">
            <span className="block text-[0.8125rem] font-semibold text-slate-900">{formatPKR(total)} kaise baantein</span>
            <Segmented label="Baantne ka tareeqa" value={method} onChange={onMethod} items={METHODS} className="w-full [&>button]:flex-1 [&>button]:px-1.5" />
          </div>
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {lines.map((l) => {
              const share = shares.get(l.id) ?? 0;
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="w-full truncate font-medium text-slate-800">{l.name}</span>
                  {method === 'WEIGHT' && (
                    <label className="flex items-center gap-1 text-[0.75rem] text-slate-500">
                      <input inputMode="decimal" value={l.weightKg ?? ''} placeholder="kg" aria-label={`${l.name} ka wazan`}
                        onChange={(e) => onWeight(l.id, e.target.value === '' ? null : Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                        className={cn(field, 'h-8 w-20 text-right tabular-nums', !(Number(l.weightKg) > 0) && 'border-amber-400')} /> kg
                    </label>
                  )}
                  <span className="ml-auto tabular-nums text-slate-600">{formatPKR(share)}</span>
                  <span className="text-right text-[0.75rem] font-semibold tabular-nums text-brand-700">{l.qty > 0 ? `+${formatPKR(share / l.qty)} / ${l.unit}` : '—'}</span>
                </li>
              );
            })}
          </ul>
          {noWeight && <p className="border-t border-slate-100 px-3 py-2 text-[0.75rem] text-amber-700">Jin lines ka wazan nahi, un par is tareeqe se kuch nahi lagega.</p>}
        </div>
      )}
      <p className="text-[0.75rem] leading-snug text-slate-500">
        Ye costs supplier ke bill ya khate me nahi jati, aur Expenses me bhi nahi. Ye maal ki Cost me jur jati hain, is liye bikne par Profit me khud aa jati hain.
      </p>
    </div>
  );
}
