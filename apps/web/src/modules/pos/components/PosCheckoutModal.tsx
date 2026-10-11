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
import { Button, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { PayQrPanel } from '@core/payments/PayQrPanel';
import { POS_PAYMENT_METHODS, POS_QUICK_AMOUNTS, type PosCheckoutMode } from '../lib/posCart';
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
  { id: 'full', label: 'Pura paisa', hint: 'Poora bill abhi', icon: Wallet },
  { id: 'partial', label: 'Kuch paisa', hint: 'Baqi udhaar', icon: Calculator },
  { id: 'credit', label: 'Pura udhaar', hint: 'Khate mein', icon: BookOpen },
];

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

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
      : isCredit ? `${formatPKR(paid)} li · ${formatPKR(credit)} udhaar`
        : change > 0 ? `Bill complete · ${formatPKR(change)} wapas` : `Bill complete · ${formatPKR(total)}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{formatPKR(total)}</span>
          <span className="text-[0.8125rem] font-normal text-slate-500">{itemCount} items</span>
        </span>
      }
      description={hasCustomer && customerName ? (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> {customerName}
          {customerBalance > 0 && <span className="font-medium text-amber-700">· pichhla udhaar {formatPKR(customerBalance)}</span>}
        </span>
      ) : 'Walk-in customer'}
      footer={
        <div className="flex w-full flex-col gap-2">
          {blocked && (
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4" /> Udhaar ke liye cart mein customer chunein
            </p>
          )}
          <Button size="xl" fullWidth onClick={submit} loading={loading} disabled={blocked}
            variant={isCredit ? 'secondary' : 'primary'}
            className={cn(isCredit && 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600')}>
            <Check className="h-5 w-5" /> {action}
          </Button>
          <p className="hidden text-center text-[0.6875rem] text-slate-400 sm:block">
            Enter = complete · F1 Cash · F3 JazzCash · F4 Easypaisa · F5 Card · F7 Bank · F6 Udhaar · Esc = band
          </p>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Kaise" className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const on = mode === m.id;
              const disabled = m.id === 'credit' && !hasCustomer;
              return (
                <button key={m.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => choose(m.id)}
                  className={cn('rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40',
                    on ? (m.id === 'full' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-amber-500 bg-amber-50 ring-1 ring-amber-500')
                      : 'border-slate-200 hover:border-slate-300')}>
                  <m.icon className={cn('h-4 w-4', on ? (m.id === 'full' ? 'text-brand-700' : 'text-amber-700') : 'text-slate-400')} />
                  <div className="mt-1 text-[0.8125rem] font-semibold text-slate-900">{m.label}</div>
                  <div className="text-[0.6875rem] text-slate-500">{disabled ? 'Customer chunein' : m.hint}</div>
                </button>
              );
            })}
          </div>

          {mode !== 'credit' && (
            <div>
              <div className="mb-1.5 text-[0.75rem] font-medium text-slate-500">Payment</div>
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3 lg:grid-cols-5">
                {POS_PAYMENT_METHODS.map((m) => {
                  const on = method === m.id;
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
                      className={cn('relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition',
                        on ? 'border-transparent text-white shadow-sm' : 'border-slate-200 text-slate-700 hover:border-slate-300')}
                      style={on ? { backgroundColor: m.color } : undefined}>
                      <m.icon className="h-4 w-4" />
                      <span className="text-[0.75rem] font-semibold">{m.label}</span>
                      <span className={cn('absolute right-1 top-1 hidden text-[0.5625rem] font-medium sm:block', on ? 'text-white/70' : 'text-slate-400')}>{m.key}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode !== 'credit' && method !== 'CASH' && method !== 'CARD' && paid > 0 && (
            <PayQrPanel method={method} amount={Math.min(paid, total)} />
          )}

          {isCredit && hasCustomer && receiver && !receiver.name.trim() && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900">
              Udhaar ja raha hai. Maal koi aur le ja raha ho to cart mein “maal kis ne liya” likh dein — bill par aa jayega.
            </p>
          )}

          <dl className="space-y-1.5 rounded-xl border border-slate-200 p-3 text-[0.875rem]">
            <div className="flex justify-between"><dt className="text-slate-500">Bill</dt><dd className="font-semibold tabular-nums text-slate-900">{formatPKR(total)}</dd></div>
            {mode !== 'credit' && <div className="flex justify-between"><dt className="text-slate-500">Mila</dt><dd className="font-semibold tabular-nums text-slate-900">{formatPKR(paid)}</dd></div>}
            {change > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-success-50 px-2.5 py-2">
                <dt className="font-medium text-success-800">{deposit && hasCustomer ? 'Khate mein jama' : 'Wapas dein'}</dt>
                <dd className="text-xl font-bold tabular-nums text-success-800">{formatPKR(change)}</dd>
              </div>
            )}
            {credit > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-2">
                <dt className="font-medium text-amber-800">Udhaar</dt>
                <dd className="text-xl font-bold tabular-nums text-amber-800">{formatPKR(credit)}</dd>
              </div>
            )}
            {change > 0 && hasCustomer && (
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-[0.8125rem] text-slate-700">
                <input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand-600))]" />
                Wapas dene ki jagah {customerName ?? 'customer'} ke khate mein advance jama karein
              </label>
            )}
          </dl>
        </div>

        {mode !== 'credit' && (
          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1.5 block text-[0.75rem] font-medium text-slate-500">
                {mode === 'partial' ? 'Kitna paisa mila?' : 'Customer ne kitna diya? (wapsi ke liye)'}
              </span>
              <input
                ref={inputRef}
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={mode === 'full' ? formatPKR(total) : '0'}
                data-autofocus={mode === 'partial' ? true : undefined}
                className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-right text-2xl font-bold tabular-nums text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {POS_QUICK_AMOUNTS.map((n) => (
                <button key={n} type="button" onClick={() => addNote(n)}
                  className="h-10 rounded-lg border border-slate-200 text-[0.8125rem] font-semibold tabular-nums text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
                  +{n.toLocaleString('en-PK')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setTendered(String(total))}
                className="h-10 rounded-lg bg-slate-100 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-200">Bilkul {formatPKR(total)}</button>
              <button type="button" onClick={() => setTendered(String(roundUp))}
                className="h-10 rounded-lg bg-slate-100 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-200">{formatPKR(roundUp)}</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PAD.map((k) => (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === '⌫' ? 'Mitayein' : k}
                  className="flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold tabular-nums text-slate-900 transition hover:bg-slate-50 active:bg-slate-100">
                  {k === '⌫' ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>
            {tendered && (
              <button type="button" onClick={() => setTendered('')} className="w-full text-center text-[0.75rem] font-medium text-slate-500 hover:text-slate-800">Saaf karein</button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default PosCheckoutModal;
