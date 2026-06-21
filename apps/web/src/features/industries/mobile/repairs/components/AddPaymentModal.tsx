import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Banknote, CreditCard, Smartphone, Building2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import { repairsApi } from '../api/repairs.api';
import type { PaymentMethod } from '@/api/sales.api';

interface Props {
  ticketId: string;
  ticketNumber: string;
  balanceDue: number;
  onClose: () => void;
}

const METHODS: { val: PaymentMethod; label: string; icon: any; color: string }[] = [
  { val: 'CASH', label: 'Cash', icon: Banknote, color: 'emerald' },
  { val: 'CARD', label: 'Card', icon: CreditCard, color: 'blue' },
  { val: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: 'orange' },
  { val: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: 'green' },
  { val: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: 'violet' },
];

export function AddPaymentModal({ ticketId, ticketNumber, balanceDue, onClose }: Props) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(balanceDue));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      repairsApi.addPayment(ticketId, {
        amount: Number(amount),
        paymentMethod: method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
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
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Add Payment</div>
              <h3 className="font-bold text-slate-900">{ticketNumber}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {balanceDue > 0 && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-700">Balance Due</div>
              <div className="text-2xl font-extrabold text-amber-900">{formatPKR(balanceDue)}</div>
            </div>
          )}

          <Input
            label="Amount (PKR) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Method</label>
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
                    <Icon className="h-4 w-4 mx-auto mb-1" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Reference / Transaction ID"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
          />

          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!amount || Number(amount) <= 0) return toast.error('Amount required');
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
