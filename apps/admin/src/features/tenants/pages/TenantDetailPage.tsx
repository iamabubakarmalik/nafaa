import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Building2, ArrowLeft, Trash2, Pause, Play, AlertCircle,
  Users, Package, ShoppingCart, Wallet, TrendingUp, Receipt, Phone,
  CreditCard, Gift, Eye,
} from 'lucide-react';
import { adminTenantsApi, type TenantStatus } from '@/api/admin-tenants.api';
import { adminImpersonateApi } from '@/api/admin-impersonate.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';
import TenantNotesPanel from '@/features/notes/pages/TenantNotesPanel';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
};

export default function TenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => adminTenantsApi.getOne(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: TenantStatus; reason?: string }) =>
      adminTenantsApi.updateStatus(id!, status, reason),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminTenantsApi.remove(id!),
    onSuccess: () => {
      toast.success('Tenant deleted');
      navigate('/tenants');
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => adminImpersonateApi.impersonate(id!),
    onSuccess: (data) => {
      const tenantUrl = (import.meta.env.VITE_TENANT_URL as string) || 'http://localhost:5173';
      const url = `${tenantUrl}/login?impersonate=1&access=${encodeURIComponent(data.accessToken)}&refresh=${encodeURIComponent(data.refreshToken)}`;
      window.open(url, '_blank');
      toast.success('Tenant ki side new tab mein open ho rahi hai');
    },
  });

  if (isLoading || !data) return <div className="p-6 text-slate-500">Loading...</div>;

  const { tenant, stats } = data;

  const summaryCards = [
    { label: 'Users', value: tenant._count.users, icon: Users, color: 'bg-admin-100 text-admin-700' },
    { label: 'Products', value: tenant._count.products, icon: Package, color: 'bg-violet-100 text-violet-700' },
    { label: 'Customers', value: tenant._count.customers, icon: Users, color: 'bg-blue-100 text-blue-700' },
    { label: 'Sales', value: tenant._count.sales, icon: ShoppingCart, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Suppliers', value: tenant._count.suppliers, icon: Building2, color: 'bg-orange-100 text-orange-700' },
    { label: 'Shops', value: tenant._count.shops, icon: Building2, color: 'bg-pink-100 text-pink-700' },
  ];

  return (
    <div className="space-y-6">
      <Link to="/tenants" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Tenants
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5" /> Tenant Profile
            </div>
            <h2 className="mt-3 text-3xl font-bold">{tenant.name}</h2>
            <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-white/80">
              <span className="font-mono">{tenant.slug}</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[tenant.status]}`}>
                {tenant.status}
              </span>
              {tenant.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {tenant.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => impersonateMutation.mutate()} loading={impersonateMutation.isPending}
              className="bg-white text-slate-900 hover:bg-slate-100">
              <Eye className="h-4 w-4" /> Login as Tenant
            </Button>

            {tenant.status === 'SUSPENDED' ? (
              <Button onClick={() => statusMutation.mutate({ status: 'ACTIVE' })}
                loading={statusMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="h-4 w-4" /> Activate
              </Button>
            ) : (
              <Button onClick={() => {
                const r = prompt('Suspend reason?') || 'Suspended by admin';
                statusMutation.mutate({ status: 'SUSPENDED', reason: r });
              }} loading={statusMutation.isPending} variant="secondary">
                <Pause className="h-4 w-4" /> Suspend
              </Button>
            )}

            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Revenue</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">{formatPKR(stats.totalRevenue)}</div>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Cost of Goods</div>
          <div className="mt-2 text-2xl font-bold">{formatPKR(stats.totalCogs)}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Expenses</div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{formatPKR(stats.totalExpenses)}</div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">{c.label}</div>
                  <div className="mt-1 text-lg font-bold">{c.value}</div>
                </div>
                <div className={`h-9 w-9 rounded-xl ${c.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <TenantNotesPanel tenantId={tenant.id} />

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h3 className="font-bold">Team Members</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {tenant.users.map((u: any) => (
              <div key={u.id} className="px-6 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{u.fullName}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </div>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <h3 className="font-bold">Subscriptions</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {tenant.subscriptions.length === 0 && (
              <div className="px-6 py-6 text-sm text-slate-500 text-center">No subscriptions</div>
            )}
            {tenant.subscriptions.map((s: any) => (
              <div key={s.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.plan.name}</div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">{s.status}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatPKR(s.amount)} / {s.interval}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold">Recent Invoices</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {tenant.invoices.length === 0 && (
              <div className="p-6 text-sm text-slate-500 text-center">No invoices</div>
            )}
            {tenant.invoices.map((i: any) => (
              <div key={i.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div className="font-mono text-xs">{i.invoiceNumber}</div>
                <div className="font-bold">{formatPKR(i.total)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Gift className="h-4 w-4 text-pink-600" />
            <h3 className="font-bold">Referral Info</h3>
          </div>
          <div className="p-6 space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Referral Code</div>
              <div className="font-mono font-bold">{tenant.referralCode || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Account Credit</div>
              <div className="font-bold text-emerald-700">{formatPKR(tenant.accountCredit)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Referred Tenants</div>
              <div className="font-bold">{tenant._count.referredTenants}</div>
            </div>
          </div>
        </div>
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Delete Tenant?</h3>
                <p className="text-sm text-slate-500">Cannot be undone</p>
              </div>
            </div>
            <p className="text-sm">
              <strong>{tenant.name}</strong> ka data permanently delete ho jayega.
            </p>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending} className="flex-1">
                Delete Forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
