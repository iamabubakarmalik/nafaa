import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard, Plus, Search, X, Save, RefreshCw, Sparkles, AlertCircle,
  User, Phone, DollarSign, Calendar, Ban, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { creditAccountsApi, type AccountStatus, type CreditAccount } from '../api/credit-accounts.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-600' },
  SUSPENDED: { label: 'Suspended', color: 'bg-amber-500' },
  CLOSED: { label: 'Closed', color: 'bg-slate-500' },
  DEFAULTED: { label: 'Defaulted', color: 'bg-red-600' },
  OVERDUE: { label: 'Overdue', color: 'bg-rose-500' },
};

export default function CreditAccountsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CreditAccount | null>(null);

  const { data: accounts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['credit-accounts', statusFilter, search],
    queryFn: () => creditAccountsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: aging } = useQuery({
    queryKey: ['credit-aging'],
    queryFn: () => creditAccountsApi.agingReport(),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Khata / Credit
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💳 Credit Accounts</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Customer khata with credit limits & aging</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />New Account
            </Button>
          </div>
        </div>
      </section>

      {aging && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
          <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2">📊 Aging Analysis</h3>
          <div className="grid sm:grid-cols-5 gap-3">
            <div className="rounded-xl bg-slate-100 dark:bg-neutral-800 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Total Outstanding</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(aging.totalOutstanding)}</div>
              <div className="text-[10px] font-bold text-slate-500">{aging.accountsCount} accounts</div>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">0-30 Days</div>
              <div className="text-lg font-extrabold text-emerald-900 tabular-nums">{formatPKR(aging.age0To30)}</div>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-blue-700">31-60 Days</div>
              <div className="text-lg font-extrabold text-blue-900 tabular-nums">{formatPKR(aging.age31To60)}</div>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-amber-700">61-90 Days</div>
              <div className="text-lg font-extrabold text-amber-900 tabular-nums">{formatPKR(aging.age61To90)}</div>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-center border-2 border-rose-300">
              <div className="text-[10px] uppercase font-extrabold text-rose-700">90+ Days</div>
              <div className="text-lg font-extrabold text-rose-900 tabular-nums">{formatPKR(aging.ageOver90)}</div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search account #, customer, phone, CNIC..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-rose-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setStatusFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === 'all' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === k ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{v.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <AccountForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['credit-accounts'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <CreditCard className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No credit accounts</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {accounts.map((a) => <AccountCard key={a.id} a={a} />)}
        </section>
      )}
    </div>
  );
}

function AccountCard({ a }: any) {
  const cfg = STATUS_CONFIG[a.status as AccountStatus];
  const utilizationPct = a.creditLimit > 0 ? (a.currentBalance / a.creditLimit) * 100 : 0;

  return (
    <Link to={'/hardware/credit-accounts/' + a.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold">{a.accountNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>{cfg.label}</span>
              {a.ageOver90Days > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold uppercase animate-pulse inline-flex items-center gap-0.5">
                  <AlertCircle className="h-2 w-2" />
                  90+ Days
                </span>
              )}
            </div>
            <div className="mt-1 font-extrabold">{a.customerName}</div>
            {a.businessName && <div className="text-xs text-slate-600 font-bold">{a.businessName}</div>}
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              {a.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{a.customerPhone}</span>}
              {a.customerCnic && <span className="font-mono">CNIC: {a.customerCnic}</span>}
              <span>Credit Days: {a.creditDays}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={
            'text-2xl font-extrabold tabular-nums ' +
            (a.currentBalance > a.creditLimit ? 'text-rose-700' : 'text-slate-900 dark:text-white')
          }>{formatPKR(a.currentBalance)}</div>
          <div className="text-[10px] font-bold text-slate-500">Limit: {formatPKR(a.creditLimit)}</div>
        </div>
      </div>

      {a.creditLimit > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
            <span className="text-slate-500">Credit Utilization</span>
            <span className={utilizationPct > 100 ? 'text-rose-700' : utilizationPct > 80 ? 'text-amber-700' : 'text-emerald-700'}>
              {utilizationPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
            <div className={
              'h-full ' +
              (utilizationPct > 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
               utilizationPct > 80 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
               'bg-gradient-to-r from-emerald-500 to-green-600')
            } style={{ width: Math.min(utilizationPct, 100) + '%' }} />
          </div>
        </div>
      )}
    </Link>
  );
}

function AccountForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerId: editing?.customerId ?? '',
    customerName: editing?.customerName ?? '',
    customerPhone: editing?.customerPhone ?? '',
    customerCnic: editing?.customerCnic ?? '',
    businessName: editing?.businessName ?? '',
    businessAddress: editing?.businessAddress ?? '',
    creditLimit: editing?.creditLimit ?? 100000,
    creditDays: editing?.creditDays ?? 30,
    interestRateMonthly: editing?.interestRateMonthly ?? 0,
    guarantorName: editing?.guarantorName ?? '',
    guarantorPhone: editing?.guarantorPhone ?? '',
    guarantorCnic: editing?.guarantorCnic ?? '',
    guarantorRelation: editing?.guarantorRelation ?? '',
    chequeSecurity: editing?.chequeSecurity ?? '',
    referredBy: editing?.referredBy ?? '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        creditLimit: Number(form.creditLimit) || 0,
        creditDays: Number(form.creditDays) || 30,
        interestRateMonthly: Number(form.interestRateMonthly) || 0,
      };
      return editing ? creditAccountsApi.update(editing.id, payload) : creditAccountsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Account updated' : 'Account created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Account' : 'New Credit Account'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          <input value={form.customerCnic} onChange={(e) => setForm({ ...form, customerCnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-rose-500" />
          <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Business name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        </div>
        <textarea rows={2} value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} placeholder="Business address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 flex items-center gap-2"><DollarSign className="h-4 w-4" />Credit Terms</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Limit *</label>
              <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Days</label>
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Interest %/month</label>
              <input type="number" step="0.1" value={form.interestRateMonthly} onChange={(e) => setForm({ ...form, interestRateMonthly: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-violet-900 flex items-center gap-2"><User className="h-4 w-4" />Guarantor</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.guarantorName} onChange={(e) => setForm({ ...form, guarantorName: e.target.value })} placeholder="Guarantor name" className="h-11 rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            <input value={form.guarantorPhone} onChange={(e) => setForm({ ...form, guarantorPhone: e.target.value })} placeholder="Guarantor phone" className="h-11 rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            <input value={form.guarantorCnic} onChange={(e) => setForm({ ...form, guarantorCnic: e.target.value })} placeholder="Guarantor CNIC" className="h-11 rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            <input value={form.guarantorRelation} onChange={(e) => setForm({ ...form, guarantorRelation: e.target.value })} placeholder="Relation (father, brother)" className="h-11 rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <input value={form.chequeSecurity} onChange={(e) => setForm({ ...form, chequeSecurity: e.target.value })} placeholder="Cheque security (bank + amount)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <input value={form.referredBy} onChange={(e) => setForm({ ...form, referredBy: e.target.value })} placeholder="Referred by" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create Account'}
          </Button>
        </div>
      </div>
    </section>
  );
}
