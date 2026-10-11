/**
 * Checkout: full payment, part payment with the rest on credit, or full
 * credit. The cashier can type what the customer handed over to see the
 * change; extra money can be kept as an advance in the customer's khata.
 *
 * Keys: Enter confirm · F1/F3/F4/F5/F7 payment method · F6 full credit.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Calculator, Check, Delete, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { PayQrPanel } from '@core/payments/PayQrPanel';
import { POS_PAYMENT_METHODS, type PosCheckoutMode } from '../lib/posCart';
import type { PosReceiverValue } from './PosReceiverField';

export interface PosCheckoutResult {
  paymentMethod: PaymentMethod;
  /** Amount recorded on the sale. Above the total means change was given. */
  paidAmount: number;
  isCredit: boolean;
  /** Keep the extra (paid − total) in the customer's khata instead of giving change. */
  depositExtra: boolean;
}

const MODES: Array<{ id: PosCheckoutMode; label: string; hint: string; icon: typeof Wallet }> = [
  { id: 'full', label: 'Pura paisa', hint: 'Abhi poora', icon: Wallet },
  { id: 'partial', label: 'Kuch paisa', hint: 'Baqi udhaar', icon: Calculator },
  { id: 'credit', label: 'Udhaar', hint: 'Khate mein', icon: BookOpen },
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
  initMode, initAmount, initMethod = 'CASH', receiver, onConfirm, onClose,
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
  customerId?: string;
  receiver?: PosReceiverValue;
  onReceiverChange?: (v: PosReceiverValue) => void;
  onConfirm: (d: PosCheckoutResult) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(initMethod);
  const [mode, setMode] = useState<PosCheckoutMode>(initMode);
  /** What the customer handed over; empty in full mode means exactly the total. */
  const [tendered, setTendered] = useState(initAmount ? String(initAmount) : '');
  const [deposit, setDeposit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const entered = Number(tendered) || 0;
  const paid = mode === 'credit' ? 0 : mode === 'full' ? Math.max(entered, total) : entered;
  const change = Math.max(paid - total, 0);
  const credit = Math.max(total - paid, 0);
  const isCredit = credit > 0;
  const blocked = isCredit && !hasCustomer;

  const choose = (m: PosCheckoutMode) => {
    setMode(m);
    if (m === 'credit') setTendered('');
    if (m === 'partial') { setTendered(''); setTimeout(() => inputRef.current?.focus(), 0); }
  };

  const submit = useCallback(() => {
    if (loading) return;
    if (blocked) { toast.error('Udhaar ke liye pehle customer chunein'); return; }
    if (mode === 'partial' && entered <= 0) { toast.error('Kitna paisa mila, likhein'); inputRef.current?.focus(); return; }
    onConfirm({ paymentMethod: method, paidAmount: paid, isCredit, depositExtra: deposit && change > 0 && !!hasCustomer });
  }, [loading, blocked, mode, entered, onConfirm, method, paid, isCredit, deposit, change, hasCustomer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); submit(); return; }
      const m = POS_PAYMENT_METHODS.find((x) => x.key === e.key);
      if (m) { e.preventDefault(); setMethod(m.id); if (mode === 'credit') setMode('full'); return; }
      if (e.key === 'F6') { e.preventDefault(); if (hasCustomer) choose('credit'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, hasCustomer, mode]);

  const press = (k: string) => {
    if (mode === 'credit') setMode('full');
    setTendered((v) => (k === '⌫' ? v.slice(0, -1) : (v === '0' ? k : v + k).slice(0, 9)));
  };
  const addNote = (n: number) => { if (mode === 'credit') setMode('full'); setTendered((v) => String((Number(v) || 0) + n)); };
  const roundUp = Math.ceil(total / 100) * 100;

  const action = loading ? 'Save ho raha hai…'
    : mode === 'credit' ? `Udhaar mein daalein · ${formatPKR(total)}`
      : isCredit ? `${formatPKR(paid)} mile · ${formatPKR(credit)} udhaar`
        : change > 0 ? `Bill complete · ${formatPKR(change)} wapas` : `Bill complete · ${formatPKR(total)}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[0.8125rem] font-medium text-slate-500">Kul bill</span>
          <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">{formatPKR(total)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-600">{itemCount} cheezein</span>
        </span>
      }
      description={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> {hasCustomer && customerName ? customerName : 'Walk-in customer'}
          {customerBalance > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">pichhla udhaar {formatPKR(customerBalance)}</span>}
        </span>
      }
      footer={
        <div className="flex w-full flex-col gap-2">
          {blocked && (
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4" /> Udhaar ke liye bill mein customer chunein
            </p>
          )}
          <button type="button" onClick={submit} disabled={loading || blocked}
            className={cn('flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[1.0625rem] font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
              isCredit ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25' : 'bg-gradient-to-r from-brand-600 to-brand-700 shadow-brand-600/25')}>
            {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-5 w-5" />} {action}
            <kbd className="ml-2 hidden rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[0.6875rem] sm:inline">Enter</kbd>
          </button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kaise</h3>
            <div role="radiogroup" aria-label="Kaise" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
              {MODES.map((m) => {
                const on = mode === m.id;
                const disabled = m.id === 'credit' && !hasCustomer;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => choose(m.id)}
                    title={disabled ? 'Pehle customer chunein' : m.hint}
                    className={cn('flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition disabled:cursor-not-allowed disabled:opacity-40',
                      on ? 'bg-white shadow-sm' : 'hover:bg-white/60')}>
                    <m.icon className={cn('h-4 w-4', on ? (m.id === 'full' ? 'text-brand-600' : 'text-amber-600') : 'text-slate-400')} />
                    <span className={cn('text-[0.8125rem] font-semibold', on ? 'text-slate-900' : 'text-slate-600')}>{m.label}</span>
                    <span className="text-[0.6875rem] text-slate-400">{disabled ? 'Customer chahiye' : m.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {mode !== 'credit' && (
            <section>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Payment</h3>
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                {POS_PAYMENT_METHODS.map((m) => {
                  const on = method === m.id;
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
                      className={cn('group relative flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition',
                        on ? 'border-transparent text-white shadow-md' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300')}
                      style={on ? { backgroundColor: m.color, boxShadow: `0 6px 16px -6px ${m.color}` } : undefined}>
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', on ? 'bg-white/20' : '')}
                        style={on ? undefined : { backgroundColor: `${m.color}17`, color: m.color }}>
                        <m.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate text-[0.8125rem] font-semibold">{m.label}</span>
                      <span className={cn('absolute right-1.5 top-1 hidden text-[0.5625rem] font-medium sm:block', on ? 'text-white/70' : 'text-slate-300')}>{m.key}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {mode !== 'credit' && method !== 'CASH' && method !== 'CARD' && paid > 0 && (
            <PayQrPanel method={method} amount={Math.min(paid, total)} />
          )}

          {isCredit && hasCustomer && receiver && !receiver.name.trim() && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900">
              Udhaar ja raha hai. Maal koi aur le ja raha ho to bill mein “maal kis ne liya” likh dein.
            </p>
          )}

          <section className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <dl className="divide-y divide-slate-100 text-[0.875rem]">
              <div className="flex justify-between px-4 py-2.5"><dt className="text-slate-500">Bill</dt><dd className="font-semibold tabular-nums text-slate-900">{formatPKR(total)}</dd></div>
              {mode !== 'credit' && <div className="flex justify-between px-4 py-2.5"><dt className="text-slate-500">Mila</dt><dd className="font-semibold tabular-nums text-slate-900">{formatPKR(paid)}</dd></div>}
              {change > 0 && (
                <div className="flex items-center justify-between bg-success-50 px-4 py-3">
                  <dt className="font-medium text-success-800">{deposit && hasCustomer ? 'Khate mein advance' : 'Wapas dein'}</dt>
                  <dd className="text-2xl font-bold tabular-nums text-success-700">{formatPKR(change)}</dd>
                </div>
              )}
              {credit > 0 && (
                <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
                  <dt className="font-medium text-amber-800">Udhaar</dt>
                  <dd className="text-2xl font-bold tabular-nums text-amber-700">{formatPKR(credit)}</dd>
                </div>
              )}
            </dl>
            {change > 0 && hasCustomer && (
              <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-700">
                <input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand-600))]" />
                Wapas dene ki jagah {customerName ?? 'customer'} ke khate mein jama karein
              </label>
            )}
          </section>
        </div>

        {mode !== 'credit' ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right shadow-inner">
              <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">
                {mode === 'partial' ? 'Kitna paisa mila' : 'Customer ne diya'}
              </div>
              <input
                ref={inputRef}
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={mode === 'full' ? String(total) : '0'}
                aria-label="Mila hua paisa"
                data-autofocus={mode === 'partial' ? true : undefined}
                className="w-full bg-transparent text-right text-4xl font-bold tabular-nums tracking-tight text-white outline-none placeholder:text-slate-600"
              />
              <div className="mt-0.5 h-4 text-[0.75rem] font-medium tabular-nums text-emerald-400">
                {change > 0 ? `${formatPKR(change)} wapas` : credit > 0 && mode === 'partial' && entered > 0 ? `${formatPKR(credit)} baqi` : ''}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {NOTES.map((n) => (
                <button key={n.v} type="button" onClick={() => addNote(n.v)}
                  className="relative overflow-hidden rounded-xl py-2.5 text-[0.8125rem] font-bold tabular-nums text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: `linear-gradient(135deg, ${n.from}, ${n.to})` }}>
                  <span className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white/15" aria-hidden />
                  +{n.v.toLocaleString('en-PK')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setTendered(String(total))}
                className="h-10 rounded-xl bg-brand-50 text-[0.8125rem] font-semibold text-brand-800 transition hover:bg-brand-100">Bilkul {formatPKR(total)}</button>
              <button type="button" onClick={() => setTendered(String(roundUp))}
                className="h-10 rounded-xl bg-slate-100 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-200">{formatPKR(roundUp)}</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PAD.map((k) => (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? 'Mitayein' : k}
                  className="flex h-12 items-center justify-center rounded-xl bg-slate-50 text-xl font-semibold tabular-nums text-slate-900 ring-1 ring-slate-200 transition hover:bg-white active:bg-slate-100">
                  {k === '⌫' ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>
            {tendered && <button type="button" onClick={() => setTendered('')} className="w-full text-center text-[0.75rem] font-medium text-slate-500 hover:text-slate-800">Saaf karein</button>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 p-6 text-center">
            <BookOpen className="h-10 w-10 text-amber-600" />
            <p className="mt-3 text-[0.9375rem] font-semibold text-amber-900">Poora bill udhaar mein</p>
            <p className="mt-1 text-[0.8125rem] text-amber-800">{formatPKR(total)} {customerName} ke khate mein jayega. Bill par pichhla aur naya baqi dono chhapenge.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default PosCheckoutModal;
