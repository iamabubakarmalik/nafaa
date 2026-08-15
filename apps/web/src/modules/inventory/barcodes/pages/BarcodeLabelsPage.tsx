// apps/web/src/modules/inventory/barcode-labels/pages/BarcodeLabelsPage.tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ScanLine, Plus, Minus, Search, X, Settings2,
  Building2, DollarSign, Package, Layers, AlertCircle, Sparkles,
  Edit3, Wand2, CheckCircle2, RefreshCw, GraduationCap,
  Hash, Tag, Trash2, Eye, QrCode, LayoutGrid, Copy, Eraser,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { formatPKRFull } from '@core/lib/format';
import { toast } from 'sonner';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

/* ═════════════════════════════════════════════════════════════
   NAFAA BARCODE LABEL STUDIO — UNIVERSAL FULL BEST
   ─────────────────────────────────────────────────────────────
   🌍 Sab industries ke liye ek hi page (koi industry-hardcode nahi)
   📏 4 generic sizes — exact mm print sizing (thermal + A4)
   🧠 Settings browser me save (dubara set karne ki zaroorat nahi)
   ⚡ Shortcuts: / search • Ctrl+P print • Esc close
   🏷️ Auto + bulk barcode generate • live preview
   🌙 Dark mode complete • 🖨️ Print-clean
   ═════════════════════════════════════════════════════════════ */

interface LabelItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  copies: number;
}

type LabelSize = 'small' | 'medium' | 'large' | 'xlarge';
type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';

const SIZE_CONFIG: Record<LabelSize, {
  label: string; dims: string; desc: string; icon: string;
  wMm: number; hMm: number; cols: number;
  barcodeHeight: number; barcodeWidth: number; fontSize: number;
  cardPadding: string; nameSize: string; priceSize: string; metaSize: string;
}> = {
  small: {
    label: 'Small', dims: '40×25mm', desc: 'Thermal printer — choti cheezain', icon: '🏷️',
    wMm: 40, hMm: 25, cols: 5,
    barcodeHeight: 28, barcodeWidth: 1.1, fontSize: 8,
    cardPadding: 'p-1.5', nameSize: 'text-[8px]', priceSize: 'text-[10px]', metaSize: 'text-[7px]',
  },
  medium: {
    label: 'Medium', dims: '50×30mm', desc: 'Standard thermal — sab se common', icon: '📋',
    wMm: 50, hMm: 30, cols: 4,
    barcodeHeight: 38, barcodeWidth: 1.3, fontSize: 10,
    cardPadding: 'p-2', nameSize: 'text-[10px]', priceSize: 'text-xs', metaSize: 'text-[8px]',
  },
  large: {
    label: 'Large', dims: '70×40mm', desc: 'A4 sheet labels — detail ke sath', icon: '📄',
    wMm: 70, hMm: 40, cols: 3,
    barcodeHeight: 48, barcodeWidth: 1.5, fontSize: 12,
    cardPadding: 'p-2.5', nameSize: 'text-xs', priceSize: 'text-sm', metaSize: 'text-[9px]',
  },
  xlarge: {
    label: 'X-Large', dims: '100×50mm', desc: 'Bada label — shelf ya box', icon: '📃',
    wMm: 100, hMm: 50, cols: 2,
    barcodeHeight: 60, barcodeWidth: 1.8, fontSize: 14,
    cardPadding: 'p-3', nameSize: 'text-sm', priceSize: 'text-base', metaSize: 'text-[10px]',
  },
};

const FORMAT_HINTS: Record<BarcodeFormat, string> = {
  CODE128: 'Universal — har scanner (recommended)',
  CODE39: 'Purane scanners ke liye',
  EAN13: 'Retail standard — sirf 12-13 digits',
  UPC: 'USA standard — sirf 11-12 digits',
};

/** Industry ke hisaab se sirf default size hint (koi hardcode layout nahi) */
const INDUSTRY_DEFAULT_SIZE: Record<string, LabelSize> = {
  jewelry: 'small',
  pharmacy: 'small',
  mobile: 'medium',
  retail: 'medium',
  grocery: 'medium',
  restaurant: 'medium',
  garment: 'medium',
  carpet: 'large',
  wholesale: 'large',
};

const PREFS_KEY = 'nafaa-label-prefs-v1';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function BarcodeImage({
  value, height, width, fontSize, format = 'CODE128',
}: {
  value: string; height: number; width: number; fontSize: number; format?: BarcodeFormat;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, { format, width, height, fontSize, margin: 2, displayValue: true });
      } catch {
        try {
          JsBarcode(ref.current, value, { format: 'CODE128', width, height, fontSize, margin: 2, displayValue: true });
        } catch { /* invalid value for format — skip */ }
      }
    }
  }, [value, height, width, fontSize, format]);
  return <svg ref={ref} />;
}

export default function BarcodeLabelsPage() {
  const queryClient = useQueryClient();
  const industry = useCurrentIndustry();
  const searchRef = useRef<HTMLInputElement>(null);

  const industryDefault: LabelSize = industry?.id
    ? (INDUSTRY_DEFAULT_SIZE[industry.id] || 'medium')
    : 'medium';

  const saved = loadPrefs();

  /* ─── State ─── */
  const [selected, setSelected] = useState<LabelItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'with-barcode' | 'without-barcode'>('all');
  const [labelSize, setLabelSize] = useState<LabelSize>(saved?.labelSize || industryDefault);
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>(saved?.barcodeFormat || 'CODE128');
  const [showShopName, setShowShopName] = useState(saved?.showShopName ?? true);
  const [showPrice, setShowPrice] = useState(saved?.showPrice ?? true);
  const [showCategory, setShowCategory] = useState(saved?.showCategory ?? false);
  const [showSku, setShowSku] = useState(saved?.showSku ?? false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  /* ─── Persist prefs ─── */
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        labelSize, barcodeFormat, showShopName, showPrice, showCategory, showSku,
      }));
    } catch { /* ignore */ }
  }, [labelSize, barcodeFormat, showShopName, showPrice, showCategory, showSku]);

  /* ─── Queries ─── */
  const { data: productsData, refetch: refetchProducts, isRefetching } = useQuery({
    queryKey: ['products-for-labels'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const products = productsData?.items ?? [];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (stockFilter === 'with-barcode' && !p.barcode) return false;
      if (stockFilter === 'without-barcode' && p.barcode) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const withBarcode = products.filter((p) => p.barcode).length;
    return { total: products.length, withBarcode, withoutBarcode: products.length - withBarcode };
  }, [products]);

  const labelsToPrint = useMemo(
    () =>
      selected.flatMap((item) =>
        Array.from({ length: item.copies }, (_, i) => ({ ...item, _key: `${item.id}-${i}` })),
      ),
    [selected],
  );

  /* ─── Mutations ─── */
  const generateBarcodeMutation = useMutation({
    mutationFn: productsApi.generateBarcode,
    onSuccess: (updated) => {
      toast.success(`✓ Barcode ban gaya: ${updated.barcode}`);
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Barcode generate fail ho gaya'),
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: productsApi.bulkGenerateBarcodes,
    onSuccess: (result) => {
      toast.success(`✓ ${result.count} barcodes ban gaye!`);
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Bulk generation fail ho gayi'),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      toast.success('✓ Barcode save ho gaya');
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
    onError: () => toast.error('Save fail ho gaya'),
  });

  /* ─── Cart actions ─── */
  const addProduct = async (product: Product) => {
    if (!product.barcode) {
      if (confirm(`"${product.name}" ka barcode nahi hai. Auto-generate kar doon?`)) {
        await generateBarcodeMutation.mutateAsync(product.id);
        toast.info('Barcode ban gaya — ab dubara click karke add karo');
      }
      return;
    }

    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) {
          addOneItem(product, undefined);
          return;
        }
        let added = 0;
        active.forEach((v) => {
          if (v.barcode) { addOneItem(product, v); added++; }
        });
        if (added === 0) {
          addOneItem(product, undefined);
          toast('Variants ka barcode nahi — product ka barcode use hua');
        } else {
          toast.success(`✓ ${added} variants add ho gaye`);
        }
      } catch {
        addOneItem(product, undefined);
      }
      return;
    }
    addOneItem(product, undefined);
  };

  const addOneItem = (product: Product, variant?: ProductVariant) => {
    const id = variant ? `${product.id}__${variant.id}` : product.id;
    setSelected((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (existing) return prev.map((p) => (p.id === id ? { ...p, copies: p.copies + 1 } : p));
      return [...prev, { id, product, variant, copies: 1 }];
    });
  };

  const updateCopies = (id: string, delta: number) => {
    setSelected((prev) =>
      prev.map((p) => (p.id === id ? { ...p, copies: Math.max(0, p.copies + delta) } : p))
        .filter((p) => p.copies > 0),
    );
  };

  const setCopies = (id: string, copies: number) => {
    setSelected((prev) =>
      prev.map((p) => (p.id === id ? { ...p, copies: Math.max(0, copies) } : p))
        .filter((p) => p.copies > 0),
    );
  };

  const setAllCopies = (copies: number) => {
    setSelected((prev) => prev.map((p) => ({ ...p, copies })));
    toast.success(`Sab items: ${copies} copies`);
  };

  const removeItem = (id: string) => setSelected((prev) => prev.filter((p) => p.id !== id));

  const handlePrint = () => {
    if (selected.length === 0) return toast.error('Pehle products select karo');
    window.print();
  };

  const handleAddAll = () => {
    let added = 0;
    filteredProducts.forEach((p) => {
      if (p.barcode) { addOneItem(p, undefined); added++; }
    });
    if (added === 0) return toast.info('Is filter me koi barcode wala product nahi');
    toast.success(`✓ ${added} products add ho gaye`);
  };

  const handleBulkGenerateBarcodes = () => {
    const withoutBarcode = filteredProducts.filter((p) => !p.barcode);
    if (withoutBarcode.length === 0) return toast.info('Sab products ke barcodes already hain 🎉');
    if (confirm(`${withoutBarcode.length} products ke barcodes auto-generate kar doon?`)) {
      bulkGenerateMutation.mutate(withoutBarcode.map((p) => p.id));
    }
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGuide) { setShowGuide(false); return; }
        if (editingProduct) { setEditingProduct(null); return; }
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide, editingProduct]);

  /* ─── Scroll lock for modals ─── */
  const anyModal = showGuide || !!editingProduct;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const config = SIZE_CONFIG[labelSize];
  const shopName = (settings as any)?.shopName || (settings as any)?.shopAddress || 'My Shop';
  const hasFilters = !!search || !!categoryFilter || stockFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-0 print:p-0">
      {showGuide && <LabelGuide onClose={() => setShowGuide(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ScanLine className="h-3.5 w-3.5 text-amber-300" /> Label Studio
              {industry?.id && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{industry.emoji} {industry.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🏷️ Barcode Labels</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Barcode banao, labels print karo — thermal se A4 tak, har industry ke liye
              {stats.withoutBarcode > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">{stats.withoutBarcode}</strong> products ko barcode chahiye
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowGuide(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetchProducts()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`h-11 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border backdrop-blur-md ${
                showSettings
                  ? 'bg-amber-400/90 border-amber-300 text-slate-900 shadow-lg'
                  : 'bg-white/15 hover:bg-white/25 border-white/25'
              }`}
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{showSettings ? 'Hide' : 'Settings'}</span>
            </button>
            <Button
              onClick={handlePrint}
              disabled={labelsToPrint.length === 0}
              className="h-11 bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-lg disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print <span className="tabular-nums">{labelsToPrint.length}</span>
            </Button>
          </div>
        </div>

        {/* ═══ SETTINGS PANEL ═══ */}
        {showSettings && (
          <div className="relative mt-4 rounded-2xl bg-white/10 backdrop-blur-md p-4 space-y-4 border border-white/20">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/80 mb-2 flex items-center gap-1.5">
                <LayoutGrid className="h-3 w-3" /> Label Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(SIZE_CONFIG) as [LabelSize, any][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setLabelSize(key)}
                    className={`px-3 py-2.5 rounded-xl text-left transition border-2 ${
                      labelSize === key
                        ? 'bg-white text-slate-900 border-white shadow-lg scale-[1.03]'
                        : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{cfg.icon}</span>
                      <span className="font-extrabold text-xs">{cfg.label}</span>
                      {key === industryDefault && (
                        <span className={`px-1 py-0.5 rounded text-[7px] font-extrabold ${labelSize === key ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-400/30 text-emerald-200'}`}>
                          {industry?.emoji || '★'} BEST
                        </span>
                      )}
                    </div>
                    <div className={`text-[9px] font-bold mt-0.5 ${labelSize === key ? 'opacity-70' : 'opacity-60'}`}>
                      {cfg.dims} • {cfg.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/80 mb-1.5 flex items-center gap-1.5">
                  <QrCode className="h-3 w-3" /> Barcode Format
                </label>
                <select
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                  className="h-10 w-full rounded-xl bg-white text-slate-900 px-3 text-sm font-bold focus:outline-none"
                >
                  {(Object.entries(FORMAT_HINTS) as [BarcodeFormat, string][]).map(([f, hint]) => (
                    <option key={f} value={f}>{f} — {hint}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Eye className="h-3 w-3" /> Label Par Kya Dikhe
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <ToggleChip checked={showShopName} onChange={setShowShopName} icon={Building2} label="Shop" />
                  <ToggleChip checked={showPrice} onChange={setShowPrice} icon={DollarSign} label="Price" />
                  <ToggleChip checked={showCategory} onChange={setShowCategory} icon={Tag} label="Category" />
                  <ToggleChip checked={showSku} onChange={setShowSku} icon={Hash} label="SKU" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Settings apne aap save ho jati hain — agli baar waisi hi milengi
            </div>
          </div>
        )}
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <StatCard label="Total Products" value={stats.total} sub="Inventory me" icon={Package} tone="violet" />
        <StatCard
          label="Barcode Ready"
          value={stats.withBarcode}
          sub={`${stats.total > 0 ? Math.round((stats.withBarcode / stats.total) * 100) : 0}% ready`}
          icon={CheckCircle2} tone="emerald"
        />
        <StatCard
          label="Barcode Chahiye"
          value={stats.withoutBarcode}
          sub={stats.withoutBarcode > 0 ? 'Action needed' : 'Sab ready 🎉'}
          icon={AlertCircle} tone="amber"
          action={stats.withoutBarcode > 0 ? (
            <button
              onClick={handleBulkGenerateBarcodes}
              disabled={bulkGenerateMutation.isPending}
              className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold transition disabled:opacity-50 active:scale-95"
            >
              <Wand2 className="h-3 w-3" /> Sab Generate Karo
            </button>
          ) : null}
        />
        <StatCard
          label="Print Queue"
          value={labelsToPrint.length}
          sub={`${selected.length} unique items`}
          icon={Printer} tone="blue" highlight
        />
      </section>

      {/* ═══ MAIN GRID ═══ */}
      <section className="grid lg:grid-cols-[420px_1fr] gap-4 sm:gap-5 items-start print:grid-cols-1 print:gap-0">
        {/* ─── PRODUCTS PICKER ─── */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Products Select Karo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
              {filteredProducts.length} products • click = queue me add
            </p>
          </div>

          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam, SKU, barcode... (/ dabao)"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Sab Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {([
                { v: 'all' as const, l: 'Sab' },
                { v: 'with-barcode' as const, l: '✓ Barcode' },
                { v: 'without-barcode' as const, l: '⚠ Baghair' },
              ]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setStockFilter(opt.v)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                    stockFilter === opt.v
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddAll}
                disabled={filteredProducts.filter((p) => p.barcode).length === 0}
                className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-1 transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Sab Add ({filteredProducts.filter((p) => p.barcode).length})
              </button>
              <button
                onClick={handleBulkGenerateBarcodes}
                disabled={bulkGenerateMutation.isPending || stats.withoutBarcode === 0}
                className="h-10 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-1 transition active:scale-95"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Generate ({stats.withoutBarcode})
              </button>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setCategoryFilter(''); setStockFilter('all'); }}
                className="w-full text-[11px] font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center justify-center gap-1 py-1 transition"
              >
                <X className="h-3 w-3" /> Filters Clear Karo
              </button>
            )}
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProducts.length === 0 ? (
              <div className="p-10 text-center">
                <AlertCircle className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Kuch nahi mila</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                  {hasFilters ? 'Filters change karo' : 'Pehle products banao'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isAdded = selected.some((s) => s.product.id === product.id);
                const hasBarcode = !!product.barcode;
                return (
                  <div
                    key={product.id}
                    className={`px-4 py-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition ${isAdded ? 'bg-emerald-50/40 dark:bg-emerald-500/10' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => addProduct(product)} className="flex-1 text-left min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                          {product.name}
                          {product.hasVariants && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-extrabold shrink-0">
                              <Layers className="h-2.5 w-2.5" /> VAR
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5 truncate">
                          {hasBarcode ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{product.barcode}</span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-bold">⚠️ Barcode nahi</span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatPKRFull(product.price)}
                          </div>
                          {isAdded && (
                            <div className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">✓ Queue me</div>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition active:scale-95"
                          title="Barcode edit karo"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {!hasBarcode && (
                          <button
                            onClick={() => generateBarcodeMutation.mutate(product.id)}
                            disabled={generateBarcodeMutation.isPending}
                            className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition disabled:opacity-50 active:scale-95"
                            title="Auto-generate barcode"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── QUEUE + PREVIEW ─── */}
        <div className="space-y-4 print:space-y-0">
          {/* Queue */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 print:hidden">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  Print Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                  {selected.length} items • <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{labelsToPrint.length}</span> labels
                </p>
              </div>
              {selected.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold mr-1 inline-flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Sab:
                  </span>
                  {[1, 5, 10, 20, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAllCopies(n)}
                      className="h-7 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition active:scale-95"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelected([])}
                    className="ml-1.5 h-7 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95"
                  >
                    <Eraser className="h-3 w-3" /> Clear
                  </button>
                </div>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                <Package className="h-11 w-11 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Queue khaali hai</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Baayein se products click karke add karo</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selected.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                          {item.product.name}
                          {item.variant && (
                            <span className="ml-1 text-violet-600 dark:text-violet-400 text-xs font-bold">({item.variant.name})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {item.variant?.barcode || item.product.barcode}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateCopies(item.id, -1)}
                          className="h-8 w-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition active:scale-95"
                        >
                          <Minus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.copies}
                          onChange={(e) => setCopies(item.id, parseInt(e.target.value) || 0)}
                          className="w-14 h-8 text-center font-extrabold text-sm border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => updateCopies(item.id, 1)}
                          className="h-8 w-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition active:scale-95"
                        >
                          <Plus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center ml-1 transition active:scale-95"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview — screen: flex wrap | print: exact mm labels */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 print:border-none print:shadow-none print:p-0 print:rounded-none print:bg-white">
            <div className="flex items-center justify-between mb-3 print:hidden flex-wrap gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Print Preview
              </h3>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <span>{config.icon}</span>
                {config.label} • {config.dims}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 print:gap-[2mm] justify-center print:justify-start">
              {labelsToPrint.map((item) => {
                const barcodeValue = item.variant?.barcode || item.product.barcode || '';
                const displayName = item.variant
                  ? `${item.product.name} - ${item.variant.name}`
                  : item.product.name;
                const displayPrice = item.variant?.price ?? item.product.price;
                const displaySku = item.variant?.sku || item.product.sku;

                return (
                  <div
                    key={item._key}
                    className={`label-card border-2 border-slate-300 dark:border-slate-600 rounded-md bg-white text-center ${config.cardPadding} print:border-slate-700 print:rounded-none overflow-hidden flex flex-col items-center justify-center`}
                    style={{ width: `${config.wMm * 2.6}px`, minHeight: `${config.hMm * 2.6}px` }}
                  >
                    {showShopName && (
                      <div className={`${config.metaSize} font-extrabold text-slate-600 truncate leading-tight max-w-full`}>
                        {shopName}
                      </div>
                    )}
                    <div className={`${config.nameSize} font-extrabold text-slate-900 leading-tight line-clamp-2 max-w-full`}>
                      {displayName}
                    </div>
                    {showCategory && item.product.category && (
                      <div className={`${config.metaSize} text-slate-500 font-bold truncate max-w-full`}>
                        {(item.product.category as any).name}
                      </div>
                    )}
                    {showSku && displaySku && (
                      <div className={`${config.metaSize} font-mono text-slate-600 truncate max-w-full`}>
                        {displaySku}
                      </div>
                    )}
                    {barcodeValue && (
                      <div className="my-0.5 flex justify-center max-w-full overflow-hidden">
                        <BarcodeImage
                          value={barcodeValue}
                          height={config.barcodeHeight}
                          width={config.barcodeWidth}
                          fontSize={config.fontSize}
                          format={barcodeFormat}
                        />
                      </div>
                    )}
                    {showPrice && (
                      <div className={`${config.priceSize} font-extrabold text-slate-900 tabular-nums`}>
                        {formatPKRFull(displayPrice)}
                      </div>
                    )}
                  </div>
                );
              })}
              {labelsToPrint.length === 0 && (
                <div className="w-full text-center py-14 print:hidden">
                  <Printer className="h-14 w-14 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="font-extrabold text-slate-700 dark:text-slate-200">Preview khaali hai</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Products add karo — yahan live preview dikhega</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EDIT BARCODE MODAL ═══ */}
      {editingProduct && (
        <EditBarcodeModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(barcode: string) => {
            updateProductMutation.mutate({ id: editingProduct.id, payload: { barcode } });
          }}
          onGenerate={() => generateBarcodeMutation.mutate(editingProduct.id)}
          saving={updateProductMutation.isPending || generateBarcodeMutation.isPending}
        />
      )}

      {/* ═══ PRINT CSS — exact mm sizing ═══ */}
      <style>{`
        @media print {
          @page { margin: 4mm; size: auto; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
          .label-card {
            width: ${config.wMm}mm !important;
            min-height: ${config.hMm}mm !important;
            height: ${config.hMm}mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .label-card svg { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   GUIDE — "Labels kaise print karein"
   ═════════════════════════════════════════════════════════════ */
function LabelGuide({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/15 dark:to-green-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Labels Kaise Print Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Har product par <strong>barcode label</strong> lagao — phir sale ke waqt scanner se
            <strong> 1 second me</strong> product mil jata hai. Haath se naam likhne ki zaroorat khatam.
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">3 Asaan Steps</div>
            <div className="space-y-2">
              <FlowRow num="①" title="Products chuno" desc="Click karke queue me add karo — copies set karo" />
              <FlowRow num="②" title="Size set karo" desc="Settings me thermal ya A4 size select karo" />
              <FlowRow num="③" title="Print dabao" desc="Label exact mm size me print hoga" />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⚠️ Barcode nahi?</strong> — purple <strong>Generate</strong> button ek click me sab ke barcode bana deta hai</TipRow>
            <TipRow><strong>⚙️ Settings yaad rehti hain</strong> — size/format ek baar set karo, hamesha wahi rahega</TipRow>
            <TipRow><strong>⌨️ Shortcut</strong> — <span className="font-mono">/</span> dabao aur search khul jayegi</TipRow>
            <TipRow><strong>📏 Print tip</strong> — print dialog me "Scale: 100%" rakho taake size exact aaye</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300">Golden Rule</h4>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                  Naya maal aate hi usi din label laga do.
                  Baghair label ka maal counter par sale slow karta hai.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 text-white font-extrabold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition"
          >
            Samajh Gaya 👍
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function FlowRow({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-extrabold shrink-0">
        {num}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function ToggleChip({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex flex-col items-center justify-center gap-0.5 h-12 rounded-xl border-2 transition active:scale-95 ${
        checked
          ? 'bg-white border-white text-slate-900 shadow-md'
          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[9px] font-extrabold">{label}</span>
    </button>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone, action, highlight }: any) {
  const tones: Record<string, { wrap: string; icon: string; text: string }> = {
    violet: {
      wrap: 'border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10',
      icon: 'from-violet-500 to-purple-700 shadow-violet-500/30',
      text: 'text-violet-700 dark:text-violet-300',
    },
    emerald: {
      wrap: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'from-emerald-500 to-green-700 shadow-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
    amber: {
      wrap: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
      icon: 'from-amber-500 to-orange-700 shadow-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
    },
    blue: {
      wrap: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10',
      icon: 'from-blue-500 to-indigo-700 shadow-blue-500/30',
      text: 'text-blue-700 dark:text-blue-300',
    },
  };
  const c = tones[tone];

  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 ${c.wrap} ${highlight ? 'shadow-lg' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${c.text}`}>{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{sub}</div>}
          {action}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${c.icon} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EditBarcodeModal({ product, onClose, onSave, onGenerate, saving }: any) {
  const [barcode, setBarcode] = useState(product.barcode || '');
  const previewRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (previewRef.current && barcode) {
      try {
        JsBarcode(previewRef.current, barcode, {
          format: 'CODE128', width: 2, height: 60, fontSize: 14, displayValue: true,
        });
      } catch { /* invalid */ }
    }
  }, [barcode]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border-2 border-blue-200 dark:border-blue-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 border-b-2 border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <Edit3 className="h-4 w-4" /> Barcode Edit Karo
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</div>
            <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{product.name}</div>
            {product.sku && (
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">SKU: {product.sku}</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Barcode Value
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode likho ya auto-generate karo"
              className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
            />
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              CODE128, CODE39, EAN-13, UPC — sab formats support
            </div>
          </div>

          {barcode && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1">Live Preview</div>
              <div className="bg-white p-2 rounded-lg">
                <svg ref={previewRef} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={onGenerate}
              loading={saving}
              variant="secondary"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-violet-600 font-extrabold"
            >
              <Wand2 className="h-4 w-4" /> Auto
            </Button>
            <Button
              onClick={() => onSave(barcode)}
              loading={saving}
              disabled={!barcode.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700 font-extrabold"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
