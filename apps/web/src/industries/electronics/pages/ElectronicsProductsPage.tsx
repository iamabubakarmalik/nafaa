import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu, Plus, Search, X, RefreshCw, Download, Grid3x3, List,
  Package, AlertTriangle, DollarSign, Eye, Edit3, Trash2,
  Barcode, CheckCircle2, XCircle, Star, ShoppingCart,
  TrendingUp, GraduationCap, Printer, Layers, ShieldCheck,
  ScanLine, SlidersHorizontal, Hash, Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { electronicsProductsApi } from '../api/products.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { QuickStockModal } from '@industries/retail/components/QuickStockModal';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { productTint } from '@modules/inventory/products/lib/productEmoji';
import { ProductsAnalytics } from '@industries/retail/components/ProductsAnalytics';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import {
  CATEGORY_META, CATEGORY_GROUPS, CONDITION_META,
  type CategoryType, type ConditionType,
} from '../constants';

/* ═════════════════════════════════════════════════════════════
   ELECTRONICS PRODUCTS
   ─────────────────────────────────────────────────────────────
   Retail ka safha aur ye safha ek jaisa lagta hai, magar
   electronics ki dukaan me do cheezein aisi hain jo kirane me
   hoti hi nahi — aur yahi safha un ka pehla darwaza hai:

     🔢 SERIAL / IMEI — jis maal ka serial rakha jata hai, uske
        liye do ginti chalti hai: stock ki ginti, aur darj shuda
        serial ki ginti. Ye dono barabar honi chahiye. Agar stock
        10 keh raha hai aur serial sirf 7 darj hain, to teen
        cheezein aisi hain jo bech to di jayengi magar unka
        warranty record kabhi nahi banega. Ye farq yahin par laal
        nishan ban kar dikhta hai — mahine baad claim aane par
        nahi.

     🛡️ WARRANTY — har cheez par kitne mahine ki warranty hai,
        ye qeemat jitni ahem baat hai. Grahak yehi poochta hai.

   Aur ek teesri baat: haalat (Brand New / Open Box / Refurbished
   / Used). Ek hi model teen haalat me alag alag rate par para
   hota hai — chaant me ye sab se upar hai.
   ═════════════════════════════════════════════════════════════ */

type ViewMode = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type StatusFilter = 'all' | 'active' | 'inactive';
type SerialFilter = 'all' | 'tracked' | 'mismatch';
type SortKey = 'name' | 'stock-low' | 'stock-high' | 'price-low' | 'price-high' | 'newest' | 'warranty';

const VIEW_KEY = 'electronics-products-view';
const PAGE_SIZE = 48;

const SORTS: Array<{ v: SortKey; l: string }> = [
  { v: 'name',       l: '🔤 Naam A–Z' },
  { v: 'newest',     l: '🆕 Naye pehle' },
  { v: 'stock-low',  l: '📉 Kam stock pehle' },
  { v: 'stock-high', l: '📈 Zyada stock pehle' },
  { v: 'price-low',  l: '💰 Sasta pehle' },
  { v: 'price-high', l: '💎 Mehnga pehle' },
  { v: 'warranty',   l: '🛡️ Lambi warranty pehle' },
];

const sel = 'h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition';

const catMeta = (c?: string) =>
  (c && CATEGORY_META[c as CategoryType]) || { label: 'Baqi', emoji: '📦', urdu: undefined };
const condMeta = (c?: string) => (c && CONDITION_META[c as ConditionType]) || null;

export default function ElectronicsProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);
  const [urlParams, setUrlParams] = useSearchParams();

  const tenantName = useAuthStore((s: any) => s.tenant?.name);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);

  const [search, setSearch] = useState('');
  const [categoryType, setCategoryType] = useState(() => urlParams.get('cat') ?? 'all');
  const [conditionType, setConditionType] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [serialFilter, setSerialFilter] = useState<SerialFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [stockModalProduct, setStockModalProduct] = useState<any>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<1 | 2>(1);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [tab, setTab] = useState<'list' | 'analytics'>('list');

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'table') setView(saved);
  }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  /* Category chunte hi URL me bhi likh dein — link share ho sakta hai */
  useEffect(() => {
    const cur = urlParams.get('cat') ?? 'all';
    if (cur === categoryType) return;
    const next = new URLSearchParams(urlParams);
    if (categoryType === 'all') next.delete('cat');
    else next.set('cat', categoryType);
    setUrlParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryType]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-products-list'],
    queryFn: () => fetchAllProducts(),
  });
  const products: any[] = (data as any)?.items ?? [];

  const { data: profiles = [] } = useQuery({
    queryKey: ['electronics-profiles-all'],
    queryFn: () => electronicsProductsApi.list(),
  });

  /* Sirf stock me pare serial — ginti isi se milani hai */
  const { data: serials = [] } = useQuery({
    queryKey: ['electronics-serials-in-stock'],
    queryFn: () => serialTrackingApi.list({ status: 'IN_STOCK' }).catch(() => []),
    staleTime: 60_000,
  });

  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const serialCount = useMemo(() => {
    const m = new Map<string, number>();
    (serials as any[]).forEach((s) => m.set(s.productId, (m.get(s.productId) ?? 0) + 1));
    return m;
  }, [serials]);

  /* ─── Har product + uska electronics profile + serial ki ginti ─── */
  const rows = useMemo(() => {
    const byProduct = new Map<string, any>();
    (profiles as any[]).forEach((p) => byProduct.set(p.productId, p));

    return products.map((p) => {
      const prof = byProduct.get(p.id);
      const stock = Number(p.stock || 0);
      const tracked = !!prof?.requiresSerial || !!prof?.hasImei;
      const haveSerials = serialCount.get(p.id) ?? 0;
      /* Ginti ka farq sirf tab maana rakhta hai jab serial rakhe
         ja rahe hon — warna har aam cheez laal ho jayegi. */
      const gap = tracked ? stock - haveSerials : 0;

      return {
        ...p,
        _prof: prof,
        _stock: stock,
        _cat: prof?.categoryType as CategoryType | undefined,
        _cond: prof?.conditionType as ConditionType | undefined,
        _model: prof?.modelNumber || prof?.partNumber || '',
        _warranty: Number(prof?.warrantyMonths || 0),
        _mrp: Number(prof?.mrp || 0),
        _tracked: tracked,
        _serials: haveSerials,
        _gap: gap,
        _mismatch: tracked && gap !== 0,
        _brandName: prof?.brand?.name || p.brand?.name || '',
        _brandId: prof?.brandId || p.brandId || '',
      };
    });
  }, [products, profiles, serialCount]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const active = rows.filter((p) => p.isActive);
    const stockValue = rows.reduce((a, p) => a + p._stock * Number(p.price || 0), 0);
    const stockCost = rows.reduce((a, p) => a + p._stock * Number(p.costPrice || 0), 0);
    const low = rows.filter((p) => p._stock > 0 && p._stock <= Number(p.lowStockAlert ?? 5));
    const out = rows.filter((p) => p._stock <= 0);
    const tracked = rows.filter((p) => p._tracked);
    const mismatch = tracked.filter((p) => p._mismatch);
    const withWarranty = rows.filter((p) => p._warranty > 0);
    /* MRP se mehnga bech rahe hain — company ki hadd tut rahi hai */
    const overMrp = rows.filter((p) => p._mrp > 0 && Number(p.price || 0) > p._mrp);

    return {
      total: rows.length,
      active: active.length,
      inactive: rows.length - active.length,
      stockValue, stockCost,
      totalStock: rows.reduce((a, p) => a + p._stock, 0),
      lowCount: low.length,
      outCount: out.length,
      lowList: low.slice(0, 6),
      trackedCount: tracked.length,
      serialsInStock: (serials as any[]).length,
      mismatchCount: mismatch.length,
      mismatchList: mismatch.slice(0, 6),
      warrantyCount: withWarranty.length,
      overMrp,
      noProfile: rows.filter((p) => !p._prof).length,
    };
  }, [rows, serials]);

  /* ─── Chaant + tarteeb ─── */
  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q)
        || (p.sku || '').toLowerCase().includes(q)
        || (p.barcode || '').toLowerCase().includes(q)
        || (p._model || '').toLowerCase().includes(q)
        || (p._brandName || '').toLowerCase().includes(q)
        || (p.category?.name || '').toLowerCase().includes(q)
        || catMeta(p._cat).label.toLowerCase().includes(q));
    }
    if (categoryType !== 'all') {
      list = categoryType === 'none'
        ? list.filter((p) => !p._cat)
        : list.filter((p) => p._cat === categoryType);
    }
    if (conditionType !== 'all') list = list.filter((p) => p._cond === conditionType);
    if (brandId !== 'all') {
      list = brandId === 'none'
        ? list.filter((p) => !p._brandId)
        : list.filter((p) => p._brandId === brandId);
    }
    if (stockFilter !== 'all') {
      list = list.filter((p) => {
        const alert = Number(p.lowStockAlert ?? 5);
        if (stockFilter === 'out') return p._stock <= 0;
        if (stockFilter === 'low') return p._stock > 0 && p._stock <= alert;
        return p._stock > alert;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => (statusFilter === 'active' ? p.isActive : !p.isActive));
    }
    if (serialFilter === 'tracked') list = list.filter((p) => p._tracked);
    if (serialFilter === 'mismatch') list = list.filter((p) => p._mismatch);

    list.sort((a, b) => {
      switch (sortKey) {
        case 'stock-low': return a._stock - b._stock;
        case 'stock-high': return b._stock - a._stock;
        case 'price-low': return Number(a.price || 0) - Number(b.price || 0);
        case 'price-high': return Number(b.price || 0) - Number(a.price || 0);
        case 'warranty': return b._warranty - a._warranty;
        case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });
    return list;
  }, [rows, search, categoryType, conditionType, brandId, stockFilter, statusFilter, serialFilter, sortKey]);

  const visible = filtered.slice(0, visibleCount);
  useEffect(() => { setVisibleCount(PAGE_SIZE); },
    [search, categoryType, conditionType, brandId, stockFilter, statusFilter, serialFilter, sortKey]);

  const hasFilters = !!search || categoryType !== 'all' || conditionType !== 'all'
    || brandId !== 'all' || stockFilter !== 'all' || statusFilter !== 'active' || serialFilter !== 'all';

  const clearFilters = () => {
    setSearch(''); setCategoryType('all'); setConditionType('all'); setBrandId('all');
    setStockFilter('all'); setStatusFilter('active'); setSerialFilter('all');
  };

  /* Sirf wohi categories jo sach me maal par lagi hain */
  const usedCategories = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((p) => { if (p._cat) counts.set(p._cat, (counts.get(p._cat) ?? 0) + 1); });
    return CATEGORY_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((c) => counts.has(c)).map((c) => ({ c, n: counts.get(c)! })),
      }))
      .filter((g) => g.items.length > 0);
  }, [rows]);

  /* Har haalat ki ginti — patti par dikhane ke liye */
  const condCounts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((p) => { if (p._cond) m.set(p._cond, (m.get(p._cond) ?? 0) + 1); });
    return m;
  }, [rows]);

  const usedCatCount = useMemo(
    () => usedCategories.reduce((a, g) => a + g.items.length, 0),
    [usedCategories],
  );

  /* ─── Selection ─── */
  const toggleOne = (id: string) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleAllVisible = () => {
    const allSel = visible.length > 0 && visible.every((p) => selected.has(p.id));
    setSelected(allSel ? new Set() : new Set(visible.map((p) => p.id)));
  };

  /* ─── Bulk ─── */
  const bulkStatus = useMutation({
    mutationFn: async (isActive: boolean) => {
      const ids = Array.from(selected);
      const res = await Promise.allSettled(ids.map((id) => productsApi.update(id, { isActive } as any)));
      const ok = res.filter((r) => r.status === 'fulfilled').length;
      return { ok, fail: res.length - ok };
    },
    onSuccess: ({ ok, fail }) => {
      if (ok) toast.success(`${ok} cheezein update ho gayin`);
      if (fail) toast.error(`${fail} nahi hui`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['electronics-products-list'] });
      forceRefreshProducts().catch(() => {});
    },
    onError: () => toast.error('Update nahi hua'),
  });

  /* Ye pehle `bulkDelete` ke onSuccess ke ANDAR likha hua tha —
     yani ek hook callback ke andar. React ka usool tootta hai aur
     bulk delete kaamyab hote hi safha crash kar jata. Ab bahar. */
  const forceDeleteAll = async (ids: string[]) => {
    const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, true)));
    const ok = res.filter((r) => r.status === 'fulfilled').length;
    const fail = res.length - ok;
    if (ok) toast.success(`${ok} cheezein poori tarah mit gayin`);
    if (fail) toast.error(`${fail} phir bhi nahi mitin`);
    setSelected(new Set());
    queryClient.invalidateQueries();
    forceRefreshProducts().catch(() => {});
  };

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, false)));
      const ok = res.filter((r) => r.status === 'fulfilled').length;
      return { ids, ok, fail: res.length - ok };
    },
    onSuccess: ({ ok, fail }) => {
      if (ok) toast.success(`${ok} cheezein delete ho gayin`);
      if (fail) {
        toast.error(`${fail} cheezon ki bikri ya kharid ka record hai — "poori tarah mitao" se jayengi`, {
          duration: 12000,
        });
      }
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['electronics-products-list'] });
      forceRefreshProducts().catch(() => {});
    },
    onError: () => toast.error('Delete nahi hua'),
  });

  /* ─── CSV ─── */
  const exportCSV = (list: any[]) => {
    if (list.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Electronics Products — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'Sab'}  •  ${new Date().toLocaleString('en-PK')}`],
      [`Kul: ${list.length}  •  Stock value: ${stats.stockValue.toFixed(2)}`],
      [`Serial wale: ${stats.trackedCount}  •  Ginti ka farq: ${stats.mismatchCount}`],
      [''],
    ];
    const head = ['Naam', 'Model', 'SKU', 'Barcode', 'Brand', 'Category', 'Haalat',
      'Cost', 'Rate', 'MRP', 'Stock', 'Serial darj', 'Farq', 'Warranty (mahine)', 'Chaalu'];
    const body = list.map((p) => [
      p.name, p._model, p.sku || '', p.barcode || '', p._brandName,
      catMeta(p._cat).label, condMeta(p._cond)?.label || '',
      Number(p.costPrice || 0).toFixed(2), Number(p.price || 0).toFixed(2),
      p._mrp ? p._mrp.toFixed(2) : '',
      p._stock, p._tracked ? p._serials : '', p._tracked ? p._gap : '',
      p._warranty || '', p.isActive ? 'Haan' : 'Nahi',
    ]);
    const csv = [...summary, head, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} cheezein export ho gayin`);
  };

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (scannerOpen) return setScannerOpen(false);
        if (showTeacher) return setShowTeacher(false);
        if (bulkDeleteOpen) return setBulkDeleteOpen(false);
        if (showMobileFilters) return setShowMobileFilters(false);
        if (selected.size > 0) return setSelected(new Set());
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); setScannerOpen(true); }
      if (k === 'g') setShowTeacher(true);
      if (k === 'r') refetch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, bulkDeleteOpen, showMobileFilters, scannerOpen, selected]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-5 pb-24 animate-pulse">
        <div className="rounded-2xl sm:rounded-3xl bg-slate-200 dark:bg-slate-800 h-40 sm:h-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-2xl bg-slate-200 dark:bg-slate-800 h-24" />)}
        </div>
        <div className="rounded-2xl bg-slate-200 dark:bg-slate-800 h-16" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-4/5" />
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 print:space-y-3">
      {stockModalProduct && <QuickStockModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} />}
      {showTeacher && <ProductsTeacher onClose={() => setShowTeacher(false)} />}

      {scannerOpen && (
        <BarcodeScanner onClose={() => setScannerOpen(false)}
          onDetected={(code: string) => {
            const clean = code.trim();
            setScannerOpen(false);
            /* Scan ka matlab hai "yehi cheez dikhao" — is liye saari
               chaant hata dete hain, warna cheez kisi band filter me
               chhupi reh jati hai aur lagta hai mili hi nahi. */
            const hit = rows.find((p) =>
              p.barcode === clean || p.sku === clean
              || (p.barcode ?? '').toLowerCase() === clean.toLowerCase());
            setTab('list'); clearFilters(); setStatusFilter('all');
            setSearch(clean); setVisibleCount(PAGE_SIZE);
            if (hit) toast.success(`${hit.name} mil gaya`);
            else {
              /* Barcode na mile to shayad ye serial/IMEI ho — electronics
                 me yehi zyada hota hai. Dhoond kar bata dete hain. */
              serialTrackingApi.lookup(clean).then((s: any) => {
                if (s) {
                  toast.success(`Ye serial hai — ${s.product?.name ?? 'cheez'} (${s.status})`, {
                    action: { label: 'Kholein', onClick: () => navigate('/electronics/serials?q=' + clean) },
                  });
                } else {
                  toast.error(`${clean} kisi cheez ya serial se nahi mila`);
                }
              }).catch(() => toast.error(`${clean} kisi cheez se nahi mila`));
            }
          }} />
      )}

      {/* ═══ BULK DELETE — do qadam ═══ */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setBulkDeleteOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-black text-white/80">
                  Hamesha ke liye — qadam {bulkDeleteStep}/2
                </div>
                <h3 className="font-black text-lg">{selected.size} cheezein</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {bulkDeleteStep === 1 ? (
                <>
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4">
                    <p className="font-black text-rose-900 dark:text-rose-200 text-sm mb-2 inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Ye sab mit jayega:
                    </p>
                    <ul className="text-xs font-bold text-rose-800 dark:text-rose-300 space-y-1">
                      <li>• Cheezein + tasveerein + variants</li>
                      <li>• Har shop ka stock</li>
                      <li>• Bikri aur kharid ka record</li>
                      <li>• <strong>Serial aur IMEI ka poora record</strong> — warranty claim ka saboot bhi</li>
                      <li>• Khali reh jane wali receipts</li>
                    </ul>
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center">
                    Sirf test ka data saaf karne ke liye. Ye wapas <strong>nahi</strong> aa sakta.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setBulkDeleteOpen(false)}
                      className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-black text-slate-700 dark:text-slate-200 transition">
                      Rehne dein
                    </button>
                    <button onClick={() => setBulkDeleteStep(2)}
                      className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black transition">
                      Samajh gaya, aage →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center leading-relaxed">
                    Aakhri baar pooch rahe hain:<br />
                    <span className="text-rose-600 dark:text-rose-400 font-black">{selected.size} cheezein</span> aur
                    unka saara record mita dein?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setBulkDeleteStep(1)}
                      className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-black text-slate-700 dark:text-slate-200 transition">
                      ← Wapas
                    </button>
                    <button onClick={() => { setBulkDeleteOpen(false); setBulkDeleteStep(1); forceDeleteAll(Array.from(selected)); }}
                      className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black inline-flex items-center justify-center gap-2 transition">
                      <Trash2 className="h-4 w-4" /> Mita dein
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">🔌 {tenantName || 'Meri dukaan'}</h1>
            <p className="text-xs text-slate-600 font-bold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Maal ki list • {filtered.length} cheezein
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Banaya gaya</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Cpu className="h-3.5 w-3.5 text-cyan-300" /> Electronics
              {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight">
              📦 Maal ki list
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
                <strong className="text-cyan-200">{stats.total}</strong> cheezein
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
                <strong className="text-emerald-300">{stats.active}</strong> chaalu
              </span>
              {!hideCost && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
                  Value <strong className="text-emerald-300">{formatPKR(stats.stockValue)}</strong>
                </span>
              )}
              {stats.trackedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
                  <strong className="text-sky-200">{stats.trackedCount}</strong> serial wale
                </span>
              )}
              {stats.lowCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-2 py-0.5">
                  <strong className="text-amber-300">{stats.lowCount}</strong> kam
                </span>
              )}
              {stats.outCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-400/20 px-2 py-0.5">
                  <strong className="text-rose-300">{stats.outCount}</strong> khatam
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition active:scale-[0.97]">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <PrivacyToggle compact />
            <button onClick={() => setScannerOpen(true)} title="Barcode / IMEI scan (B)"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition active:scale-[0.97]">
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Scan</span>
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} title="Refresh (R)"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur disabled:opacity-50 transition active:scale-[0.97]">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition active:scale-[0.97]">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={() => exportCSV(filtered)}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition active:scale-[0.97]">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <Link to="/electronics/serials"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition active:scale-[0.97]">
              <Hash className="h-4 w-4" /> <span className="hidden lg:inline">Serial</span>
            </Link>
            <Link to="/electronics-products/new"
              className="h-11 px-4 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Nayi cheez
            </Link>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Dhoondein</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>B</Kbd><span className="text-white/60">Scan</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>G</Kbd><span className="text-white/60">Sikhein</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Package} label="Kul cheezein" value={stats.total} sub={`${stats.inactive} band`} tone="blue" />
        <Kpi icon={DollarSign} label="Stock ki value"
          value={hideCost ? '••••' : formatPKR(stats.stockValue)}
          sub={hideCost ? '🔒 PIN se dekhein' : `Lagat ${formatPKR(stats.stockCost)}`} tone="emerald" />
        <Kpi icon={Hash} label="Serial wale" value={stats.trackedCount}
          sub={`${stats.serialsInStock} serial stock me`} tone="sky"
          onClick={() => setSerialFilter(serialFilter === 'tracked' ? 'all' : 'tracked')}
          active={serialFilter === 'tracked'} />
        <Kpi icon={AlertTriangle} label="Kam / khatam" value={stats.lowCount + stats.outCount}
          sub={`${stats.lowCount} kam · ${stats.outCount} khatam`} tone="amber"
          onClick={() => { setStockFilter(stockFilter === 'low' ? 'all' : 'low'); setStatusFilter('all'); }}
          active={stockFilter === 'low'} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          { v: 'list' as const, label: 'Maal', hint: 'Poori list, chaant aur scan', icon: Package, n: stats.total },
          { v: 'analytics' as const, label: 'Hisab', hint: 'Paisa kahan khara hai', icon: TrendingUp, n: undefined },
        ]).map((t) => {
          const on = tab === t.v;
          return (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`group relative overflow-hidden rounded-3xl border-2 px-4 sm:px-6 py-4 text-left transition active:scale-[0.99] ${
                on
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-700 border-transparent text-white shadow-xl shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:shadow-lg'
              }`}>
              {on && <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />}
              <div className="relative flex items-center gap-3">
                <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 transition ${
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-blue-500 to-cyan-700 text-white group-hover:scale-105'
                }`}>
                  <t.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black truncate">{t.label}</span>
                    {t.n !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums shrink-0 ${
                        on ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>{t.n.toLocaleString()}</span>
                    )}
                  </div>
                  <div className={`text-[11px] font-bold truncate ${on ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                    {t.hint}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {tab === 'analytics' && <ProductsAnalytics products={products} hideCost={hideCost} />}

      {tab === 'list' && (<>

      {/* ═══ SERIAL KI GINTI KA FARQ — electronics ka sab se ahem nishan ═══ */}
      {stats.mismatchCount > 0 && serialFilter !== 'mismatch' && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
              <Hash className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                🔢 {stats.mismatchCount} cheezon me stock aur serial ki ginti barabar nahi
              </h3>
              <p className="mt-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300/80">
                Jitna maal stock me hai, utne serial darj hone chahiye. Jo cheez serial ke baghair bik gayi,
                uski warranty ka koi saboot nahi bachta.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.mismatchList.map((p) => (
                  <Link key={p.id} to={`/electronics-products/${p.id}`}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 hover:border-rose-400 text-[11px] font-black text-rose-900 dark:text-rose-200 transition">
                    {p.name}{' '}
                    <span className="text-rose-600 dark:text-rose-400">
                      (stock {p._stock} · serial {p._serials})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button onClick={() => { setSerialFilter('mismatch'); setStatusFilter('all'); }}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition active:scale-[0.97]">
                Sab dekhein →
              </button>
              <Link to="/electronics/serials"
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-black text-center transition">
                Serial darj karein
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ KAM STOCK ═══ */}
      {stats.lowCount > 0 && stockFilter !== 'low' && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-amber-900 dark:text-amber-200 text-sm">
                ⚠️ {stats.lowCount} cheezein khatam hone wali hain
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.lowList.map((p) => (
                  <button key={p.id} onClick={() => setStockModalProduct(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 hover:border-amber-400 text-[11px] font-black text-amber-900 dark:text-amber-200 transition">
                    {p.name} <span className="text-rose-700 dark:text-rose-400">({p._stock} {p.unit})</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { setStockFilter('low'); setStatusFilter('all'); }}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 transition active:scale-[0.97]">
              Sab dekhein →
            </button>
          </div>
        </section>
      )}

      {/* ═══ MRP SE MEHNGA ═══ */}
      {stats.overMrp.length > 0 && (
        <section className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3 flex items-start gap-2.5 flex-wrap print:hidden">
          <Star className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
          <p className="flex-1 min-w-[220px] text-[12px] font-bold text-violet-900 dark:text-violet-200">
            <strong>{stats.overMrp.length} cheezein</strong> company ke MRP se mehngi lagi hui hain.
            Kuch company walay is par aitraaz karte hain — rate ek baar dekh lein.
          </p>
          <div className="flex flex-wrap gap-1 shrink-0">
            {stats.overMrp.slice(0, 4).map((p) => (
              <Link key={p.id} to={`/electronics-products/${p.id}`}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-[10px] font-black text-violet-800 dark:text-violet-200 transition">
                {p.name} · {formatPKR(p.price)} &gt; {formatPKR(p._mrp)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ PROFILE NAHI BANA ═══ */}
      {stats.noProfile > 0 && (
        <section className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/30 p-3 flex items-center gap-2.5 flex-wrap print:hidden">
          <Cpu className="h-4 w-4 text-sky-600 shrink-0" />
          <p className="flex-1 min-w-[220px] text-[12px] font-bold text-sky-900 dark:text-sky-200">
            <strong>{stats.noProfile} cheezon</strong> ki electronics tafseel nahi bhari — na model, na warranty,
            na haalat. Grahak yehi poochta hai.
          </p>
          <button onClick={() => { clearFilters(); setCategoryType('none'); setStatusFilter('all'); }}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shrink-0 transition">
            Dikhayein →
          </button>
        </section>
      )}

      {/* ═══ TOOLBAR — chipak kar upar rehta hai ═══ */}
      <section className="sticky top-0 z-30 -mx-1 px-1 py-1 print:hidden">
        <div className="rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/30 p-3 sm:p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam, model, brand, SKU, barcode… (/ dabao)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <button onClick={() => setScannerOpen(true)} title="Barcode / IMEI scan (B)"
              className="h-12 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-blue-500/30 shrink-0 transition active:scale-[0.97]">
              <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Scan</span>
            </button>

            <button onClick={() => setShowMobileFilters((v) => !v)}
              className={`lg:hidden h-12 px-4 rounded-2xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 transition active:scale-[0.97] ${
                showMobileFilters
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
              <SlidersHorizontal className="h-4 w-4" /> Chaant
              {hasFilters && <span className="h-2 w-2 rounded-full bg-amber-500" />}
            </button>

            <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <button onClick={() => setView('grid')} title="Khane"
                className={`px-4 h-12 transition ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button onClick={() => setView('table')} title="List"
                className={`px-4 h-12 border-l-2 border-slate-200 dark:border-slate-700 transition ${view === 'table' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>

            <button onClick={() => exportCSV(filtered)}
              className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition active:scale-[0.97]">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Haalat ki patti — electronics me ek hi model teen haalat me bikta hai */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setConditionType('all')}
              className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition active:scale-[0.97] ${
                conditionType === 'all'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400'
              }`}>
              <Package className="h-3.5 w-3.5" /> Sab ({stats.total})
            </button>
            {Object.entries(CONDITION_META).map(([k, m]) => {
              const n = condCounts.get(k) ?? 0;
              if (n === 0 && conditionType !== k) return null;
              return (
                <button key={k} onClick={() => setConditionType(conditionType === k ? 'all' : k)} title={m.hint}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition active:scale-[0.97] ${
                    conditionType === k
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                  }`}>
                  {m.emoji} {m.label} ({n})
                </button>
              );
            })}
          </div>

          {/* Serial ki patti — electronics ka apna alarm */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <Segmented value={serialFilter} onChange={setSerialFilter}
              activeCls="bg-blue-600 text-white"
              options={[
                { v: 'all' as const, l: '📦 Sab' },
                { v: 'tracked' as const, l: '🔢 Serial wale', c: stats.trackedCount },
                { v: 'mismatch' as const, l: '⚠️ Ginti ka farq', c: stats.mismatchCount },
              ]} />
            {stats.warrantyCount > 0 && (
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> {stats.warrantyCount} par warranty likhi hai
              </span>
            )}
          </div>

          {/* Baqi chaant — desktop hamesha, mobile par toggle */}
          <div className={`gap-2 flex-wrap items-center ${showMobileFilters ? 'flex' : 'hidden lg:flex'}`}>
            <select value={categoryType} onChange={(e) => setCategoryType(e.target.value)} className={sel}>
              <option value="all">Sab Categories ({usedCatCount})</option>
              <option value="none">Tafseel nahi bhari ({stats.noProfile})</option>
              {usedCategories.map((g) => (
                <optgroup key={g.label} label={`${g.emoji} ${g.label}`}>
                  {g.items.map(({ c, n }) => (
                    <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label} ({n})</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={sel}>
              <option value="all">Sab Brands ({(brands as any[]).length})</option>
              <option value="none">Bina brand</option>
              {(brands as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <Segmented value={stockFilter} onChange={setStockFilter} activeCls="bg-blue-600 text-white"
              options={[
                { v: 'all' as const, l: 'Sab' },
                { v: 'in' as const, l: 'Stock me' },
                { v: 'low' as const, l: 'Kam', c: stats.lowCount },
                { v: 'out' as const, l: 'Khatam', c: stats.outCount },
              ]} />

            <Segmented value={statusFilter} onChange={setStatusFilter}
              activeCls="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              options={[
                { v: 'active' as const, l: 'Active' },
                { v: 'inactive' as const, l: 'Band' },
                { v: 'all' as const, l: 'Dono' },
              ]} />

            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={sel}>
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>

            {hasFilters && (
              <button onClick={clearFilters}
                className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                <X className="h-3 w-3" /> Chaant hatao
              </button>
            )}

            <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
              {filtered.length} cheezein
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BULK BAR ═══ */}
      {selected.size > 0 && (
        <section className="sticky top-[76px] z-20 rounded-2xl bg-slate-950 dark:bg-slate-900 text-white shadow-2xl border border-white/20 p-3 flex items-center gap-2 flex-wrap print:hidden">
          <div className="font-extrabold text-sm px-2"><span className="text-cyan-300">{selected.size}</span> chuni</div>
          <button onClick={() => bulkStatus.mutate(true)} disabled={bulkStatus.isPending}
            className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97] disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active karo
          </button>
          <button onClick={() => bulkStatus.mutate(false)} disabled={bulkStatus.isPending}
            className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97] disabled:opacity-50">
            <XCircle className="h-3.5 w-3.5" /> Band karo
          </button>
          <button onClick={() => navigate('/retail/barcode-labels', { state: { productIds: Array.from(selected) } })}
            className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97]">
            <Barcode className="h-3.5 w-3.5" /> Labels print
          </button>
          <button onClick={() => exportCSV(filtered.filter((p) => selected.has(p.id)))}
            className="px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97]">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => bulkDelete.mutate()} disabled={bulkDelete.isPending}
            className="px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97] disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => { setBulkDeleteStep(1); setBulkDeleteOpen(true); }}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold transition active:scale-[0.97]">
            Poori tarah mitao
          </button>
          <button onClick={() => setSelected(new Set())}
            className="ml-auto px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold transition active:scale-[0.97]">
            Clear
          </button>
        </section>
      )}

      {/* ═══ NATEEJA ═══ */}
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 print:hidden">
        {filtered.length} cheezein
        {filtered.length > visible.length && ` · ${visible.length} dikha rahe hain`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-black text-slate-700 dark:text-slate-200">Kuch nahi mila</p>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {hasFilters ? 'Chaant badal kar dekhein' : 'Abhi koi cheez nahi — pehli cheez daal dein'}
          </p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            {hasFilters && (
              <button onClick={clearFilters}
                className="h-11 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-black transition">
                Chaant hatayein
              </button>
            )}
            <Link to="/electronics-products/new"
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <Plus className="h-4 w-4" /> Nayi cheez
            </Link>
          </div>
        </div>
      ) : view === 'grid' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {visible.map((p) => (
              <ProductCard key={p.id} p={p} hideCost={hideCost}
                selected={selected.has(p.id)} onToggle={() => toggleOne(p.id)}
                onStock={() => setStockModalProduct(p)} />
            ))}
          </div>
          {filtered.length > visible.length && (
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-black text-slate-600 dark:text-slate-300 hover:border-blue-400 transition print:hidden">
              Aur {Math.min(PAGE_SIZE, filtered.length - visible.length)} dikhayein
              <span className="text-slate-400"> · {filtered.length - visible.length} baqi</span>
            </button>
          )}
        </>
      ) : (
        <>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="w-10 px-3 py-2.5 print:hidden">
                      <input type="checkbox" onChange={toggleAllVisible}
                        checked={visible.length > 0 && visible.every((p) => selected.has(p.id))}
                        className="h-4 w-4 rounded accent-blue-600" />
                    </th>
                    <Th>Cheez</Th>
                    <Th>Category</Th>
                    <Th>Haalat</Th>
                    <Th className="text-right">Rate</Th>
                    <Th className="text-right">Stock</Th>
                    <Th className="text-right">Serial</Th>
                    <Th className="text-right">Warranty</Th>
                    <Th className="text-right print:hidden">Kaam</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((p) => {
                    const cm = catMeta(p._cat);
                    const cond = condMeta(p._cond);
                    const alert = Number(p.lowStockAlert ?? 5);
                    return (
                      <tr key={p.id} className={`transition ${
                        selected.has(p.id) ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}>
                        <td className="px-3 py-2.5 print:hidden">
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                            className="h-4 w-4 rounded accent-blue-600" />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link to={`/electronics-products/${p.id}`} className="flex items-center gap-2 min-w-0 group">
                            <Thumb p={p} />
                            <span className="min-w-0">
                              <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition">
                                {p.name}
                              </span>
                              <span className="block text-[10px] font-bold text-slate-400 truncate">
                                {p._model || p.sku || p.barcode || '—'}
                                {p._brandName && ` · ${p._brandName}`}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {cm.emoji} {cm.label}
                        </td>
                        <td className="px-3 py-2.5">
                          {cond
                            ? <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${cond.chip}`}>{cond.emoji} {cond.label}</span>
                            : <span className="text-[10px] font-bold text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="block text-[13px] font-black text-slate-900 dark:text-white tabular-nums">
                            {formatPKR(p.price)}
                          </span>
                          {!hideCost && Number(p.costPrice) > 0 && (
                            <span className="block text-[10px] font-bold text-slate-400 tabular-nums">
                              lagat {formatPKR(p.costPrice)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Pill tone={p._stock <= 0 ? 'rose' : p._stock <= alert ? 'amber' : 'emerald'}>
                            {p._stock} {p.unit}
                          </Pill>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {p._tracked ? (
                            <Pill tone={p._mismatch ? 'rose' : 'sky'}>
                              {p._serials}{p._mismatch && ` (${p._gap > 0 ? '−' : '+'}${Math.abs(p._gap)})`}
                            </Pill>
                          ) : <span className="text-[10px] font-bold text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11px] font-black text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {p._warranty > 0 ? `🛡️ ${p._warranty} mah` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 print:hidden">
                          <div className="flex gap-1 justify-end">
                            <IconBtn to={`/electronics-products/${p.id}`} title="Kholein" tone="sky"><Eye className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn to={`/electronics-products/${p.id}/edit`} title="Badlein" tone="amber"><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                            <button onClick={() => setStockModalProduct(p)} title="Stock"
                              className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 flex items-center justify-center transition">
                              <Boxes className="h-3.5 w-3.5" />
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
          {filtered.length > visible.length && (
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-black text-slate-600 dark:text-slate-300 hover:border-blue-400 transition print:hidden">
              Aur {Math.min(PAGE_SIZE, filtered.length - visible.length)} dikhayein
            </button>
          )}
        </>
      )}
      </>)}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

function Segmented<T extends string>({ value, onChange, options, activeCls }: {
  value: T; onChange: (v: T) => void; activeCls: string;
  options: Array<{ v: T; l: string; c?: number }>;
}) {
  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold transition active:scale-[0.97] ${
              on ? `${activeCls} shadow-sm` : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}>
            {o.l}
            {o.c != null && <span className={`ml-1 tabular-nums ${on ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>}
          </button>
        );
      })}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  rose: 'bg-rose-600',
  violet: 'bg-violet-600',
};

function Badge({ tone, children }: any) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shadow ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

function Kbd({ children }: any) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 font-black text-white/90">
      {children}
    </kbd>
  );
}

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

const PILL_TONES: Record<string, string> = {
  emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300',
  sky: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
};

function Pill({ tone, children }: any) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-black tabular-nums whitespace-nowrap ${PILL_TONES[tone]}`}>
      {children}
    </span>
  );
}

const ICON_TONES: Record<string, string> = {
  sky: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-500/20',
  amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-500/20',
};

function IconBtn({ to, title, tone, children }: any) {
  return (
    <Link to={to} title={title}
      className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${ICON_TONES[tone]}`}>
      {children}
    </Link>
  );
}

function FilterSelect({ value, onChange, label, full, children }: any) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className={`h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition ${full ? 'w-full' : ''}`}>
      {children}
    </select>
  );
}

function Thumb({ p, size = 'h-10 w-10' }: any) {
  const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url;
  const cm = catMeta(p._cat);
  return (
    <span className={`${size} rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0`}>
      {img
        ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <span className="text-base">{cm.emoji}</span>}
    </span>
  );
}

const KPI_TONES: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'from-blue-500 to-cyan-600', icon: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'from-emerald-500 to-green-600', icon: 'text-emerald-600 dark:text-emerald-400' },
  sky: { bg: 'from-sky-500 to-blue-600', icon: 'text-sky-600 dark:text-sky-400' },
  amber: { bg: 'from-amber-500 to-orange-600', icon: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'from-rose-500 to-red-600', icon: 'text-rose-600 dark:text-rose-400' },
};

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const t = KPI_TONES[tone] ?? KPI_TONES.blue;
  const Wrap: any = onClick ? 'button' : 'div';
  return (
    <Wrap onClick={onClick}
      className={`rounded-2xl sm:rounded-3xl border-2 p-3 sm:p-4 text-left transition ${
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-lg'
          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
      } ${onClick ? 'hover:border-blue-400 hover:shadow-md active:scale-[0.99] cursor-pointer' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-8 w-8 rounded-xl bg-gradient-to-br ${t.bg} text-white flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] font-bold text-slate-400 truncate">{sub}</p>}
    </Wrap>
  );
}

/* ── Ek cheez ka khana ──
   Bakery/retail jaisa: bari tasveer, upar nishan, neeche laal
   patti jab stock khatam ho, aur sab se neeche chaar kaam ke
   button — stock, badlo, POS, delete. */
function ProductCard({ p, hideCost, selected, onToggle, onStock }: any) {
  const cm = catMeta(p._cat);
  const cond = condMeta(p._cond);
  const alert = Number(p.lowStockAlert ?? 5);
  const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url;
  const out = p._stock <= 0;
  const low = !out && p._stock <= alert;

  return (
    <div className={[
      'group relative rounded-2xl bg-white dark:bg-slate-900/80 border-2 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 avoid-break',
      selected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-500/30'
        : p._mismatch ? 'border-rose-300 dark:border-rose-500/40'
        : out ? 'border-rose-200 dark:border-rose-500/40'
        : low ? 'border-amber-200 dark:border-amber-500/40'
        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/40',
      !p.isActive ? 'opacity-60' : '',
    ].join(' ')}>
      <button onClick={onToggle} aria-label="Chunein"
        className={[
          'absolute top-2 left-2 z-10 h-7 w-7 rounded-lg border-2 flex items-center justify-center transition shadow-sm print:hidden',
          selected ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100',
        ].join(' ')}>
        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>

      <Link to={`/electronics-products/${p.id}`} className="block">
        <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {img ? (
            <img src={img} alt={p.name} loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(p.name)} select-none`}>
              <span className="text-5xl drop-shadow-sm">{cm.emoji}</span>
            </div>
          )}

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {p.isFeatured && (
              <span className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <Star className="h-3 w-3 fill-white text-white" />
              </span>
            )}
            {p._warranty > 0 && (
              <Badge tone="emerald"><ShieldCheck className="h-2.5 w-2.5" /> {p._warranty}m</Badge>
            )}
            {p._tracked && (
              <Badge tone={p._mismatch ? 'rose' : 'sky'}>
                <Hash className="h-2.5 w-2.5" /> {p._serials}
              </Badge>
            )}
            {p._mrp > 0 && Number(p.price) > p._mrp && (
              <Badge tone="violet">MRP+</Badge>
            )}
          </div>

          {p._mismatch ? (
            <div className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white tracking-wide bg-rose-600">
              SERIAL {p._gap > 0 ? `${p._gap} KAM` : `${Math.abs(p._gap)} ZYADA`}
            </div>
          ) : (out || low) && (
            <div className={`absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white tracking-wide ${out ? 'bg-rose-600' : 'bg-amber-500'}`}>
              {out ? 'STOCK KHATAM' : `SIRF ${p._stock} ${p.unit} BACHA`}
            </div>
          )}
        </div>

        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight line-clamp-2 min-h-[2rem] group-hover:text-blue-600">
            {p.name}
          </div>

          <div className="mt-1 flex items-center gap-1 flex-wrap">
            {cond && (
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${cond.chip}`}>
                {cond.emoji} {cond.label}
              </span>
            )}
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[8rem]">
              {cm.emoji} {cm.label}
            </span>
            {p.category && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-white truncate max-w-[8rem]"
                style={{ backgroundColor: p.category.color || '#64748b' }}>
                {p.category.name}
              </span>
            )}
          </div>

          {(p._model || p._brandName) && (
            <div className="mt-1 text-[9px] font-bold text-slate-400 truncate">
              {p._brandName}{p._brandName && p._model ? ' · ' : ''}{p._model}
            </div>
          )}

          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div className="min-w-0">
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
                {formatPKR(p.price || 0)}
              </div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {hideCost || !Number(p.costPrice)
                  ? `per ${p.unit}`
                  : `lagat ${formatPKR(p.costPrice)} · nafa ${formatPKR(Number(p.price || 0) - Number(p.costPrice || 0))}`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-extrabold tabular-nums leading-none ${
                out ? 'text-rose-700 dark:text-rose-400'
                  : low ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-700 dark:text-slate-300'
              }`}>{p._stock}</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">stock</div>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 flex items-center gap-1 print:hidden">
        <button onClick={onStock}
          className="flex-1 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center justify-center gap-1 transition active:scale-[0.97]">
          <Plus className="h-3 w-3" /> Stock
        </button>
        {p._tracked && (
          <Link to={`/electronics/serials?product=${p.id}`} title="Serial dekhein"
            className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 flex items-center justify-center transition">
            <Hash className="h-3.5 w-3.5" />
          </Link>
        )}
        <Link to={`/electronics-products/${p.id}/edit`} title="Badlein"
          className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition">
          <Edit3 className="h-3.5 w-3.5" />
        </Link>
        <Link to="/pos" title="POS"
          className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition">
          <ShoppingCart className="h-3.5 w-3.5" />
        </Link>
        <ProductDeleteButton id={p.id} name={p.name} />
      </div>
    </div>
  );
}

/* ── Sikhein ── */
function ProductsTeacher({ onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Ye safha kaise chalta hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Electronics ki dukaan ke liye</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Hash, t: 'Serial ki ginti sab se ahem hai', d: 'Jis cheez ka serial rakha jata hai, uske liye do ginti chalti hai — stock ki, aur darj shuda serial ki. Ye barabar honi chahiye. Stock 10 aur serial 7 ka matlab hai teen cheezein aisi hain jinki warranty ka koi saboot nahi bachega. Laal patti yehi batati hai.' },
            { i: ShieldCheck, t: 'Warranty likhna mat bhooliye', d: 'Grahak sab se pehle yehi poochta hai — "kitni warranty hai?" Har cheez par mahine likhe hon to counter par socha nahi parta.' },
            { i: Star, t: 'Haalat — ek hi model, teen rate', d: 'Brand New, Open Box, Refurbished aur Used alag alag rate par bikte hain. Har cheez par haalat lagi ho to list me hi saaf nazar aata hai ke kaunsa maal kis rate ka hai.' },
            { i: ScanLine, t: 'Scan me serial bhi chalta hai', d: 'Barcode scan karein. Agar wo barcode kisi cheez se na mile, to hum khud dekh lete hain ke kahin ye serial ya IMEI to nahi — aur seedha uska record khol dete hain.' },
            { i: Layers, t: 'Category khandaan ke hisab se', d: 'Aath-ten khandaan hain — Audio, Power & Cables, Storage waghera. Sirf wohi dikhte hain jo aap ke maal par sach me lage hain, is liye list chhoti aur kaam ki rehti hai.' },
            { i: Boxes, t: 'Stock wahin se badlein', d: 'Khane par jo hara/peela/laal number hai, us par dabayein — stock wahin badal jayega. Poora safha kholne ki zaroorat nahi.' },
            { i: Trash2, t: 'Delete se pehle soch lein', d: '"Delete" wo cheezein hata deta hai jinka koi record nahi. Jinki bikri ho chuki, wo "poori tarah mitao" se jati hain — aur us ke sath unke serial aur warranty ka record bhi chala jata hai. Wo wapas nahi aata.' },
          ].map((s, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0">
                <s.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{s.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['/', 'Dhoondein'], ['B', 'Scan'], ['G', 'Ye safha'], ['R', 'Refresh'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-blue-600 to-cyan-700">
            Samajh gaya
          </Button>
        </footer>
      </div>
    </div>
  );
}
