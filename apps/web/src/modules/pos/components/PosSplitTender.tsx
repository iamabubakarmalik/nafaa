/**
 * Split payment rows for the checkout: one row per method (cash + card,
 * cash + JazzCash, a trade-in phone or old part …). The keypad types into the row in
 * focus; change can only come from cash.
 */

import { useEffect } from 'react';
import { Delete, Plus, Repeat, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { SalePaymentPart, TenderMethod } from '@modules/sales/sales/api/sales.api';
import { PAYMENT_LABELS } from '@modules/sales/receipt/fromSale';
import { POS_PAYMENT_METHODS } from '../lib/posCart';
import { t as tr } from '@core/i18n';

/** Goods taken toward the bill (a used phone, an old part), offered as a trade-in part. */
export interface PosTradeIn {
  code: string;
  label: string;
  value: number;
}

export interface SplitRow {
  method: TenderMethod;
  amount: string;
  reference?: string;
  note?: string;
}

const TRADE_IN_OPTION = { id: 'TRADE_IN' as const, label: tr('Trade-in'), icon: Repeat, color: '#a16207' };
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];
const MAX_ROWS = 5;

const amountOf = (r: SplitRow) => Number(r.amount) || 0;

/** Totals of the rows against the bill, and what stops it from going through. */
export function splitSummary(rows: SplitRow[], total: number) {
  const paid = rows.reduce((s, r) => s + amountOf(r), 0);
  const cash = rows.filter((r) => r.method === 'CASH').reduce((s, r) => s + amountOf(r), 0);
  const change = Math.max(paid - total, 0);
  const remaining = Math.max(total - paid, 0);
  const problem = change > cash + 0.005
    ? tr('Change sirf Cash se di ja sakti hai — card, wallet ya trade-in ki amount bill se zyada na likhein')
    : rows.some((r) => r.method === 'TRADE_IN' && amountOf(r) > 0 && !r.reference)
      ? tr('Trade-in ke liye cheez chunein')
      : null;
  return { paid, cash, change, remaining, problem };
}

/** Rows with an amount, as the sale API takes them. */
export function splitParts(rows: SplitRow[]): SalePaymentPart[] {
  return rows.filter((r) => amountOf(r) > 0).map((r) => ({
    method: r.method, amount: amountOf(r),
    ...(r.reference && { reference: r.reference }),
    ...(r.note && { note: r.note }),
  }));
}

/** Receipt lines of a split payment as handed over; nothing for a bill paid one way. */
export function splitReceiptLines(parts?: SalePaymentPart[]) {
  if (!parts?.length || (parts.length === 1 && parts[0].method !== 'TRADE_IN')) return undefined;
  return parts.map((p) => ({ label: `${PAYMENT_LABELS[p.method] ?? p.method}${p.note ? ` (${p.note})` : ''}`, amount: p.amount }));
}

export function PosSplitTender({ total, rows, onRows, active, onActive, tradeIns }: {
  total: number;
  rows: SplitRow[];
  onRows: (rows: SplitRow[]) => void;
  active: number;
  onActive: (i: number) => void;
  /** Open trade-ins; when given, Trade-in is one of the methods. */
  tradeIns?: PosTradeIn[];
}) {
  const s = splitSummary(rows, total);
  // The highlighted line's amount box takes the typing.
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-split-amount="${active}"]`);
      if (el && document.activeElement !== el) { el.focus(); el.select(); }
    }, 0);
    return () => clearTimeout(t);
  }, [active, rows.length]);
  const options = [...POS_PAYMENT_METHODS, ...(tradeIns ? [TRADE_IN_OPTION] : [])];
  const usedCodes = new Set(rows.map((r) => r.reference).filter(Boolean));

  const update = (i: number, patch: Partial<SplitRow>) => onRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setMethod = (i: number, method: TenderMethod) =>
    update(i, method === 'TRADE_IN' ? { method, amount: '', reference: undefined, note: undefined } : { method, reference: undefined, note: undefined });
  const pickTradeIn = (i: number, code: string) => {
    const t = tradeIns?.find((x) => x.code === code);
    update(i, t ? { reference: t.code, note: t.label, amount: String(t.value) } : { reference: undefined, note: undefined, amount: '' });
  };
  const add = () => {
    if (rows.length >= MAX_ROWS) return;
    const unused = POS_PAYMENT_METHODS.find((m) => !rows.some((r) => r.method === m.id))?.id ?? 'CASH';
    onRows([...rows, { method: unused, amount: s.remaining > 0 ? String(Number(s.remaining.toFixed(2))) : '' }]);
    onActive(rows.length);
  };
  const remove = (i: number) => {
    if (rows.length <= 1) return;
    onRows(rows.filter((_, j) => j !== i));
    onActive(Math.max(0, Math.min(active, rows.length - 2)));
  };
  const press = (k: string) => {
    const r = rows[active];
    if (!r || r.method === 'TRADE_IN') return;
    const v = r.amount;
    update(active, { amount: k === '⌫' ? v.slice(0, -1) : (v === '0' ? k : v + k).slice(0, 9) });
  };
  const fillRest = () => {
    const r = rows[active];
    if (!r || r.method === 'TRADE_IN') return;
    const rest = total - (s.paid - amountOf(r));
    update(active, { amount: rest > 0 ? String(Number(rest.toFixed(2))) : '' });
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const on = i === active;
          const opt = options.find((o) => o.id === r.method);
          return (
            <li key={i} onClick={() => onActive(i)}
              className={cn('rounded-xl p-2 ring-1 transition', on ? 'bg-white ring-2 ring-brand-500' : 'bg-slate-50 ring-slate-200')}>
              <div className="flex items-center gap-2">
                <select value={r.method} onChange={(e) => setMethod(i, e.target.value as TenderMethod)} aria-label={tr('Tareeqa')}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-semibold"
                  style={{ color: opt?.color }}>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <input inputMode="decimal" value={r.amount} aria-label={tr('Amount')} placeholder="0" data-split-amount={i}
                  readOnly={r.method === 'TRADE_IN'} onFocus={() => onActive(i)}
                  onChange={(e) => update(i, { amount: e.target.value.replace(/[^\d.]/g, '') })}
                  onKeyDown={(e) => {
                    // Enter with money still due moves to the next line (filled with what is left); otherwise checkout completes.
                    if (e.key !== 'Enter' || s.remaining <= 0.005) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const rest = String(Number(s.remaining.toFixed(2)));
                    if (i + 1 < rows.length) {
                      if (!amountOf(rows[i + 1])) onRows(rows.map((r, j) => (j === i + 1 ? { ...r, amount: rest } : r)));
                      onActive(i + 1);
                    } else add();
                  }}
                  className="h-10 w-28 rounded-lg border border-slate-200 bg-white px-2 text-end text-base font-bold tabular-nums outline-none focus:border-brand-500" />
                <button type="button" onClick={(e) => { e.stopPropagation(); remove(i); }} disabled={rows.length <= 1} aria-label={tr('Hatayein')}
                  className="flex h-10 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-30">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {r.method === 'TRADE_IN' && (
                <select value={r.reference ?? ''} onChange={(e) => pickTradeIn(i, e.target.value)} aria-label={tr('Trade-in')}
                  className="mt-2 h-10 w-full rounded-lg border border-amber-300 bg-amber-50 px-2 text-[0.8125rem]">
                  <option value="">{tradeIns?.length ? tr('Trade-in chunein…') : tr('Koi trade-in nahi mila')}</option>
                  {tradeIns?.filter((t) => t.code === r.reference || !usedCodes.has(t.code)).map((t) => (
                    <option key={t.code} value={t.code}>{t.label} · {formatPKR(t.value)}</option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={add} disabled={rows.length >= MAX_ROWS} data-split-add
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-[0.8125rem] font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-40">
        <Plus className="h-4 w-4" /> {' '}{tr('Aur tareeqa')}{' '} <kbd className="rounded bg-slate-100 px-1 font-mono text-[0.625rem] text-slate-500">Alt A</kbd>
      </button>
      <p className="text-center text-[0.6875rem] text-slate-500">{tr('F1 Cash · F3 JazzCash · F4 Easypaisa · F5 Card · F7 Bank — chuni hui line ka tareeqa badlein')}</p>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2"><dt className="text-[0.6875rem] text-slate-500">{tr('Mila')}</dt><dd className="font-bold tabular-nums text-slate-900">{formatPKR(s.paid)}</dd></div>
        <div className={cn('rounded-xl px-2 py-2', s.remaining > 0 ? 'bg-amber-50' : 'bg-slate-50')}><dt className="text-[0.6875rem] text-slate-500">{tr('Baqi')}</dt><dd className={cn('font-bold tabular-nums', s.remaining > 0 ? 'text-amber-700' : 'text-slate-400')}>{formatPKR(s.remaining)}</dd></div>
        <div className={cn('rounded-xl px-2 py-2', s.change > 0 ? 'bg-success-50' : 'bg-slate-50')}><dt className="text-[0.6875rem] text-slate-500">{tr('Wapas (cash)')}</dt><dd className={cn('font-bold tabular-nums', s.change > 0 ? 'text-success-700' : 'text-slate-400')}>{formatPKR(s.change)}</dd></div>
      </dl>
      {s.problem && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.75rem] font-medium text-rose-700">{s.problem}</p>}

      <div className="grid grid-cols-3 gap-1.5">
        {PAD.map((k) => (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? tr('Mitayein') : k}
            className="flex h-11 items-center justify-center rounded-xl bg-slate-50 text-lg font-semibold tabular-nums text-slate-900 ring-1 ring-slate-200 transition hover:bg-white active:bg-slate-100">
            {k === '⌫' ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
      </div>
      <button type="button" onClick={fillRest}
        className="h-10 w-full rounded-xl bg-brand-50 text-[0.8125rem] font-semibold text-brand-800 transition hover:bg-brand-100">
        {tr('Baqi is line me daalein')}
      </button>
    </div>
  );
}
