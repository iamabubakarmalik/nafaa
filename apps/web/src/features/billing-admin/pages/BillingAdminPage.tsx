import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Eye, Download,
  TrendingUp, AlertCircle,
} from 'lucide-react';
import { billingAdminApi } from '@/api/billing-admin.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@nafaa/shared-utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function BillingAdminPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['billing-admin-stats'],
    queryFn: billingAdminApi.stats,
    enabled: role === 'OWNER',
  });

  const { data: pending = [] } = useQuery({
    queryKey: ['billing-admin-pending'],
    queryFn: billingAdminApi.pending,
    enabled: role === 'OWNER' && tab === 'pending',
  });

  const { data: all = [] } = useQuery({
    queryKey: ['billing-admin-all'],
    queryFn: billingAdminApi.all,
    enabled: role === 'OWNER' && tab === 'all',
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => billingAdminApi.approve(id),
    onSuccess: () => {
      toast.success('Payment approved! Subscription active ho gayi.');
      queryClient.invalidateQueries({ queryKey: ['billing-admin-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-admin-all'] });
      queryClient.invalidateQueries({ queryKey: ['billing-admin-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Approve fail'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      billingAdminApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Payment rejected');
      setRejectModal(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['billing-admin-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-admin-all'] });
      queryClient.invalidateQueries({ queryKey: ['billing-admin-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Reject fail'),
  });

  if (role !== 'OWNER') {
    return (
      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-8 text-center">
        <ShieldCheck className="h-12 w-12 text-amber-700 mx-auto" />
        <h3 className="mt-3 font-bold text-amber-900">Owner Only</h3>
        <p className="text-sm text-amber-700 mt-2">
          Sirf shop ka Owner payments approve kar sakta hai.
        </p>
      </div>
    );
  }

  const list = tab === 'pending' ? pending : all;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Payment Approvals
          </div>
          <h2 className="mt-3 text-3xl font-bold">Billing Admin</h2>
          <p className="mt-2 text-sm text-white/80">
            Manual payments approve/reject karein
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Pending</div>
              <div className="mt-2 text-2xl font-bold text-amber-700">
                {stats?.pending ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Approved</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {stats?.approved ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Rejected</div>
              <div className="mt-2 text-2xl font-bold text-rose-700">
                {stats?.rejected ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">Total Approved</div>
              <div className="mt-2 text-xl font-bold">
                {formatPKR(stats?.totalApproved ?? 0)}
              </div>
            </div>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === 'pending'
              ? 'bg-violet-600 text-white'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          Pending ({stats?.pending ?? 0})
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === 'all'
              ? 'bg-violet-600 text-white'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          All Payments
        </button>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h4 className="mt-4 text-lg font-semibold text-slate-900">All clear! 🎉</h4>
            <p className="mt-1 text-sm text-slate-500">
              {tab === 'pending' ? 'Koi pending payment nahi' : 'Koi payment record nahi'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((p: any) => (
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
                      <div className="text-sm text-slate-600 mt-1">
                        {p.payerName || 'Unknown'} • {p.provider}
                      </div>
                      {p.invoice && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Invoice: <span className="font-mono">{p.invoice.invoiceNumber}</span>
                        </div>
                      )}
                      {p.transactionId && (
                        <div className="text-xs text-slate-500">
                          Txn: <span className="font-mono">{p.transactionId}</span>
                        </div>
                      )}
                      {p.bankName && (
                        <div className="text-xs text-slate-500">
                          From: {p.bankName}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        Submitted: {formatDate(p.createdAt)}
                      </div>
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
                        View Receipt
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
                          className="text-rose-700 border-rose-200 hover:bg-rose-50"
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
              placeholder="Reason: e.g., Receipt blurry, Amount mismatch..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />

            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!rejectReason.trim()) return toast.error('Reason likhein');
                  rejectMutation.mutate({ id: rejectModal, reason: rejectReason.trim() });
                }}
                loading={rejectMutation.isPending}
                className="flex-1 bg-rose-600 hover:bg-rose-700"
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
