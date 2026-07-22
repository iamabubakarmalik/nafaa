import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Search, X, Save, Edit3, RefreshCw, Sparkles, User,
  Phone, Mail, DollarSign, TrendingUp, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { wholesaleApi, type WholesaleAccount } from '../api/wholesale.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const BUSINESS_TYPES = ['Restaurant', 'Hotel', 'Catering', 'Institution', 'Grocery', 'Wholesaler', 'Other'];

export default function WholesalePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WholesaleAccount | null>(null);

  const { data: accounts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wholesale-accounts', search],
    queryFn: () => wholesaleApi.list({ active: true, search: search.trim() || undefined }),
  });

  const stats = {
    total: accounts.length,
    outstanding: accounts.reduce((s, a) => s + a.totalOutstanding, 0),
    totalRevenue: accounts.reduce((s, a) => s + a.totalPurchases, 0),
    creditLimit: accounts.reduce((s, a) => s + a.creditLimit, 0),
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Building2 className="h-3.5 w-3.5 text-amber-300" />
              B2B Accounts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏢 Wholesale Accounts</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Restaurants, hotels, catering — credit accounts</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Account
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Accounts" value={stats.total} icon={Building2} color="violet" />
        <StatCard label="Total Revenue" value={formatPKR(stats.totalRevenue)} icon={TrendingUp} color="emerald" />
        <StatCard label="Outstanding" value={formatPKR(stats.outstanding)} icon={AlertCircle} color="amber" />
        <StatCard label="Credit Limit" value={formatPKR(stats.creditLimit)} icon={DollarSign} color="blue" />
      </section>

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
      </div>

      {showForm && (
        <WholesaleForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['wholesale-accounts'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No wholesale accounts</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onEdit={() => { setEditing(a); setShowForm(true); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600', emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600', blue: 'from-blue-500 to-cyan-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account, onEdit }: any) {
  const creditUsedPct = account.creditLimit > 0 ? (account.currentBalance / account.creditLimit) * 100 : 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow shrink-0">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white truncate">{account.businessName}</div>
          <div className="text-[10px] font-mono font-bold text-slate-500">{account.accountNumber}</div>
          <div className="text-xs font-extrabold text-violet-600">{account.businessType}</div>
        </div>
        <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>

      {account.contactPerson && (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 font-bold"><User className="h-3 w-3" />{account.contactPerson}</div>
          {account.contactPhone && <div className="flex items-center gap-1 text-slate-600 font-bold"><Phone className="h-3 w-3" />{account.contactPhone}</div>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 text-xs">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Revenue</div>
          <div className="text-sm font-extrabold text-emerald-800 tabular-nums">{formatPKR(account.totalPurchases).replace('Rs', '').trim()}</div>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700">Outstanding</div>
          <div className="text-sm font-extrabold text-amber-800 tabular-nums">{formatPKR(account.totalOutstanding).replace('Rs', '').trim()}</div>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
          <div className="text-[9px] uppercase font-extrabold text-blue-700">Orders</div>
          <div className="text-sm font-extrabold text-blue-800 tabular-nums">{account.totalOrders}</div>
        </div>
      </div>

      {account.creditLimit > 0 && (
        <div>
          <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
            <span className="text-slate-600">Credit Used</span>
            <span className={creditUsedPct > 80 ? 'text-rose-700' : creditUsedPct > 50 ? 'text-amber-700' : 'text-emerald-700'}>
              {formatPKR(account.currentBalance)} / {formatPKR(account.creditLimit)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
            <div className={
              'h-full ' +
              (creditUsedPct > 80 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
               creditUsedPct > 50 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
               'bg-gradient-to-r from-emerald-500 to-green-600')
            } style={{ width: Math.min(creditUsedPct, 100) + '%' }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 text-xs pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div><span className="text-slate-500 font-semibold">Credit Days:</span> <span className="font-extrabold">{account.creditDays}d</span></div>
        <div><span className="text-slate-500 font-semibold">Discount:</span> <span className="font-extrabold text-emerald-700">{account.discountPct}%</span></div>
      </div>
    </div>
  );
}

function WholesaleForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerId: editing?.customerId ?? '',
    businessName: editing?.businessName ?? '',
    businessType: editing?.businessType ?? 'Restaurant',
    creditLimit: editing?.creditLimit ?? 0,
    creditDays: editing?.creditDays ?? 30,
    discountPct: editing?.discountPct ?? 0,
    requiresDelivery: editing?.requiresDelivery ?? true,
    contactPerson: editing?.contactPerson ?? '',
    contactPhone: editing?.contactPhone ?? '',
    contactEmail: editing?.contactEmail ?? '',
    billingAddress: editing?.billingAddress ?? '',
    deliveryAddress: editing?.deliveryAddress ?? '',
    gstNumber: editing?.gstNumber ?? '',
    ntnNumber: editing?.ntnNumber ?? '',
    notes: editing?.notes ?? '',
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(!editing);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-wholesale', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        creditLimit: Number(form.creditLimit) || 0,
        creditDays: Number(form.creditDays) || 30,
        discountPct: Number(form.discountPct) || 0,
      };
      return editing ? wholesaleApi.update(editing.id, payload) : wholesaleApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Account created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Account' : 'New Wholesale Account'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {!editing && (
          selectedCustomer ? (
            <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 flex items-center gap-3">
              <User className="h-5 w-5 text-violet-600" />
              <div className="flex-1"><div className="font-extrabold">{selectedCustomer.name}</div></div>
              <button onClick={() => { setSelectedCustomer(null); setForm({ ...form, customerId: '' }); setShowPicker(true); }} className="text-xs font-extrabold text-violet-600 hover:underline">Change</button>
            </div>
          ) : (
            <div>
              <label className="text-[10px] uppercase font-extrabold mb-1 block">Select Customer *</label>
              <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-11 w-full rounded-xl border-2 border-violet-200 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <div className="mt-2 max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-200">
                {(customersData?.items ?? []).map((c) => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setForm({ ...form, customerId: c.id, businessName: c.name }); setShowPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-violet-50 text-left">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {(form.customerId || editing) && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Business Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>

            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
              <div className="text-sm font-extrabold text-emerald-900">💳 Credit Terms</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Credit Limit (Rs)</label>
                  <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Credit Days</label>
                  <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Discount %</label>
                  <input type="number" step="0.1" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="GST #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
              <input value={form.ntnNumber} onChange={(e) => setForm({ ...form, ntnNumber: e.target.value })} placeholder="NTN #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
            </div>

            <textarea rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} placeholder="Billing address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
            <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Delivery address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.businessName}>
                <Save className="h-4 w-4" />
                {editing ? 'Update' : 'Create Account'}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
