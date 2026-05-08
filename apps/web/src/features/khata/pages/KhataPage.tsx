import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, ArrowDownToLine, ArrowUpFromLine, Wallet, Users, AlertTriangle,
} from 'lucide-react';
import { customerLedgerApi, type LedgerType } from '@/api/customer-ledger.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const typeLabels: Record<LedgerType, { label: string; tone: string }> = {
  SALE_CREDIT: { label: 'Udhaar (Credit)', tone: 'bg-rose-100 text-rose-700' },
  PAYMENT_RECEIVED: { label: 'Payment Received', tone: 'bg-emerald-100 text-emerald-700' },
  ADJUSTMENT: { label: 'Adjustment', tone: 'bg-slate-100 text-slate-700' },
  OPENING_BALANCE: { label: 'Opening Balance', tone: 'bg-blue-100 text-blue-700' },
};

export default function KhataPage() {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['khata-summary'],
    queryFn: customerLedgerApi.summary,
  });

  const { data: allCustomers } = useQuery({
    queryKey: ['customers-for-khata'],
    queryFn: () => customersApi.list({ page: 1, limit: 200 }),
  });

  const { data: ledgerData } = useQuery({
    queryKey: ['khata-ledger', selectedCustomerId],
    queryFn: () => customerLedgerApi.list(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  const paymentMutation = useMutation({
    mutationFn: ({ customerId, payload }: any) =>
      customerLedgerApi.receivePayment(customerId, payload),
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      setPaymentAmount('');
      setPaymentNote('');
      queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
      queryClient.invalidateQueries({ queryKey: ['khata-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-khata'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Payment fail ho gayi');
    },
  });

  const handleReceivePayment = () => {
    if (!selectedCustomerId) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return toast.error('Valid amount likhein');
    paymentMutation.mutate({
      customerId: selectedCustomerId,
      payload: {
        amount,
        note: paymentNote.trim() || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <BookOpen className="h-3.5 w-3.5" />
              Customer Credit System
            </div>
            <h2 className="mt-3 text-3xl font-bold">Khata (Udhaar Book)</h2>
            <p className="mt-2 text-sm text-white/80">
              Customers ka udhaar track karein aur payment receive karein.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Outstanding</div>
              <div className="mt-2 text-2xl font-bold text-rose-700">
                {formatPKR(summary?.totalOutstanding ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Customers with Credit</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.customersWithCredit ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Customers</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.totalCustomers ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[400px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Top Debtors</h3>
            <p className="text-xs text-slate-500">Click to view ledger</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {(allCustomers?.items ?? []).filter((c) => c.balance > 0).length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                Koi customer udhaar mein nahi hai 🎉
              </div>
            ) : (
              (allCustomers?.items ?? [])
                .filter((c) => c.balance > 0)
                .sort((a, b) => b.balance - a.balance)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full px-6 py-4 text-left hover:bg-slate-50 transition ${
                      selectedCustomerId === c.id ? 'bg-rose-50 border-l-4 border-rose-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.phone || 'No phone'}</div>
                      </div>
                      <div className="font-bold text-rose-700 text-right">
                        {formatPKR(c.balance)}
                      </div>
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {!selectedCustomerId ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Customer select karein</h4>
              <p className="mt-1 text-sm text-slate-500">Left side se customer click karein ledger dekhne ke liye</p>
            </div>
          ) : ledgerData ? (
            <>
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{ledgerData.customer.name}</h3>
                    <p className="text-sm text-slate-500">{ledgerData.customer.phone || 'No phone'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Outstanding Balance</div>
                    <div className="text-2xl font-bold text-rose-700">
                      {formatPKR(ledgerData.customer.balance)}
                    </div>
                  </div>
                </div>

                {ledgerData.customer.balance > 0 && (
                  <div className="mt-5 grid sm:grid-cols-[1fr_1fr_auto] gap-3">
                    <Input
                      type="number"
                      placeholder="Amount received"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <Input
                      placeholder="Note (optional)"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                    />
                    <Button
                      onClick={handleReceivePayment}
                      loading={paymentMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Receive Payment
                    </Button>
                  </div>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {ledgerData.ledgers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Koi transaction nahi hai
                  </div>
                ) : (
                  ledgerData.ledgers.map((l) => {
                    const cfg = typeLabels[l.type];
                    const isCredit = l.amount > 0;
                    const Icon = isCredit ? ArrowUpFromLine : ArrowDownToLine;
                    return (
                      <div key={l.id} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.tone}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">{cfg.label}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {l.note || l.reference || '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatDate(l.createdAt)} • {l.createdBy?.fullName || 'System'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-bold ${isCredit ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {isCredit ? '+' : ''}{formatPKR(l.amount)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Bal: {formatPKR(l.balanceAfter)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          )}
        </div>
      </section>
    </div>
  );
}
