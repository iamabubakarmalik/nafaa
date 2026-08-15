import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, DollarSign, Eye, Edit3, Trash2,
  Barcode, ShoppingCart, CheckCircle2, XCircle, Star,
  Boxes, PackageX, Upload, Zap, Tag, GraduationCap, ArrowRight,
  Keyboard, Camera, Layers, TrendingUp, Printer, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { QuickStockModal } from '../components/QuickStockModal';
import { QuickSetupCatalogModal } from '@modules/inventory/products/components/QuickSetupCatalogModal';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL PRODUCTS — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode COMPLETE (pehle bilkul nahi tha!)
   🎓 Teacher modal — "Products page kaise use karein"
   🔢 Filter pills pe live counts
   ⌨️  / = search focus, Esc = modals band
   🖨️ Print/PDF (A4 landscape, multi-page)
   📊 CSV (summary header ke sath)
   📱 Mobile → 4K responsive
   ═════════════════════════════════════════════════════════════ */

type ViewMode = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'name' | 'stock-low' | 'stock-high' | 'price-low' | 'price-high' | 'newest';

const VIEW_KEY = 'retail-products-view';
const PAGE_SIZE = 48;

export default function RetailProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [stockModalProduct, setStockModalProduct] = useState<any>(null);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<1 | 2>(1);
  const [showTeacher, setShowTeacher] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'table') setView(saved);
  }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retail-products'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 } as any),
  });
  const products: any[] = (data as any)?.items ?? (Array.isArray(data) ? (data as any) : []);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const active = products.filter((p) => p.isActive);
    const totalStock = products.reduce((a, p) => a + Number(p.stock || 0), 0);
    const stockValue = products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.price || 0), 0);
    const stockCost = products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.costPrice || 0), 0);
    const low = products.filter((p) => {
      const s = Number(p.stock || 0);
      const alert = Number(p.lowStockAlert ?? 5);
      return s > 0 && s <= alert;
    });
    const out = products.filter((p) => Number(p.stock || 0) <= 0);
    return {
      total: products.length,
      active: active.length,
      inactive: products.length - active.length,
      totalStock, stockValue, stockCost,
      potentialProfit: stockValue - stockCost,
      lowCount: low.length,
      outCount: out.length,
      lowList: low.slice(0, 6),
    };
  }, [products]);

  /* ─── Filter + Sort ─── */
  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category?.name || '').toLowerCase().includes(q) ||
        (p.brand?.name || '').toLowerCase().includes(q),
      );
    }
    if (categoryId !== 'all') {
      list = categoryId === 'none'
        ? list.filter((p) => !p.categoryId)
        : list.filter((p) => p.categoryId === categoryId);
    }
    if (brandId !== 'all') {
      list = brandId === 'none'
        ? list.filter((p) => !p.brandId)
        : list.filter((p) => p.brandId === brandId);
    }
    if (stockFilter !== 'all') {
      list = list.filter((p) => {
        const s = Number(p.stock || 0);
        const alert = Number(p.lowStockAlert ?? 5);
        if (stockFilter === 'out') return s <= 0;
        if (stockFilter === 'low') return s > 0 && s <= alert;
        return s > alert;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => (statusFilter === 'active' ? p.isActive : !p.isActive));
    }
    list.sort((a, b) => {
      switch (sortKey) {
        case 'stock-low': return Number(a.stock || 0) - Number(b.stock || 0);
        case 'stock-high': return Number(b.stock || 0) - Number(a.stock || 0);
        case 'price-low': return Number(a.price || 0) - Number(b.price || 0);
        case 'price-high': return Number(b.price || 0) - Number(a.price || 0);
        case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });
    return list;
  }, [products, search, categoryId, brandId, stockFilter, statusFilter, sortKey]);

  const visible = filtered.slice(0, visibleCount);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, categoryId, brandId, stockFilter, statusFilter, sortKey]);

  const hasFilters = !!search || categoryId !== 'all' || brandId !== 'all' || stockFilter !== 'all' || statusFilter !== 'active';
  const clearFilters = () => {
    setSearch(''); setCategoryId('all'); setBrandId('all');
    setStockFilter('all'); setStatusFilter('active');
  };

  /* ─── Selection ─── */
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAllVisible = () => {
    const allSelected = visible.every((p) => selected.has(p.id));
    setSelected(allSelected ? new Set() : new Set(visible.map((p) => p.id)));
  };

  /* ─── Bulk mutations ─── */
  const bulkStatus = useMutation({
    mutationFn: async (isActive: boolean) => {
      const ids = Array.from(selected);
      const res = await Promise.allSettled(ids.map((id) => productsApi.update(id, { isActive } as any)));
      return { ok: res.filter((r) => r.status === 'fulfilled').length, fail: res.length - res.filter((r) => r.status === 'fulfilled').length };
    },
    onSuccess: ({ ok, fail }) => {
      if (ok) toast.success(`${ok} products update ho gaye`);
      if (fail) toast.error(`${fail} fail huay`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      forceRefreshProducts().catch(() => {});
    },
  });

  const forceDeleteAll = async (ids: string[]) => {
    const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, true)));
    const ok = res.filter((r) => r.status === 'fulfilled').length;
    const fail = res.length - ok;
    if (ok) toast.success(`${ok} products force-deleted — sales, stock, sab kuch`);
    if (fail) toast.error(`${fail} products still failed`);
    setSelected(new Set());
    queryClient.invalidateQueries();
    forceRefreshProducts().catch(() => {});
  };

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, false)));
      return {
        ids,
        ok: res.filter((r) => r.status === 'fulfilled').length,
        fail: res.length - res.filter((r) => r.status === 'fulfilled').length,
      };
    },
    onSuccess: ({ ids, ok, fail }) => {
      if (ok) toast.success(`${ok} products delete ho gaye`);
      if (fail) {
        toast.error(`${fail} products ki sales/purchase history hai`, {
          duration: 15000,
          action: {
            label: '⚠️ Force Delete All',
            onClick: () => {
              if (!confirm(`⚠️ DANGER: ${fail} products AUR unki saari sales / purchase / stock history PERMANENTLY delete ho jayegi.\n\nYe undo nahi ho sakta. Continue?`)) return;
              if (!confirm('Bilkul sure? Sirf demo/test data cleanup ke liye.')) return;
              forceDeleteAll(ids);
            },
          },
        });
      }
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      forceRefreshProducts().catch(() => {});
    },
    onError: () => toast.error('Bulk delete fail'),
  });

  const exportCSV = (rows: any[]) => {
    if (rows.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Products Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${rows.length}  •  Stock Value: ${stats.stockValue.toFixed(2)}`],
      [''],
    ];
    const head = ['Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Unit', 'Cost', 'Sale', 'Wholesale', 'Stock', 'Stock Value', 'Active'];
    const body = rows.map((p) => [
      p.name, p.sku || '', p.barcode || '', p.category?.name || '', p.brand?.name || '',
      p.unit || '', Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
      p.wholesalePrice ? Number(p.wholesalePrice).toFixed(2) : '',
      Number(p.stock || 0), (Number(p.stock || 0) * Number(p.price || 0)).toFixed(2),
      p.isActive ? 'Yes' : 'No',
    ]);
    const csv = [...summary, head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retail-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} products export ho gaye`);
  };

  const printLabels = (ids: string[]) => {
    navigate('/retail/barcode-labels', { state: { productIds: ids } });
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (bulkDeleteOpen) setBulkDeleteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, bulkDeleteOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-sky-200 dark:border-sky-800 border-t-sky-600 dark:border-t-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 print:space-y-3">
      {stockModalProduct && (
        <QuickStockModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} />
      )}

      {quickSetupOpen && <QuickSetupCatalogModal onClose={() => setQuickSetupOpen(false)} />}

      {/* ═══ BULK DELETE MODAL ═══ */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={() => setBulkDeleteOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
               onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">
                    Permanent Delete — Step {bulkDeleteStep}/2
                  </div>
                  <h3 className="font-extrabold text-lg">{selected.size} products</h3>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {bulkDeleteStep === 1 ? (
                <>
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 p-4">
                    <div className="font-extrabold text-rose-900 dark:text-rose-200 text-sm mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      In {selected.size} products ka ye sab permanently delete hoga:
                    </div>
                    <ul className="text-xs font-semibold text-rose-800 dark:text-rose-300 space-y-1">
                      <li>• Products + images + variants + batches</li>
                      <li>• Stock records (har shop ka)</li>
                      <li>• Sale items & purchase history</li>
                      <li>• IMEIs / carpet rolls / cut pieces (agar hain)</li>
                      <li>• Empty ho jane wali sale receipts</li>
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                    Sirf demo/test data cleanup ke liye. Ye action <strong>undo nahi</strong> ho sakta.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkDeleteOpen(false)}
                      className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition"
                    >
                      Cancel — Rehne Do
                    </button>
                    <button
                      onClick={() => setBulkDeleteStep(2)}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold transition"
                    >
                      Samajh gaya, aage →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center leading-relaxed">
                    Final confirmation:<br />
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">{selected.size} products</span> aur
                    unki saari history delete kar dein?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkDeleteStep(1)}
                      className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition"
                    >
                      ← Wapas
                    </button>
                    <button
                      onClick={() => { setBulkDeleteOpen(false); forceDeleteAll(Array.from(selected)); }}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Forever
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-sky-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🛒 {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Products List • {filtered.length} items
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Retail Store
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📦 Products</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-cyan-200">{stats.total}</strong> products
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{stats.active}</strong> active
              {!hideCost && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  Stock value <strong className="text-emerald-300">{formatPKR(stats.stockValue)}</strong>
                </>
              )}
              {(stats.lowCount > 0 || stats.outCount > 0) && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">{stats.lowCount}</strong> kam
                  <span className="opacity-50 mx-1">•</span>
                  <strong className="text-rose-300">{stats.outCount}</strong> khatam
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
            </button>
            <PrivacyToggle compact />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handlePrint}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={() => setQuickSetupOpen(true)}
              className="h-11 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition"
            >
              <Zap className="h-4 w-4" /> Quick Setup ⚡
            </button>
            <Link
              to="/retail/bulk-import"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Bulk Import</span>
            </Link>
            <Link
              to="/retail-products/new"
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition"
            >
              <Plus className="h-4 w-4" /> Naya Product
            </Link>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && <ProductsTeacher onClose={() => setShowTeacher(false)} onQuickSetup={() => { setShowTeacher(false); setQuickSetupOpen(true); }} />}

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Package} label="Total Products" value={stats.total} sub={`${stats.inactive} inactive`} tone="sky" />
        <Kpi icon={DollarSign} label="Stock Value" value={hideCost ? '••••' : formatPKR(stats.stockValue)} sub={hideCost ? '🔒 PIN se dekho' : `Cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.lowCount} sub="Order karne ka waqt" tone="amber"
          onClick={() => { setStockFilter('low'); setStatusFilter('all'); }} active={stockFilter === 'low'} />
        <Kpi icon={PackageX} label="Out of Stock" value={stats.outCount} sub="Khatam ho gaya" tone="rose"
          onClick={() => { setStockFilter('out'); setStatusFilter('all'); }} active={stockFilter === 'out'} />
      </section>

      {/* ═══ LOW STOCK BANNER ═══ */}
      {stats.lowCount > 0 && stockFilter !== 'low' && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/40 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                ⚠️ {stats.lowCount} products khatam hone wale hain
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.lowList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setStockModalProduct(p)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 hover:border-amber-400 dark:hover:border-amber-500/60 text-[11px] font-extrabold text-amber-900 dark:text-amber-200 transition"
                  >
                    {p.name} <span className="text-rose-700 dark:text-rose-400">({p.stock} {p.unit})</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setStockFilter('low'); setStatusFilter('all'); }}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0 transition shadow-md"
            >
              Sab dekhein →
            </button>
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, SKU ya barcode se dhundo... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <button
              onClick={() => setView('grid')}
              title="Card view"
              className={`px-4 h-12 text-xs font-extrabold transition ${view === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              title="List view"
              className={`px-4 h-12 text-xs font-extrabold border-l-2 border-slate-200 dark:border-slate-700 transition ${view === 'table' ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => exportCSV(filtered)}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500/50 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
          >
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
          >
            <option value="all">Sab Categories ({categories.length})</option>
            <option value="none">Bina category</option>
            {(categories as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>

          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
          >
            <option value="all">Sab Brands ({brands.length})</option>
            <option value="none">Bina brand</option>
            {(brands as any[]).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>

          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { v: 'all' as StockFilter, l: 'Sab', c: null },
              { v: 'in' as StockFilter, l: 'Stock me', c: null },
              { v: 'low' as StockFilter, l: 'Kam', c: stats.lowCount },
              { v: 'out' as StockFilter, l: 'Khatam', c: stats.outCount },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setStockFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  stockFilter === o.v ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
                {o.c != null && (
                  <span className={`ml-1 tabular-nums ${stockFilter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { v: 'active' as StatusFilter, l: 'Active' },
              { v: 'inactive' as StatusFilter, l: 'Band' },
              { v: 'all' as StatusFilter, l: 'Dono' },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
          >
            <option value="name">A → Z</option>
            <option value="newest">Naye pehle</option>
            <option value="stock-low">Stock kam pehle</option>
            <option value="stock-high">Stock zyada pehle</option>
            <option value="price-low">Sasta pehle</option>
            <option value="price-high">Mehnga pehle</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Filter hatao
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} products
          </div>
        </div>
      </section>

      {/* ═══ BULK BAR ═══ */}
      {selected.size > 0 && (
        <section className="sticky top-2 z-20 rounded-2xl bg-slate-950 dark:bg-slate-900 text-white shadow-2xl border border-white/20 p-3 flex items-center gap-2 flex-wrap print:hidden">
          <div className="font-extrabold text-sm px-2"><span className="text-sky-300">{selected.size}</span> selected</div>
          <button onClick={() => bulkStatus.mutate(true)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1 transition">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active karo
          </button>
          <button onClick={() => bulkStatus.mutate(false)} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-extrabold inline-flex items-center gap-1 transition">
            <XCircle className="h-3.5 w-3.5" /> Band karo
          </button>
          <button onClick={() => printLabels(Array.from(selected))} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold inline-flex items-center gap-1 transition">
            <Barcode className="h-3.5 w-3.5" /> Labels print
          </button>
          <button onClick={() => exportCSV(products.filter((p) => selected.has(p.id)))} className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold inline-flex items-center gap-1 transition">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => { setBulkDeleteStep(1); setBulkDeleteOpen(true); }}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold inline-flex items-center gap-1 transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold transition">
            Clear
          </button>
        </section>
      )}

      {/* ═══ EMPTY ═══ */}
      {filtered.length === 0 ? (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-sky-500/40">
            <ShoppingBag className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {hasFilters ? 'Kuch nahi mila' : 'Abhi koi product nahi'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
            {hasFilters ? 'Filter change kar ke dekho' : 'Sab se fast tareeqa: Quick Setup ⚡ — 2000+ ready-made Pakistani products (Lays, Coca-Cola, Surf...) sirf select karo, sab ban jayega!'}
          </p>
          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            {hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filter hatao</Button>
            ) : (
              <>
                <button
                  onClick={() => setShowTeacher(true)}
                  className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition"
                >
                  <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                </button>
                <button
                  onClick={() => setQuickSetupOpen(true)}
                  className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-amber-500/40 transition"
                >
                  <Zap className="h-4 w-4" /> Quick Setup ⚡
                </button>
                <Link to="/retail-products/new">
                  <Button className="bg-gradient-to-r from-sky-600 to-cyan-700 font-extrabold"><Plus className="h-4 w-4" /> Naya Product</Button>
                </Link>
                <Link to="/retail/bulk-import">
                  <Button variant="secondary" className="font-extrabold"><Upload className="h-4 w-4" /> Excel se import</Button>
                </Link>
              </>
            )}
          </div>
        </section>
      ) : view === 'grid' ? (
        /* ═══ GRID ═══ */
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              selected={selected.has(p.id)}
              onToggle={() => toggleOne(p.id)}
              onStock={() => setStockModalProduct(p)}
            />
          ))}
        </section>
      ) : (
        /* ═══ TABLE ═══ */
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden print:border-0 print:rounded-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm print:text-[10px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3 w-10 print:hidden">
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && visible.every((p) => selected.has(p.id))}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded accent-sky-600"
                    />
                  </th>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  {!hideCost && <Th className="text-right">Cost</Th>}
                  <Th className="text-right">Sale</Th>
                  <Th className="text-right">Stock</Th>
                  {!hideCost && <Th className="text-right">Value</Th>}
                  <Th className="text-center">Status</Th>
                  <Th className="text-right print:hidden">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((p) => {
                  const stock = Number(p.stock || 0);
                  const alert = Number(p.lowStockAlert ?? 5);
                  const isOut = stock <= 0;
                  const isLow = !isOut && stock <= alert;
                  return (
                    <tr key={p.id} className={['hover:bg-sky-50/40 dark:hover:bg-sky-500/5 transition', selected.has(p.id) ? 'bg-sky-50/60 dark:bg-sky-500/10' : ''].join(' ')}>
                      <td className="px-3 py-2.5 print:hidden">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded accent-sky-600" />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/retail-products/${p.id}`} className="flex items-center gap-2.5 group">
                          <Thumb p={p} size="h-10 w-10" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-sky-700 dark:group-hover:text-sky-400 flex items-center gap-1">
                              {p.name}
                              {p.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                              {p.sku || p.barcode || '—'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        {p.category ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white" style={{ backgroundColor: p.category.color || '#64748b' }}>
                            {p.category.name}
                          </span>
                        ) : <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">—</span>}
                      </td>
                      {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">{formatPKR(p.costPrice || 0)}</td>}
                      <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(p.price || 0)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => setStockModalProduct(p)} className="inline-flex flex-col items-end group">
                          <span className={[
                            'font-extrabold tabular-nums text-sm',
                            isOut ? 'text-rose-700 dark:text-rose-400' : isLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white',
                          ].join(' ')}>
                            {stock} <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{p.unit}</span>
                          </span>
                          <span className="text-[9px] font-extrabold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition print:hidden">+ Stock</span>
                        </button>
                      </td>
                      {!hideCost && (
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatPKR(stock * Number(p.price || 0))}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-center">
                        {isOut ? (
                          <Pill tone="rose">Khatam</Pill>
                        ) : isLow ? (
                          <Pill tone="amber">Kam</Pill>
                        ) : p.isActive ? (
                          <Pill tone="emerald">OK</Pill>
                        ) : (
                          <Pill tone="slate">Band</Pill>
                        )}
                      </td>
                      <td className="px-3 py-2.5 print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn to={`/retail-products/${p.id}`} title="Dekho" tone="sky"><Eye className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn to={`/retail-products/${p.id}/edit`} title="Edit" tone="violet"><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                          <button
                            onClick={() => setStockModalProduct(p)}
                            title="Stock"
                            className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition"
                          >
                            <Boxes className="h-3.5 w-3.5" />
                          </button>
                          <ProductDeleteButton id={p.id} name={p.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Load more */}
      {visibleCount < filtered.length && (
        <div className="flex justify-center print:hidden">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500/50 text-sm font-extrabold text-slate-700 dark:text-slate-200 shadow-sm transition"
          >
            Aur {Math.min(PAGE_SIZE, filtered.length - visibleCount)} dikhao
            <span className="text-slate-400 dark:text-slate-500 font-bold ml-1">({visibleCount}/{filtered.length})</span>
          </button>
        </div>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          main, aside, header, nav, [class*="max-h-"], [class*="fixed"] {
            max-height: none !important; height: auto !important; overflow: visible !important;
          }
          [class*="fixed"] { display: none !important; }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [class*="rounded-2xl"], [class*="rounded-3xl"] { overflow: visible !important; border-radius: 6px !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; page-break-inside: auto !important; }
          thead { display: table-header-group !important; }
          thead th { background: #0ea5e9 !important; color: white !important; padding: 5px 4px !important; font-size: 8px !important; font-weight: 800 !important; border: 1px solid #0284c7 !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          tbody tr:nth-child(even) td { background: #f8fafc !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          tbody td img { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRODUCTS TEACHER — "Products page kaise use karein"
   ═════════════════════════════════════════════════════════════ */
function ProductsTeacher({ onClose, onQuickSetup }: { onClose: () => void; onQuickSetup: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Products Page — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye aapki <strong>poori dukkaan ka inventory</strong> hai. Yahan se products add, edit, delete,
            stock update — sab kuch hota hai.
          </p>

          {/* 4 ways to add */}
          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/5 p-4 space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-sky-700 dark:text-sky-300">
              ➕ Product add karne ke 4 tareeqay
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <GuideRow emoji="⚡" title="Quick Setup" desc="2000+ ready Pakistani products — select karo, done!" badge="Sab se fast" />
              <GuideRow emoji="➕" title="Naya Product" desc="1-1 product wizard se (naam + rate likho, bas)" />
              <GuideRow emoji="📊" title="Bulk Import" desc="Excel/CSV se ek saath saikron" />
              <GuideRow emoji="📷" title="Barcode scan" desc="POS pe scan karo — naya ho to foran banao" />
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⌨️ / dabao</strong> — search box pe jump</TipRow>
            <TipRow><strong>Stock number pe click</strong> — foran stock add karo</TipRow>
            <TipRow><strong>Card pe hover</strong> — checkbox se select → bulk actions (active/band/delete/labels)</TipRow>
            <TipRow><strong>🟡 Kam / 🔴 Khatam</strong> pills — click se filter ho jayega</TipRow>
            <TipRow><strong>🗑️ Delete</strong> — sales history ho to soft-delete, warna 2-step permanent delete</TipRow>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-extrabold shadow-lg shadow-amber-500/40 h-12"
            onClick={onQuickSetup}
          >
            <Zap className="h-4 w-4" /> Samajh Gaya — Quick Setup Kholo! ⚡
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuideRow({ emoji, title, desc, badge }: { emoji: string; title: string; desc: string; badge?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-500/30 p-2.5">
      <span className="text-lg shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
          {title}
          {badge && <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 text-[8px] font-black uppercase">{badge}</span>}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

/* ══════════ Sub-components ══════════ */

function ProductCard({ p, selected, onToggle, onStock }: any) {
  const stock = Number(p.stock || 0);
  const alert = Number(p.lowStockAlert ?? 5);
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= alert;

  return (
    <div className={[
      'group relative rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-sky-500/10 hover:-translate-y-0.5',
      selected ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-500/30' : isOut ? 'border-rose-200 dark:border-rose-500/40' : isLow ? 'border-amber-200 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
      !p.isActive ? 'opacity-60' : '',
    ].join(' ')}>
      <button
        onClick={onToggle}
        className={[
          'absolute top-2 left-2 z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition',
          selected ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-600 opacity-0 group-hover:opacity-100',
        ].join(' ')}
      >
        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>

      <Link to={`/retail-products/${p.id}`} className="block">
        <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
          {p.images?.[0]?.url ? (
            <img src={p.images[0].url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            </div>
          )}
          {p.isFeatured && (
            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          )}
          {(isOut || isLow) && (
            <div className={[
              'absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white',
              isOut ? 'bg-rose-600' : 'bg-amber-500',
            ].join(' ')}>
              {isOut ? 'STOCK KHATAM' : `SIRF ${stock} ${p.unit} BACHA`}
            </div>
          )}
        </div>

        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
          {p.category && (
            <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: p.category.color || '#64748b' }}>
              <Tag className="h-2 w-2" /> {p.category.name}
            </div>
          )}
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div>
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">per {p.unit}</div>
            </div>
            <div className="text-right">
              <div className={[
                'text-sm font-extrabold tabular-nums leading-none',
                isOut ? 'text-rose-700 dark:text-rose-400' : isLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300',
              ].join(' ')}>{stock}</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">stock</div>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 flex items-center gap-1">
        <button
          onClick={onStock}
          className="flex-1 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center justify-center gap-1 transition"
        >
          <Plus className="h-3 w-3" /> Stock
        </button>
        <Link
          to={`/retail-products/${p.id}/edit`}
          className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/pos"
          className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 flex items-center justify-center transition"
          title="POS"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </Link>
        <ProductDeleteButton id={p.id} name={p.name} />
      </div>
    </div>
  );
}

function Thumb({ p, size = 'h-10 w-10' }: any) {
  return (
    <div className={`${size} rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700`}>
      {p.images?.[0]?.url ? (
        <img src={p.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-slate-400 dark:text-slate-500" /></div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ${className}`}>
      {children}
    </th>
  );
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function IconBtn({ to, title, tone, children }: any) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300',
    violet: 'bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300',
  };
  return (
    <Link to={to} title={title} className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${tones[tone]}`}>
      {children}
    </Link>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    sky: 'from-sky-500 to-cyan-700 shadow-sky-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-sky-500 dark:border-sky-500/60 ring-2 ring-sky-200 dark:ring-sky-500/20'
          : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
