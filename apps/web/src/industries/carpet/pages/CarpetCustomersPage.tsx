import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Layers, Scissors, Ruler, Crown, TrendingUp,
  Grid3x3, List, X, RefreshCw, Download, UserPlus, SortAsc, BookOpen,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
type FilterKey = 'all' | 'carpet-buyers' | 'khata' | 'vip';
type SortKey = 'totalSpent' | 'totalSqft' | 'balance' | 'name' | 'recent';
type ViewMode = 'grid' | 'list';

export default function CarpetCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 48, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalSqft');
  const [view, setView] = useState<ViewMode>('grid');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-for-carpet-customers'],
    queryFn: () => salesApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const customersWithCarpetStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerSales = allSales.filter((s: any) => s.customer?.id === c.id);
      let totalSqft = 0, rollCount = 0, cutPieceCount = 0;
      for (const sale of customerSales) {
        for (const item of (sale.items || [])) {
          if (!CARPET_UNITS.has(item.product?.unit || '')) continue;
          totalSqft += Number(item.quantity || 0);
          const note = item.note || '';
          if (note.includes('Cut from')) rollCount += 1;
          if (note.includes('Cut piece')) cutPieceCount += 1;
        }
      }
      return { ...c, totalSqft, rollCount, cutPieceCount };
    });
  }, [data, allSales]);

  const filtered = useMemo(() => {
    let list = customersWithCarpetStats;
    if (filter === 'carpet-buyers') list = list.filter((c: any) => c.totalSqft > 0);
    if (filter === 'khata') list = list.filter((c: any) => c.balance > 0);
    if (filter === 'vip') list = list.filter((c: any) => c.isVip);

    list = [...list].sort((a: any, b: any) => {
      if (sortKey === 'totalSpent') return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortKey === 'totalSqft') return (b.totalSqft || 0) - (a.totalSqft || 0);
      if (sortKey === 'balance') return (b.balance || 0) - (a.balance || 0);
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'recent') return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      return 0;
    });
    return list;
  }, [customersWithCarpetStats, filter, sortKey]);

  const withCarpetPurchase = customersWithCarpetStats.filter((c: any) => c.totalSqft > 0).length;
  const totalSqftSold = customersWithCarpetStats.reduce((s: number, c: any) => s + c.totalSqft, 0);
  const khataCount = customersWithCarpetStats.filter((c: any) => c.balance > 0).length;

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const headers = ['Name', 'Phone', 'Total Spent', 'Total Sqft', 'Rolls Bought', 'Pieces Bought', 'Balance'];
    const rows = filtered.map((c: any) => [
      c.name || '', c.phone || '', (c.totalSpent || 0).toFixed(2),
      (c.totalSqft || 0).toFixed(2), c.rollCount || 0, c.cutPieceCount || 0, (c.balance || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `carpet-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} customers exported`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-emerald-900 to-teal-800"
        emoji="🧶"
        industryLabel="Carpet"
        industryBadgeColor="bg-emerald-500/30 border border-emerald-300/40"
        title="Carpet Shop Customers"
        subtitle={
          filtered.length > 0
            ? `${filtered.length} customers • ${withCarpetPurchase} carpet buyers • ${totalSqftSold.toFixed(0)} sqft sold`
            : 'Roll buyers, cut piece clients, bulk orders'
        }
        actionButton={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold backdrop-blur border border-white/20 disabled:opacity-50 active:scale-95 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-2.5 text-sm font-bold backdrop-blur border border-white/20 active:scale-95 transition">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <Link to="/customers/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <UserPlus className="h-4 w-4" /> Add
              </Button>
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <CustomerStatCard label="Total Customers" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users} color="from-emerald-500 to-teal-600" isHighlight />
        <CustomerStatCard label="Carpet Buyers" value={withCarpetPurchase}
          sub="Purchased carpet" icon={Layers} color="from-teal-500 to-cyan-600"
          onClick={() => setFilter(filter === 'carpet-buyers' ? 'all' : 'carpet-buyers')} />
        <CustomerStatCard label="Total Sqft Sold" value={totalSqftSold.toFixed(0)}
          sub="Cumulative area" icon={Ruler} color="from-blue-500 to-cyan-600" />
        <CustomerStatCard label="Khata Holders" value={khataCount}
          sub="Pending udhaar" icon={BookOpen} color="from-rose-500 to-red-600"
          onClick={() => setFilter(filter === 'khata' ? 'all' : 'khata')} />
      </section>

      <section className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 sm:h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="Customer naam, phone, email..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            />
            {params.search && (
              <button onClick={() => setParams({ ...params, search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center active:scale-95">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-11 sm:h-12 rounded-2xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option value="totalSqft">🧶 Zyada Sqft</option>
              <option value="totalSpent">💰 Zyada Spend</option>
              <option value="balance">📔 Zyada Udhaar</option>
              <option value="name">🔤 Naam A-Z</option>
              <option value="recent">🕐 Recent</option>
            </select>
            <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
              <button onClick={() => setView('grid')}
                className={`h-11 sm:h-12 w-11 sm:w-12 flex items-center justify-center transition ${view === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button onClick={() => setView('list')}
                className={`h-11 sm:h-12 w-11 sm:w-12 flex items-center justify-center transition border-l-2 border-slate-200 ${view === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all' as const, label: 'Sab', count: customersWithCarpetStats.length, icon: Users },
            { v: 'carpet-buyers' as const, label: 'Carpet Buyers', count: withCarpetPurchase, icon: Layers },
            { v: 'khata' as const, label: 'Khata', count: khataCount, icon: BookOpen },
            { v: 'vip' as const, label: 'VIP', count: stats?.vip ?? 0, icon: Crown },
          ].map((opt) => {
            const Icon = opt.icon; const active = filter === opt.v;
            return (
              <button key={opt.v} onClick={() => setFilter(opt.v)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1.5 active:scale-95 ${
                  active ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}>
                <Icon className="h-3 w-3" />
                {opt.label}
                <span className={`px-1.5 rounded text-[10px] ${active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'}`}>{opt.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4' : 'space-y-2'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={view === 'grid' ? 'h-52 rounded-2xl bg-slate-100 animate-pulse' : 'h-20 rounded-2xl bg-slate-100 animate-pulse'} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white border-4 border-dashed border-slate-200 p-12 sm:p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 mx-auto flex items-center justify-center">
            <Layers className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg sm:text-xl font-extrabold text-slate-900">
            {params.search || filter !== 'all' ? 'Kuch nahi mila' : 'Koi customer nahi'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            {params.search || filter !== 'all' ? 'Filter change karo' : 'Pehla customer add karo'}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="emerald"
              onDelete={(id) => {
                if (confirm(`Customer "${c.name}" delete karein?`)) removeMutation.mutate(id);
              }}
              extraBadges={
                <>
                  {c.totalSqft > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <Ruler className="h-3 w-3" />
                      {c.totalSqft.toFixed(0)} sqft
                    </div>
                  )}
                  {c.rollCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold">
                      <Layers className="h-3 w-3" />
                      {c.rollCount} rolls
                    </div>
                  )}
                  {c.cutPieceCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                      <Scissors className="h-3 w-3" />
                      {c.cutPieceCount} pieces
                    </div>
                  )}
                </>
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y-2 divide-slate-100">
            {filtered.map((c: any) => (
              <Link key={c.id} to={`/customers/${c.id}`}
                className="block px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 transition group active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow ${
                    c.isVip ? 'bg-gradient-to-br from-amber-500 to-orange-700'
                      : c.balance > 0 ? 'bg-gradient-to-br from-rose-500 to-red-700'
                      : c.totalSqft > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
                      : 'bg-gradient-to-br from-slate-500 to-slate-700'
                  }`}>
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">{c.name}</h3>
                      {c.isVip && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                          <Crown className="h-2.5 w-2.5" /> VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-bold flex-wrap mt-0.5">
                      {c.phone && <span>{c.phone}</span>}
                      {c.totalSqft > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 inline-flex items-center gap-0.5">
                            <Ruler className="h-3 w-3" /> {c.totalSqft.toFixed(0)} sqft
                          </span>
                        </>
                      )}
                      {c.rollCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-teal-700 inline-flex items-center gap-0.5">
                            <Layers className="h-3 w-3" /> {c.rollCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.totalSpent > 0 && (
                      <div className="text-base sm:text-lg font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR(c.totalSpent)}
                      </div>
                    )}
                    {c.balance > 0 && (
                      <div className="mt-1 rounded-lg bg-rose-100 border border-rose-300 px-2 py-0.5">
                        <div className="text-sm font-extrabold text-rose-800 tabular-nums">
                          {formatPKR(c.balance)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
