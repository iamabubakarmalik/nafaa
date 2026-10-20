import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Search, Package, Sparkles, CheckCircle2, Tag,
  Filter, TrendingUp, AlertCircle,
  Image as ImageIcon, DollarSign, Boxes, Rocket, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button, Modal } from '@/design-system/components';
import {
  quickSetupApi,
  type SeedProduct,
  type PriceOverride,
} from '../api/quick-setup.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';

interface Props {
  onClose: () => void;
}

type Step = 'select' | 'review' | 'importing' | 'done';

export function QuickSetupCatalogModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name ?? null);

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
    mutationFn: () => quickSetupApi.import(Array.from(selectedIds), priceOverrides, currentShopId ?? undefined),
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
      toast.error(e?.response?.data?.message || 'Import nahi hua — dobara koshish karein');
    },
  });

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
    toast.success(`${all.length} products select ho gaye`);
  };

  const deselectAll = () => setSelectedIds(new Set());

  const selectCategory = (categoryName: string) => {
    if (!data) return;
    const ids = data.catalog
      .filter((p) => p.category === categoryName && !p.alreadyExists)
      .map((p) => p.id);
    setSelectedIds((prev) => new Set([...prev, ...ids]));
    toast.success(`${categoryName} — ${ids.length} products select ho gaye`);
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
      toast.error('Pehle products select karein');
      return;
    }
    setStep('review');
  };

  const confirmImport = () => {
    setStep('importing');
    importMutation.mutate();
  };

  // ─── DONE screen ───────────────────────────────────
  function doneView() {
    const r = importMutation.data!;
    return {
      title: (
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Import mukammal ho gaya
        </span>
      ),
      description: r.message,
      size: 'md' as const,
      onClose,
      footer: <Button onClick={onClose}>Theek hai — Products dekhein</Button>,
      body: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Products" value={r.imported} icon={Package} tone="emerald" />
            <StatBox label="Brands" value={r.brandsCreated} icon={Tag} tone="blue" />
            <StatBox label="Categories" value={r.categoriesCreated} icon={Boxes} tone="violet" />
            <StatBox label="Tags" value={r.tagsCreated} icon={Sparkles} tone="amber" />
          </div>

          {r.skipped > 0 && (
            <div className="rounded-lg bg-slate-100 p-3 text-center text-sm text-slate-700">
              {r.skipped} products pehle se maujood the, unhein chhor diya
            </div>
          )}

          {r.errorCount > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-rose-900">
                <AlertCircle className="h-4 w-4" /> {r.errorCount} products me masla aaya
              </div>
              <ul className="space-y-0.5 text-xs text-rose-800">
                {r.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>• {e.name}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    };
  }

  // ─── IMPORTING screen ──────────────────────────────
  function importingView() {
    return {
      title: `${selectedIds.size} products import ho rahe hain...`,
      size: 'sm' as const,
      // Import is in progress; Escape must not close the dialog.
      onClose: () => {},
      hideClose: true,
      body: (
        <div className="py-4 text-center" aria-live="polite">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-brand-600" />
          <p className="text-sm text-slate-600">
            Brands, categories, tags aur products ban rahe hain. 1-2 minute lag sakte hain.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full animate-pulse rounded-full bg-brand-600" style={{ width: '60%' }} />
          </div>
        </div>
      ),
    };
  }

  // ─── REVIEW screen ─────────────────────────────────
  function reviewView() {
    const selectedProducts = data?.catalog.filter((p) => selectedIds.has(p.id)) ?? [];
    const back = () => setStep('select');
    return {
      title: `${selectedIds.size} products import ke liye tayyar`,
      description: 'Qadam 2/2 — check kar ke pakka karein',
      size: 'xl' as const,
      onClose: back,
      footer: (
        <>
          <Button variant="secondary" onClick={back}>← Wapas select karein</Button>
          <Button onClick={confirmImport} leftIcon={<Rocket className="h-4 w-4" />}>
            {selectedIds.size} Products import karein
          </Button>
        </>
      ),
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <div>
              <div className="text-[0.6875rem] font-semibold uppercase text-slate-500">Products</div>
              <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.selectedCount}</div>
            </div>
            <div>
              <div className="text-[0.6875rem] font-semibold uppercase text-slate-500">Andazan Sale</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700">{formatPKR(stats.totalPrice)}</div>
            </div>
            <div>
              <div className="text-[0.6875rem] font-semibold uppercase text-slate-500">Andazan Cost</div>
              <div className="text-2xl font-bold tabular-nums text-amber-700">{formatPKR(stats.totalCost)}</div>
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Price / Stock badlein (zaroori nahi)
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {selectedProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-2xl">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (p as any).emoji ? (
                    <span>{(p as any).emoji}</span>
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="text-[0.6875rem] text-slate-500">
                    {p.brand} • {p.category}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
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
      ),
    };
  }

  // ─── SELECT screen (main) ──────────────────────────
  function selectView() {
    const selectableCount = filtered.filter((p) => !p.alreadyExists).length;
    return {
      title: 'Pakistan Grocery Catalog',
      description: 'Bani banayi products ki list — select karein aur import kar dein',
      size: 'full' as const,
      onClose,
      footer: (
        <>
          <div className="mr-auto flex min-w-0 flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-900">{selectedIds.size} select</span>
            {selectedIds.size > 0 && (
              <>
                <span className="text-slate-400">•</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-emerald-700">
                  <DollarSign className="h-3 w-3" />
                  Sale: {formatPKR(stats.totalPrice)}
                </span>
                <span className="text-slate-400">•</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-amber-700">
                  <TrendingUp className="h-3 w-3" />
                  Cost: {formatPKR(stats.totalCost)}
                </span>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>Band karein</Button>
          <Button onClick={startImport} disabled={selectedIds.size === 0} leftIcon={<Rocket className="h-4 w-4" />}>
            Check kar ke import ({selectedIds.size})
          </Button>
        </>
      ),
      body: (
        <>
          {(shopName || data) && (
            <div className="mb-4 space-y-3">
              {shopName && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs">
                  <span>🏪</span>
                  <span className="text-slate-600">Stock jayegi:</span>
                  <span className="font-semibold text-emerald-800">{shopName}</span>
                </div>
              )}
              {data && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat label="Mojood" value={data.total - data.alreadyImported} />
                  <MiniStat label="Select kiye" value={selectedIds.size} highlight />
                  <MiniStat label="Categories" value={data.categories.length} />
                  <MiniStat label="Brands" value={data.brands.length} />
                </div>
              )}
            </div>
          )}

          {/* Filters stay visible while the grid scrolls. */}
          <div className="sticky -top-4 z-10 -mx-5 mb-4 space-y-3 border-b border-slate-200 bg-white px-5 py-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product, brand ya tag talaash karein..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Talaash saaf karein"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <select
                value={activeBrand}
                onChange={(e) => setActiveBrand(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="all">Sab Brands</option>
                {data?.brands.map((b) => (
                  <option key={b.name} value={b.name}>{b.name} ({b.count})</option>
                ))}
              </select>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                <input
                  type="checkbox"
                  checked={hideAlreadyImported}
                  onChange={(e) => setHideAlreadyImported(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs font-medium text-slate-700">Pehle se import shuda chhupayein</span>
              </label>
            </div>

            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sab ({data?.total ?? 0})
              </button>
              {data?.categories.map((cat) => {
                const active = activeCategory === cat.name;
                return (
                  <button
                    type="button"
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition ${
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
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs" variant="secondary" onClick={selectAllVisible} leftIcon={<CheckCircle2 className="h-3 w-3" />}>
                Nazar aane wale sab select ({selectableCount})
              </Button>
              {activeCategory !== 'all' && (
                <Button size="xs" variant="secondary" onClick={() => selectCategory(activeCategory)} leftIcon={<Boxes className="h-3 w-3" />}>
                  Sab {activeCategory} select karein
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button size="xs" variant="critical" onClick={deselectAll} leftIcon={<X className="h-3 w-3" />}>
                  Selection hatayein ({selectedIds.size})
                </Button>
              )}
              {(search || activeCategory !== 'all' || activeBrand !== 'all') && (
                <Button size="xs" variant="ghost" onClick={clearFilters} leftIcon={<Filter className="h-3 w-3" />}>
                  Filter hatayein
                </Button>
              )}
              <div className="ml-auto text-xs font-medium text-slate-500">
                {filtered.length} products nazar aa rahe hain
              </div>
            </div>
          </div>

          {/* Product grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="mx-auto mb-3 h-16 w-16 text-slate-300" />
              <h3 className="font-semibold text-slate-900">Kuch nahi mila</h3>
              <p className="mt-1 text-sm text-slate-500">Filter badal kar dekhein</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
        </>
      ),
    };
  }

  /* One Modal for every step, so switching steps keeps focus and the scroll
     lock stable. The backdrop never closes it: a stray click would lose the
     selection. */
  const isDone = step === 'done' && !!importMutation.data;
  const view: { title: ReactNode; description?: ReactNode; size: 'sm' | 'md' | 'xl' | 'full'; footer?: ReactNode; body: ReactNode; onClose: () => void; hideClose?: boolean } =
    isDone ? doneView()
      : step === 'importing' ? importingView()
        : step === 'review' ? reviewView()
          : selectView();

  return (
    <Modal
      open
      onClose={view.onClose}
      title={view.title}
      description={view.description}
      size={view.size}
      footer={view.footer}
      hideClose={view.hideClose}
      closeOnBackdrop={false}
    >
      {view.body}
    </Modal>
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
      type="button"
      onClick={onToggle}
      disabled={p.alreadyExists}
      aria-pressed={selected}
      className={[
        'group relative overflow-hidden rounded-xl border-2 bg-white text-left transition-all',
        selected
          ? 'border-brand-500 shadow-md ring-2 ring-brand-500/20'
          : p.alreadyExists
          ? 'cursor-not-allowed border-slate-200 opacity-50'
          : 'border-slate-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md',
      ].join(' ')}
    >
      {selected && (
        <div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white shadow-lg">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
      )}
      {p.alreadyExists && (
        <div className="absolute right-2 top-2 z-10 rounded-md bg-emerald-500 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-white shadow">
          Pehle se hai
        </div>
      )}

      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden"
        style={{
          background: categoryColor
            ? `linear-gradient(135deg, ${categoryColor}18, ${categoryColor}08)`
            : undefined,
        }}
      >
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" />
        ) : (p as any).emoji ? (
          <div className="text-6xl drop-shadow-sm transition-transform group-hover:scale-110">
            {(p as any).emoji}
          </div>
        ) : (
          <Package className="h-12 w-12 text-slate-300" />
        )}
      </div>

      <div className="space-y-1 p-2.5">
        {categoryColor && (
          <div
            className="inline-block rounded px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {p.category}
          </div>
        )}
        <div className="line-clamp-2 min-h-[2rem] text-xs font-semibold leading-tight text-slate-900">
          {p.name}
        </div>
        <div className="truncate text-[0.6875rem] font-medium text-violet-700">
          {p.brand}
        </div>
        <div className="flex items-end justify-between pt-1">
          <div className="text-base font-bold leading-none tabular-nums text-emerald-700">
            {formatPKR(p.price)}
          </div>
          <div className="text-[0.625rem] font-medium text-slate-500">/{p.unit}</div>
        </div>
      </div>
    </button>
  );
}

function StatBox({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-lg font-bold tabular-nums text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: any) {
  return (
    <div className={[
      'rounded-lg border p-2.5',
      highlight ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-slate-50',
    ].join(' ')}>
      <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{value}</div>
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
    sky:     { text: 'text-sky-700',     border: 'focus:border-sky-500' },
    emerald: { text: 'text-emerald-700', border: 'focus:border-emerald-500' },
    amber:   { text: 'text-amber-700',   border: 'focus:border-amber-500' },
  };
  const t = toneMap[tone];
  return (
    <div>
      <label className={`mb-0.5 block text-center text-[0.625rem] font-semibold uppercase ${t.text}`}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onClick={(e) => e.stopPropagation()}
        className={`h-9 w-16 rounded-lg border border-slate-300 bg-white px-1.5 text-center text-xs font-semibold tabular-nums focus:outline-none ${t.border}`}
      />
    </div>
  );
}
