import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Layers, AlertTriangle, Trash2, Ruler, Package, MapPin,
  Eye, EyeOff, Scissors, X, FileSpreadsheet, Edit3, DollarSign, Save,
  TrendingUp, BarChart3, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Filter, Sparkles, Grid3x3, List as ListIcon, Activity, Palette,
  CheckCircle2, XCircle, Warehouse, Zap, ArrowRight, Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR, formatPKRFull } from '@/lib/format';
import {
  carpetRollsApi,
  type CarpetRollsListParams,
  type CarpetRollStatus,
  type CarpetRoll,
} from '../api/carpet-rolls.api';
import { productsApi } from '@/api/products.api';
import { AddRollModal } from '../components/AddRollModal';

const statusConfig: Record<CarpetRollStatus, { label: string; color: string; icon: any }> = {
  ACTIVE:      { label: 'Active',      color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  FINISHED:    { label: 'Finished',    color: 'bg-slate-200 text-slate-700 border-slate-300',       icon: XCircle },
  DAMAGED:     { label: 'Damaged',     color: 'bg-rose-100 text-rose-700 border-rose-300',          icon: AlertTriangle },
  RESERVED:    { label: 'Reserved',    color: 'bg-amber-100 text-amber-700 border-amber-300',       icon: Activity },
  TRANSFERRED: { label: 'Transferred', color: 'bg-blue-100 text-blue-700 border-blue-300',          icon: ArrowRight },
};

type ViewMode = 'variants' | 'grid' | 'list';
type SortBy = 'newest' | 'largest' | 'smallest' | 'oldest' | 'name' | 'value-high' | 'value-low';
type PriceVisibility = 'all' | 'sale-only' | 'hidden';

const PRICE_VIS_KEY = 'nafaa.carpet-rolls.price-visibility';
const VIEW_MODE_KEY = 'nafaa.carpet-rolls.view-mode';

export default function CarpetRollsPage() {
  const queryClient = useQueryClient();

  const [params, setParams] = useState<CarpetRollsListParams>({
    page: 1,
    limit: 60,
    inStockOnly: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickEditRoll, setQuickEditRoll] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'variants',
  );
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [priceVis, setPriceVis] = useState<PriceVisibility>(
    (localStorage.getItem(PRICE_VIS_KEY) as PriceVisibility) || 'all',
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const persistViewMode = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem(VIEW_MODE_KEY, v);
  };
  const cyclePriceVis = () => {
    const next: PriceVisibility =
      priceVis === 'all' ? 'sale-only' : priceVis === 'sale-only' ? 'hidden' : 'all';
    setPriceVis(next);
    localStorage.setItem(PRICE_VIS_KEY, next);
  };

  // ─── Fetch large list once, filter/sort/group client-side ───
  const { data } = useQuery({
    queryKey: ['carpet-rolls', { ...params, page: 1, limit: 500 }],
    queryFn: () => carpetRollsApi.list({ ...params, page: 1, limit: 500 }),
  });

  const { data: lowRemaining = [] } = useQuery({
    queryKey: ['carpet-rolls-low'],
    queryFn: () => carpetRollsApi.lowRemaining(10),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 500, isActive: true }],
    queryFn: () => productsApi.list({ limit: 500, isActive: true }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => carpetRollsApi.remove(id),
    onSuccess: (res: any) => {
      toast.success(res?.message ?? 'Roll removed');
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  // ─── UNIVERSAL SEARCH — matches EVERYTHING ───
  const searchText = (params.search ?? '').toLowerCase().trim();
  const searchMatchesRoll = (r: any): boolean => {
    if (!searchText) return true;
    const hay = [
      r.rollNumber,
      r.designCode,
      r.product?.name,
      r.variant?.name,
      r.variant?.color,
      r.rackNumber,
      r.shop?.name,
      r.quality,
      r.pile,
      r.notes,
      String(r.remainingLengthFt),
      String(r.remainingSqft),
      `${r.widthFt}ft`,
      `${r.widthFt}x${r.remainingLengthFt}`,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(searchText);
  };

  // ─── Filtered + sorted flat list ───
  const rolls = useMemo(() => {
    let list = (data?.items ?? []).filter(searchMatchesRoll);
    list = [...list].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'largest':    return Number(b.remainingSqft) - Number(a.remainingSqft);
        case 'smallest':   return Number(a.remainingSqft) - Number(b.remainingSqft);
        case 'oldest':     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':       return String(a.rollNumber).localeCompare(String(b.rollNumber));
        case 'value-high': return (Number(b.remainingSqft) * Number(b.salePricePerSqft)) - (Number(a.remainingSqft) * Number(a.salePricePerSqft));
        case 'value-low':  return (Number(a.remainingSqft) * Number(a.salePricePerSqft)) - (Number(b.remainingSqft) * Number(b.salePricePerSqft));
        case 'newest':
        default:           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [data?.items, sortBy, searchText]);

  // ─── Grouped by Product → Variant → Rolls ───
  interface RollGroup {
    key: string;
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    variantColorHex: string | null;
    designCode: string | null;
    rolls: any[];
    totalSqft: number;
    activeRolls: number;
    stockValue: number;
    stockCost: number;
  }

  const groups = useMemo<RollGroup[]>(() => {
    const map = new Map<string, RollGroup>();
    for (const r of rolls) {
      const key = `${r.productId}::${r.variantId ?? 'none'}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productId: r.productId,
          productName: r.product?.name ?? 'Unknown',
          variantId: r.variantId ?? null,
          variantName: r.variant?.name ?? null,
          variantColorHex: r.variant?.colorHex ?? null,
          designCode: r.designCode ?? null,
          rolls: [],
          totalSqft: 0,
          activeRolls: 0,
          stockValue: 0,
          stockCost: 0,
        });
      }
      const g = map.get(key)!;
      g.rolls.push(r);
      if (r.status === 'ACTIVE') {
        g.activeRolls++;
        g.totalSqft += Number(r.remainingSqft ?? 0);
        g.stockValue += Number(r.remainingSqft ?? 0) * Number(r.salePricePerSqft ?? 0);
        g.stockCost += Number(r.remainingSqft ?? 0) * Number(r.costPerSqft ?? 0);
      }
    }
    // Sort groups by total sqft descending
    return Array.from(map.values()).sort((a, b) => {
      if (b.activeRolls !== a.activeRolls) return b.activeRolls - a.activeRolls;
      return b.totalSqft - a.totalSqft;
    });
  }, [rolls]);

  // ─── Overall stats ───
  const stats = useMemo(() => {
    const all = data?.items ?? [];
    const active = all.filter((r: any) => r.status === 'ACTIVE');
    const finished = all.filter((r: any) => r.status === 'FINISHED');
    const damaged = all.filter((r: any) => r.status === 'DAMAGED');
    const totalActiveSqft = active.reduce((s: number, r: any) => s + Number(r.remainingSqft || 0), 0);
    const totalLength = active.reduce((s: number, r: any) => s + Number(r.remainingLengthFt || 0), 0);
    const totalStockValue = active.reduce((s: number, r: any) => s + Number(r.remainingSqft || 0) * Number(r.salePricePerSqft || 0), 0);
    const totalStockCost = active.reduce((s: number, r: any) => s + Number(r.remainingSqft || 0) * Number(r.costPerSqft || 0), 0);
    // Group by product+variant to count "designs"
    const designSet = new Set<string>();
    for (const r of active) designSet.add(`${r.productId}:${r.variantId ?? 'none'}`);
    return {
      totalActiveRolls: active.length,
      totalFinishedRolls: finished.length,
      totalDamagedRolls: damaged.length,
      totalSqft: totalActiveSqft,
      totalLength,
      totalStockValue,
      totalStockCost,
      totalProfit: totalStockValue - totalStockCost,
      designCount: designSet.size,
      totalAll: all.length,
    };
  }, [data?.items]);

  // ─── Group expand/collapse ───
  const isGroupExpanded = (key: string) => expandedGroups.has(key);
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const expandAllGroups = () => setExpandedGroups(new Set(groups.map((g) => g.key)));
  const collapseAllGroups = () => setExpandedGroups(new Set());

  const showPrice = priceVis !== 'hidden';
  const showCost = priceVis === 'all';

  const hasActiveFilters = !!(params.productId || params.status || !params.inStockOnly || searchText);

  return (
    <div className="space-y-5">
      {showAddModal && (
        <AddRollModal
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {quickEditRoll && (
        <QuickEditRollModal
          roll={quickEditRoll}
          onClose={() => setQuickEditRoll(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
            setQuickEditRoll(null);
          }}
        />
      )}

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Layers className="h-3.5 w-3.5 text-amber-300" />
              Carpet Inventory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Carpet Rolls</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl font-semibold">
              Har roll ka individual tracking • variant-wise group view • real-time stock & value
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link to="/carpet-cut-pieces">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20">
                <Scissors className="h-4 w-4" /> Cut Pieces
              </Button>
            </Link>
            <Link to="/carpet-bulk-import">
              <Button variant="secondary" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Bulk Import
              </Button>
            </Link>
            <Button onClick={() => setShowAddModal(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-black/20">
              <Plus className="h-4 w-4" /> Add Roll
            </Button>
          </div>
        </div>

        {/* KPI GRID — bigger, clearer */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <KpiTile label="Active Rolls" value={stats.totalActiveRolls} sub={`${stats.totalAll} total`} icon={Package} tone="emerald" />
          <KpiTile label="Total Stock" value={`${stats.totalSqft.toFixed(0)}`} sub="sqft available" icon={Boxes} tone="blue" big />
          <KpiTile label="Designs" value={stats.designCount} sub="product × color" icon={Palette} tone="violet" />
          {showPrice && (
            <KpiTile label="Stock Value" value={formatPKR(stats.totalStockValue)} sub="at sale price" icon={TrendingUp} tone="amber" />
          )}
          {showCost && (
            <KpiTile label="Stock Cost" value={formatPKR(stats.totalStockCost)} sub="at cost price" icon={DollarSign} tone="slate" />
          )}
          <KpiTile label="Low Stock" value={lowRemaining.length} sub="< 10ft left" icon={AlertTriangle} tone="rose" />
        </div>
      </section>

      {/* ═══════════════ TOOLBAR ═══════════════ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        {/* Search row — BIG input */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-12 text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
              placeholder="Search: roll #, design code, product, color, rack, size (12x8)..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
              autoFocus
            />
            {params.search && (
              <button onClick={() => setParams({ ...params, search: '', page: 1 })} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
            {searchText && (
              <div className="absolute -bottom-6 left-2 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {rolls.length} match{rolls.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          {/* View mode switch */}
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => persistViewMode('variants')}
              className={`px-4 h-14 text-sm font-extrabold transition inline-flex items-center gap-1.5 ${
                viewMode === 'variants' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Group by product & variant"
            >
              <Palette className="h-4 w-4" />
              Variants
            </button>
            <button
              onClick={() => persistViewMode('grid')}
              className={`px-4 h-14 text-sm font-extrabold transition border-l-2 border-slate-200 inline-flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Card grid"
            >
              <Grid3x3 className="h-4 w-4" />
              Grid
            </button>
            <button
              onClick={() => persistViewMode('list')}
              className={`px-4 h-14 text-sm font-extrabold transition border-l-2 border-slate-200 inline-flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Table list"
            >
              <ListIcon className="h-4 w-4" />
              Table
            </button>
          </div>
        </div>

        {/* Second row — sort, price toggle, filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold focus:outline-none focus:border-emerald-500"
          >
            <option value="newest">🆕 Newest first</option>
            <option value="oldest">📅 Oldest first</option>
            <option value="largest">📦 Largest stock</option>
            <option value="smallest">📉 Smallest stock</option>
            <option value="value-high">💰 Highest value</option>
            <option value="value-low">💸 Lowest value</option>
            <option value="name">🔤 By roll number</option>
          </select>

          <button
            onClick={cyclePriceVis}
            className={`h-11 px-3 rounded-xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 transition ${
              priceVis === 'all' ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : priceVis === 'sale-only' ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
            title="Toggle price visibility"
          >
            {priceVis === 'hidden' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {priceVis === 'all' ? 'Prices: All' : priceVis === 'sale-only' ? 'Sale only' : 'Prices hidden'}
          </button>

          {viewMode === 'variants' && groups.length > 0 && (
            <>
              <button
                onClick={expandAllGroups}
                className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1"
              >
                <ChevronDown className="h-4 w-4" /> Expand All
              </button>
              <button
                onClick={collapseAllGroups}
                className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1"
              >
                <ChevronUp className="h-4 w-4" /> Collapse All
              </button>
            </>
          )}

          <Button
            variant="secondary"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters || hasActiveFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''}
          >
            <Filter className="h-4 w-4" /> Filters
            {hasActiveFilters && (
              <span className="ml-1 h-5 w-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">!</span>
            )}
          </Button>

          {hasActiveFilters && (
            <button
              onClick={() => setParams({ page: 1, limit: 60, inStockOnly: true, search: '' })}
              className="h-11 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-extrabold inline-flex items-center gap-1 border-2 border-rose-200"
            >
              <X className="h-4 w-4" /> Clear all
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t-2 border-slate-100">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">Product</label>
              <select
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                value={params.productId ?? ''}
                onChange={(e) => setParams({ ...params, productId: e.target.value || undefined, page: 1 })}
              >
                <option value="">All products</option>
                {(productsData?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">Status</label>
              <select
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                value={params.status ?? ''}
                onChange={(e) => setParams({ ...params, status: (e.target.value || undefined) as any, page: 1 })}
              >
                <option value="">All status</option>
                <option value="ACTIVE">✓ Active</option>
                <option value="FINISHED">Finished</option>
                <option value="DAMAGED">Damaged</option>
                <option value="RESERVED">Reserved</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-extrabold cursor-pointer h-11 px-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 flex-1">
                <input
                  type="checkbox"
                  checked={params.inStockOnly ?? false}
                  onChange={(e) => setParams({ ...params, inStockOnly: e.target.checked, page: 1 })}
                  className="h-4 w-4 rounded"
                />
                <span className="text-emerald-900">Only show rolls with stock</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════ LOW STOCK ALERT ═══════════════ */}
      {lowRemaining.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-amber-900 text-base">
                {lowRemaining.length} roll{lowRemaining.length !== 1 ? 's' : ''} running low
              </div>
              <div className="text-xs text-amber-700 font-bold">Less than 10ft remaining — consider restocking</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowRemaining.slice(0, 12).map((r: any) => (
              <Link
                key={r.id}
                to={`/carpet-rolls/${r.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border-2 border-amber-300 text-sm font-extrabold text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition shadow-sm"
              >
                <Activity className="h-3 w-3" />
                {r.rollNumber}
                <span className="text-amber-600 font-bold">{Number(r.remainingLengthFt).toFixed(1)}ft</span>
              </Link>
            ))}
            {lowRemaining.length > 12 && (
              <span className="inline-flex items-center px-3 text-sm font-extrabold text-amber-700">
                +{lowRemaining.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ CONTENT ═══════════════ */}
      {rolls.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 mx-auto flex items-center justify-center shadow-inner mb-4">
            <Layers className="h-12 w-12 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            {searchText ? `No rolls match "${searchText}"` : 'No rolls found'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto font-semibold">
            {searchText
              ? 'Try different keywords — roll #, product name, color, or size'
              : 'Add your first roll to start tracking carpet inventory'}
          </p>
          {!searchText && (
            <Button className="mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" /> Add First Roll
            </Button>
          )}
        </div>
      ) : viewMode === 'variants' ? (
        <VariantsView
          groups={groups}
          isExpanded={isGroupExpanded}
          onToggle={toggleGroup}
          onQuickEdit={setQuickEditRoll}
          onDelete={(id, num) => {
            if (confirm(`Delete roll ${num}?`)) removeMutation.mutate(id);
          }}
          onAddForVariant={(productId, variantId) => {
            // Deep-link into AddRollModal with variant pre-selected via a click event
            setShowAddModal(true);
            // For now, users pick variant inside modal. Future: pass through preselect props.
            void productId; void variantId;
          }}
          showPrice={showPrice}
          showCost={showCost}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rolls.map((roll: any) => (
            <RollCard
              key={roll.id}
              roll={roll}
              showPrice={showPrice}
              showCost={showCost}
              onQuickEdit={() => setQuickEditRoll(roll)}
              onDelete={() => {
                if (confirm(`Delete roll ${roll.rollNumber}?`)) removeMutation.mutate(roll.id);
              }}
            />
          ))}
        </div>
      ) : (
        <RollsTableView
          rolls={rolls}
          showPrice={showPrice}
          showCost={showCost}
          onQuickEdit={setQuickEditRoll}
          onDelete={(id, num) => {
            if (confirm(`Delete roll ${num}?`)) removeMutation.mutate(id);
          }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VARIANTS VIEW — Grouped by product+variant
// ═════════════════════════════════════════════════════════════

function VariantsView({
  groups, isExpanded, onToggle, onQuickEdit, onDelete, onAddForVariant, showPrice, showCost,
}: {
  groups: any[];
  isExpanded: (key: string) => boolean;
  onToggle: (key: string) => void;
  onQuickEdit: (r: any) => void;
  onDelete: (id: string, num: string) => void;
  onAddForVariant: (productId: string, variantId: string | null) => void;
  showPrice: boolean;
  showCost: boolean;
}) {
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const expanded = isExpanded(g.key);
        return (
          <section key={g.key} className="rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition">
            {/* Group Header */}
            <button
              onClick={() => onToggle(g.key)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/70 transition text-left"
            >
              {/* Variant swatch */}
              {g.variantColorHex ? (
                <div
                  className="h-14 w-14 rounded-xl border-2 border-white shadow-md shrink-0 ring-2 ring-slate-200"
                  style={{ backgroundColor: g.variantColorHex }}
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 ring-2 ring-slate-200">
                  <Layers className="h-6 w-6 text-slate-500" />
                </div>
              )}

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-extrabold text-slate-900 text-lg leading-tight">
                    {g.productName}
                  </div>
                  {g.variantName && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-sm font-extrabold">
                      {g.variantColorHex && (
                        <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: g.variantColorHex }} />
                      )}
                      {g.variantName}
                    </div>
                  )}
                  {g.designCode && (
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {g.designCode}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 flex-wrap text-sm text-slate-600 font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 text-emerald-600" />
                    <strong className="text-slate-900">{g.activeRolls}</strong> active roll{g.activeRolls !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5 text-blue-600" />
                    <strong className="text-emerald-700 tabular-nums text-base">{g.totalSqft.toFixed(0)}</strong> sqft available
                  </span>
                  {showPrice && g.stockValue > 0 && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                        <strong className="text-slate-900 tabular-nums">{formatPKR(g.stockValue)}</strong>
                      </span>
                    </>
                  )}
                  {g.rolls.length > g.activeRolls && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 text-xs font-bold">
                        +{g.rolls.length - g.activeRolls} finished/damaged
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Big sqft badge */}
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-3xl font-extrabold text-emerald-700 tabular-nums leading-none">
                  {g.totalSqft.toFixed(0)}
                </div>
                <div className="text-xs font-extrabold text-emerald-700">sqft</div>
              </div>

              <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition shrink-0 ${
                expanded ? 'bg-emerald-600 text-white rotate-180' : 'bg-slate-100 text-slate-600'
              }`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </button>

            {/* Expanded rolls list */}
            {expanded && (
              <div className="border-t-2 border-slate-100 bg-slate-50/40 p-3 space-y-2">
                {g.rolls.map((r: any) => (
                  <RollRowCompact
                    key={r.id}
                    roll={r}
                    showPrice={showPrice}
                    showCost={showCost}
                    onQuickEdit={() => onQuickEdit(r)}
                    onDelete={() => onDelete(r.id, r.rollNumber)}
                  />
                ))}
                <Link
                  to={`/carpet-rolls?productId=${g.productId}${g.variantId ? `&variantId=${g.variantId}` : ''}`}
                  onClick={(e) => { e.preventDefault(); onAddForVariant(g.productId, g.variantId); }}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-sm font-extrabold transition"
                >
                  <Plus className="h-4 w-4" /> Add Roll to {g.variantName || g.productName}
                </Link>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// COMPACT ROLL ROW (inside expanded variant group)
// ═════════════════════════════════════════════════════════════

function RollRowCompact({
  roll, showPrice, showCost, onQuickEdit, onDelete,
}: {
  roll: any;
  showPrice: boolean;
  showCost: boolean;
  onQuickEdit: () => void;
  onDelete: () => void;
}) {
  const percent =
    roll.originalLengthFt > 0
      ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
      : 0;
  const status = statusConfig[roll.status as CarpetRollStatus];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 hover:shadow-sm transition p-3 flex items-center gap-3 flex-wrap">
      {/* Roll # + status */}
      <div className="shrink-0">
        <div className="font-mono font-extrabold text-emerald-700 text-base leading-tight">
          {roll.rollNumber}
        </div>
        <span className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold ${status.color}`}>
          <StatusIcon className="h-2.5 w-2.5" />
          {status.label}
        </span>
      </div>

      {/* Dimensions */}
      <div className="text-sm shrink-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500">Size</div>
        <div className="font-extrabold text-slate-900 tabular-nums">
          {Number(roll.widthFt)}ft{Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''}
          {' × '}
          {Number(roll.remainingLengthFt)}ft{Number(roll.remainingLengthInch || 0) > 0 ? ` ${roll.remainingLengthInch}in` : ''}
        </div>
      </div>

      {/* Remaining sqft — BIG */}
      <div className="shrink-0 flex-1 min-w-[140px]">
        <div className="flex items-baseline gap-1">
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">
            {Number(roll.remainingSqft).toFixed(1)}
          </div>
          <div className="text-xs font-extrabold text-emerald-700">sqft</div>
          <div className="text-[10px] text-slate-500 font-bold ml-1">({percent.toFixed(0)}% left)</div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
          <div
            className={`h-full ${percent > 50 ? 'bg-emerald-500' : percent > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.max(percent, 3)}%` }}
          />
        </div>
      </div>

      {/* Pricing */}
      {showPrice && (
        <div className="shrink-0 text-right">
          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
            {formatPKR(roll.salePricePerSqft)}<span className="text-[10px] text-slate-500 font-bold">/sqft</span>
          </div>
          {showCost && (
            <div className="text-[11px] text-slate-500 font-bold tabular-nums">
              Cost {formatPKR(roll.costPerSqft)}
            </div>
          )}
        </div>
      )}

      {/* Location */}
      {roll.rackNumber && (
        <div className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
          <MapPin className="h-3 w-3" /> {roll.rackNumber}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <Link
          to={`/carpet-rolls/${roll.id}`}
          className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
          title="View details"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          onClick={onQuickEdit}
          className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition"
          title="Quick edit"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// KPI TILE
// ═════════════════════════════════════════════════════════════

function KpiTile({
  label, value, sub, icon: Icon, tone, big,
}: {
  label: string; value: string | number; sub?: string; icon: any; tone: string; big?: boolean;
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue:    'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet:  'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber:   'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose:    'from-rose-400/30 to-rose-600/20 border-rose-300/40',
    slate:   'from-slate-400/30 to-slate-600/20 border-slate-300/40',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3.5`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-white/90" />
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/90">{label}</div>
      </div>
      <div className={`font-extrabold leading-none text-white tabular-nums ${big ? 'text-3xl' : 'text-2xl'}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] font-bold text-white/75 mt-1">{sub}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// GRID CARD (unchanged design, bigger text, price toggle)
// ═════════════════════════════════════════════════════════════

function RollCard({
  roll, showPrice, showCost, onQuickEdit, onDelete,
}: {
  roll: any; showPrice: boolean; showCost: boolean;
  onQuickEdit: () => void; onDelete: () => void;
}) {
  const percentRemaining =
    roll.originalLengthFt > 0
      ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
      : 0;
  const profit = Number(roll.salePricePerSqft) - Number(roll.costPerSqft);
  const margin = roll.salePricePerSqft > 0 ? (profit / Number(roll.salePricePerSqft)) * 100 : 0;
  const status = statusConfig[roll.status as CarpetRollStatus];

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div className="font-mono text-white font-extrabold text-base">{roll.rollNumber}</div>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="font-extrabold text-slate-900 text-base line-clamp-1 leading-tight">
            {roll.product?.name ?? 'Unknown product'}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {roll.variant && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-xs font-extrabold">
                {roll.variant.colorHex && (
                  <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: roll.variant.colorHex }} />
                )}
                {roll.variant.name}
              </div>
            )}
            {roll.designCode && (
              <div className="text-xs font-mono font-bold text-slate-500">{roll.designCode}</div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="font-extrabold text-emerald-700 inline-flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Size
            </div>
            <div className="font-extrabold text-slate-900 tabular-nums">
              {Number(roll.widthFt)}ft{Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''}
              {' × '}
              {Number(roll.remainingLengthFt)}ft{Number(roll.remainingLengthInch || 0) > 0 ? ` ${roll.remainingLengthInch}in` : ''}
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <div className="text-3xl font-extrabold text-emerald-700 tabular-nums leading-none">
              {Number(roll.remainingSqft).toFixed(1)}
            </div>
            <div className="text-sm font-extrabold text-emerald-700">sqft</div>
          </div>
          <div className="h-2 rounded-full bg-white overflow-hidden ring-1 ring-emerald-200">
            <div
              className={`h-full transition-all ${
                percentRemaining > 50 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                : percentRemaining > 20 ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                : 'bg-gradient-to-r from-rose-400 to-rose-600'
              }`}
              style={{ width: `${Math.max(percentRemaining, 3)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold mt-1.5">
            <span className="text-slate-500">
              Original {Number(roll.originalLengthFt)}ft{Number(roll.originalLengthInch || 0) > 0 ? ` ${roll.originalLengthInch}in` : ''}
            </span>
            <span className={percentRemaining > 50 ? 'text-emerald-700' : percentRemaining > 20 ? 'text-amber-700' : 'text-rose-700'}>
              {percentRemaining.toFixed(0)}% left
            </span>
          </div>
        </div>

        {showPrice && (
          <div className="grid grid-cols-3 gap-1.5">
            {showCost && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Cost</div>
                <div className="text-sm font-extrabold text-slate-700 tabular-nums">{formatPKR(roll.costPerSqft)}</div>
              </div>
            )}
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Sale</div>
              <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(roll.salePricePerSqft)}</div>
            </div>
            {showCost && (
              <div className={`rounded-lg border p-2 ${
                margin > 25 ? 'bg-amber-50 border-amber-200'
                : margin > 10 ? 'bg-blue-50 border-blue-200'
                : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[10px] uppercase font-extrabold ${
                  margin > 25 ? 'text-amber-700' : margin > 10 ? 'text-blue-700' : 'text-slate-500'
                }`}>Margin</div>
                <div className={`text-sm font-extrabold tabular-nums ${
                  margin > 25 ? 'text-amber-700' : margin > 10 ? 'text-blue-700' : 'text-slate-700'
                }`}>{margin.toFixed(0)}%</div>
              </div>
            )}
          </div>
        )}

        {(roll.rackNumber || roll.shop?.name) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-50 rounded-lg px-2.5 py-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {roll.shop?.name}
              {roll.shop?.name && roll.rackNumber && ' • '}
              {roll.rackNumber}
            </span>
          </div>
        )}

        <div className="flex gap-1.5 pt-1">
          <Link
            to={`/carpet-rolls/${roll.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Link>
          <button onClick={onQuickEdit} className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center justify-center transition" title="Quick edit">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TABLE VIEW — bigger text, cleaner columns
// ═════════════════════════════════════════════════════════════

function RollsTableView({
  rolls, showPrice, showCost, onQuickEdit, onDelete,
}: {
  rolls: any[]; showPrice: boolean; showCost: boolean;
  onQuickEdit: (r: any) => void; onDelete: (id: string, num: string) => void;
}) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <Th>Roll #</Th>
              <Th>Product & Variant</Th>
              <Th className="text-center">Size</Th>
              <Th className="text-right">Remaining</Th>
              {showPrice && showCost && <Th className="text-right">Cost/sqft</Th>}
              {showPrice && <Th className="text-right">Sale/sqft</Th>}
              {showPrice && <Th className="text-right">Value</Th>}
              <Th>Rack</Th>
              <Th className="text-center">Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rolls.map((roll) => {
              const percent = roll.originalLengthFt > 0 ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100 : 0;
              const status = statusConfig[roll.status as CarpetRollStatus];
              const StatusIcon = status.icon;
              const value = Number(roll.remainingSqft) * Number(roll.salePricePerSqft);
              return (
                <tr key={roll.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono font-extrabold text-emerald-700 text-base">{roll.rollNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-extrabold text-slate-900 text-sm">{roll.product?.name}</div>
                    {roll.variant && (
                      <div className="text-xs text-violet-700 font-bold flex items-center gap-1 mt-0.5">
                        {roll.variant.colorHex && (
                          <span className="h-2.5 w-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: roll.variant.colorHex }} />
                        )}
                        {roll.variant.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-slate-700 tabular-nums">
                    {Number(roll.widthFt)}ft × {Number(roll.remainingLengthFt)}ft
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-extrabold text-emerald-700 tabular-nums text-base">
                      {Number(roll.remainingSqft).toFixed(1)} sqft
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">{percent.toFixed(0)}% left</div>
                  </td>
                  {showPrice && showCost && (
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700 tabular-nums">{formatPKR(roll.costPerSqft)}</td>
                  )}
                  {showPrice && (
                    <td className="px-4 py-3 text-right text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(roll.salePricePerSqft)}</td>
                  )}
                  {showPrice && (
                    <td className="px-4 py-3 text-right text-sm font-extrabold text-slate-900 tabular-nums">{formatPKR(value)}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-slate-600 font-bold">
                    {roll.rackNumber || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${status.color}`}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/carpet-rolls/${roll.id}`} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => onQuickEdit(roll)} className="h-8 w-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDelete(roll.id, roll.rollNumber)} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: any; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>
      {children}
    </th>
  );
}

// ═════════════════════════════════════════════════════════════
// QUICK EDIT MODAL — bigger inputs, live profit
// ═════════════════════════════════════════════════════════════

function QuickEditRollModal({
  roll, onClose, onSuccess,
}: {
  roll: any; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    costPerSqft: Number(roll.costPerSqft) || 0,
    salePricePerSqft: Number(roll.salePricePerSqft) || 0,
    wholesalePricePerSqft: Number(roll.wholesalePricePerSqft) || 0,
    rackNumber: roll.rackNumber ?? '',
    designCode: roll.designCode ?? '',
    notes: roll.notes ?? '',
  });

  const updateMutation = useMutation({
    mutationFn: () => carpetRollsApi.update(roll.id, form),
    onSuccess: () => {
      toast.success(`✓ ${roll.rollNumber} updated`);
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const profitMargin =
    form.costPerSqft > 0 && form.salePricePerSqft > 0
      ? ((form.salePricePerSqft - form.costPerSqft) / form.salePricePerSqft) * 100
      : 0;
  const rollValue = Number(roll.remainingSqft) * form.salePricePerSqft;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-blue-700 to-blue-600 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Zap className="h-3 w-3" /> Quick Edit
            </div>
            <h2 className="mt-2 text-2xl font-extrabold font-mono">{roll.rollNumber}</h2>
            <p className="text-sm text-white/85 mt-0.5 font-semibold">
              {roll.product?.name}
              {roll.variant && ` — ${roll.variant.name}`}
              <span className="ml-2 text-white/70">• {Number(roll.remainingSqft).toFixed(1)} sqft</span>
            </p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider font-extrabold text-blue-700 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Pricing (per sqft)
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Cost" type="number" step="0.01" value={form.costPerSqft} onChange={(e) => setForm({ ...form, costPerSqft: Number(e.target.value) })} />
              <Input label="Sale" type="number" step="0.01" value={form.salePricePerSqft} onChange={(e) => setForm({ ...form, salePricePerSqft: Number(e.target.value) })} />
              <Input label="Wholesale" type="number" step="0.01" value={form.wholesalePricePerSqft} onChange={(e) => setForm({ ...form, wholesalePricePerSqft: Number(e.target.value) })} />
            </div>
            {profitMargin > 0 && (
              <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Margin</div>
                  <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{profitMargin.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-600">Profit /sqft</div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">Rs {(form.salePricePerSqft - form.costPerSqft).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-amber-700">Roll Value</div>
                  <div className="text-lg font-extrabold text-amber-700 tabular-nums">{formatPKRFull(rollValue)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Location & Details
            </div>
            <Input label="Rack / Location" value={form.rackNumber} onChange={(e) => setForm({ ...form, rackNumber: e.target.value })} hint="e.g. Wall-1, Rack-A" />
            <Input label="Design Code" value={form.designCode} onChange={(e) => setForm({ ...form, designCode: e.target.value })} />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <Link to={`/carpet-rolls/${roll.id}`} className="block text-center text-sm text-blue-600 font-extrabold hover:underline">
            Need to edit dimensions or roll number? → Open full editor
          </Link>
        </div>

        <div className="bg-slate-50 border-t-2 border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-200 transition">
            Cancel
          </button>
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending} className="bg-gradient-to-r from-blue-700 to-blue-600 shadow-lg">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
