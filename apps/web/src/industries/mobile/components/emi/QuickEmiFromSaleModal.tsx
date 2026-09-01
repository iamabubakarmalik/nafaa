// apps/web/src/industries/mobile/components/emi/QuickEmiFromSaleModal.tsx
import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, CreditCard, CheckCircle2, Calculator, Calendar,
  Sparkles, AlertTriangle,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { emiApi } from '../../api/emi.api';

/* ═════════════════════════════════════════════════════════════
   QUICK EMI FROM SALE — FULL BEST (dark mode complete)
   ═════════════════════════════════════════════════════════════ */

interface Props {
  saleId: string;
  saleNumber: string;
  saleTotal: number;
  paidAmount: number;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  onSuccess: (planId: string) => void;
  onClose: () => void;
}

const INSTALLMENT_OPTIONS = [3, 6, 9, 12, 18, 24];

export function QuickEmiFromSaleModal({
  saleId, saleNumber, saleTotal, paidAmount, customerId,
  customerName, customerPhone, onSuccess, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [downPayment, setDownPayment] = useState(String(paidAmount));
  const [installmentCount, setInstallmentCount] = useState(6);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState(`Auto from POS sale ${saleNumber}`);

  const down = Number(downPayment) || 0;
  const financed = Math.max(saleTotal - down, 0);
  const perInstallment = installmentCount > 0 ? financed / installmentCount : 0;
  const downPct = saleTotal > 0 ? (down / saleTotal) * 100 : 0;

  const isValid = saleTotal > 0 && down >= 0 && down < saleTotal && installmentCount > 0 && !!startDate;

  const preview = useMemo(() => {
    if (!isValid) return [];
    const start = new Date(startDate);
    let running = 0;
    const list = [];
    for (let i = 1; i <= installmentCount; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + (i - 1));
      const amount = i === installmentCount
        ? Number((financed - running).toFixed(2))
        : Number(perInstallment.toFixed(2));
      running += amount;
      list.push({ num: i, due, amount });
    }
    return list;
  }, [isValid, installmentCount, financed, perInstallment, startDate]);

  const mutation = useMutation({
    mutationFn: () =>
      emiApi.create({
        saleId,
        customerId,
        customerName,
        customerPhone,
        totalAmount: saleTotal,
        downPayment: down,
        installmentCount,
        startDate,
        notes,
      }),
    onSuccess: (plan) => {
      toast.success(`✓ EMI Plan ${plan.planNumber} ban gaya — ${installmentCount} installments`);
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
      onSuccess(plan.id);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  /* Esc + scroll lock */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border-2 border-indigo-200 dark:border-indigo-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-indigo-100 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/15 dark:to-purple-500/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 shrink-0">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-extrabold">
                Sale → EMI Convert
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white truncate">Sale: {saleNumber}</h3>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">
                {customerName}{customerPhone && ` • ${customerPhone}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Sale info */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-500/10 dark:to-blue-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3.5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">Sale Total</div>
                <div className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">{formatPKR(saleTotal)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-extrabold text-emerald-700 dark:text-emerald-400">Already Paid</div>
                <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">{formatPKR(paidAmount)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-extrabold text-indigo-700 dark:text-indigo-400">To Finance</div>
                <div className="font-extrabold text-indigo-700 dark:text-indigo-400 text-sm tabular-nums">{formatPKR(financed)}</div>
              </div>
            </div>
          </div>

          {/* Down payment */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Down Payment (PKR) * <span className="normal-case font-bold text-slate-400 dark:text-slate-500">— default = jo POS pe liya</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">Rs</span>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 pl-9 pr-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {down >= saleTotal && (
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Down payment total se kam honi chahiye
              </div>
            )}
            {saleTotal > 0 && down < saleTotal && downPct < 15 && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Sirf {downPct.toFixed(0)}% down — 20%+ safer hai
              </div>
            )}
          </div>

          {/* Installments */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Kitne Months?
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {INSTALLMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstallmentCount(opt)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-extrabold transition ${
                    installmentCount === opt
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg scale-105'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="60"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white mt-2 focus:outline-none focus:border-indigo-500 transition"
              placeholder="Ya custom count (1-60)..."
            />
          </div>

          {/* Per-installment */}
          {financed > 0 && installmentCount > 0 && (
            <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-500/40 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-indigo-900 dark:text-indigo-200 mb-1">
                <Calculator className="h-4 w-4" /> Per Month
              </div>
              <div className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                {formatPKR(perInstallment)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 tabular-nums">
                × {installmentCount} months = {formatPKR(financed)}
              </div>
            </div>
          )}

          {/* Start date */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Pehli Installment Kab? *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <div className="flex gap-1 mt-1.5">
              {[
                { label: '1 hafta', days: 7 },
                { label: '15 din', days: 15 },
                { label: '1 mahina', days: 30 },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + q.days);
                    setStartDate(d.toISOString().slice(0, 10));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule preview */}
          {preview.length > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3.5">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Schedule Preview
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {preview.slice(0, 6).map((inst) => (
                  <div
                    key={inst.num}
                    className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      #{inst.num} — {inst.due.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                      {formatPKR(inst.amount)}
                    </span>
                  </div>
                ))}
                {preview.length > 6 && (
                  <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 font-extrabold py-1">
                    +{preview.length - 6} aur installments
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Info */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
            <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Yaad rakho:</strong> Down payment POS pe already aa chuki hai.
              Baqi amount installments me convert hogi — phir EMI page se track + WhatsApp reminders.
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0">
          <Button variant="secondary" onClick={onClose}>Skip</Button>
          <Button
            onClick={() => {
              if (!isValid) return toast.error('Sab fields check karo');
              mutation.mutate();
            }}
            loading={mutation.isPending}
            disabled={!isValid}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 font-extrabold shadow-lg shadow-indigo-500/40"
          >
            <CheckCircle2 className="h-4 w-4" /> EMI Plan Banao
          </Button>
        </div>
      </div>
    </div>
  );
}
