import { useState, useMemo, useEffect } from 'react';
import {
  X, Banknote, CreditCard, Smartphone, Building2, Zap,
  CheckCircle2, ArrowRight, Calculator, BookOpen, AlertTriangle,
  Wallet, User,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

interface Props {
  total: number;
  itemCount: number;
  loading?: boolean;
  customerName?: string;
  customerBalance?: number;
  hasCustomer?: boolean;
  onConfirm: (data: { paymentMethod: PaymentMethod; paidAmount: number; isCredit: boolean }) => void;
  onClose: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: any; color: string; bgClass: string }[] = [
  { id: 'CASH',          label: 'Cash',      icon: Banknote,   color: '#16a34a', bgClass: 'from-emerald-500 to-green-600' },
  { id: 'JAZZCASH',      label: 'JazzCash',  icon: Smartphone, color: '#f97316', bgClass: 'from-orange-500 to-orange-600' },
  { id: 'EASYPAISA',     label: 'EasyPaisa', icon: Zap,        color: '#22c55e', bgClass: 'from-green-500 to-lime-600' },
  { id: 'CARD',          label: 'Card',      icon: CreditCard, color: '#2563eb', bgClass: 'from-blue-500 to-blue-700' },
  { id: 'BANK_TRANSFER', label: 'Bank',      icon: Building2,  color: '#7c3aed', bgClass: 'from-violet-500 to-purple-700' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export function RetailQuickCash({
  total, itemCount, loading, customerName, customerBalance = 0, hasCustomer,
  onConfirm, onClose,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidStr, setPaidStr] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [mode, setMode] = useState<'full' | 'credit' | 'partial'>('full');

  const paid = useMemo(() => {
    if (mode === 'credit') return 0;
    if (mode === 'full') return total;
    return Number(paidStr) || 0;
  }, [paidStr, mode, total]);

  const change = useMemo(() => Math.max(paid - total, 0), [paid, total]);
  const creditAmount = useMemo(() => Math.max(total - paid, 0), [total, paid]);
  const isCredit = creditAmount > 0;

  // Auto-select paid = total on mount
  useEffect(() => {
    if (mode === 'full') setPaidStr(String(total));
  }, [mode, total]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        submit();
      }
      if (e.key === 'Escape') onClose();
      // F1-F5 for payment method quick select
      if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('CASH'); }
      if (e.key === 'F3') { e.preventDefault(); setPaymentMethod('JAZZCASH'); }
      if (e.key === 'F4') { e.preventDefault(); setPaymentMethod('EASYPAISA'); }
      if (e.key === 'F5') { e.preventDefault(); setPaymentMethod('CARD'); }
      if (e.key === 'F6') { e.preventDefault(); if (hasCustomer) setMode('credit'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading, hasCustomer]);

  const submit = () => {
    if (mode === 'credit' && !hasCustomer) {
      alert('Udhaar ke liye customer select karein');
      return;
    }
    if (mode === 'partial' && !hasCustomer && creditAmount > 0) {
      alert('Baqi paisay ke liye customer select karein');
      return;
    }
    if (paid < 0) return;
    onConfirm({ paymentMethod, paidAmount: paid, isCredit });
  };

  const addAmount = (amt: number) => {
    setMode('partial');
    setPaidStr(String((Number(paidStr) || 0) + amt));
  };

  const setExact = (amt: number) => {
    setMode('partial');
    setPaidStr(String(amt));
  };

  const clearAmount = () => setPaidStr('');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">

        {/* ═══ HEADER ═══ */}
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white px-5 py-4">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-extrabold text-emerald-200 tracking-wider">
                Payment • {itemCount} items
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none mt-1">
                {formatPKR(total)}
              </div>
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
            <button
              onClick={onClose}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center border-2 border-white/20 transition shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ═══ MODE TOGGLE — Full / Partial / Full Udhaar ═══ */}
          <div className="px-4 sm:px-5 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setMode('full'); setPaidStr(String(total)); }}
                className={[
                  'p-3 rounded-2xl border-4 text-center transition active:scale-95',
                  mode === 'full'
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-emerald-300',
                ].join(' ')}
              >
                <Wallet className={`h-6 w-6 mx-auto ${mode === 'full' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'full' ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Pura Paisa
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">100% payment</div>
              </button>

              <button
                onClick={() => { setMode('partial'); setPaidStr(''); }}
                className={[
                  'p-3 rounded-2xl border-4 text-center transition active:scale-95',
                  mode === 'partial'
                    ? 'border-amber-500 bg-amber-50 shadow-lg ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white hover:border-amber-300',
                ].join(' ')}
              >
                <Calculator className={`h-6 w-6 mx-auto ${mode === 'partial' ? 'text-amber-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'partial' ? 'text-amber-800' : 'text-slate-700'}`}>
                  Kuch Cash
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Baqi udhaar</div>
              </button>

              <button
                onClick={() => setMode('credit')}
                disabled={!hasCustomer}
                className={[
                  'p-3 rounded-2xl border-4 text-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                  mode === 'credit'
                    ? 'border-rose-500 bg-rose-50 shadow-lg ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white hover:border-rose-300',
                ].join(' ')}
              >
                <BookOpen className={`h-6 w-6 mx-auto ${mode === 'credit' ? 'text-rose-600' : 'text-slate-500'}`} />
                <div className={`text-sm font-extrabold mt-1 ${mode === 'credit' ? 'text-rose-800' : 'text-slate-700'}`}>
                  Pura Udhaar
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {hasCustomer ? 'Khaate mein' : 'Customer chunein'}
                </div>
              </button>
            </div>
          </div>

          {/* ═══ PAYMENT METHOD (only if not full credit) ═══ */}
          {mode !== 'credit' && (
            <div className="px-4 sm:px-5 pt-4">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider mb-2">
                Payment Method
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={[
                        'p-2.5 rounded-2xl border-4 transition active:scale-95 flex flex-col items-center gap-1',
                        active
                          ? `border-current shadow-lg text-white bg-gradient-to-br ${m.bgClass}`
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700',
                      ].join(' ')}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-extrabold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ AMOUNT INPUT (only for partial mode) ═══ */}
          {mode === 'partial' && (
            <div className="px-4 sm:px-5 pt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">
                    Kitna paisa diya?
                  </div>
                  <button
                    onClick={() => setShowCalculator(!showCalculator)}
                    className={[
                      'h-7 px-2 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1',
                      showCalculator ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    <Calculator className="h-3 w-3" /> Calculator
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={paidStr}
                    onChange={(e) => setPaidStr(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    autoFocus
                    className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 bg-emerald-50 px-4 pr-14 text-3xl sm:text-4xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200"
                  />
                  {paidStr && (
                    <button
                      onClick={clearAmount}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white hover:bg-slate-100 active:scale-95 flex items-center justify-center transition"
                    >
                      <X className="h-5 w-5 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick amount buttons */}
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider mb-1.5">
                  Fatafat add karo
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => addAmount(amt)}
                      className="h-11 rounded-xl bg-slate-100 hover:bg-emerald-100 active:scale-95 text-sm font-extrabold text-slate-800 transition"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact amount shortcuts */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExact(total)}
                  className="h-11 rounded-xl bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-sm font-extrabold text-emerald-800 transition inline-flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Pura ({formatPKR(total)})
                </button>
                <button
                  onClick={() => setExact(Math.ceil(total / 100) * 100)}
                  className="h-11 rounded-xl bg-blue-100 hover:bg-blue-200 active:scale-95 text-sm font-extrabold text-blue-800 transition"
                >
                  Round up ({formatPKR(Math.ceil(total / 100) * 100)})
                </button>
              </div>

              {/* Calculator (inline) */}
              {showCalculator && (
                <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-100 p-2">
                  {[7, 8, 9, 'C', 4, 5, 6, '←', 1, 2, 3, '00', 0, '.', '000', 'OK'].map((k) => (
                    <button
                      key={String(k)}
                      onClick={() => {
                        const key = String(k);
                        if (key === 'C') return clearAmount();
                        if (key === '←') return setPaidStr(paidStr.slice(0, -1));
                        if (key === 'OK') return submit();
                        setPaidStr(paidStr + key);
                      }}
                      className={[
                        'h-11 rounded-xl font-extrabold text-lg transition active:scale-95',
                        k === 'C' ? 'bg-rose-500 text-white hover:bg-rose-600'
                          : k === '←' ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : k === 'OK' ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-slate-800 hover:bg-slate-50 shadow-sm',
                      ].join(' ')}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ SUMMARY ═══ */}
          <div className="px-4 sm:px-5 py-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border-4 border-slate-200 p-4 space-y-2">
              <SummaryRow label="Total Bill" value={formatPKR(total)} tone="slate" />
              {mode !== 'credit' && paid > 0 && (
                <SummaryRow label="Diya" value={formatPKR(paid)} tone="emerald" />
              )}

              {change > 0 && (
                <div className="rounded-xl bg-emerald-500 text-white p-3 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Customer ko wapis</div>
                      <div className="text-2xl font-extrabold tabular-nums leading-none">{formatPKR(change)}</div>
                    </div>
                  </div>
                </div>
              )}

              {creditAmount > 0 && (
                <div className={[
                  'rounded-xl p-3 flex items-center justify-between mt-2 border-2',
                  hasCustomer ? 'bg-amber-500 text-white border-amber-400' : 'bg-rose-500 text-white border-rose-400',
                ].join(' ')}>
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
                <div className="rounded-xl bg-rose-50 border-2 border-rose-300 p-2.5 text-xs font-extrabold text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Udhaar rakhne ke liye customer select karein warna sale nahi hogi</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ CONFIRM BUTTON ═══ */}
        <div className="shrink-0 p-4 border-t-4 border-slate-100 bg-white">
          <button
            onClick={submit}
            disabled={loading || (isCredit && !hasCustomer)}
            className={[
              'w-full h-16 sm:h-20 rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              isCredit
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6',
            ].join(' ')}
          >
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
          <div className="mt-2 text-center text-[10px] font-bold text-slate-400">
            Enter = confirm • Esc = cancel • F1/F3/F4/F5 = payment • F6 = udhaar
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'amber' }) {
  const tones = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className={`text-lg font-extrabold tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  );
}
