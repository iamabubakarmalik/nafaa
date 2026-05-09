import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Clock, CheckCircle2, XCircle, Eye, AlertCircle,
  Search, TrendingUp, Wallet,
} from 'lucide-react';
import { adminBillingApi, type PaymentStatus } from '@/api/admin-billing.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(v),
  );

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PaymentStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-billing-stats'],
    queryFn: adminBillingApi.stats,
  });

  const { data } = useQuery({
    queryKey: ['admin-billing-list', tab, search],
    queryFn: () =>
      adminBillingApi.list({
        status: tab === 'ALL' ? undefined : tab,
        search: search || undefined,
        page: 1,
        limit: 50,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminBillingApi.approve(id),
    onSuccess: () => {
      toast.success('Payment approved!');
      queryClient.invalidateQueries({ queryKey: ['admin-billing-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-billing-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Approve failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminBillingApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Payment rejected');
      setRejectModal(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-billing-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-billing-stats'] });
    },
  });

  const list = data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <CreditCard className="h-3.5 w-3.5" />
          Payment Approvals
        </div>
        <h2 className="mt-3 text-3xl font-bold">Billing Center</h2>
        <p className="mt-2 text-sm text-white/80">
          Manual payments approve/reject karein — tenants ki subscription activate karein
        </p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Pending</div>
              <div className="mt-1 text-2xl font-bold text-amber-700">
                {stats?.pending ?? 0}
              </div>
            </div>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Approved</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {stats?.approved ?? 0}
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Rejected</div>
              <div className="mt-1 text-2xl font-bold text-rose-700">
                {stats?.rejected ?? 0}
              </div>
            </div>
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Today Revenue</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {formatPKR(stats?.todayApproved ?? 0)}
              </div>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-600" />
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/80">Total Revenue</div>
              <div className="mt-1 text-lg font-bold">
                {formatPKR(stats?.totalApproved ?? 0)}
              </div>
            </div>
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </section>

      <div className="flex gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === t
                ? 'bg-admin-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm"
            placeholder="Search transaction, tenant, payer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No payments here</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {p.status === 'PENDING' && <Clock className="h-6 w-6" />}
                      {p.status === 'APPROVED' && <CheckCircle2 className="h-6 w-6" />}
                      {p.status === 'REJECTED' && <XCircle className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xl text-slate-900">{formatPKR(p.amount)}</div>
                      <div className="text-sm text-slate-700 mt-0.5">
                        <span className="font-semibold">{p.tenant.name}</span> • {p.provider}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Payer: {p.payerName || '—'}
                        {p.invoice && (
                          <> • Invoice: <span className="font-mono">{p.invoice.invoiceNumber}</span></>
                        )}
                      </div>
                      {p.transactionId && (
                        <div className="text-xs text-slate-500">Txn: <span className="font-mono">{p.transactionId}</span></div>
                      )}
                      {p.bankName && (
                        <div className="text-xs text-slate-500">From: {p.bankName}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">{formatDate(p.createdAt)}</div>
                      {p.rejectionReason && (
                        <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded-lg px-2 py-1 inline-block">
                          ✗ {p.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {p.upload && (
                      <a
                        href={p.upload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        Receipt
                      </a>
                    )}
                    {p.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          loading={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(p.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRejectModal(p.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reject Payment?</h3>
                <p className="text-sm text-slate-500">User ko reason notify hoga</p>
              </div>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />

            <div className="flex gap-2 mt-4">
              <Button variant="secondary" onClick={() => setRejectModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!rejectReason.trim()) return toast.error('Reason likhein');
                  rejectMutation.mutate({ id: rejectModal, reason: rejectReason.trim() });
                }}
                loading={rejectMutation.isPending}
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
