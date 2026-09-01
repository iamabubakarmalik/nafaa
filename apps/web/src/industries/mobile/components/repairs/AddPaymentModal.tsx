import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Banknote, CreditCard, Smartphone, Building2, Zap,
  AlertTriangle, CheckCircle2, Copy, Printer, Sparkles,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { repairsApi } from '../../api/repairs.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

interface Props {
  ticketId: string;
  ticketNumber: string;
  balanceDue: number;
  customerName?: string;
  onClose: () => void;
}

const METHODS: {
  val: PaymentMethod;
  label: string;
  icon: any;
  color: string;
  hint?: string;
}[] = [
  { val: 'CASH', label: 'Cash', icon: Banknote, color: 'emerald', hint: 'Fauran' },
  { val: 'CARD', label: 'Card', icon: CreditCard, color: 'blue', hint: 'POS' },
  { val: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: 'orange', hint: 'Mobile' },
  { val: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: 'green', hint: 'Mobile' },
  { val: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: 'violet', hint: 'IBFT' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export function AddPaymentModal({
  ticketId, ticketNumber, balanceDue, customerName, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(balanceDue));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [printAfter, setPrintAfter] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, method, reference, notes]);

  const amtN = Number(amount) || 0;
  const isOverpay = amtN > balanceDue && balanceDue > 0;
  const isPartial = amtN > 0 && amtN < balanceDue;
  const remaining = Math.max(0, balanceDue - amtN);

  const needsRef = method !== 'CASH' && method !== 'CARD';

  const mutation = useMutation({
    mutationFn: () =>
      repairsApi.addPayment(ticketId, {
        amount: amtN,
        paymentMethod: method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment record ho gaya ✅');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      if (printAfter) printReceipt();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const printReceipt = () => {
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${ticketNumber}</title>
<style>
@page { size: 80mm auto; margin: 3mm; }
body { font-family: 'Courier New', monospace; font-size: 11px; width: 74mm; margin: 0; padding: 2mm; color: #000; }
.center { text-align: center; }
.bold { font-weight: bold; }
.big { font-size: 14px; }
.divider { border-top: 1px dashed #000; margin: 4px 0; }
.row { display: flex; justify-content: space-between; margin: 2px 0; }
</style></head><body>
<div class="center bold big">PAYMENT RECEIPT</div>
<div class="center">Ticket: ${ticketNumber}</div>
<div class="center">${new Date().toLocaleString('en-PK')}</div>
<div class="divider"></div>
${customerName ? `<div class="row"><span>Customer:</span><span class="bold">${customerName}</span></div>` : ''}
<div class="row"><span>Method:</span><span class="bold">${method}</span></div>
${reference ? `<div class="row"><span>Ref:</span><span>${reference}</span></div>` : ''}
<div class="divider"></div>
<div class="row big bold"><span>PAID:</span><span>Rs ${amtN.toLocaleString()}</span></div>
${remaining > 0 ? `<div class="row"><span>Balance:</span><span class="bold">Rs ${remaining.toLocaleString()}</span></div>` : '<div class="center bold">✓ FULLY PAID</div>'}
<div class="divider"></div>
<div class="center">Shukriya!</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w) return toast.error('Popup blocked');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  const submit = () => {
    if (amtN <= 0) return toast.error('Amount required');
    if (needsRef && !reference.trim()) {
      if (!confirm('Reference/Transaction ID nahi hai. Continue?')) return;
    }
    if (isOverpay) {
      if (!confirm(`Balance sirf ${formatPKR(balanceDue)} hai. Extra ${formatPKR(amtN - balanceDue)} lene ka pakka?`))
        return;
    }
    mutation.mutate();
  };

  const activeMethod = METHODS.find((m) => m.val === method)!;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold">
                Payment Record
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{ticketNumber}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {balanceDue > 0 ? (
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">
                Balance Due
              </div>
              <div className="text-3xl font-extrabold text-amber-900 dark:text-amber-100">
                {formatPKR(balanceDue)}
              </div>
              {customerName && (
                <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-bold">
                  from {customerName}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-3 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                Fully Paid! Overpay / advance record kar rahay ho.
              </div>
            </div>
          )}

          <Input
            label="Amount (PKR) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-1.5">
            {balanceDue > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(balanceDue))}
                className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold"
              >
                Full ({formatPKR(balanceDue)})
              </button>
            )}
            {balanceDue > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(balanceDue / 2)))}
                className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 text-blue-800 dark:text-blue-200 text-[10px] font-bold"
              >
                Half
              </button>
            )}
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold"
              >
                Rs {a >= 1000 ? `${a / 1000}k` : a}
              </button>
            ))}
          </div>

          {/* Warnings */}
          {isPartial && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2 flex items-start gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-blue-900 dark:text-blue-200">
                <strong>Partial payment:</strong> Baaki {formatPKR(remaining)} bacha hai.
              </div>
            </div>
          )}
          {isOverpay && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 px-3 py-2 flex items-start gap-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-rose-900 dark:text-rose-200">
                <strong>Overpay:</strong> Extra {formatPKR(amtN - balanceDue)} — advance/tip banega.
              </div>
            </div>
          )}

          {/* Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Payment Method
            </label>
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
                        ? `bg-${m.color}-50 dark:bg-${m.color}-950/40 border-${m.color}-400 text-${m.color}-800 dark:text-${m.color}-200 shadow`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mx-auto mb-1" />
                    {m.label}
                    {m.hint && (
                      <div className="text-[8px] font-normal opacity-60 mt-0.5">{m.hint}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={`Reference / Txn ID ${needsRef ? '(recommended)' : ''}`}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={needsRef ? 'TRX123456...' : 'Optional'}
              />
            </div>
            {reference && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(reference);
                  toast.success('Copy ho gaya');
                }}
                className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center mb-0"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
          </div>

          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={printAfter}
              onChange={(e) => setPrintAfter(e.target.checked)}
              className="rounded"
            />
            <Printer className="h-3.5 w-3.5" /> Save ke baad receipt print karo (80mm thermal)
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            loading={mutation.isPending}
            className={`bg-${activeMethod.color}-600 hover:bg-${activeMethod.color}-700`}
          >
            <CheckCircle2 className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
