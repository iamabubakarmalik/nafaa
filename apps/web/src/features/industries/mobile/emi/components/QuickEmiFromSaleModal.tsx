import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, CreditCard, CheckCircle2, Calculator, Calendar,
  AlertCircle, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import { emiApi } from '../api/emi.api';

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

  const isValid = saleTotal > 0 && down < saleTotal && installmentCount > 0 && startDate;

  // Preview installments
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
      toast.success(`EMI Plan ${plan.planNumber} created — ${installmentCount} installments`);
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
      onSuccess(plan.id);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">
                Convert to EMI Plan
              </div>
              <h3 className="font-bold text-slate-900">Sale: {saleNumber}</h3>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Customer: <strong>{customerName}</strong>
                {customerPhone && ` • ${customerPhone}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Sale Info Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500">Sale Total</div>
                <div className="font-extrabold text-slate-900 text-sm">{formatPKR(saleTotal)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-emerald-700">Already Paid</div>
                <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(paidAmount)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-indigo-700">To Finance</div>
                <div className="font-extrabold text-indigo-700 text-sm">{formatPKR(financed)}</div>
              </div>
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Down Payment (PKR) *
              <span className="text-[10px] text-slate-500 font-normal ml-2">
                Default = already paid amount
              </span>
            </label>
            <input
              type="number"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              max={saleTotal - 1}
              className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50/30 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
            {down >= saleTotal && (
              <div className="text-[10px] text-rose-600 font-bold mt-1">
                Down payment must be less than total
              </div>
            )}
          </div>

          {/* Installments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Number of Installments
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {INSTALLMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstallmentCount(opt)}
                  className={`py-2 rounded-lg border-2 text-sm font-extrabold transition ${
                    installmentCount === opt
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Math.max(1, Number(e.target.value) || 1))}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm mt-2"
              placeholder="Or custom count..."
            />
          </div>

          {/* Calculation Card */}
          {financed > 0 && installmentCount > 0 && (
            <div className="rounded-xl bg-white border-2 border-indigo-300 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-indigo-700" />
                <div className="text-xs font-bold text-indigo-900">Per-Installment Amount</div>
              </div>
              <div className="text-3xl font-extrabold text-indigo-700">
                {formatPKR(perInstallment)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                × {installmentCount} months = {formatPKR(financed)}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              First Installment Due Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Schedule Preview */}
          {preview.length > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Schedule Preview
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {preview.slice(0, 6).map((inst) => (
                  <div
                    key={inst.num}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold text-slate-700">
                      #{inst.num} — {inst.due.toLocaleDateString('en-PK')}
                    </span>
                    <span className="font-extrabold text-indigo-700">
                      {formatPKR(inst.amount)}
                    </span>
                  </div>
                ))}
                {preview.length > 6 && (
                  <div className="text-center text-[10px] text-slate-500 font-bold py-1">
                    +{preview.length - 6} more installments
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Info Banner */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-900">
              <strong>Yad rakhein:</strong> Down payment customer ne POS pe pay kar diya hai.
              Bachi hui amount installments mein convert ho jaye gi. Customer ko WhatsApp reminders bhej saktay hain.
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Skip</Button>
          <Button
            onClick={() => {
              if (!isValid) {
                toast.error('Check all fields');
                return;
              }
              mutation.mutate();
            }}
            loading={mutation.isPending}
            disabled={!isValid}
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            <CheckCircle2 className="h-4 w-4" /> Create EMI Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
