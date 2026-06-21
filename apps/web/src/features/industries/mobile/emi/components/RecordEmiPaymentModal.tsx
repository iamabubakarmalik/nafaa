import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Banknote, CreditCard, Smartphone, Building2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import { emiApi } from '../api/emi.api';
import type { PaymentMethod } from '@/api/sales.api';

interface Props {
  planId: string;
  planNumber: string;
  installmentId: string;
  installmentNumber: number;
  installmentAmount: number;
  alreadyPaid: number;
  onClose: () => void;
}

const METHODS: { val: PaymentMethod; label: string; icon: any }[] = [
  { val: 'CASH', label: 'Cash', icon: Banknote },
  { val: 'CARD', label: 'Card', icon: CreditCard },
  { val: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { val: 'EASYPAISA', label: 'EasyPaisa', icon: Zap },
  { val: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
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
      toast.success(`Payment of ${formatPKR(Number(amount))} recorded`);
      queryClient.invalidateQueries({ queryKey: ['emi-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
                Installment #{installmentNumber}
              </div>
              <h3 className="font-bold text-slate-900">{planNumber}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-500">Amount</div>
              <div className="font-extrabold text-slate-900 text-sm">
                {formatPKR(installmentAmount)}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase font-bold text-emerald-700">Paid</div>
              <div className="font-extrabold text-emerald-700 text-sm">
                {formatPKR(alreadyPaid)}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase font-bold text-amber-700">Balance</div>
              <div className="font-extrabold text-amber-700 text-sm">{formatPKR(balance)}</div>
            </div>
          </div>

          <Input
            label="Payment Amount (PKR) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-5 gap-1.5">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.val;
              return (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setMethod(m.val)}
                  className={`p-2 rounded-lg border-2 text-[10px] font-bold transition ${
                    active
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mx-auto mb-0.5" />
                  {m.label}
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
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any reference"
          />
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!amount || Number(amount) <= 0) return toast.error('Amount required');
              if (Number(amount) > balance + 0.01)
                return toast.error(`Cannot exceed balance ${formatPKR(balance)}`);
              mutation.mutate();
            }}
            loading={mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Record Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
