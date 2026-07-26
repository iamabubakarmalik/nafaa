import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, ShoppingCart, Star, Wallet,
  Crown, X, RefreshCw, Download, Grid3x3, List, ArrowUpDown,
  UserPlus, TrendingUp, Award, BookOpen,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

type FilterKey = 'all' | 'loyalty' | 'khata' | 'vip';
type SortKey = 'totalSpent' | 'balance' | 'loyaltyPoints' | 'name' | 'recent';
type ViewMode = 'grid' | 'list';

export default function RetailCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 48, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent');
  const [view, setView] = useState<ViewMode>('grid');

  const { data, isLoading, refetch, isRefetching } = useQuery({
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
      toast.success('Customer delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    let list: any[] = items;
    if (filter === 'loyalty') list = list.filter((c: any) => c.loyaltyPoints > 0);
    if (filter === 'khata') list = list.filter((c: any) => c.balance > 0);
    if (filter === 'vip') list = list.filter((c: any) => c.isVip);

    // Sort
    list = [...list].sort((a: any, b: any) => {
      if (sortKey === 'totalSpent') return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortKey === 'balance') return (b.balance || 0) - (a.balance || 0);
      if (sortKey === 'loyaltyPoints') return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'recent') return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      return 0;
    });

    return list;
  }, [items, filter, sortKey]);

  const loyaltyCount = items.filter((c: any) => c.loyaltyPoints > 0).length;
  const khataCount = items.filter((c: any) => c.balance > 0).length;
  const totalLoyaltyPoints = items.reduce((s: number, c: any) => s + (c.loyaltyPoints || 0), 0);
  const totalKhata = items.reduce((s: number, c: any) => s + Math.max(c.balance || 0, 0), 0);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const headers = ['Name', 'Phone', 'Email', 'Total Spent', 'Balance (Udhaar)', 'Loyalty Points', 'Orders', 'VIP'];
    const rows = filtered.map((c: any) => [
      c.name || '',
      c.phone || '',
      c.email || '',
      (c.totalSpent || 0).toFixed(2),
      (c.balance || 0).toFixed(2),
      c.loyaltyPoints || 0,
      c.orderCount || 0,
      c.isVip ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} customers exported`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-sky-900 to-cyan-700"
        emoji="🛒"
        industryLabel="Retail"
        industryBadgeColor="bg-sky-500/30 border border-sky-300/40"
        title="Retail Customers"
        subtitle={
          items.length > 0
            ? `${items.length} customers • ${loyaltyCount} loyalty • ${khataCount} khata holders`
            : 'Loyalty members, khata holders, combo buyers'
        }
        actionButton={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold backdrop-blur border border-white/20 disabled:opacity-50 active:scale-95 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold backdrop-blur border border-white/20 active:scale-95 transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <Link to="/customers/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <UserPlus className="h-4 w-4" /> Add Customer
              </Button>
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <CustomerStatCard
          label="Total Customers"
          value={stats?.total ?? items.length}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users}
          color="from-sky-500 to-cyan-600"
          isHighlight
        />
        <CustomerStatCard
          label="Loyalty Members"
          value={loyaltyCount}
          sub={`${totalLoyaltyPoints.toLocaleString()} points`}
          icon={Star}
          color="from-amber-500 to-orange-600"
          onClick={() => setFilter(filter === 'loyalty' ? 'all' : 'loyalty')}
        />
        <CustomerStatCard
          label="Khata Holders"
          value={khataCount}
          sub={formatPKR(totalKhata)}
          icon={BookOpen}
          color="from-rose-500 to-red-600"
          onClick={() => setFilter(filter === 'khata' ? 'all' : 'khata')}
        />
        <CustomerStatCard
          label="VIP"
          value={stats?.vip ?? 0}
          sub="Premium tier"
          icon={Crown}
          color="from-amber-500 to-orange-700"
          onClick={() => setFilter(filter === 'vip' ? 'all' : 'vip')}
        />
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 sm:h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              placeholder="Customer naam, phone, email..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            />
            {params.search && (
              <button
                onClick={() => setParams({ ...params, search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-11 sm:h-12 rounded-2xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500"
            >
              <option value="totalSpent">💰 Zyada spending</option>
              <option value="balance">📔 Zyada udhaar</option>
              <option value="loyaltyPoints">⭐ Zyada points</option>
              <option value="name">🔤 Naam A-Z</option>
              <option value="recent">🕐 Recent</option>
            </select>

            <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`h-11 sm:h-12 w-11 sm:w-12 flex items-center justify-center transition ${
                  view === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`h-11 sm:h-12 w-11 sm:w-12 flex items-center justify-center transition border-l-2 border-slate-200 ${
                  view === 'list' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all' as const, label: 'Sab', count: items.length, icon: Users },
            { v: 'loyalty' as const, label: 'Loyalty', count: loyaltyCount, icon: Star },
            { v: 'khata' as const, label: 'Khata', count: khataCount, icon: BookOpen },
            { v: 'vip' as const, label: 'VIP', count: stats?.vip ?? 0, icon: Crown },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = filter === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setFilter(opt.v)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1.5',
                  active ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
                <span className={['px-1.5 rounded text-[10px]', active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'].join(' ')}>
                  {opt.count}
                </span>
              </button>
            );
          })}
          <div className="ml-auto text-xs font-extrabold text-slate-500 self-center pr-2 hidden sm:block">
            {filtered.length} shown
          </div>
        </div>
      </section>

      {/* Content */}
      {isLoading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4' : 'space-y-2'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={view === 'grid' ? 'h-52 rounded-2xl bg-slate-100 animate-pulse' : 'h-20 rounded-2xl bg-slate-100 animate-pulse'} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white border-4 border-dashed border-slate-200 p-12 sm:p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-100 to-cyan-200 mx-auto flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-sky-600" />
          </div>
          <h3 className="mt-4 text-lg sm:text-xl font-extrabold text-slate-900">
            {params.search || filter !== 'all' ? 'Kuch nahi mila' : 'Koi customer nahi'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {params.search || filter !== 'all' ? 'Filter change karo' : 'Pehla customer add karo'}
          </p>
          {!params.search && filter === 'all' && (
            <Link to="/customers/new">
              <Button className="mt-4 bg-gradient-to-r from-sky-600 to-cyan-700">
                <UserPlus className="h-4 w-4" /> Naya Customer
              </Button>
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="sky"
              onDelete={(id) => {
                if (confirm(`Customer "${c.name}" delete karein?`)) {
                  removeMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y-2 divide-slate-100">
            {filtered.map((c: any) => {
              const initial = (c.name || '?').charAt(0).toUpperCase();
              const hasBalance = c.balance > 0;
              return (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="block px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg sm:text-xl shrink-0 shadow',
                      c.isVip ? 'bg-gradient-to-br from-amber-500 to-orange-700'
                        : hasBalance ? 'bg-gradient-to-br from-rose-500 to-red-700'
                        : c.loyaltyPoints > 0 ? 'bg-gradient-to-br from-violet-500 to-purple-700'
                        : 'bg-gradient-to-br from-sky-500 to-cyan-700',
                    ].join(' ')}>
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">{c.name}</h3>
                        {c.isVip && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                            <Crown className="h-2.5 w-2.5" /> VIP
                          </span>
                        )}
                        {c.loyaltyPoints > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-violet-500" /> {c.loyaltyPoints}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 font-bold flex-wrap">
                        {c.phone && <span>{c.phone}</span>}
                        {c.orderCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{c.orderCount} orders</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {c.totalSpent > 0 && (
                        <div>
                          <div className="text-[10px] uppercase font-extrabold text-slate-500">Spent</div>
                          <div className="text-base sm:text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
                            {formatPKR(c.totalSpent)}
                          </div>
                        </div>
                      )}
                      {hasBalance && (
                        <div className="mt-1.5 rounded-lg bg-rose-100 border border-rose-300 px-2 py-0.5">
                          <div className="text-[9px] uppercase font-extrabold text-rose-700">Udhaar</div>
                          <div className="text-sm font-extrabold text-rose-800 tabular-nums leading-none">
                            {formatPKR(c.balance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
