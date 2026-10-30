/**
 * Checkout: full payment, part payment with the rest on credit, or full
 * credit. The cashier can type what the customer handed over to see the
 * change; extra money can be kept as an advance in the customer's khata.
 * Split payment takes the bill by several methods (cash + card …, or a
 * trade-in phone where the shop offers it).
 *
 * Keys: type the amount · Enter confirm · Tab next field · F1/F3/F4/F5/F7
 * payment method (in a split: the highlighted line's method) · F6 full
 * credit · Alt+S split on/off · Alt+A one more split line.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Calculator, Check, Delete, Split, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PaymentMethod, SalePaymentPart } from '@modules/sales/sales/api/sales.api';
import { PayQrPanel } from '@core/payments/PayQrPanel';
import { POS_PAYMENT_METHODS, type PosCheckoutMode } from '../lib/posCart';
import type { PosReceiverValue } from './PosReceiverField';
import { PosSplitTender, splitParts, splitSummary, type PosTradeIn, type SplitRow } from './PosSplitTender';
import { t } from '@core/i18n';

export interface PosCheckoutResult {
  paymentMethod: PaymentMethod;
  /** Amount recorded on the sale. Above the total means change was given. */
  paidAmount: number;
  isCredit: boolean;
  /** Keep the extra (paid − total) in the customer's khata instead of giving change. */
  depositExtra: boolean;
  /** Split payment: what was handed over by each method (adds up to paidAmount). */
  payments?: SalePaymentPart[];
}

const MODES: Array<{ id: PosCheckoutMode; label: string; hint: string; icon: typeof Wallet }> = [
  { id: 'full', label: t('Pura paisa'), hint: t('Abhi poora'), icon: Wallet },
  { id: 'partial', label: t('Kuch paisa'), hint: t('Baqi udhaar'), icon: Calculator },
  { id: 'credit', label: t('Udhaar'), hint: t('Khate mein'), icon: BookOpen },
];

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

/** Quick cash buttons in the colours of the Pakistani notes. */
const NOTES = [
  { v: 100, from: '#dc2626', to: '#991b1b' },
  { v: 500, from: '#15803d', to: '#14532d' },
  { v: 1000, from: '#2563eb', to: '#1e3a8a' },
  { v: 5000, from: '#b45309', to: '#78350f' },
];

export function PosCheckoutModal({
  total, itemCount, loading, customerName, customerBalance = 0, hasCustomer,
  initMode, initAmount, initMethod = 'CASH', initSplit, receiver, allowCredit = true, allowSplit = true, tradeIns, onCreditChange, notice, onConfirm, onClose,
}: {
  total: number;
  itemCount: number;
  loading?: boolean;
  customerName?: string;
  customerBalance?: number;
  hasCustomer?: boolean;
  initMode: PosCheckoutMode;
  initAmount?: number;
  /** Payment method selected when the dialog opens. */
  initMethod?: PaymentMethod;
  /** Open straight in split payment. */
  initSplit?: boolean;
  customerId?: string;
  receiver?: PosReceiverValue;
  /** Settings can switch credit off; then the bill must be paid in full. */
  allowCredit?: boolean;
  /** Open trade-in phones (mobile shops); offered as a part of a split payment. */
  tradeIns?: PosTradeIn[];
  /** False where the bill is saved by an endpoint that keeps one method only. */
  allowSplit?: boolean;
  onReceiverChange?: (v: PosReceiverValue) => void;
  /** Told whether part of the bill goes on udhaar, so the counter can switch to the credit price. */
  onCreditChange?: (onCredit: boolean) => void;
  /** Short message at the top (e.g. the credit price was applied). */
  notice?: string;
  onConfirm: (d: PosCheckoutResult) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(initMethod);
  const [mode, setMode] = useState<PosCheckoutMode>(initMode);
  /** What the customer handed over; empty in full mode means exactly the total. */
  const [tendered, setTendered] = useState(initAmount ? String(initAmount) : '');
  const [deposit, setDeposit] = useState(false);
  const [split, setSplit] = useState(false);
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const splitting = split && mode !== 'credit';
  const sum = splitSummary(rows, total);
  const entered = Number(tendered) || 0;
  const paid = mode === 'credit' ? 0 : splitting ? sum.paid : mode === 'full' ? Math.max(entered, total) : entered;
  const change = Math.max(paid - total, 0);
  const credit = Math.max(total - paid, 0);
  const isCredit = credit > 0;
  // A split in full mode must cover the bill; what is left is asked for, not put on credit.
  const short = splitting && mode === 'full' && credit > 0.005;
  const blocked = isCredit && !short && (!hasCustomer || !allowCredit);
  // Credit is judged on the choice the cashier made (udhaar or part payment), not the moving total.
  const onUdhaar = mode === 'credit' || (mode === 'partial' && isCredit);
  useEffect(() => { onCreditChange?.(onUdhaar && !blocked); }, [onUdhaar, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSplit = () => {
    // With an amount typed, it becomes the first part and the rest goes to the second;
    // otherwise both start empty and the cashier types the first part.
    const second: PaymentMethod = method === 'CASH' ? 'CARD' : 'CASH';
    if (entered > 0 && entered < total) {
      setRows([{ method, amount: String(Number(entered.toFixed(2))) }, { method: second, amount: String(Number((total - entered).toFixed(2))) }]);
      setActive(1);
    } else {
      setRows([{ method, amount: '' }, { method: second, amount: '' }]);
      setActive(0);
    }
    setDeposit(false);
    setSplit(true);
  };

  const choose = (m: PosCheckoutMode) => {
    setMode(m);
    if (m === 'credit') setTendered('');
    if (m === 'partial') { setTendered(''); setTimeout(() => inputRef.current?.focus(), 0); }
  };

  const submit = useCallback(() => {
    if (loading) return;
    if (splitting) {
      if (sum.problem) { toast.error(sum.problem); return; }
      if (mode === 'full' && sum.remaining > 0.005) { toast.error(t('{{remaining}} baqi hai — aur payment daalein ya "Kuch paisa" chunein', { remaining: formatPKR(sum.remaining) })); return; }
    }
    if (blocked) { toast.error(allowCredit ? t('Udhaar ke liye pehle customer chunein') : t('Is dukaan me udhaar band hai — poora paisa lein')); return; }
    if (mode === 'partial' && paid <= 0) { toast.error(t('Kitna paisa mila, likhein')); inputRef.current?.focus(); return; }
    if (splitting) {
      const payments = splitParts(rows);
      // The largest money part stands for the bill.
      const main = payments.filter((p) => p.method !== 'TRADE_IN').sort((a, b) => b.amount - a.amount)[0]?.method as PaymentMethod | undefined;
      onConfirm({ paymentMethod: main ?? 'CASH', paidAmount: paid, isCredit, depositExtra: false, payments });
      return;
    }
    onConfirm({ paymentMethod: method, paidAmount: paid, isCredit, depositExtra: deposit && change > 0 && !!hasCustomer });
  }, [loading, splitting, sum.problem, sum.remaining, mode, blocked, allowCredit, paid, rows, onConfirm, isCredit, method, deposit, change, hasCustomer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); submit(); return; }
      const m = POS_PAYMENT_METHODS.find((x) => x.key === e.key);
      if (m && splitting) {
        e.preventDefault();
        setRows((rs) => rs.map((r, j) => (j === active ? { ...r, method: m.id, reference: undefined, note: undefined } : r)));
        return;
      }
      if (m) { e.preventDefault(); setMethod(m.id); if (mode === 'credit') setMode('full'); return; }
      if (e.key === 'F6') { e.preventDefault(); if (hasCustomer && allowCredit) choose('credit'); return; }
      const code = e.code;
      if (e.altKey && code === 'KeyS' && allowSplit && mode !== 'credit') { e.preventDefault(); if (splitting) setSplit(false); else startSplit(); return; }
      if (e.altKey && code === 'KeyA' && splitting) { e.preventDefault(); document.querySelector<HTMLButtonElement>('[data-split-add]')?.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, hasCustomer, mode, splitting, active, allowSplit, entered, method, total]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (initSplit && allowSplit && initMode !== 'credit') startSplit(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Typing goes straight into the amount box; back there after leaving split.
  useEffect(() => { if (!splitting && mode !== 'credit') setTimeout(() => inputRef.current?.focus(), 0); }, [splitting, mode]);

  const press = (k: string) => {
    if (mode === 'credit') setMode('full');
    setTendered((v) => (k === '⌫' ? v.slice(0, -1) : (v === '0' ? k : v + k).slice(0, 9)));
  };
  const addNote = (n: number) => { if (mode === 'credit') setMode('full'); setTendered((v) => String((Number(v) || 0) + n)); };
  const roundUp = Math.ceil(total / 100) * 100;

  const action = loading ? t('Save ho raha hai…')
    : short ? t('{{credit}} baqi — aur payment daalein', { credit: formatPKR(credit) })
    : mode === 'credit' ? t('Udhaar mein daalein · {{total}}', { total: formatPKR(total) })
      : isCredit ? t('{{paid}} mile · {{credit}} udhaar', { paid: formatPKR(paid), credit: formatPKR(credit) })
        : change > 0 ? t('Bill complete · {{change}} wapas', { change: formatPKR(change) }) : t('Bill complete · {{total}}', { total: formatPKR(total) });

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[0.8125rem] font-medium text-slate-500">{t('Kul bill')}</span>
          <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">{formatPKR(total)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-600">{t('{{itemCount}} cheezein', { itemCount })}</span>
        </span>
      }
      description={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> {hasCustomer && customerName ? customerName : t('Walk-in customer')}
          {customerBalance > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">{t('pichhla udhaar {{customerBalance}}', { customerBalance: formatPKR(customerBalance) })}</span>}
        </span>
      }
      footer={
        <div className="flex w-full flex-col gap-2">
          {blocked && (
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4" /> {' '}{t('Udhaar ke liye bill mein customer chunein')}
            </p>
          )}
          <button type="button" onClick={submit} disabled={loading || blocked}
            className={cn('flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[1.0625rem] font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
              isCredit ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25' : 'bg-gradient-to-r from-brand-600 to-brand-700 shadow-brand-600/25')}>
            {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-5 w-5" />} {action}
            <kbd className="ms-2 hidden rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[0.6875rem] sm:inline">Enter</kbd>
          </button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Kaise')}</h3>
            <div role="radiogroup" aria-label={t('Kaise')} className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
              {MODES.map((m) => {
                const on = mode === m.id;
                const creditOff = m.id !== 'full' && !allowCredit;
                const disabled = creditOff || (m.id === 'credit' && !hasCustomer);
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => choose(m.id)}
                    title={creditOff ? t('Udhaar Settings me band hai') : disabled ? t('Pehle customer chunein') : m.hint}
                    className={cn('flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition disabled:cursor-not-allowed disabled:opacity-40',
                      on ? 'bg-white shadow-sm' : 'hover:bg-white/60')}>
                    <m.icon className={cn('h-4 w-4', on ? (m.id === 'full' ? 'text-brand-600' : 'text-amber-600') : 'text-slate-400')} />
                    <span className={cn('text-[0.8125rem] font-semibold', on ? 'text-slate-900' : 'text-slate-600')}>{m.label}</span>
                    <span className="text-[0.6875rem] text-slate-400">{creditOff ? t('Band hai') : disabled ? t('Customer chahiye') : m.hint}</span>
                  </button>
                );
              })}
            </div>
            {notice && (
              <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.8125rem] font-medium text-amber-900 ring-1 ring-amber-200">
                <BookOpen className="h-4 w-4 shrink-0" /> {notice}
              </p>
            )}
          </section>

          {mode !== 'credit' && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Payment')}</h3>
                {allowSplit && <button type="button" onClick={() => (splitting ? setSplit(false) : startSplit())}
                  className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold transition',
                    splitting ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
                  <Split className="h-3.5 w-3.5" /> {splitting ? t('Ek tareeqa') : tradeIns ? t('Split / Trade-in') : t('Split payment')}
                  <kbd className="rounded bg-black/10 px-1 font-mono text-[0.5625rem]">Alt S</kbd>
                </button>}
              </div>
              {splitting ? (
                <p className="rounded-xl bg-brand-50 px-3 py-2 text-[0.75rem] text-brand-900">
                  {t('Bill do ya zyada tareeqon se — jaise kuch Cash aur baqi Card. Change sirf Cash se milti hai.')}
                </p>
              ) : (
              <div role="radiogroup" aria-label={t('Payment method')} className="grid grid-cols-3 gap-2">
                {POS_PAYMENT_METHODS.map((m) => {
                  const on = method === m.id;
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
                      className={cn('group relative flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-start transition',
                        on ? 'border-transparent text-white shadow-md' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300')}
                      style={on ? { backgroundColor: m.color, boxShadow: `0 6px 16px -6px ${m.color}` } : undefined}>
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', on ? 'bg-white/20' : '')}
                        style={on ? undefined : { backgroundColor: `${m.color}17`, color: m.color }}>
                        <m.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate text-[0.8125rem] font-semibold">{m.label}</span>
                      <span className={cn('absolute end-1.5 top-1 hidden text-[0.5625rem] font-medium sm:block', on ? 'text-white/70' : 'text-slate-300')}>{m.key}</span>
                    </button>
                  );
                })}
              </div>
              )}
            </section>
          )}

          {mode !== 'credit' && !splitting && method !== 'CASH' && method !== 'CARD' && paid > 0 && (
            <PayQrPanel method={method} amount={Math.min(paid, total)} />
          )}

          {isCredit && hasCustomer && receiver && !receiver.name.trim() && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900">
              {t('Udhaar ja raha hai. Maal koi aur le ja raha ho to bill mein “maal kis ne liya” likh dein.')}
            </p>
          )}

          <section className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <dl className="divide-y divide-slate-100 text-[0.875rem]">
              <div className="flex justify-between px-4 py-2.5"><dt className="text-slate-500">{t('Bill')}</dt><dd className="font-semibold tabular-nums text-slate-900">{formatPKR(total)}</dd></div>
              {mode !== 'credit' && <div className="flex justify-between px-4 py-2.5"><dt className="text-slate-500">{t('Mila')}</dt><dd className="font-semibold tabular-nums text-slate-900">{formatPKR(paid)}</dd></div>}
              {change > 0 && (
                <div className="flex items-center justify-between bg-success-50 px-4 py-3">
                  <dt className="font-medium text-success-800">{deposit && hasCustomer ? t('Khate mein advance') : t('Wapas dein')}</dt>
                  <dd className="text-2xl font-bold tabular-nums text-success-700">{formatPKR(change)}</dd>
                </div>
              )}
              {credit > 0 && (
                <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
                  <dt className="font-medium text-amber-800">{t('Udhaar')}</dt>
                  <dd className="text-2xl font-bold tabular-nums text-amber-700">{formatPKR(credit)}</dd>
                </div>
              )}
            </dl>
            {change > 0 && hasCustomer && !splitting && (
              <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-700">
                <input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand-600))]" />
                {t('Wapas dene ki jagah {{value}} ke khate mein jama karein', { value: customerName ?? 'customer' })}
              </label>
            )}
          </section>
        </div>

        {splitting ? (
          <PosSplitTender total={total} rows={rows} onRows={setRows} active={active} onActive={setActive} tradeIns={tradeIns} />
        ) : mode !== 'credit' ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-end shadow-inner">
              <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">
                {mode === 'partial' ? t('Kitna paisa mila') : t('Customer ne diya')}
              </div>
              <input
                ref={inputRef}
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={mode === 'full' ? String(total) : '0'}
                aria-label={t('Mila hua paisa')}
                data-autofocus
                className="w-full bg-transparent text-end text-4xl font-bold tabular-nums tracking-tight text-white outline-none placeholder:text-slate-600"
              />
              <div className="mt-0.5 h-4 text-[0.75rem] font-medium tabular-nums text-emerald-400">
                {change > 0 ? t('{{change}} wapas', { change: formatPKR(change) }) : credit > 0 && mode === 'partial' && entered > 0 ? t('{{credit}} baqi', { credit: formatPKR(credit) }) : ''}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {NOTES.map((n) => (
                <button key={n.v} type="button" onClick={() => addNote(n.v)}
                  className="relative overflow-hidden rounded-xl py-2.5 text-[0.8125rem] font-bold tabular-nums text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: `linear-gradient(135deg, ${n.from}, ${n.to})` }}>
                  <span className="absolute -end-2 -top-2 h-8 w-8 rounded-full bg-white/15" aria-hidden />
                  +{n.v.toLocaleString('en-PK')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setTendered(String(total))}
                className="h-10 rounded-xl bg-brand-50 text-[0.8125rem] font-semibold text-brand-800 transition hover:bg-brand-100">{t('Bilkul {{total}}', { total: formatPKR(total) })}</button>
              <button type="button" onClick={() => setTendered(String(roundUp))}
                className="h-10 rounded-xl bg-slate-100 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-200">{formatPKR(roundUp)}</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PAD.map((k) => (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? t('Mitayein') : k}
                  className="flex h-12 items-center justify-center rounded-xl bg-slate-50 text-xl font-semibold tabular-nums text-slate-900 ring-1 ring-slate-200 transition hover:bg-white active:bg-slate-100">
                  {k === '⌫' ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>
            {tendered && <button type="button" onClick={() => setTendered('')} className="w-full text-center text-[0.75rem] font-medium text-slate-500 hover:text-slate-800">{t('Saaf karein')}</button>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 p-6 text-center">
            <BookOpen className="h-10 w-10 text-amber-600" />
            <p className="mt-3 text-[0.9375rem] font-semibold text-amber-900">{t('Poora bill udhaar mein')}</p>
            <p className="mt-1 text-[0.8125rem] text-amber-800">{t('{{total}} {{customerName}} ke khate mein jayega. Bill par pichhla aur naya baqi dono chhapenge.', { total: formatPKR(total), customerName })}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default PosCheckoutModal;
