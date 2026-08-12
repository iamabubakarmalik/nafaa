import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Search, Package, Sparkles, CheckCircle2, Tag,
  ShoppingBag, Filter, Zap, TrendingUp, AlertCircle,
  Image as ImageIcon, DollarSign, Boxes, Rocket, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import {
  quickSetupApi,
  type SeedProduct,
  type PriceOverride,
} from '../api/quick-setup.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

interface Props {
  onClose: () => void;
}

type Step = 'select' | 'review' | 'importing' | 'done';

export function QuickSetupCatalogModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [priceOverrides, setPriceOverrides] = useState<Record<string, PriceOverride>>({});

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeBrand, setActiveBrand] = useState<string>('all');
  const [hideAlreadyImported, setHideAlreadyImported] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['quick-setup-catalog'],
    queryFn: quickSetupApi.catalog,
  });

  const importMutation = useMutation({
    mutationFn: () => quickSetupApi.import(Array.from(selectedIds), priceOverrides),
    onSuccess: (result) => {
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      forceRefreshProducts().catch(() => {});
      toast.success(result.message);
    },
    onError: (e: any) => {
      setStep('review');
      toast.error(e?.response?.data?.message || 'Import fail — try again');
    },
  });

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ─── Filtering ─────────────────────────────────────
  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.catalog;

    if (hideAlreadyImported) {
      list = list.filter((p) => !p.alreadyExists);
    }
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (activeBrand !== 'all') {
      list = list.filter((p) => p.brand === activeBrand);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data, search, activeCategory, activeBrand, hideAlreadyImported]);

  // ─── Stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    if (!data) return { selectedCount: 0, totalPrice: 0, totalCost: 0 };
    const selected = data.catalog.filter((p) => selectedIds.has(p.id));
    const totalPrice = selected.reduce((s, p) => {
      const override = priceOverrides[p.id]?.price ?? p.price;
      return s + override;
    }, 0);
    const totalCost = selected.reduce((s, p) => {
      const override = priceOverrides[p.id]?.costPrice ?? p.costPrice;
      return s + override;
    }, 0);
    return { selectedCount: selected.length, totalPrice, totalCost };
  }, [data, selectedIds, priceOverrides]);

  // ─── Actions ───────────────────────────────────────
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const all = filtered.filter((p) => !p.alreadyExists).map((p) => p.id);
    setSelectedIds((prev) => new Set([...prev, ...all]));
    toast.success(`${all.length} products selected`);
  };

  const deselectAll = () => setSelectedIds(new Set());

  const selectCategory = (categoryName: string) => {
    if (!data) return;
    const ids = data.catalog
      .filter((p) => p.category === categoryName && !p.alreadyExists)
      .map((p) => p.id);
    setSelectedIds((prev) => new Set([...prev, ...ids]));
    toast.success(`${categoryName} — ${ids.length} products selected`);
  };

  const clearFilters = () => {
    setSearch('');
    setActiveCategory('all');
    setActiveBrand('all');
  };

  const updateOverride = (id: string, field: keyof PriceOverride, value: number) => {
    setPriceOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const startImport = () => {
    if (selectedIds.size === 0) {
      toast.error('Pehle products select karo');
      return;
    }
    setStep('review');
  };

  const confirmImport = () => {
    setStep('importing');
    importMutation.mutate();
  };

  // ─── DONE screen ───────────────────────────────────
  if (step === 'done' && importMutation.data) {
    const r = importMutation.data;
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-6 text-center">
            <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur mx-auto flex items-center justify-center shadow-inner mb-3">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-extrabold">Import Complete! 🎉</h2>
            <p className="text-white/85 text-sm mt-1">{r.message}</p>
          </div>

          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Products" value={r.imported} icon={Package} tone="emerald" />
              <StatBox label="Brands" value={r.brandsCreated} icon={Tag} tone="blue" />
              <StatBox label="Categories" value={r.categoriesCreated} icon={Boxes} tone="violet" />
              <StatBox label="Tags" value={r.tagsCreated} icon={Sparkles} tone="amber" />
            </div>

            {r.skipped > 0 && (
              <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                {r.skipped} products already existed (skipped)
              </div>
            )}

            {r.errorCount > 0 && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3">
                <div className="font-extrabold text-rose-900 dark:text-rose-200 text-sm mb-1 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> {r.errorCount} errors
                </div>
                <ul className="text-xs text-rose-800 dark:text-rose-300 space-y-0.5">
                  {r.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>• {e.name}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-lg"
            >
              Done — Products dekho
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── IMPORTING screen ──────────────────────────────
  if (step === 'importing') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-700 mx-auto flex items-center justify-center shadow-xl mb-4">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Importing {selectedIds.size} products...
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-semibold">
              Brands, categories, tags aur products ban rahe hain. 1-2 minute lag sakte hain.
            </p>
            <div className="mt-6 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-700 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── REVIEW screen ─────────────────────────────────
  if (step === 'review') {
    const selectedProducts = data?.catalog.filter((p) => selectedIds.has(p.id)) ?? [];
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-br from-sky-600 to-cyan-700 text-white p-5 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">
                    Step 2 of 2 — Review & Confirm
                  </div>
                  <h2 className="font-extrabold text-lg">{selectedIds.size} products ready to import</h2>
                </div>
              </div>
              <button
                onClick={() => setStep('select')}
                className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-800 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-300">Products</div>
                  <div className="text-2xl font-extrabold text-sky-900 dark:text-sky-100 tabular-nums">
                    {stats.selectedCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-300">Est. Sales</div>
                  <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatPKR(stats.totalPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-300">Est. Cost</div>
                  <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                    {formatPKR(stats.totalCost)}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Adjust prices / stock (optional)
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-2xl">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (p as any).emoji ? (
                        <span>{(p as any).emoji}</span>
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {p.brand} • {p.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PriceInput
                        label="Sale"
                        value={priceOverrides[p.id]?.price ?? p.price}
                        onChange={(v) => updateOverride(p.id, 'price', v)}
                        tone="emerald"
                      />
                      <PriceInput
                        label="Cost"
                        value={priceOverrides[p.id]?.costPrice ?? p.costPrice}
                        onChange={(v) => updateOverride(p.id, 'costPrice', v)}
                        tone="amber"
                      />
                      <PriceInput
                        label="Stock"
                        value={priceOverrides[p.id]?.stock ?? 0}
                        onChange={(v) => updateOverride(p.id, 'stock', v)}
                        tone="sky"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 dark:border-slate-700 p-4 flex gap-2 shrink-0 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => setStep('select')}
              className="flex-1 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-extrabold text-sm"
            >
              ← Back to Selection
            </button>
            <button
              onClick={confirmImport}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 text-white font-extrabold text-sm shadow-lg inline-flex items-center justify-center gap-2"
            >
              <Rocket className="h-4 w-4" /> Import {selectedIds.size} Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SELECT screen (main) ──────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="relative bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-5 shrink-0 overflow-hidden">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" /> Quick Setup
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-1">Pakistan Grocery Catalog</h2>
                <p className="text-xs text-white/80 font-semibold mt-0.5">
                  Ready-made products list — select karo aur import kar do 🚀
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {data && (
            <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat label="Available" value={data.total - data.alreadyImported} />
              <MiniStat label="Selected" value={selectedIds.size} highlight />
              <MiniStat label="Categories" value={data.categories.length} />
              <MiniStat label="Brands" value={data.brands.length} />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 border-b-2 border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, tags..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-9 text-sm font-semibold focus:outline-none focus:border-sky-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <select
              value={activeBrand}
              onChange={(e) => setActiveBrand(e.target.value)}
              className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Brands</option>
              {data?.brands.map((b) => (
                <option key={b.name} value={b.name}>{b.name} ({b.count})</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hideAlreadyImported}
                onChange={(e) => setHideAlreadyImported(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Hide imported</span>
            </label>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                activeCategory === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All ({data?.total ?? 0})
            </button>
            {data?.categories.map((cat) => {
              const active = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                    active ? 'shadow-sm' : 'border-transparent'
                  }`}
                  style={{
                    backgroundColor: active ? cat.color : `${cat.color}15`,
                    color: active ? '#fff' : cat.color,
                    borderColor: active ? cat.color : 'transparent',
                  }}
                >
                  {cat.name} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={selectAllVisible}
              className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold inline-flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3" /> Select All Visible ({filtered.filter(p => !p.alreadyExists).length})
            </button>
            {activeCategory !== 'all' && (
              <button
                onClick={() => selectCategory(activeCategory)}
                className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/30 hover:bg-sky-200 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300 text-xs font-extrabold inline-flex items-center gap-1"
              >
                <Boxes className="h-3 w-3" /> Select all {activeCategory}
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear ({selectedIds.size})
              </button>
            )}
            {(search || activeCategory !== 'all' || activeBrand !== 'all') && (
              <button onClick={clearFilters} className="text-xs font-extrabold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
                <Filter className="h-3 w-3" /> Clear filters
              </button>
            )}
            <div className="ml-auto text-xs font-extrabold text-slate-500">
              {filtered.length} products shown
            </div>
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Kuch nahi mila</h3>
              <p className="text-sm text-slate-500 mt-1">Filter change karo</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  selected={selectedIds.has(p.id)}
                  onToggle={() => toggleOne(p.id)}
                  categoryColor={data?.categories.find((c) => c.name === p.category)?.color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="border-t-2 border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">
                {selectedIds.size} selected
              </span>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 tabular-nums">
                    <DollarSign className="h-3 w-3" />
                    Sales: {formatPKR(stats.totalPrice)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 tabular-nums">
                    <TrendingUp className="h-3 w-3" />
                    Cost: {formatPKR(stats.totalCost)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-extrabold"
          >
            Cancel
          </button>
          <button
            onClick={startImport}
            disabled={selectedIds.size === 0}
            className="px-5 h-11 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-sm font-extrabold shadow-lg inline-flex items-center gap-2"
          >
            <Rocket className="h-4 w-4" />
            Review & Import ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ Sub-components ══════════ */

function ProductCard({
  product: p, selected, onToggle, categoryColor,
}: {
  product: SeedProduct;
  selected: boolean;
  onToggle: () => void;
  categoryColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={p.alreadyExists}
      className={[
        'group relative rounded-2xl bg-white dark:bg-slate-800 border-2 overflow-hidden transition-all text-left',
        selected
          ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-800 shadow-md'
          : p.alreadyExists
          ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
          : 'border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:shadow-md hover:-translate-y-0.5',
      ].join(' ')}
    >
      {selected && (
        <div className="absolute top-2 left-2 z-10 h-6 w-6 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-lg">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
      )}
      {p.alreadyExists && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow">
          Imported
        </div>
      )}

      <div
        className="aspect-square overflow-hidden relative flex items-center justify-center"
        style={{
          background: categoryColor
            ? `linear-gradient(135deg, ${categoryColor}18, ${categoryColor}08)`
            : undefined,
        }}
      >
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" />
        ) : (p as any).emoji ? (
          <div className="text-6xl group-hover:scale-110 transition-transform drop-shadow-sm">
            {(p as any).emoji}
          </div>
        ) : (
          <Package className="h-12 w-12 text-slate-300" />
        )}
      </div>

      <div className="p-2.5 space-y-1">
        {categoryColor && (
          <div
            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {p.category}
          </div>
        )}
        <div className="font-extrabold text-slate-900 dark:text-white text-xs line-clamp-2 leading-tight min-h-[2rem]">
          {p.name}
        </div>
        <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 truncate">
          {p.brand}
        </div>
        <div className="flex items-end justify-between pt-1">
          <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
            {formatPKR(p.price)}
          </div>
          <div className="text-[9px] font-bold text-slate-500">/{p.unit}</div>
        </div>
      </div>
    </button>
  );
}

function StatBox({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2.5">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: any) {
  return (
    <div className={[
      'rounded-xl backdrop-blur border p-2.5',
      highlight ? 'bg-amber-500/25 border-amber-300/40' : 'bg-white/10 border-white/20',
    ].join(' ')}>
      <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      <div className="text-lg font-extrabold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function PriceInput({
  label, value, onChange, tone = 'sky',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone?: 'sky' | 'emerald' | 'amber';
}) {
  const toneMap = {
    sky:     { text: 'text-sky-700 dark:text-sky-400',         border: 'focus:border-sky-500' },
    emerald: { text: 'text-emerald-700 dark:text-emerald-400', border: 'focus:border-emerald-500' },
    amber:   { text: 'text-amber-700 dark:text-amber-400',     border: 'focus:border-amber-500' },
  };
  const t = toneMap[tone];
  return (
    <div>
      <label className={`block text-[9px] font-extrabold uppercase mb-0.5 text-center ${t.text}`}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onClick={(e) => e.stopPropagation()}
        className={`h-9 w-16 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 text-xs font-extrabold text-center tabular-nums focus:outline-none ${t.border}`}
      />
    </div>
  );
}
