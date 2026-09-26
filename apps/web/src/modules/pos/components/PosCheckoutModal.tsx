import { useState, useEffect, useCallback } from 'react';
import {
  X, User, CheckCircle2, ArrowRight, AlertTriangle, Zap, Banknote,
  Calculator, CreditCard, Smartphone, Building2, BookOpen, Wallet, Delete,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { POS_PAYMENT_METHODS, POS_QUICK_AMOUNTS, type PosCheckoutMode } from '../lib/posCart';
import { PosReceiverField, type PosReceiverValue } from './PosReceiverField';

/* ═════════════════════════════════════════════════════════════
   CHECKOUT — pura paisa, kuch cash, ya pura udhaar
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Yahan teen soorton ka faisla
   hota hai aur teenon counter par roz pesh aati hain, is liye
   teenon ek hi nazar me samne hain — koi menu ke andar chhupi
   hui nahi.

   Udhaar wali soorat me "maal lene kaun aaya" ka khana khulta
   hai: khata mahine bhar chalta hai aur maal aksar mulazim le
   jata hai.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   💳 CHECKOUT MODAL
   ═════════════════════════════════════════════════════════════ */
export function PosCheckoutModal({
  total, itemCount, loading, customerName, customerBalance = 0, hasCustomer,
  initMode, initAmount, customerId, receiver, onReceiverChange, onConfirm, onClose,
}: {
  total: number; itemCount: number; loading?: boolean;
  customerName?: string; customerBalance?: number; hasCustomer?: boolean;
  initMode: PosCheckoutMode; initAmount?: number;
  customerId?: string;
  receiver: PosReceiverValue;
  onReceiverChange: (v: PosReceiverValue) => void;
  onConfirm: (d: { paymentMethod: PaymentMethod; paidAmount: number; isCredit: boolean; depositExtra: boolean }) => void;
  onClose: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidStr, setPaidStr] = useState<string>(initAmount ? String(initAmount) : '');
  const [mode, setMode] = useState<PosCheckoutMode>(initMode);
  const [depositExtra, setDepositExtra] = useState(false);

  const paid = mode === 'credit' ? 0 : mode === 'full' ? total : Number(paidStr) || 0;
  const change = Math.max(paid - total, 0);
  const creditAmount = Math.max(total - paid, 0);
  const isCredit = creditAmount > 0;

  useEffect(() => {
    if (mode === 'full') setPaidStr(String(total));
  }, [mode, total]);

  const submit = useCallback(() => {
    if (isCredit && !hasCustomer) { toast.error('Udhaar ke liye customer select karein'); return; }
    if (loading) return;
    onConfirm({ paymentMethod, paidAmount: mode === 'credit' ? 0 : paid, isCredit, depositExtra: depositExtra && change > 0 });
  }, [isCredit, hasCustomer, loading, onConfirm, paymentMethod, mode, paid, depositExtra, change]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') onClose();
      if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('CASH'); }
      if (e.key === 'F3') { e.preventDefault(); setPaymentMethod('JAZZCASH'); }
      if (e.key === 'F4') { e.preventDefault(); setPaymentMethod('EASYPAISA'); }
      if (e.key === 'F5') { e.preventDefault(); setPaymentMethod('CARD'); }
      if (e.key === 'F6') { e.preventDefault(); if (hasCustomer) setMode('credit'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [submit, onClose, hasCustomer]);

  const addAmount = (amt: number) => { setMode('partial'); setPaidStr(String((Number(paidStr) || 0) + amt)); };
  const setExact = (amt: number) => { setMode('partial'); setPaidStr(String(amt)); };

  const numpad = (k: string) => {
    setMode('partial');
    if (k === 'C') return setPaidStr('');
    if (k === '⌫') return setPaidStr((v) => v.slice(0, -1));
    setPaidStr((v) => (v === '0' ? k : v + k).slice(0, 9));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white px-5 py-4">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-extrabold text-emerald-200 tracking-wider">Payment • {itemCount} items</div>
              <div className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none mt-1">{formatPKR(total)}</div>
              {hasCustomer && customerName && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur border border-white/20 text-xs font-extrabold">
                  <User className="h-3 w-3" />
                  {customerName}
                  {customerBalance > 0 && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="text-amber-300">Purana udhaar {formatPKR(customerBalance)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center border-2 border-white/20 transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setMode('full')}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95',
                  mode === 'full' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'].join(' ')}>
                <Wallet className={`h-6 w-6 mx-auto ${mode === 'full' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'full' ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>Pura Paisa</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">100% payment</div>
              </button>
              <button onClick={() => { setMode('partial'); setPaidStr(''); }}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95',
                  mode === 'partial' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 shadow-lg ring-2 ring-amber-200 dark:ring-amber-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300'].join(' ')}>
                <Calculator className={`h-6 w-6 mx-auto ${mode === 'partial' ? 'text-amber-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'partial' ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>Kuch Cash</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Baqi udhaar</div>
              </button>
              <button onClick={() => setMode('credit')} disabled={!hasCustomer}
                className={['p-3 rounded-2xl border-4 text-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                  mode === 'credit' ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 shadow-lg ring-2 ring-rose-200 dark:ring-rose-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-rose-300'].join(' ')}>
                <BookOpen className={`h-6 w-6 mx-auto ${mode === 'credit' ? 'text-rose-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'credit' ? 'text-rose-800 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>Pura Udhaar</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">{hasCustomer ? 'Khaate mein' : 'Customer chunein'}</div>
              </button>
            </div>
          </div>

          {/* Maal lene wale ka naam yahan nahi — cart me customer ke
              saath hai. Wahan hone ki wajah: INSTANT CASH (F12) ye
              modal kholta hi nahi, aur naam usi waqt likha jata hai
              jab customer chuna jata hai, paisa lete waqt nahi.
              Yahan sirf yaad-dehani, jab udhaar ja raha ho aur naam
              khali reh gaya ho. */}
          {isCredit && hasCustomer && !receiver.name.trim() && (
            <div className="px-4 sm:px-5 pt-4">
              <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 px-3 py-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                💡 Udhaar ja raha hai — agar maal koi aur le kar ja raha hai to
                cart me uska naam likh dein, bill par aa jayega.
              </div>
            </div>
          )}

          {mode !== 'credit' && (
            <div className="px-4 sm:px-5 pt-4">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 tracking-wider mb-2">Payment Method</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {POS_PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                      className={['p-2.5 rounded-2xl border-4 transition active:scale-95 flex flex-col items-center gap-1',
                        active ? `border-transparent shadow-lg text-white bg-gradient-to-br ${m.bg}` : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'].join(' ')}>
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-extrabold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'partial' && (
            <div className="px-4 sm:px-5 pt-4 space-y-3">
              <div className="relative">
                <input type="number" step="0.01" value={paidStr} autoFocus
                  onChange={(e) => setPaidStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Kitna paisa diya?"
                  className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 pr-14 text-3xl sm:text-4xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20" />
                {paidStr && (
                  <button onClick={() => setPaidStr('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {POS_QUICK_AMOUNTS.map((amt) => (
                  <button key={amt} onClick={() => addAmount(amt)}
                    className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 text-sm font-extrabold text-slate-800 dark:text-slate-200 transition tabular-nums">
                    +{amt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setExact(total)}
                  className="h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 active:scale-95 text-sm font-extrabold text-emerald-800 dark:text-emerald-300 transition inline-flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Pura ({formatPKR(total)})
                </button>
                <button onClick={() => setExact(Math.ceil(total / 100) * 100)}
                  className="h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 active:scale-95 text-sm font-extrabold text-blue-800 dark:text-blue-300 transition tabular-nums">
                  Round up ({formatPKR(Math.ceil(total / 100) * 100)})
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['1', '2', '3', '⌫', '4', '5', '6', 'C', '7', '8', '9', '00', '0', '000'].map((k) => (
                  <button key={k} onClick={() => numpad(k)}
                    className={['h-12 rounded-xl font-extrabold text-lg transition active:scale-95 tabular-nums',
                      k === 'C' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : k === '⌫' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-emerald-400'].join(' ')}>
                    {k === '⌫' ? <Delete className="h-5 w-5 mx-auto" /> : k}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 sm:px-5 py-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-4 border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total Bill</span>
                <span className="text-lg font-extrabold tabular-nums text-slate-800 dark:text-white">{formatPKR(total)}</span>
              </div>
              {mode !== 'credit' && paid > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Diya</span>
                  <span className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{formatPKR(paid)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="rounded-xl bg-emerald-500 text-white p-3 mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Customer ko wapis</div>
                      <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(change)}</div>
                    </div>
                  </div>
                  {hasCustomer && (
                    <label className="mt-2.5 flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-2 cursor-pointer hover:bg-white/25 transition">
                      <input type="checkbox" checked={depositExtra} onChange={(e) => setDepositExtra(e.target.checked)}
                        className="h-4 w-4 rounded accent-white" />
                      <span className="text-xs font-extrabold">Extra paisa {customerName} ke khaate mein jama karo</span>
                    </label>
                  )}
                </div>
              )}
              {creditAmount > 0 && (
                <div className={['rounded-xl p-3 flex items-center mt-2 border-2',
                  hasCustomer ? 'bg-amber-500 text-white border-amber-400' : 'bg-rose-500 text-white border-rose-400'].join(' ')}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">
                        {hasCustomer ? 'Khaate mein udhaar' : '⚠️ Customer chahiye'}
                      </div>
                      <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(creditAmount)}</div>
                    </div>
                  </div>
                </div>
              )}
              {!hasCustomer && (mode === 'credit' || creditAmount > 0) && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-300 dark:border-rose-500/40 p-2.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Udhaar ke liye customer select karein</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={submit} disabled={loading || (isCredit && !hasCustomer)}
            className={['w-full h-16 sm:h-20 rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              isCredit ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
              : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                {loading ? 'Save ho raha...' : isCredit ? '📔 Khaate mein daalo' : '💰 Sale complete karo'}
              </div>
              <div className="text-xl sm:text-2xl tabular-nums leading-none mt-0.5">
                {mode === 'credit' ? `Udhaar ${formatPKR(total)}`
                  : isCredit ? `${formatPKR(paid)} + Udhaar ${formatPKR(creditAmount)}`
                  : `${formatPKR(paid || total)}`}
              </div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
          <div className="mt-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            Enter = confirm • Esc = cancel • F1/F3/F4/F5 = payment • F6 = udhaar
          </div>
        </div>
      </div>
    </div>
  );
}

export default PosCheckoutModal;
