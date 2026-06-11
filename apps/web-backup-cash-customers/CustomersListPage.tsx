import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Star, Phone, MapPin, TrendingUp, Wallet,
  Crown, ArrowRight, SlidersHorizontal, Trash2, Edit3,
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
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-900 to-cyan-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Users className="h-3.5 w-3.5" /> Customer Management
            </div>
            <h2 className="mt-3 text-3xl font-bold">Customers</h2>
            <p className="mt-2 text-sm text-white/80">
              Aap ke gahak — VIP, regular, aur khata wale sab yahan
            </p>
          </div>
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Customer
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total</div>
              <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            </div>
          </div>
          {stats && stats.newThisMonth > 0 && (
            <div className="mt-3 text-xs text-emerald-700 font-bold">
              +{stats.newThisMonth} this month
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">VIP</div>
              <div className="text-2xl font-bold text-amber-700">{stats?.vip ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Khata</div>
              <div className="text-2xl font-bold text-rose-700">{formatPKR(stats?.totalDebt ?? 0)}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">{stats?.withCredit ?? 0} customers</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Growth</div>
              <div className="text-2xl font-bold">
                {stats && stats.growthPct >= 0 ? '+' : ''}
                {stats?.growthPct?.toFixed(1) ?? 0}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-white/70">vs last month</div>
        </div>
      </section>

      {/* Top spenders */}
      {stats && stats.topSpenders.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-slate-900">Top Spenders</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.topSpenders.map((s, idx) => (
              <Link
                key={s.id}
                to={`/customers/${s.id}`}
                className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} className="h-10 w-10 rounded-full object-cover" alt={s.name} />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      #{idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{s.name}</div>
                    <div className="text-xs text-amber-700 font-bold">{formatPKR(s.totalSpent)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Search by name, phone, CNIC, email..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
      </div>

      {showFilters && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
                <option value="all">All customers</option>
                <option value="vip">VIP only</option>
                <option value="credit">With khata (udhaar)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Sort by</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={params.sortBy ?? 'createdAt'}
                onChange={(e) => setParams({ ...params, sortBy: e.target.value as any, page: 1 })}
              >
                <option value="createdAt">Newest first</option>
                <option value="name">Name (A-Z)</option>
                <option value="totalSpent">Top spenders</option>
                <option value="balance">Highest debt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">City</label>
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                placeholder="Lahore, Karachi..."
                value={params.city ?? ''}
                onChange={(e) => setParams({ ...params, city: e.target.value || undefined, page: 1 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
          <Users className="h-16 w-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">No customers yet</h3>
          <p className="text-sm text-slate-500 mt-1">Add your first customer</p>
          <Link to="/customers/new">
            <Button className="mt-5">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} className="h-14 w-14 rounded-2xl object-cover" alt={c.name} />
                  ) : (
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold ${
                      c.isVip
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        : 'bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700'
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
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-700 transition">
                    {c.name}
                  </h3>
                  {c.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {c.city}{c.area && `, ${c.area}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Spent</div>
                  <div className="text-sm font-bold text-emerald-700">{formatPKR(c.totalSpent)}</div>
                </div>
                <div className={`rounded-lg px-2.5 py-1.5 ${c.balance > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Khata</div>
                  <div className={`text-sm font-bold ${c.balance > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {formatPKR(c.balance)}
                  </div>
                </div>
              </div>

              {c.loyaltyPoints > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-amber-700">{c.loyaltyPoints} points</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
