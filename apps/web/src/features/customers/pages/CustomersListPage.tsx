import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Star, Phone, MapPin, TrendingUp, Wallet,
  Crown, SlidersHorizontal, Trash2, Edit3, X, Eye, Sparkles,
  MessageCircle, Mail, Download,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

export default function CustomersListPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '',
    page: 1,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  const items = data?.items ?? [];
  const hasFilters = params.search || params.isVip !== undefined || params.hasCredit !== undefined || params.city;

  const exportCSV = () => {
    if (items.length === 0) return toast.error('No data');
    const headers = ['Name', 'Phone', 'Email', 'City', 'Area', 'CNIC', 'VIP', 'Total Spent', 'Balance', 'Loyalty Points', 'Created'];
    const rows = items.map((c) => [
      c.name,
      c.phone || '',
      c.email || '',
      c.city || '',
      c.area || '',
      c.cnic || '',
      c.isVip ? 'Yes' : 'No',
      c.totalSpent.toFixed(2),
      c.balance.toFixed(2),
      c.loyaltyPoints,
      new Date(c.createdAt).toLocaleDateString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Customers exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              Customer Management
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Customers</h2>
            <p className="mt-2 text-sm text-white/80">
              VIP, regular, khata wale — sab gahak ek hi jagah manage karein.
            </p>
          </div>
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Customer
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Customers</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats?.total ?? 0}</div>
              {stats && stats.newThisMonth > 0 && (
                <div className="text-xs text-emerald-700 font-bold mt-1">+{stats.newThisMonth} this month</div>
              )}
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">VIP Members</div>
              <div className="mt-2 text-2xl font-extrabold text-amber-700">{stats?.vip ?? 0}</div>
              <div className="text-xs text-amber-600 font-semibold mt-1">Premium tier</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Khata</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-700">{formatPKR(stats?.totalDebt ?? 0)}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">{stats?.withCredit ?? 0} customers</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-lg shadow-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/80 font-bold">Growth</div>
              <div className="mt-2 text-2xl font-extrabold">
                {stats && stats.growthPct >= 0 ? '+' : ''}{stats?.growthPct?.toFixed(1) ?? 0}%
              </div>
              <div className="text-xs text-white/80 font-semibold mt-1">vs last month</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {stats && stats.topSpenders.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-slate-900">Top Spenders</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.topSpenders.map((s, idx) => (
              <Link
                key={s.id}
                to={`/customers/${s.id}`}
                className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} className="h-11 w-11 rounded-full object-cover" alt={s.name} />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-extrabold shadow">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                     <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-600'
                    }`}>
                      #{idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate group-hover:text-amber-700">{s.name}</div>
                    <div className="text-xs text-amber-700 font-extrabold mt-0.5">{formatPKR(s.totalSpent)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            placeholder="Search by name, phone, CNIC, email..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
          {params.search && (
            <button onClick={() => setParams({ ...params, search: '', page: 1 })} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {hasFilters && <span className="ml-1 h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">!</span>}
        </Button>
        {items.length > 0 && (
          <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Export
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Type</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
                value={params.isVip === true ? 'vip' : params.hasCredit === true ? 'credit' : 'all'}
                onChange={(e) => {
                  const v = e.target.value;
                  setParams({
                    ...params,
                    isVip: v === 'vip' ? true : undefined,
                    hasCredit: v === 'credit' ? true : undefined,
                    page: 1,
                  });
                }}
              >
                <option value="all">👥 All customers</option>
                <option value="vip">👑 VIP only</option>
                <option value="credit">💳 With khata (udhaar)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Sort by</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
                value={params.sortBy ?? 'createdAt'}
                onChange={(e) => setParams({ ...params, sortBy: e.target.value as any, page: 1 })}
              >
                <option value="createdAt">🆕 Newest first</option>
                <option value="name">🔤 Name (A-Z)</option>
                <option value="totalSpent">💰 Top spenders</option>
                <option value="balance">⚠️ Highest debt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">City</label>
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
                placeholder="Lahore, Karachi..."
                value={params.city ?? ''}
                onChange={(e) => setParams({ ...params, city: e.target.value || undefined, page: 1 })}
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={() => setParams({ search: '', page: 1, limit: 24, sortBy: 'createdAt', sortOrder: 'desc' })}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
            <Users className="h-9 w-9 text-blue-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">{hasFilters ? 'No matches' : 'No customers yet'}</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {hasFilters ? 'Try different filters or clear them' : 'Apna pehla customer add karein aur tracking shuru karein'}
          </p>
          {!hasFilters && (
            <Link to="/customers/new">
              <Button className="mt-5">
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((c) => (
            <div
              key={c.id}
              className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
            >
              <Link to={`/customers/${c.id}`} className="block p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} className="h-14 w-14 rounded-2xl object-cover shadow" alt={c.name} />
                    ) : (
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-extrabold shadow ${
                        c.isVip
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {c.isVip && (
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 truncate group-hover:text-blue-700 transition">
                      {c.name}
                    </h3>
                    {c.phone && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-semibold">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                        <MapPin className="h-3 w-3" />
                        {c.city}{c.area && `, ${c.area}`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-2">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Spent</div>
                    <div className="text-sm font-extrabold text-emerald-700 truncate">{formatPKR(c.totalSpent)}</div>
                  </div>
                  <div className={`rounded-lg px-2.5 py-2 border ${
                    c.balance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${
                      c.balance > 0 ? 'text-rose-700' : 'text-slate-500'
                    }`}>Khata</div>
                    <div className={`text-sm font-extrabold truncate ${
                      c.balance > 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}>
                      {formatPKR(c.balance)}
                    </div>
                  </div>
                </div>

                {c.loyaltyPoints > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {c.loyaltyPoints.toLocaleString()} pts
                  </div>
                )}
              </Link>

              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
                <div className="flex items-center gap-1">
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"
                      title="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center"
                      title="Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/customers/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to={`/customers/${c.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${c.name}? Yeh action undo nahi ho sakta.`)) {
                        removeMutation.mutate(c.id);
                      }
                    }}
                    className="h-7 w-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm text-slate-600">
            Page <strong>{data.meta.page}</strong> of <strong>{data.meta.totalPages}</strong> • <strong>{data.meta.total}</strong> total
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ← Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
