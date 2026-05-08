import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Search, Calendar, Pause, Play, Plus, X, AlertCircle,
} from 'lucide-react';
import {
  adminSubscriptionsApi,
  type SubscriptionStatus,
  type BillingInterval,
} from '@/api/admin-subscriptions.api';
import { adminPlansApi } from '@/api/admin-plans.api';
import { adminTenantsApi } from '@/api/admin-tenants.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const statusColors: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  PAST_DUE: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
};

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const [page, setPage] = useState(1);
  const [assignModal, setAssignModal] = useState(false);
  const [extendModal, setExtendModal] = useState<string | null>(null);

  const [tenantId, setTenantId] = useState('');
  const [planId, setPlanId] = useState('');
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [customDays, setCustomDays] = useState('');
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [notes, setNotes] = useState('');

  const [extendDays, setExtendDays] = useState('30');
  const [extendReason, setExtendReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-subscriptions-stats'],
    queryFn: adminSubscriptionsApi.stats,
  });

  const { data } = useQuery({
    queryKey: ['admin-subscriptions', search, status, page],
    queryFn: () =>
      adminSubscriptionsApi.list({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans-for-assign'],
    queryFn: adminPlansApi.list,
    enabled: assignModal,
  });

  const { data: tenantsData } = useQuery({
    queryKey: ['admin-tenants-for-assign'],
    queryFn: () => adminTenantsApi.list({ limit: 100 }),
    enabled: assignModal,
  });

  const assignMutation = useMutation({
    mutationFn: adminSubscriptionsApi.assign,
    onSuccess: () => {
      toast.success('Plan assigned successfully');
      setAssignModal(false);
      setTenantId('');
      setPlanId('');
      setNotes('');
      setCustomDays('');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Assign failed'),
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, days, reason }: { id: string; days: number; reason?: string }) =>
      adminSubscriptionsApi.extend(id, days, reason),
    onSuccess: () => {
      toast.success('Subscription extended');
      setExtendModal(null);
      setExtendDays('30');
      setExtendReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminSubscriptionsApi.cancel(id, reason),
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: adminSubscriptionsApi.activate,
    onSuccess: () => {
      toast.success('Subscription activated');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <CreditCard className="h-3.5 w-3.5" />
              Subscriptions
            </div>
            <h2 className="mt-3 text-3xl font-bold">Subscriptions Manager</h2>
            <p className="mt-2 text-sm text-white/80">
              Free mein paid plan assign karein, extend karein, cancel karein
            </p>
          </div>
          <Button onClick={() => setAssignModal(true)} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" />
            Assign Plan to Tenant
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs text-emerald-700">Active</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{stats?.active ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <div className="text-xs text-blue-700">Trial</div>
          <div className="mt-1 text-2xl font-bold text-blue-900">{stats?.trial ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4">
          <div className="text-xs text-orange-700">Past Due</div>
          <div className="mt-1 text-2xl font-bold text-orange-900">{stats?.pastDue ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div className="text-xs text-slate-700">Cancelled</div>
          <div className="mt-1 text-2xl font-bold">{stats?.cancelled ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <div className="text-xs text-rose-700">Expired</div>
          <div className="mt-1 text-2xl font-bold text-rose-900">{stats?.expired ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-4">
          <div className="text-xs text-white/80">MRR Estimate</div>
          <div className="mt-1 text-lg font-bold">{formatPKR(stats?.mrrEstimate ?? 0)}</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm"
              placeholder="Search by tenant name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SubscriptionStatus | '');
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-4 font-medium">Tenant</th>
                <th className="text-left px-6 py-4 font-medium">Plan</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium">Amount</th>
                <th className="text-left px-6 py-4 font-medium">Period End</th>
                <th className="text-right px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="font-medium">{s.tenant.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.tenant.slug}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="font-medium">{s.plan.name}</div>
                    <div className="text-xs text-slate-500">{s.interval}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium">{formatPKR(s.amount)}</td>
                  <td className="px-6 py-3 text-xs text-slate-600">
                    {new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(s.currentPeriodEnd))}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => setExtendModal(s.id)}
                        className="text-blue-600 hover:bg-blue-50 rounded-lg p-2"
                        title="Extend"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      {s.status === 'ACTIVE' || s.status === 'TRIAL' ? (
                        <button
                          onClick={() => {
                            const r = prompt('Cancel reason?');
                            if (r !== null) cancelMutation.mutate({ id: s.id, reason: r });
                          }}
                          className="text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                          title="Cancel"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(s.id)}
                          className="text-emerald-600 hover:bg-emerald-50 rounded-lg p-2"
                          title="Activate"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {assignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-xl text-slate-900">Assign Plan to Tenant</h3>
                <p className="text-sm text-slate-500">Manually grant a plan (free or paid)</p>
              </div>
              <button onClick={() => setAssignModal(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tenant</label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="">Select tenant...</option>
                  {(tenantsData?.items ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Plan</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="">Select plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatPKR(p.priceMonthly)}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Interval</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value as BillingInterval)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <Input
                label="Custom Days (optional, overrides interval)"
                type="number"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="e.g. 90 for 3 months"
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-admin-600"
                />
                <span className="text-sm font-medium text-slate-700">
                  Mark as paid (free assignment, no invoice required)
                </span>
              </label>

              <Input
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Free promo for early adopter"
              />

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setAssignModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!tenantId) return toast.error('Tenant select karein');
                    if (!planId) return toast.error('Plan select karein');
                    assignMutation.mutate({
                      tenantId,
                      planId,
                      interval,
                      customDays: customDays ? Number(customDays) : undefined,
                      markAsPaid,
                      notes: notes || undefined,
                    });
                  }}
                  loading={assignMutation.isPending}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4" />
                  Assign Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {extendModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Extend Subscription</h3>
                <p className="text-sm text-slate-500">Add days to current period</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Extra Days"
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
              />
              <Input
                label="Reason (optional)"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="e.g. Goodwill gesture"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="secondary" onClick={() => setExtendModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const d = Number(extendDays);
                  if (!d || d <= 0) return toast.error('Valid days');
                  extendMutation.mutate({
                    id: extendModal,
                    days: d,
                    reason: extendReason || undefined,
                  });
                }}
                loading={extendMutation.isPending}
                className="flex-1"
              >
                Extend
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
