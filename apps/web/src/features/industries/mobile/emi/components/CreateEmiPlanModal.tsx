import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, CreditCard, User, DollarSign, Calendar, CheckCircle2, Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import { emiApi } from '../api/emi.api';
import { customersApi } from '@/api/customers.api';

interface Props {
  onSuccess?: (planId: string) => void;
  onClose: () => void;
}

const INSTALLMENT_OPTIONS = [3, 6, 9, 12, 18, 24];

export function CreateEmiPlanModal({ onSuccess, onClose }: Props) {
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [installmentCount, setInstallmentCount] = useState(6);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-emi'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const filteredCustomers = useMemo(() => {
    const list = customersData?.items ?? [];
    const q = customerSearch.toLowerCase().trim();
    if (!q) return [];
    return list
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.cnic || '').includes(q),
      )
      .slice(0, 8);
  }, [customersData, customerSearch]);

  const total = Number(totalAmount) || 0;
  const down = Number(downPayment) || 0;
  const financed = Math.max(total - down, 0);
  const perInstallment = installmentCount > 0 ? financed / installmentCount : 0;

  const isValid =
    customerId &&
    customerName.trim() &&
    total > 0 &&
    down < total &&
    installmentCount > 0 &&
    startDate;

  // Generate installment preview
  const installmentPreview = useMemo(() => {
    if (!isValid) return [];
    const start = new Date(startDate);
    let runningTotal = 0;
    const list = [];
    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      const amount = i === installmentCount
        ? Number((financed - runningTotal).toFixed(2))
        : Number(perInstallment.toFixed(2));
      runningTotal += amount;
      list.push({ num: i, dueDate, amount });
    }
    return list;
  }, [isValid, installmentCount, financed, perInstallment, startDate]);

  const mutation = useMutation({
    mutationFn: () =>
      emiApi.create({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        totalAmount: total,
        downPayment: down || undefined,
        installmentCount,
        startDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (plan) => {
      toast.success(`EMI Plan ${plan.planNumber} created with ${installmentCount} installments`);
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
      onSuccess?.(plan.id);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">
                EMI / Installments
              </div>
              <h3 className="font-bold text-slate-900">New EMI Plan</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Customer */}
          <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-900">
              <User className="h-4 w-4" /> Customer
            </div>

            <div className="relative">
              <input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerResults(true);
                }}
                onFocus={() => setShowCustomerResults(true)}
                placeholder="Search by name, phone, or CNIC..."
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
              />
              {showCustomerResults && filteredCustomers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerName(c.name);
                        setCustomerPhone(c.phone || '');
                        setCustomerSearch('');
                        setShowCustomerResults(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-violet-50"
                    >
                      <div className="font-bold text-sm text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {c.phone && `${c.phone} · `}
                        {c.cnic && `CNIC: ${c.cnic} · `}
                        {c.balance > 0 && (
                          <span className="text-amber-700 font-bold">
                            Udhaar: {formatPKR(c.balance)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {customerId && (
              <div className="rounded-lg bg-white border border-violet-300 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-violet-900">{customerName}</div>
                  {customerPhone && (
                    <div className="text-xs text-violet-700">{customerPhone}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerId('');
                    setCustomerName('');
                    setCustomerPhone('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <DollarSign className="h-4 w-4" /> Amounts
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Total Amount (PKR) *"
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="150000"
              />
              <Input
                label="Down Payment (PKR)"
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="30000"
              />
            </div>

            {financed > 0 && (
              <div className="rounded-xl bg-white border border-emerald-300 p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-500">Total</div>
                  <div className="font-extrabold text-slate-900 text-sm">{formatPKR(total)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold text-emerald-700">Down</div>
                  <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(down)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold text-indigo-700">Financed</div>
                  <div className="font-extrabold text-indigo-700 text-sm">{formatPKR(financed)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Installments */}
          <div className="rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <Calendar className="h-4 w-4" /> Installment Plan
            </div>

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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                First Installment Due Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

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
          </div>

          {/* Schedule preview */}
          {installmentPreview.length > 0 && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-700 mb-2">Schedule Preview</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {installmentPreview.map((inst) => (
                  <div
                    key={inst.num}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold text-slate-700">
                      #{inst.num} — {inst.dueDate.toLocaleDateString('en-PK')}
                    </span>
                    <span className="font-extrabold text-indigo-700">
                      {formatPKR(inst.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional terms or info..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!customerId) return toast.error('Customer required');
              if (total <= 0) return toast.error('Total amount required');
              if (down >= total) return toast.error('Down payment must be less than total');
              if (installmentCount <= 0) return toast.error('Installment count required');
              mutation.mutate();
            }}
            loading={mutation.isPending}
            disabled={!isValid}
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            <CheckCircle2 className="h-4 w-4" /> Create Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
