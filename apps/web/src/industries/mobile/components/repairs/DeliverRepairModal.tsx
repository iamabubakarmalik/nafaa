import { useState, useEffect } from 'react';
import {
  Wrench, Smartphone, User, Hash, X, Truck, Banknote, Sparkles,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { RepairTicket } from '../../api/repairs.api';

const METHODS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'CASH', label: 'Cash', emoji: '💵' },
  { value: 'CARD', label: 'Card', emoji: '💳' },
  { value: 'BANK_TRANSFER', label: 'Bank', emoji: '🏦' },
];

/**
 * Counter par ticket hand-over karne ka ek hi step:
 * baqi paisa lo → deliver → repair ki sale khud ban jaye.
 */
export function DeliverRepairModal({
  ticket, pending, onConfirm, onClose,
}: {
  ticket: RepairTicket;
  pending: boolean;
  onConfirm: (amount: number, paymentMethod: PaymentMethod) => void;
  onClose: () => void;
}) {
  const balance = Math.max(Number(ticket.totalCost) - Number(ticket.paidAmount), 0);
  const [amount, setAmount] = useState(String(balance || ''));
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  const entered = Number(amount) || 0;
  const remaining = Math.max(balance - entered, 0);
  const tooMuch = entered > balance + 0.01;
  const needsCustomerAccount = remaining > 0 && !ticket.customerId;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border-2 border-transparent dark:border-slate-800"
      >
        {/* Header */}
        <div className="relative overflow-hidden px-5 py-4 bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 text-white shrink-0">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur border border-white/25 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/80">
                  Repair Deliver
                </div>
                <h3 className="font-extrabold text-lg font-mono truncate">{ticket.ticketNumber}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Device + customer */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
              <Smartphone className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
              {ticket.deviceBrand} {ticket.deviceModel}
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <User className="h-3.5 w-3.5 shrink-0" />
              {ticket.customerName}
              {ticket.customerPhone && <span className="text-slate-400">· {ticket.customerPhone}</span>}
            </div>
            {ticket.imei1 && (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                {ticket.imei1}
              </div>
            )}
          </div>

          {/* Money */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3.5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-300">Kul bill</span>
              <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(ticket.totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-300">Pehle mila</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(ticket.paidAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-emerald-200 dark:border-emerald-500/30">
              <span className="font-extrabold text-slate-900 dark:text-white">Baqi</span>
              <span className={`text-lg font-extrabold tabular-nums ${balance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {formatPKR(balance)}
              </span>
            </div>
          </div>

          {balance > 0 && (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    Abhi kitna liya
                  </label>
                  <button
                    onClick={() => setAmount(String(balance))}
                    className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Poora {formatPKR(balance)}
                  </button>
                </div>
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`h-14 w-full rounded-2xl border-2 bg-white dark:bg-slate-800 px-4 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none transition ${
                    tooMuch
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                  }`}
                />
                {tooMuch && (
                  <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    Baqi sirf {formatPKR(balance)} hai
                  </p>
                )}
                {!tooMuch && remaining > 0 && (
                  <p className={`mt-1.5 text-xs font-bold ${needsCustomerAccount ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {needsCustomerAccount
                      ? `${formatPKR(remaining)} udhaar rahega — is ticket ka customer account nahi, pehle poora paisa lein`
                      : `${formatPKR(remaining)} khate me udhaar chala jayega`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1.5">
                  Tarika
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMethod(m.value)}
                      className={`h-12 rounded-2xl border-2 text-xs font-extrabold transition active:scale-95 ${
                        method === m.value
                          ? 'bg-gradient-to-br from-orange-600 to-amber-700 text-white border-transparent shadow-lg shadow-orange-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-500/40'
                      }`}
                    >
                      <span className="mr-1">{m.emoji}</span>{m.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3.5">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-relaxed">
                Deliver karte hi is repair ki <strong>sale khud ban jayegi</strong> — dashboard,
                aaj ka profit aur cash register, teeno me apne aap aa jayegi.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <Button
            size="lg"
            fullWidth
            disabled={tooMuch || needsCustomerAccount}
            loading={pending}
            leftIcon={balance > 0 ? <Banknote className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            className="bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 font-extrabold shadow-lg shadow-orange-500/30"
            onClick={() => onConfirm(Math.min(entered, balance), method)}
          >
            {balance > 0
              ? `${formatPKR(Math.min(entered, balance))} lo aur deliver karo`
              : 'Deliver Karo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
