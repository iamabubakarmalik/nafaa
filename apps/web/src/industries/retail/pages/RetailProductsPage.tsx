import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, TrendingUp, DollarSign, Eye, Edit3, Trash2,
  Barcode, ShoppingCart, CheckCircle2, XCircle, Layers, Star,
  ChevronDown, ArrowUpDown, Boxes, PackageX, Upload, Zap, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { QuickStockModal } from '../components/QuickStockModal';
import { QuickSetupCatalogModal } from '@modules/inventory/products/components/QuickSetupCatalogModal';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';

import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

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
    const head = ['Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Unit', 'Cost', 'Sale', 'Wholesale', 'Stock', 'Stock Value', 'Active'];
    const body = rows.map((p) => [
      p.name, p.sku || '', p.barcode || '', p.category?.name || '', p.brand?.name || '',
      p.unit || '', Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
      p.wholesalePrice ? Number(p.wholesalePrice).toFixed(2) : '',
      Number(p.stock || 0), (Number(p.stock || 0) * Number(p.price || 0)).toFixed(2),
      p.isActive ? 'Yes' : 'No',
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {stockModalProduct && (
        <QuickStockModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} />
      )}

      {quickSetupOpen && <QuickSetupCatalogModal onClose={() => setQuickSetupOpen(false)} />}

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
                      className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200"
                    >
                      Cancel — Rehne Do
                    </button>
                    <button
                      onClick={() => setBulkDeleteStep(2)}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold"
                    >
                      Samajh gaya, aage →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center leading-relaxed">
                    Final confirmation:<br />
                    <span className="text-rose-600 font-extrabold">{selected.size} products</span> aur
                    unki saari history delete kar dein?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkDeleteStep(1)}
                      className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200"
                    >
                      ← Wapas
                    </button>
                    <button
                      onClick={() => { setBulkDeleteOpen(false); forceDeleteAll(Array.from(selected)); }}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2"
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

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Retail Store
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Products</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} products • {stats.active} active • Stock value{' '}
              <strong className="text-emerald-300">{formatPKR(stats.stockValue)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <button
              onClick={() => setQuickSetupOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-amber-500/30 border border-amber-300/40"
            >
              <Zap className="h-4 w-4" /> Quick Setup ⚡
            </button>
            <Link
              to="/retail/bulk-import"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <Upload className="h-4 w-4" /> Bulk Import
            </Link>
            <Link
              to="/retail-products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 text-sm font-extrabold shadow-lg"
            >
              <Plus className="h-4 w-4" /> Naya Product
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Package} label="Total Products" value={stats.total} sub={`${stats.inactive} inactive`} tone="sky" />
        <Kpi icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} sub={hideCost ? "•••" : `Cost ${formatPKR(stats.stockCost)}`} tone="emerald" />
        <Kpi icon={AlertTriangle} label="Low Stock" value={stats.lowCount} sub="Order karne ka waqt" tone="amber"
          onClick={() => { setStockFilter('low'); setStatusFilter('all'); }} />
        <Kpi icon={PackageX} label="Out of Stock" value={stats.outCount} sub="Khatam ho gaya" tone="rose"
          onClick={() => { setStockFilter('out'); setStatusFilter('all'); }} />
      </section>

      {/* ═══ LOW STOCK BANNER ═══ */}
      {stats.lowCount > 0 && stockFilter !== 'low' && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-amber-900 text-sm">
                {stats.lowCount} products khatam hone wale hain
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.lowList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setStockModalProduct(p)}
                    className="px-2.5 py-1 rounded-lg bg-white border-2 border-amber-200 hover:border-amber-400 text-[11px] font-extrabold text-amber-900"
                  >
                    {p.name} <span className="text-rose-700">({p.stock} {p.unit})</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setStockFilter('low'); setStatusFilter('all'); }}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0"
            >
              Sab dekhein
            </button>
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, SKU ya barcode se dhundo..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setView('grid')}
              title="Card view"
              className={`px-4 h-12 text-xs font-extrabold transition ${view === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              title="List view"
              className={`px-4 h-12 text-xs font-extrabold border-l-2 border-slate-200 transition ${view === 'table' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => exportCSV(filtered)}
            className="h-12 px-4 rounded-2xl border-2 border-slate-200 hover:border-sky-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-sky-500"
          >
            <option value="all">Sab Categories</option>
            <option value="none">Bina category</option>
            {(categories as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>

          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-sky-500"
          >
            <option value="all">Sab Brands</option>
            <option value="none">Bina brand</option>
            {(brands as any[]).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>

          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {([
              { v: 'all' as StockFilter, l: 'Sab' },
              { v: 'in' as StockFilter, l: 'Stock me' },
              { v: 'low' as StockFilter, l: 'Kam' },
              { v: 'out' as StockFilter, l: 'Khatam' },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setStockFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  stockFilter === o.v ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {([
              { v: 'active' as StatusFilter, l: 'Active' },
              { v: 'inactive' as StatusFilter, l: 'Band' },
              { v: 'all' as StatusFilter, l: 'Dono' },
            ]).map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-sky-500"
          >
            <option value="name">A → Z</option>
            <option value="newest">Naye pehle</option>
            <option value="stock-low">Stock kam pehle</option>
            <option value="stock-high">Stock zyada pehle</option>
            <option value="price-low">Sasta pehle</option>
            <option value="price-high">Mehnga pehle</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Filter hatao
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500">
            {filtered.length} products
          </div>
        </div>
      </section>

      {/* ═══ BULK BAR ═══ */}
      {selected.size > 0 && (
        <section className="sticky top-2 z-20 rounded-2xl bg-slate-900 text-white shadow-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="font-extrabold text-sm px-2">{selected.size} selected</div>
          <button onClick={() => bulkStatus.mutate(true)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active karo
          </button>
          <button onClick={() => bulkStatus.mutate(false)} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-extrabold inline-flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Band karo
          </button>
          <button onClick={() => printLabels(Array.from(selected))} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold inline-flex items-center gap-1">
            <Barcode className="h-3.5 w-3.5" /> Labels print
          </button>
          <button onClick={() => exportCSV(products.filter((p) => selected.has(p.id)))} className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => { setBulkDeleteStep(1); setBulkDeleteOpen(true); }}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold inline-flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold">
            Clear
          </button>
        </section>
      )}

      {/* ═══ EMPTY ═══ */}
      {filtered.length === 0 ? (
        <section className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-100 to-cyan-200 flex items-center justify-center">
            <ShoppingBag className="h-9 w-9 text-sky-600" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold text-slate-900">
            {hasFilters ? 'Kuch nahi mila' : 'Abhi koi product nahi'}
          </h3>
          <p className="text-sm text-slate-500 mt-2 font-semibold">
            {hasFilters ? 'Filter change kar ke dekho' : 'Pehla product add karein — 1 minute ka kaam hai'}
          </p>
          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            {hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filter hatao</Button>
            ) : (
              <>
                <Link to="/retail-products/new">
                  <Button className="bg-gradient-to-r from-sky-600 to-cyan-700"><Plus className="h-4 w-4" /> Naya Product</Button>
                </Link>
                <Link to="/retail/bulk-import">
                  <Button variant="secondary"><Upload className="h-4 w-4" /> Excel se import</Button>
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
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && visible.every((p) => selected.has(p.id))}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded"
                    />
                  </th>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  {!hideCost && <Th className="text-right">Cost</Th>}
                  <Th className="text-right">Sale</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Value</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => {
                  const stock = Number(p.stock || 0);
                  const alert = Number(p.lowStockAlert ?? 5);
                  const isOut = stock <= 0;
                  const isLow = !isOut && stock <= alert;
                  return (
                    <tr key={p.id} className={['hover:bg-sky-50/40 transition', selected.has(p.id) ? 'bg-sky-50/60' : ''].join(' ')}>
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded" />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/retail-products/${p.id}`} className="flex items-center gap-2.5 group">
                          <Thumb p={p} size="h-10 w-10" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-sm truncate group-hover:text-sky-700 flex items-center gap-1">
                              {p.name}
                              {p.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
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
                        ) : <span className="text-[10px] text-slate-400 font-bold">—</span>}
                      </td>
                      {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 tabular-nums">{formatPKR(p.costPrice || 0)}</td>}
                      <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price || 0)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => setStockModalProduct(p)} className="inline-flex flex-col items-end group">
                          <span className={[
                            'font-extrabold tabular-nums text-sm',
                            isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900',
                          ].join(' ')}>
                            {stock} <span className="text-[10px] font-bold text-slate-500">{p.unit}</span>
                          </span>
                          <span className="text-[9px] font-extrabold text-sky-600 opacity-0 group-hover:opacity-100 transition">+ Stock</span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">
                        {formatPKR(stock * Number(p.price || 0))}
                      </td>
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
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn to={`/retail-products/${p.id}`} title="Dekho" tone="sky"><Eye className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn to={`/retail-products/${p.id}/edit`} title="Edit" tone="violet"><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                          <button
                            onClick={() => setStockModalProduct(p)}
                            title="Stock"
                            className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center"
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
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-6 py-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-400 text-sm font-extrabold text-slate-700 shadow-sm"
          >
            Aur {Math.min(PAGE_SIZE, filtered.length - visibleCount)} dikhao
            <span className="text-slate-400 font-bold ml-1">({visibleCount}/{filtered.length})</span>
          </button>
        </div>
      )}
    </div>
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
      'group relative rounded-2xl bg-white border-2 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
      selected ? 'border-sky-500 ring-2 ring-sky-200' : isOut ? 'border-rose-200' : isLow ? 'border-amber-200' : 'border-slate-200',
      !p.isActive ? 'opacity-60' : '',
    ].join(' ')}>
      <button
        onClick={onToggle}
        className={[
          'absolute top-2 left-2 z-10 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition',
          selected ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100',
        ].join(' ')}
      >
        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>

      <Link to={`/retail-products/${p.id}`} className="block">
        <div className="aspect-square bg-slate-100 overflow-hidden relative">
          {p.images?.[0]?.url ? (
            <img src={p.images[0].url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-slate-300" />
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
          <div className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
          {p.category && (
            <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: p.category.color || '#64748b' }}>
              <Tag className="h-2 w-2" /> {p.category.name}
            </div>
          )}
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div>
              <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
              <div className="text-[9px] font-bold text-slate-500">per {p.unit}</div>
            </div>
            <div className="text-right">
              <div className={[
                'text-sm font-extrabold tabular-nums leading-none',
                isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-700',
              ].join(' ')}>{stock}</div>
              <div className="text-[9px] font-bold text-slate-500">stock</div>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 flex items-center gap-1">
        <button
          onClick={onStock}
          className="flex-1 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-extrabold inline-flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" /> Stock
        </button>
        <Link
          to={`/retail-products/${p.id}/edit`}
          className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/pos"
          className="h-8 w-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 flex items-center justify-center"
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
    <div className={`${size} rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200`}>
      {p.images?.[0]?.url ? (
        <img src={p.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-slate-400" /></div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>
      {children}
    </th>
  );
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-200 text-slate-600',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function IconBtn({ to, title, tone, children }: any) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 hover:bg-sky-100 text-sky-700',
    violet: 'bg-violet-50 hover:bg-violet-100 text-violet-700',
  };
  return (
    <Link to={to} title={title} className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
      {children}
    </Link>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    sky: 'from-sky-500 to-cyan-700 shadow-sky-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full',
        onClick ? 'hover:border-sky-300 hover:shadow-md transition' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
