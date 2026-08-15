import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles, Plus, Search, X, Star, StarOff, Edit3, Trash2,
  Package, Percent, TrendingUp, RefreshCw, Grid3x3, List,
  ShoppingBag, Copy, Printer, FileSpreadsheet,
  Crown, Flame, ArrowUpDown, CalendarClock, Trophy,
} from 'lucide-react';
import { combosApi, type ProductCombo } from '../api/combos.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL COMBOS — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   🏆 Best Seller crown + Top Revenue flame badges
   ↕️  Sort: Revenue / Sold / Bachat / Newest / Name
   🔢 Status pills pe live counts
   ⏰ Expiring-soon (≤7 din) warning
   ✨ Dark + light perfect, 🖨️ print/PDF, 📊 CSV, 📱→4K
   ═════════════════════════════════════════════════════════════ */

type ViewMode = 'grid' | 'table';
type SortBy = 'revenue' | 'sold' | 'savings' | 'newest' | 'name';

const SORT_OPTIONS: { v: SortBy; l: string }[] = [
  { v: 'revenue', l: '💰 Revenue' },
  { v: 'sold',    l: '🔥 Sab Se Zyada Bike' },
  { v: 'savings', l: '🏷️ Bachat %' },
  { v: 'newest',  l: '🆕 Naye Pehle' },
  { v: 'name',    l: '🔤 Naam A-Z' },
];

export default function CombosPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('revenue');

  const { data: combos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retail-combos', statusFilter, featuredOnly, search],
    queryFn: () => combosApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      featured: featuredOnly ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  /* ─── Status counts (unfiltered list se baad me — yahan current list se approx) ── */
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: combos.length };
    combos.forEach((c) => { m[c.status] = (m[c.status] || 0) + 1; });
    return m;
  }, [combos]);

  /* ─── Sorted list ───────────────────────────────────── */
  const sortedCombos = useMemo(() => {
    const arr = [...combos];
    switch (sortBy) {
      case 'revenue': return arr.sort((a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0));
      case 'sold':    return arr.sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0));
      case 'savings': return arr.sort((a, b) => b.savingsPercentage - a.savingsPercentage);
      case 'name':    return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':  return arr.reverse(); // API default newest-first assume
      default:        return arr;
    }
  }, [combos, sortBy]);

  /* ─── Stats + champions ─────────────────────────────── */
  const stats = useMemo(() => {
    const active = combos.filter((c) => c.status === 'ACTIVE');
    const totalRevenue = combos.reduce((a, c) => a + Number(c.totalRevenue || 0), 0);
    const totalSold = combos.reduce((a, c) => a + Number(c.soldCount || 0), 0);
    const avgSaving = combos.length > 0
      ? combos.reduce((a, c) => a + c.savingsPercentage, 0) / combos.length
      : 0;

    const bestSeller = combos.reduce<ProductCombo | null>(
      (best, c) => (Number(c.soldCount || 0) > Number(best?.soldCount || 0) ? c : best), null);
    const topRevenue = combos.reduce<ProductCombo | null>(
      (best, c) => (Number(c.totalRevenue || 0) > Number(best?.totalRevenue || 0) ? c : best), null);

    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const expiringSoon = combos.filter((c) =>
      c.status === 'ACTIVE' && c.validTo &&
      new Date(c.validTo).getTime() - now > 0 &&
      new Date(c.validTo).getTime() - now <= WEEK,
    );

    return {
      total: combos.length,
      active: active.length,
      featured: combos.filter((c) => c.isFeatured).length,
      totalRevenue, totalSold, avgSaving,
      bestSeller: bestSeller && Number(bestSeller.soldCount) > 0 ? bestSeller : null,
      topRevenue: topRevenue && Number(topRevenue.totalRevenue) > 0 ? topRevenue : null,
      expiringSoon,
    };
  }, [combos]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => combosApi.remove(id),
    onSuccess: () => {
      toast.success('Combo delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const toggleFeatured = useMutation({
    mutationFn: (id: string) => combosApi.toggleFeatured(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retail-combos'] }),
  });

  const duplicate = useMutation({
    mutationFn: async (combo: ProductCombo) => {
      const payload = {
        name: `${combo.name} (Copy)`,
        description: combo.description,
        imageUrl: combo.imageUrl,
        categoryId: combo.categoryId,
        comboPrice: combo.comboPrice,
        status: 'DRAFT' as const,
        tagLine: combo.tagLine,
        isFeatured: false,
        items: combo.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
          unitName: it.unitName,
          originalPrice: it.originalPrice,
        })),
      };
      return combosApi.create(payload as any);
    },
    onSuccess: () => {
      toast.success('Combo duplicate ho gaya (draft me)');
      queryClient.invalidateQueries({ queryKey: ['retail-combos'] });
    },
  });

  /* ─── CSV Export ────────────────────────────────────── */
  const exportCSV = () => {
    if (combos.length === 0) {
      toast.error('Koi combo nahi hai export ke liye');
      return;
    }
    const summary = [
      [`Combos Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total Combos: ${stats.total}`],
      [`Active: ${stats.active}  •  Featured: ${stats.featured}`],
      [`Total Sold: ${stats.totalSold}  •  Total Revenue: ${stats.totalRevenue.toFixed(2)}`],
      [`Avg Savings: ${stats.avgSaving.toFixed(1)}%`],
      ...(stats.bestSeller ? [[`Best Seller: ${stats.bestSeller.name} (${stats.bestSeller.soldCount} sold)`]] : []),
      [''],
    ];
    const headers = [
      '#', 'Name', 'Tag Line', 'Items Count', 'Original Total',
      'Combo Price', 'Savings', 'Savings %',
      'Sold', 'Revenue', 'Status', 'Featured', 'Valid Till',
    ];
    const rows = sortedCombos.map((c, i) => [
      i + 1, c.name, c.tagLine || '', c.items.length,
      c.originalTotal.toFixed(2), c.comboPrice.toFixed(2),
      c.savingsAmount.toFixed(2), c.savingsPercentage.toFixed(1),
      c.soldCount, Number(c.totalRevenue).toFixed(2),
      c.status, c.isFeatured ? 'Yes' : 'No',
      c.validTo ? new Date(c.validTo).toLocaleDateString('en-PK') : '',
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const handlePrint = () => { window.print(); };
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-3">
      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-violet-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🎁 {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Combo Deals Report
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 dark:from-slate-950 dark:via-violet-950 dark:to-fuchsia-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Retail Combos
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🎁 Combo Deals
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{stats.total}</strong> combos
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats.active}</strong> active
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-pink-300">{stats.totalSold}</strong> bike
              <span className="opacity-50 mx-1.5">•</span>
              Revenue <strong className="text-emerald-300">{formatPKR(stats.totalRevenue)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <PrivacyToggle compact />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-extrabold backdrop-blur-md disabled:opacity-50 border border-white/20 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Button
              variant="secondary"
              onClick={exportCSV}
              disabled={combos.length === 0}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20 font-extrabold"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              disabled={combos.length === 0}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20 font-extrabold"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Link to="/retail/combos/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl">
                <Plus className="h-4 w-4" /> Naya Combo
              </Button>
            </Link>
          </div>
        </div>

        {/* Champions strip */}
        {(stats.bestSeller || stats.topRevenue) && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {stats.bestSeller && (
              <Link
                to={`/retail/combos/${stats.bestSeller.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold transition"
              >
                <Crown className="h-4 w-4 text-amber-300" />
                <span className="text-white/70">Best Seller:</span>
                <span className="truncate max-w-[160px]">{stats.bestSeller.name}</span>
                <span className="text-amber-300 tabular-nums">×{stats.bestSeller.soldCount}</span>
              </Link>
            )}
            {stats.topRevenue && !hideCost && (
              <Link
                to={`/retail/combos/${stats.topRevenue.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold transition"
              >
                <Trophy className="h-4 w-4 text-emerald-300" />
                <span className="text-white/70">Top Revenue:</span>
                <span className="truncate max-w-[160px]">{stats.topRevenue.name}</span>
                <span className="text-emerald-300 tabular-nums">{formatPKR(stats.topRevenue.totalRevenue)}</span>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ═══ EXPIRING SOON ALERT ═══ */}
      {stats.expiringSoon.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3 sm:p-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                ⏰ {stats.expiringSoon.length} combo{stats.expiringSoon.length > 1 ? 's' : ''} 7 din mein expire ho raha!
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {stats.expiringSoon.map((c) => (
                  <Link
                    key={c.id}
                    to={`/retail/combos/${c.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-500/40 px-2 py-1 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 hover:border-amber-500 transition"
                  >
                    {c.name}
                    <span className="text-amber-600 dark:text-amber-400">
                      · {new Date(c.validTo!).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ KPI TILES ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={ShoppingBag} label="Total Combos" value={stats.total} sub={`${stats.active} active`} tone="violet" />
        <Kpi
          icon={Star} label="Featured" value={stats.featured} sub="Highlighted deals" tone="amber"
          active={featuredOnly} onClick={() => setFeaturedOnly(!featuredOnly)}
        />
        <Kpi
          icon={TrendingUp} label="Combos Sold" value={stats.totalSold}
          sub={hideCost ? '••••' : `${formatPKR(stats.totalRevenue)} revenue`} tone="emerald"
        />
        <Kpi icon={Percent} label="Avg Savings" value={`${stats.avgSaving.toFixed(0)}%`} sub="Customer bachat" tone="pink" />
      </section>

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Combo name, tag line, SKU..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/30 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 text-xs font-extrabold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          </div>

          <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-4 h-12 text-xs font-extrabold transition ${
                view === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-4 h-12 text-xs font-extrabold border-l-2 border-slate-200 dark:border-slate-700 transition ${
                view === 'table' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
            {[
              { v: 'all', l: 'Sab' },
              { v: 'ACTIVE', l: 'Active' },
              { v: 'DRAFT', l: 'Draft' },
              { v: 'INACTIVE', l: 'Off' },
              { v: 'EXPIRED', l: 'Expired' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
                {statusCounts[o.v] != null && (
                  <span className={`ml-1 tabular-nums ${statusFilter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                    {statusCounts[o.v]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={[
              'h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
              featuredOnly
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300',
            ].join(' ')}
          >
            <Star className={`h-3.5 w-3.5 ${featuredOnly ? 'fill-current' : ''}`} />
            Sirf Featured
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400">
            {sortedCombos.length} combos
          </div>
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sortedCombos.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 mx-auto flex items-center justify-center shadow-lg shadow-violet-500/40">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {search || statusFilter !== 'all' || featuredOnly ? 'Is filter mein koi combo nahi' : 'Abhi koi combo nahi 🎁'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">
            {search || statusFilter !== 'all' || featuredOnly
              ? 'Filter badal ke dekho ya search clear karo'
              : '2+ products ka bundle banao, customer ko bachat do, aap ka average bill barhega'}
          </p>
          {(search || statusFilter !== 'all' || featuredOnly) ? (
            <Button
              variant="secondary"
              className="mt-4 font-extrabold"
              onClick={() => { setSearch(''); setStatusFilter('all'); setFeaturedOnly(false); }}
            >
              <X className="h-4 w-4" /> Filters Clear Karo
            </Button>
          ) : (
            <Link to="/retail/combos/new">
              <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold shadow-lg shadow-violet-500/40">
                <Plus className="h-4 w-4" /> Pehla Combo Banao
              </Button>
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {sortedCombos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              hideCost={hideCost}
              isBestSeller={stats.bestSeller?.id === combo.id}
              isTopRevenue={!hideCost && stats.topRevenue?.id === combo.id}
              onToggleFeatured={() => toggleFeatured.mutate(combo.id)}
              onDuplicate={() => duplicate.mutate(combo)}
              onDelete={() => {
                if (confirm(`Combo "${combo.name}" delete karein?`)) removeMutation.mutate(combo.id);
              }}
            />
          ))}
        </section>
      ) : (
        <ComboTable
          combos={sortedCombos}
          hideCost={hideCost}
          bestSellerId={stats.bestSeller?.id}
          topRevenueId={hideCost ? undefined : stats.topRevenue?.id}
          onToggleFeatured={(id) => toggleFeatured.mutate(id)}
          onDelete={(c) => { if (confirm(`Combo "${c.name}" delete karein?`)) removeMutation.mutate(c.id); }}
          onDuplicate={(c) => duplicate.mutate(c)}
        />
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important;
            color: #0f172a !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          main, aside, header, nav, [class*="max-h-"] {
            max-height: none !important; height: auto !important; overflow: visible !important;
          }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [class*="rounded-2xl"], [class*="rounded-3xl"] { overflow: visible !important; border-radius: 6px !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; page-break-inside: auto !important; }
          thead { display: table-header-group !important; }
          thead th { background: #8b5cf6 !important; color: white !important; padding: 5px 4px !important; font-size: 8px !important; font-weight: 800 !important; border: 1px solid #7c3aed !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          tbody tr:nth-child(even) td { background: #f8fafc !important; }
          .bg-emerald-100, [class*="emerald-500/20"] { background: #d1fae5 !important; color: #047857 !important; }
          .bg-amber-100, [class*="amber-500/20"] { background: #fef3c7 !important; color: #b45309 !important; }
          .bg-rose-100, [class*="rose-500/20"] { background: #ffe4e6 !important; color: #be123c !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          .text-violet-700, [class*="violet-400"] { color: #6d28d9 !important; }
          tbody td img { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
          .grid > div, section > div, [class*="rounded-2xl"] { break-inside: avoid !important; page-break-inside: avoid !important; }
          section.grid { break-inside: avoid-page !important; }
          tbody tr, .grid { orphans: 3 !important; widows: 3 !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   COMBO CARD (grid view)
   ═════════════════════════════════════════════════════════════ */

function ComboCard({ combo, hideCost, isBestSeller, isTopRevenue, onToggleFeatured, onDuplicate, onDelete }: {
  combo: ProductCombo;
  hideCost: boolean;
  isBestSeller?: boolean;
  isTopRevenue?: boolean;
  onToggleFeatured: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const statusMeta: Record<string, { light: string; dark: string }> = {
    ACTIVE:   { light: 'bg-emerald-100 text-emerald-700', dark: 'dark:bg-emerald-500/20 dark:text-emerald-300' },
    INACTIVE: { light: 'bg-slate-200 text-slate-600',     dark: 'dark:bg-slate-700 dark:text-slate-300' },
    DRAFT:    { light: 'bg-amber-100 text-amber-700',     dark: 'dark:bg-amber-500/20 dark:text-amber-300' },
    EXPIRED:  { light: 'bg-rose-100 text-rose-700',       dark: 'dark:bg-rose-500/20 dark:text-rose-300' },
  };
  const sm = statusMeta[combo.status] || statusMeta.ACTIVE;

  return (
    <div className={[
      'group relative rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm',
      'border-2 shadow-sm dark:shadow-black/20 hover:shadow-xl dark:hover:shadow-violet-500/20',
      'hover:-translate-y-1 transition-all overflow-hidden',
      combo.isFeatured
        ? 'border-amber-400 dark:border-amber-500/50 ring-2 ring-amber-100 dark:ring-amber-500/20'
        : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      {/* Champion badges */}
      {(isBestSeller || isTopRevenue) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
          {isBestSeller && (
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg inline-flex items-center gap-1">
              <Crown className="h-2.5 w-2.5" /> Best Seller
            </span>
          )}
          {isTopRevenue && (
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg inline-flex items-center gap-1">
              <Trophy className="h-2.5 w-2.5" /> Top Revenue
            </span>
          )}
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-violet-500 via-purple-600 to-pink-600 overflow-hidden">
        {combo.imageUrl ? (
          <img
            src={combo.imageUrl}
            alt={combo.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-16 w-16 text-white/40" />
          </div>
        )}

        {combo.tagLine && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur text-[10px] font-extrabold text-violet-700 dark:text-violet-300 uppercase tracking-wider shadow-lg">
            {combo.tagLine}
          </div>
        )}

        <button
          onClick={onToggleFeatured}
          className={[
            'absolute top-2 right-2 h-9 w-9 rounded-xl backdrop-blur-md flex items-center justify-center transition shadow-lg',
            combo.isFeatured
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:bg-white',
          ].join(' ')}
          title={combo.isFeatured ? 'Featured hataao' : 'Featured banao'}
        >
          {combo.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>

        {combo.savingsPercentage > 0 && (
          <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-extrabold shadow-lg inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {combo.savingsPercentage.toFixed(0)}% BACHAT
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate flex-1">
            {combo.name}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${sm.light} ${sm.dark}`}>
            {combo.status}
          </span>
        </div>

        {/* Items preview */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Package className="h-2.5 w-2.5" />
            {combo.items.length} items
          </div>
          <div className="space-y-0.5">
            {combo.items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-1 w-1 rounded-full bg-violet-500 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-200 truncate flex-1">
                  {item.product?.name || '—'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-extrabold shrink-0 tabular-nums">
                  × {item.quantity}
                </span>
              </div>
            ))}
            {combo.items.length > 2 && (
              <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-400 pl-2.5">
                + {combo.items.length - 2} aur
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {combo.originalTotal > combo.comboPrice && (
              <div className="text-xs text-slate-400 dark:text-slate-500 line-through font-bold">
                {formatPKR(combo.originalTotal)}
              </div>
            )}
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(combo.comboPrice)}
            </div>
            {combo.savingsAmount > 0 && (
              <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                Save {formatPKR(combo.savingsAmount)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Bike</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {combo.soldCount}
            </div>
            {!hideCost && Number(combo.totalRevenue) > 0 && (
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {formatPKR(combo.totalRevenue)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t-2 border-slate-100 dark:border-slate-800">
          <Link
            to={`/retail/combos/${combo.id}/edit`}
            className="flex-1 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </Link>
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   COMBO TABLE (list view)
   ═════════════════════════════════════════════════════════════ */

function ComboTable({ combos, hideCost, bestSellerId, topRevenueId, onToggleFeatured, onDelete, onDuplicate }: {
  combos: ProductCombo[];
  hideCost: boolean;
  bestSellerId?: string;
  topRevenueId?: string;
  onToggleFeatured: (id: string) => void;
  onDelete: (c: ProductCombo) => void;
  onDuplicate: (c: ProductCombo) => void;
}) {
  return (
    <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm print:text-[10px]">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
            <tr>
              <Th>Combo</Th>
              <Th>Items</Th>
              <Th className="text-right">Individual</Th>
              <Th className="text-right">Combo</Th>
              <Th className="text-right">Bachat</Th>
              <Th className="text-right">Bike</Th>
              {!hideCost && <Th className="text-right">Revenue</Th>}
              <Th className="text-center">Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {combos.map((c: ProductCombo) => (
              <tr key={c.id} className="hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition">
                <td className="px-3 py-2.5">
                  <Link to={`/retail/combos/${c.id}/edit`} className="flex items-center gap-2.5 group">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        {bestSellerId === c.id && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {topRevenueId === c.id && <Trophy className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                        <span className="font-extrabold text-slate-900 dark:text-white truncate group-hover:text-violet-700 dark:group-hover:text-violet-300">
                          {c.name}
                        </span>
                        {c.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      {c.tagLine && (
                        <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-400 uppercase truncate">
                          {c.tagLine}
                        </div>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {c.items.length} products
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-[150px]">
                    {c.items.slice(0, 2).map((it) => it.product?.name).filter(Boolean).join(', ')}
                    {c.items.length > 2 && ` +${c.items.length - 2}`}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums line-through">
                  {formatPKR(c.originalTotal)}
                </td>
                <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPKR(c.comboPrice)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="font-extrabold text-amber-700 dark:text-amber-400 tabular-nums text-xs">
                    {formatPKR(c.savingsAmount)}
                  </div>
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {c.savingsPercentage.toFixed(1)}%
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {c.soldCount}
                </td>
                {!hideCost && (
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatPKR(c.totalRevenue)}
                  </td>
                )}
                <td className="px-3 py-2.5 text-center">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onToggleFeatured(c.id)}
                      title="Featured toggle"
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${
                        c.isFeatured
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                      }`}
                    >
                      <Star className={`h-3.5 w-3.5 ${c.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                    <Link
                      to={`/retail/combos/${c.id}/edit`}
                      title="Edit"
                      className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => onDuplicate(c)}
                      title="Duplicate"
                      className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      title="Delete"
                      className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ${className}`}>
      {children}
    </th>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    DRAFT:    'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    INACTIVE: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    EXPIRED:  'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    violet:  'from-violet-500 to-purple-700 shadow-violet-500/40',
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
    pink:    'from-pink-500 to-rose-600 shadow-pink-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer' : '',
        active
          ? 'border-violet-500 dark:border-violet-500/60 ring-2 ring-violet-200 dark:ring-violet-500/20'
          : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">
            {label}
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
            {value}
          </div>
          {sub && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">
              {sub}
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
