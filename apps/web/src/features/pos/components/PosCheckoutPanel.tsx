import { useMemo } from 'react';
import {
  Percent, BookOpen, Banknote, HandCoins, AlertCircle, CheckCircle2,
  ArrowDownCircle, TrendingDown, Wallet, CreditCard, Smartphone, Zap, Building2,
  Sparkles, Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import type { CartItem, SaleMode } from './pos-types';
import type { PaymentMethod } from '@/api/sales.api';

const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: any; color: string; bg: string; activeBg: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', bg: 'bg-white border-slate-200', activeBg: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', bg: 'bg-white border-slate-200', activeBg: 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', bg: 'bg-white border-slate-200', activeBg: 'bg-orange-50 border-orange-500 ring-2 ring-orange-200' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', bg: 'bg-white border-slate-200', activeBg: 'bg-green-50 border-green-500 ring-2 ring-green-200' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed', bg: 'bg-white border-slate-200', activeBg: 'bg-violet-50 border-violet-500 ring-2 ring-violet-200' },
};

interface Props {
  cart: CartItem[];
  globalDiscount: string;
  setGlobalDiscount: (v: string) => void;
  saleMode: SaleMode;
  setSaleMode: (m: SaleMode) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  paidAmount: string;
  setPaidAmount: (v: string) => void;
  customerId: string;
  onCheckout: () => void;
  loading: boolean;
}

export function PosCheckoutPanel({
  cart, globalDiscount, setGlobalDiscount, saleMode, setSaleMode,
  paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
  customerId, onCheckout, loading,
}: Props) {
  const subtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const unitPrice =
          item.priceOverride ??
          (item.useWholesale ? (item.wholesalePrice ?? item.basePrice) : item.basePrice);
        return sum + unitPrice * item.quantity;
      }, 0),
    [cart],
  );

  const totalLineDiscount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.lineDiscount || 0), 0),
    [cart],
  );

  const gDiscount = Number(globalDiscount) || 0;
  const totalDiscount = totalLineDiscount + gDiscount;
  const total = Math.max(subtotal - totalDiscount, 0);

  const effectivePaid = useMemo(() => {
    if (saleMode === 'FULL_PAYMENT') return total;
    if (saleMode === 'FULL_CREDIT') return 0;
    return Number(paidAmount || 0);
  }, [saleMode, total, paidAmount]);

  const change = Math.max(effectivePaid - total, 0);
  const credit = Math.max(total - effectivePaid, 0);
  const isCreditSale = credit > 0;

  const quickAmounts = useMemo(() => {
    const amts = new Set([total, 500, 1000, 2000, 5000, 10000].filter((n) => n > 0 && n < total));
    return Array.from(amts).slice(0, 4);
  }, [total]);

  return (
    <div className="shrink-0 border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 space-y-2.5">
      {/* Global discount */}
      <div>
        <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
          <Percent className="h-2.5 w-2.5 text-amber-600" />
          Global Discount
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={globalDiscount}
          onChange={(e) => setGlobalDiscount(e.target.value)}
          placeholder="0"
          className="h-10 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
        />
      </div>

      {/* Sale mode */}
      <div>
        <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
          <BookOpen className="h-2.5 w-2.5 text-violet-600" />
          Sale Mode
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => { setSaleMode('FULL_PAYMENT'); setPaidAmount(''); }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition ${
              saleMode === 'FULL_PAYMENT'
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <Banknote className={`h-3.5 w-3.5 ${saleMode === 'FULL_PAYMENT' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className={`text-[9px] font-extrabold ${saleMode === 'FULL_PAYMENT' ? 'text-emerald-700' : 'text-slate-500'}`}>
              Full Cash
            </span>
          </button>
          <button
            onClick={() => {
              if (!customerId) { toast.error('Pehle customer select karein'); return; }
              setSaleMode('PARTIAL_CREDIT');
              setPaidAmount(String(Math.floor(total / 2)));
            }}
            disabled={!customerId}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition ${
              saleMode === 'PARTIAL_CREDIT'
                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-sm'
                : !customerId
                ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <HandCoins className={`h-3.5 w-3.5 ${saleMode === 'PARTIAL_CREDIT' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className={`text-[9px] font-extrabold ${saleMode === 'PARTIAL_CREDIT' ? 'text-amber-700' : 'text-slate-500'}`}>
              Partial
            </span>
          </button>
          <button
            onClick={() => {
              if (!customerId) { toast.error('Pehle customer select karein'); return; }
              setSaleMode('FULL_CREDIT');
              setPaidAmount('0');
            }}
            disabled={!customerId}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition ${
              saleMode === 'FULL_CREDIT'
                ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200 shadow-sm'
                : !customerId
                ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                : 'bg-white border-slate-200 hover:border-rose-300'
            }`}
          >
            <BookOpen className={`h-3.5 w-3.5 ${saleMode === 'FULL_CREDIT' ? 'text-rose-600' : 'text-slate-400'}`} />
            <span className={`text-[9px] font-extrabold ${saleMode === 'FULL_CREDIT' ? 'text-rose-700' : 'text-slate-500'}`}>
              Full Udhaar
            </span>
          </button>
        </div>
      </div>

      {/* Payment method (hide for full credit) */}
      {saleMode !== 'FULL_CREDIT' && (
        <div>
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 block">
            Payment Method
          </label>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((m) => {
              const cfg = paymentMethodConfig[m];
              const Icon = cfg.icon;
              const active = paymentMethod === m;
              return (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border-2 transition ${
                    active ? cfg.activeBg : cfg.bg + ' hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-3 w-3" style={{ color: active ? cfg.color : '#94a3b8' }} />
                  <span className={`text-[9px] font-extrabold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Partial payment amount */}
      {saleMode === 'PARTIAL_CREDIT' && (
        <div>
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700 mb-1 block">
            Paid Amount
          </label>
          <div className="relative">
            <Wallet className="h-3.5 w-3.5 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0"
              max={total - 0.01}
              className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 pl-8 pr-3 text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition"
            />
          </div>
          {quickAmounts.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {quickAmounts.map((amt, idx) => (
                <button
                  key={`${idx}-${amt}`}
                  onClick={() => setPaidAmount(String(amt))}
                  className="py-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-[10px] font-extrabold text-amber-800 transition"
                >
                  {formatPKR(amt)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TOTAL DISPLAY */}
      <div className={`rounded-2xl p-3 space-y-1.5 text-white shadow-xl ${
        saleMode === 'FULL_CREDIT'
          ? 'bg-gradient-to-br from-rose-700 to-rose-900 shadow-rose-500/30'
          : saleMode === 'PARTIAL_CREDIT'
          ? 'bg-gradient-to-br from-amber-700 to-orange-900 shadow-amber-500/30'
          : 'bg-gradient-to-br from-slate-950 to-brand-900 shadow-brand-500/30'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70 font-semibold">Subtotal</span>
          <span className="font-bold tabular-nums">{formatPKR(subtotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-amber-300 font-semibold">Discount</span>
            <span className="font-extrabold text-amber-300 tabular-nums">-{formatPKR(totalDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/15">
          <span className="text-sm font-bold flex items-center gap-1">
            <Receipt className="h-3.5 w-3.5" />
            Total
          </span>
          <span className="text-2xl font-extrabold tabular-nums">{formatPKR(total)}</span>
        </div>
        {saleMode !== 'FULL_CREDIT' && (
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/10">
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <ArrowDownCircle className="h-2.5 w-2.5" /> Paid
            </span>
            <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(effectivePaid)}</span>
          </div>
        )}
        {change > 0 && (
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/10">
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <TrendingDown className="h-2.5 w-2.5" /> Change
            </span>
            <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(change)}</span>
          </div>
        )}
        {credit > 0 && (
          <div className="flex items-center justify-between pt-1.5 border-t border-white/20 bg-white/10 -mx-3 -mb-3 px-3 py-2.5 rounded-b-2xl">
            <span className="text-amber-300 font-extrabold flex items-center gap-1 text-sm">
              <BookOpen className="h-3.5 w-3.5" /> Khata
            </span>
            <span className="font-extrabold text-amber-300 text-lg tabular-nums">
              {formatPKR(credit)}
            </span>
          </div>
        )}
      </div>

      {/* Warning */}
      {credit > 0 && !customerId && (
        <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-2 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-900 font-extrabold">
            Customer select karein for credit sale
          </p>
        </div>
      )}

      {/* Checkout button */}
      <Button
        className={`w-full shadow-lg ${
          saleMode === 'FULL_CREDIT'
            ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-rose-500/30'
            : saleMode === 'PARTIAL_CREDIT'
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30'
            : 'bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 shadow-emerald-500/30'
        }`}
        onClick={onCheckout}
        loading={loading}
        disabled={isCreditSale && !customerId}
      >
        <CheckCircle2 className="h-4 w-4" />
        {saleMode === 'FULL_CREDIT'
          ? `Add to Khata • ${formatPKR(total)}`
          : saleMode === 'PARTIAL_CREDIT'
          ? `Confirm • ${formatPKR(credit)} udhaar`
          : `Complete Sale • ${formatPKR(total)}`}
        <Sparkles className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
