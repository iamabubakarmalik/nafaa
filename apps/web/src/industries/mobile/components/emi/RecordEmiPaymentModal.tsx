// apps/web/src/industries/mobile/components/emi/RecordEmiPaymentModal.tsx
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Banknote, CreditCard, Smartphone, Building2, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { emiApi } from '../../api/emi.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   RECORD EMI PAYMENT — FULL BEST (dark mode + Esc + Ctrl+Enter)
   ═════════════════════════════════════════════════════════════ */

interface Props {
  planId: string;
  planNumber: string;
  installmentId: string;
  installmentNumber: number;
  installmentAmount: number;
  alreadyPaid: number;
  onClose: () => void;
}

const METHODS: { val: PaymentMethod; label: string; emoji: string; icon: any }[] = [
  { val: 'CASH', label: 'Cash', emoji: '💵', icon: Banknote },
  { val: 'CARD', label: 'Card', emoji: '💳', icon: CreditCard },
  { val: 'JAZZCASH', label: 'JazzCash', emoji: '📱', icon: Smartphone },
  { val: 'EASYPAISA', label: 'EasyPaisa', emoji: '⚡', icon: Zap },
  { val: 'BANK_TRANSFER', label: 'Bank', emoji: '🏦', icon: Building2 },
];

export function RecordEmiPaymentModal({
  planId, planNumber, installmentId, installmentNumber, installmentAmount, alreadyPaid, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const balance = Math.max(installmentAmount - alreadyPaid, 0);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      emiApi.recordPayment(planId, installmentId, {
        amount: Number(amount),
        paymentMethod: method,
        paidDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`✓ ${formatPKR(Number(amount))} record ho gaya`);
      queryClient.invalidateQueries({ queryKey: ['emi-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Amount likho');
    if (amt > balance + 0.01) return toast.error(`Balance se zyada nahi — max ${formatPKR(balance)}`);
    mutation.mutate();
  };

  /* Esc + Ctrl+Enter + scroll lock */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, balance]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b-2 border-emerald-100 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-extrabold">
                Installment #{installmentNumber} — Payment
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white font-mono truncate">{planNumber}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-500/10 dark:to-blue-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">Amount</div>
              <div className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">{formatPKR(installmentAmount)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase font-extrabold text-emerald-700 dark:text-emerald-400">Paid</div>
              <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">{formatPKR(alreadyPaid)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase font-extrabold text-amber-700 dark:text-amber-400">Balance</div>
              <div className="font-extrabold text-amber-700 dark:text-amber-400 text-sm tabular-nums">{formatPKR(balance)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Kitna Mila? (PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">Rs</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onFocus={(e) => e.target.select()}
                autoFocus
                className="h-14 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-500/50 bg-white dark:bg-slate-800 pl-9 pr-3 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition"
              />
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition"
              >
                Full ({formatPKR(balance)})
              </button>
              {balance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(balance / 2)))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Half
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.val;
              return (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setMethod(m.val)}
                  className={`p-2 rounded-xl border-2 text-[9px] font-extrabold transition ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-base leading-none">{m.emoji}</div>
                  <div className="mt-0.5">{m.label}</div>
                </button>
              );
            })}
          </div>

          <Input
            label="Payment Date"
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />

          <Input
            label="Note (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reference ya koi baat..."
          />
        </div>

        <div className="px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            loading={mutation.isPending}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg shadow-emerald-500/40"
          >
            <CheckCircle2 className="h-4 w-4" /> Record Karo
          </Button>
        </div>
      </div>
    </div>
  );
}
