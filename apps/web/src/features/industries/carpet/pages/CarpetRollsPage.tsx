import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Layers, AlertTriangle, Sliders, Trash2,
  Ruler, Package, MapPin, Eye, Scissors, X, FileSpreadsheet,
  Edit3, DollarSign, Save, TrendingUp, BarChart3, ChevronRight,
  Filter, SortAsc, Sparkles, Grid3x3, List as ListIcon, Award,
  Activity, ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import {
  carpetRollsApi,
  type CarpetRollsListParams,
  type CarpetRollStatus,
} from '../api/carpet-rolls.api';
import { productsApi } from '@/api/products.api';
import { AddRollModal } from '../components/AddRollModal';

const statusColors: Record<CarpetRollStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  FINISHED: 'bg-slate-100 text-slate-600 border-slate-300',
  DAMAGED: 'bg-rose-100 text-rose-700 border-rose-300',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-300',
  TRANSFERRED: 'bg-blue-100 text-blue-700 border-blue-300',
};

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'largest' | 'smallest' | 'oldest' | 'name';

export default function CarpetRollsPage() {
  const queryClient = useQueryClient();

  const [params, setParams] = useState<CarpetRollsListParams>({
    page: 1,
    limit: 24,
    inStockOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickEditRoll, setQuickEditRoll] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [summarySearch, setSummarySearch] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const { data } = useQuery({
    queryKey: ['carpet-rolls', params, sortBy],
    queryFn: () => carpetRollsApi.list(params),
  });

  const { data: summary = [] } = useQuery({
    queryKey: ['carpet-rolls-summary'],
    queryFn: () => carpetRollsApi.summary(),
  });

  const { data: lowRemaining = [] } = useQuery({
    queryKey: ['carpet-rolls-low'],
    queryFn: () => carpetRollsApi.lowRemaining(10),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 200, isActive: true }],
    queryFn: () => productsApi.list({ limit: 200, isActive: true }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => carpetRollsApi.remove(id),
    onSuccess: (res: any) => {
      toast.success(res?.message ?? 'Removed');
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to delete'),
  });

  // ─── Filtered + sorted items ──────────────────────────────
  const items = useMemo(() => {
    let list = data?.items ?? [];
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'largest':
          return Number(b.remainingSqft) - Number(a.remainingSqft);
        case 'smallest':
          return Number(a.remainingSqft) - Number(b.remainingSqft);
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.rollNumber.localeCompare(b.rollNumber);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [data?.items, sortBy]);

  // ─── Filtered variant summary ─────────────────────────────
  const filteredSummary = useMemo(() => {
    const q = summarySearch.toLowerCase().trim();
    if (!q) return summary;
    return summary.filter(
      (s) =>
        s.productName.toLowerCase().includes(q) ||
        (s.variantName || '').toLowerCase().includes(q) ||
        (s.variantColor || '').toLowerCase().includes(q),
    );
  }, [summary, summarySearch]);

  // ─── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalActiveSqft = summary.reduce((a, s) => a + Number(s.totalSqft), 0);
    const totalRolls = summary.reduce((a, s) => a + s.rollCount, 0);
    const totalLength = summary.reduce((a, s) => a + Number(s.totalLengthFt), 0);
    const totalStockValue = (data?.items ?? []).reduce(
      (a, r) => a + Number(r.remainingSqft) * Number(r.salePricePerSqft),
      0,
    );
    const totalCostValue = (data?.items ?? []).reduce(
      (a, r) => a + Number(r.remainingSqft) * Number(r.costPerSqft),
      0,
    );
    return { totalActiveSqft, totalRolls, totalLength, totalStockValue, totalCostValue };
  }, [summary, data?.items]);

  const displayedSummary = summaryExpanded ? filteredSummary : filteredSummary.slice(0, 8);
  const hasMoreSummary = filteredSummary.length > 8;

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
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              Carpet Rolls
            </h1>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Roll-based stock management — har roll alag track hota hai, automatic cut tracking, real-time profit analysis
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
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-black/20"
            >
              <Plus className="h-4 w-4" /> Add New Roll
            </Button>
          </div>
        </div>

        {/* ─── KPI GRID ─── */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <KpiTile
            label="Active Rolls"
            value={stats.totalRolls}
            icon={Package}
            tone="emerald"
          />
          <KpiTile
            label="Total Sqft"
            value={stats.totalActiveSqft.toFixed(0)}
            sub="available"
            icon={Ruler}
            tone="blue"
          />
          <KpiTile
            label="Designs"
            value={summary.length}
            sub="variants"
            icon={Sparkles}
            tone="violet"
          />
          <KpiTile
            label="Stock Value"
            value={formatPKRFull(stats.totalStockValue)}
            sub="at sale price"
            icon={TrendingUp}
            tone="amber"
          />
          <KpiTile
            label="Low Stock"
            value={lowRemaining.length}
            sub="< 10ft left"
            icon={AlertTriangle}
            tone="rose"
          />
        </div>
      </section>

      {/* ═══════════════ VARIANT SUMMARY (Compact) ═══════════════ */}
      {summary.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                    Variant Summary
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {filteredSummary.length} of {summary.length} variant groups
                    {summarySearch && ` • filtered by "${summarySearch}"`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    placeholder="Filter designs..."
                    className="h-9 w-44 rounded-lg border-2 border-slate-200 bg-white pl-8 pr-7 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  {summarySearch && (
                    <button
                      onClick={() => setSummarySearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded hover:bg-slate-100 flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-slate-500" />
                    </button>
                  )}
                </div>
                {(params.productId || params.variantId) && (
                  <button
                    onClick={() =>
                      setParams({ ...params, productId: undefined, variantId: undefined, page: 1 })
                    }
                    className="h-9 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear filter
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            {filteredSummary.length === 0 ? (
              <div className="py-8 text-center">
                <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No designs match "{summarySearch}"</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                  {displayedSummary.map((s) => {
                    const isSelected =
                      params.productId === s.productId &&
                      params.variantId === (s.variantId ?? undefined);
                    return (
                      <button
                        key={`${s.productId}:${s.variantId ?? 'none'}`}
                        onClick={() =>
                          setParams({
                            ...params,
                            productId: s.productId,
                            variantId: s.variantId ?? undefined,
                            page: 1,
                          })
                        }
                        className={`group rounded-xl border-2 p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="text-[10px] font-extrabold text-slate-900 line-clamp-1 leading-tight">
                          {s.productName}
                        </div>
                        {s.variantName && (
                          <div className="text-[9px] font-extrabold text-violet-700 truncate mt-0.5 flex items-center gap-0.5">
                            {s.variantColor && (
                              <span
                                className="h-1.5 w-1.5 rounded-full border border-white shadow-sm shrink-0"
                                style={{ backgroundColor: s.variantColor }}
                              />
                            )}
                            <span className="truncate">{s.variantName}</span>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-baseline gap-0.5">
                          <span className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">
                            {s.totalSqft.toFixed(0)}
                          </span>
                          <span className="text-[9px] font-extrabold text-emerald-700">sqft</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                          {s.rollCount} roll{s.rollCount !== 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {hasMoreSummary && (
                  <button
                    onClick={() => setSummaryExpanded((v) => !v)}
                    className="mt-3 w-full h-9 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition"
                  >
                    {summaryExpanded ? (
                      <>
                        <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                        Show less
                      </>
                    ) : (
                      <>
                        Show all {filteredSummary.length} designs
                        <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════ SEARCH + CONTROLS ═══════════════ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
              placeholder="Search by roll #, design code, product name..."
              value={params.search ?? ''}
              onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
            />
            {params.search && (
              <button
                onClick={() => setParams({ ...params, search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-extrabold focus:outline-none focus:border-emerald-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="largest">Largest stock</option>
            <option value="smallest">Smallest stock</option>
            <option value="name">By roll number</option>
          </select>

          <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 h-11 text-xs font-extrabold transition ${
                viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 h-11 text-xs font-extrabold transition border-l-2 border-slate-200 ${
                viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''}
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t-2 border-slate-100">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Product</label>
              <select
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                value={params.productId ?? ''}
                onChange={(e) =>
                  setParams({ ...params, productId: e.target.value || undefined, page: 1 })
                }
              >
                <option value="">All products</option>
                {(productsData?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Status</label>
              <select
                className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                value={params.status ?? ''}
                onChange={(e) =>
                  setParams({ ...params, status: (e.target.value || undefined) as any, page: 1 })
                }
              >
                <option value="">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="FINISHED">Finished</option>
                <option value="DAMAGED">Damaged</option>
                <option value="RESERVED">Reserved</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-xs font-extrabold cursor-pointer h-10 px-3 rounded-lg bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 w-full">
                <input
                  type="checkbox"
                  checked={params.inStockOnly ?? false}
                  onChange={(e) =>
                    setParams({ ...params, inStockOnly: e.target.checked, page: 1 })
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="text-emerald-900">Only available stock</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setParams({ page: 1, limit: 24, inStockOnly: false })}
                className="h-10 w-full rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition border-2 border-rose-200"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════ LOW REMAINING ALERT ═══════════════ */}
      {lowRemaining.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-md">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="font-extrabold text-amber-900 text-sm">
                {lowRemaining.length} roll{lowRemaining.length !== 1 ? 's' : ''} running low
              </div>
              <div className="text-[10px] text-amber-700 font-bold">
                Less than 10ft remaining — consider restocking
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowRemaining.slice(0, 10).map((r) => (
              <Link
                key={r.id}
                to={`/carpet-rolls/${r.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border-2 border-amber-300 text-xs font-extrabold text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition shadow-sm"
              >
                <Activity className="h-2.5 w-2.5" />
                {r.rollNumber}
                <span className="text-amber-600 font-bold">
                  {Number(r.remainingLengthFt).toFixed(1)}ft
                </span>
              </Link>
            ))}
            {lowRemaining.length > 10 && (
              <span className="inline-flex items-center px-2 text-xs font-extrabold text-amber-700">
                +{lowRemaining.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ ROLLS GRID/LIST ═══════════════ */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 mx-auto flex items-center justify-center shadow-inner mb-4">
            <Layers className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">No rolls found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {params.search
              ? 'Try different search keywords'
              : 'Add your first roll to start tracking carpet inventory'}
          </p>
          <Button className="mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add First Roll
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((roll) => (
            <RollCard
              key={roll.id}
              roll={roll}
              onQuickEdit={() => setQuickEditRoll(roll)}
              onDelete={() => {
                if (confirm(`Delete roll ${roll.rollNumber}?`)) {
                  removeMutation.mutate(roll.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Roll #</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Dimensions</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Remaining</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cost</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Sale</th>
                  <th className="px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Location</th>
                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Status</th>
                  <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((roll) => {
                  const percent =
                    roll.originalLengthFt > 0
                      ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
                      : 0;
                  return (
                    <tr key={roll.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 font-mono font-extrabold text-emerald-700 text-xs">
                        {roll.rollNumber}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 text-xs">{roll.product?.name}</div>
                        {roll.variant && (
                          <div className="text-[10px] text-violet-700 font-bold flex items-center gap-1">
                            {roll.variant.colorHex && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: roll.variant.colorHex }}
                              />
                            )}
                            {roll.variant.name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] font-bold text-slate-700">
                        {Number(roll.widthFt)}ft
                        {Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''}
                        {' × '}
                        {Number(roll.remainingLengthFt)}ft
                        {Number(roll.remainingLengthInch || 0) > 0 ? ` ${roll.remainingLengthInch}in` : ''}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-extrabold text-emerald-700 tabular-nums">
                          {Number(roll.remainingSqft).toFixed(1)} sqft
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold">
                          {percent.toFixed(0)}% remaining
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-bold text-slate-700">
                        {formatPKRFull(roll.costPerSqft)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-extrabold text-emerald-700">
                        {formatPKRFull(roll.salePricePerSqft)}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-slate-600">
                        {roll.shop?.name && <div className="font-bold">{roll.shop.name}</div>}
                        {roll.rackNumber && <div className="text-slate-500">{roll.rackNumber}</div>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${statusColors[roll.status]}`}>
                          {roll.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/carpet-rolls/${roll.id}`}
                            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                          >
                            <Eye className="h-3 w-3" />
                          </Link>
                          <button
                            onClick={() => setQuickEditRoll(roll)}
                            className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete roll ${roll.rollNumber}?`)) {
                                removeMutation.mutate(roll.id);
                              }
                            }}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
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
      )}

      {/* ═══════════════ PAGINATION ═══════════════ */}
      {data && data.meta.totalPages > 1 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="text-sm text-slate-600 font-bold">
            Page <span className="text-slate-900">{data.meta.page}</span> of{' '}
            <span className="text-slate-900">{data.meta.totalPages}</span> •{' '}
            <span className="text-emerald-700">{data.meta.total}</span> total rolls
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="h-9 px-3 rounded-lg border-2 border-slate-200 text-xs font-extrabold disabled:opacity-40 hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═════════════════════════════════════════════════════════════

function KpiTile({
  label, value, sub, icon: Icon, tone,
}: { label: string; value: string | number; sub?: string; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40 text-emerald-100',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40 text-blue-100',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40 text-violet-100',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40 text-amber-100',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40 text-rose-100',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold leading-none text-white tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold opacity-75 mt-0.5">{sub}</div>}
    </div>
  );
}

function RollCard({
  roll, onQuickEdit, onDelete,
}: {
  roll: any;
  onQuickEdit: () => void;
  onDelete: () => void;
}) {
  const percentRemaining =
    roll.originalLengthFt > 0
      ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
      : 0;
  const profit = Number(roll.salePricePerSqft) - Number(roll.costPerSqft);
  const margin = roll.salePricePerSqft > 0 ? (profit / Number(roll.salePricePerSqft)) * 100 : 0;

  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">
      {/* Header strip */}
      <div className="px-3.5 py-2 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div className="font-mono text-white font-extrabold text-sm">{roll.rollNumber}</div>
        <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold ${statusColors[roll.status as CarpetRollStatus]}`}>
          {roll.status}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        {/* Product info */}
        <div>
          <div className="font-extrabold text-slate-900 text-sm line-clamp-1 leading-tight">
            {roll.product?.name ?? 'Unknown product'}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {roll.variant && (
              <div className="text-[10px] font-extrabold text-violet-700 flex items-center gap-1">
                {roll.variant.colorHex && (
                  <span
                    className="h-2 w-2 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: roll.variant.colorHex }}
                  />
                )}
                {roll.variant.name}
              </div>
            )}
            {roll.designCode && (
              <div className="text-[9px] font-mono font-bold text-slate-500">
                {roll.designCode}
              </div>
            )}
          </div>
        </div>

        {/* Dimensions box */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-2.5">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <div className="font-extrabold text-emerald-700 flex items-center gap-1">
              <Ruler className="h-2.5 w-2.5" /> Size
            </div>
            <div className="font-extrabold text-slate-900">
              {Number(roll.widthFt)}ft{Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''}
              {' × '}
              {Number(roll.remainingLengthFt)}ft{Number(roll.remainingLengthInch || 0) > 0 ? ` ${roll.remainingLengthInch}in` : ''}
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1.5">
            <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">
              {Number(roll.remainingSqft).toFixed(1)}
            </div>
            <div className="text-[10px] font-extrabold text-emerald-700">sqft</div>
          </div>
          <div className="h-1.5 rounded-full bg-white overflow-hidden ring-1 ring-emerald-200">
            <div
              className={`h-full transition-all ${
                percentRemaining > 50
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  : percentRemaining > 20
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                    : 'bg-gradient-to-r from-rose-400 to-rose-600'
              }`}
              style={{ width: `${Math.max(percentRemaining, 3)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold mt-1">
            <span className="text-slate-500">
              {Number(roll.originalLengthFt)}ft{Number(roll.originalLengthInch || 0) > 0 ? ` ${roll.originalLengthInch}in` : ''} orig
            </span>
            <span className={percentRemaining > 50 ? 'text-emerald-700' : percentRemaining > 20 ? 'text-amber-700' : 'text-rose-700'}>
              {percentRemaining.toFixed(0)}% left
            </span>
          </div>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-1.5">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Cost</div>
            <div className="text-xs font-extrabold text-slate-700 tabular-nums">
              {formatPKRFull(roll.costPerSqft)}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-1.5">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Sale</div>
            <div className="text-xs font-extrabold text-emerald-700 tabular-nums">
              {formatPKRFull(roll.salePricePerSqft)}
            </div>
          </div>
          <div className={`rounded-lg border p-1.5 ${
            margin > 25 ? 'bg-amber-50 border-amber-200' :
            margin > 10 ? 'bg-blue-50 border-blue-200' :
            'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-[9px] uppercase font-extrabold ${
              margin > 25 ? 'text-amber-700' :
              margin > 10 ? 'text-blue-700' :
              'text-slate-500'
            }`}>Margin</div>
            <div className={`text-xs font-extrabold tabular-nums ${
              margin > 25 ? 'text-amber-700' :
              margin > 10 ? 'text-blue-700' :
              'text-slate-700'
            }`}>
              {margin.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Location */}
        {(roll.rackNumber || roll.shop?.name) && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold bg-slate-50 rounded-md px-2 py-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">
              {roll.shop?.name}
              {roll.shop?.name && roll.rackNumber && ' • '}
              {roll.rackNumber}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-0.5">
          <Link
            to={`/carpet-rolls/${roll.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition"
          >
            <Eye className="h-3 w-3" /> View
          </Link>
          <button
            onClick={onQuickEdit}
            className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center justify-center transition"
            title="Quick edit pricing & location"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition"
            title="Delete roll"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Edit Modal — fast pricing + location update ───────
function QuickEditRollModal({
  roll, onClose, onSuccess,
}: {
  roll: any;
  onClose: () => void;
  onSuccess: () => void;
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
      toast.success(`${roll.rollNumber} updated`);
      onSuccess();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const profitMargin =
    form.costPerSqft > 0 && form.salePricePerSqft > 0
      ? ((form.salePricePerSqft - form.costPerSqft) / form.salePricePerSqft) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-blue-700 to-blue-600 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Edit3 className="h-3 w-3" />
              Quick Edit
            </div>
            <h2 className="mt-2 text-xl font-extrabold font-mono">{roll.rollNumber}</h2>
            <p className="text-xs text-white/80 mt-0.5">
              {roll.product?.name}
              {roll.variant && ` — ${roll.variant.name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Pricing
            </div>
            <Input
              label="Cost / sqft (PKR)"
              type="number"
              step="0.01"
              value={form.costPerSqft}
              onChange={(e) => setForm({ ...form, costPerSqft: Number(e.target.value) })}
            />
            <Input
              label="Sale / sqft (PKR)"
              type="number"
              step="0.01"
              value={form.salePricePerSqft}
              onChange={(e) => setForm({ ...form, salePricePerSqft: Number(e.target.value) })}
            />
            <Input
              label="Wholesale / sqft (PKR)"
              type="number"
              step="0.01"
              value={form.wholesalePricePerSqft}
              onChange={(e) => setForm({ ...form, wholesalePricePerSqft: Number(e.target.value) })}
            />
            {profitMargin > 0 && (
              <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2 text-xs">
                <span className="font-bold text-emerald-900">
                  Profit margin: {profitMargin.toFixed(1)}%
                </span>
                <span className="text-emerald-700 ml-2">
                  (Rs {(form.salePricePerSqft - form.costPerSqft).toFixed(2)} per sqft)
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location & Details
            </div>
            <Input
              label="Rack / Location"
              value={form.rackNumber}
              onChange={(e) => setForm({ ...form, rackNumber: e.target.value })}
              hint="e.g. Wall-1, Rack-A"
            />
            <Input
              label="Design Code"
              value={form.designCode}
              onChange={(e) => setForm({ ...form, designCode: e.target.value })}
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <Link
            to={`/carpet-rolls/${roll.id}`}
            className="block text-center text-xs text-blue-600 font-bold hover:underline"
          >
            Need to edit dimensions or roll number? → Open full editor
          </Link>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <Button
            onClick={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
            className="bg-gradient-to-r from-blue-700 to-blue-600"
          >
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
