import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Cake, Timer, Snowflake, AlertTriangle, Package, PackageX,
  DollarSign, ChefHat, ShoppingBag, Wheat, CheckCircle2, XCircle, Award,
  TrendingUp, BarChart3, Info, GraduationCap, X, Printer, Boxes, Flame, Star,
  Calculator, Tag, Layers, Clock, Scale, Plus, Minus, Save, Hash, Barcode,
  ShoppingCart, Receipt, History, ChevronRight, ArrowRightLeft, RotateCcw,
  Image as ImageIcon, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { stockMovementsApi } from '@modules/inventory/stock-movements/api/stock-movements.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { bakeryProductsApi } from '../api/products.api';
import { ingredientsApi } from '../api/ingredients.api';
import { freshnessApi, type FreshnessLog } from '../api/freshness.api';
import { FLAVORS, SHAPES, CREAMS } from '../api/constants';
import { deriveBakeryCategory, isCakeLike, prettyCategory } from '../lib/bakeryCategory';
import { unitDef, rateBetween, priceField, extraUnitsFor } from '../lib/bakeryUnits';
import { useBusinessDayStart, setToDayStart, setToDayEnd } from '@core/lib/business-day';

/* ═════════════════════════════════════════════════════════════
   BAKERY — EK CHEEZ KI POORI KAHANI  (Retail jaisa, poora)
   ─────────────────────────────────────────────────────────────
   Retail detail ki har cheez:
     🔒 Cost chhupao • ➕ Quick stock (S) — ISI file me
     🏷️ Label • 🛒 POS • 🗑️ Delete • 🖼️ Gallery • #Tags
     📈 30 din ki bikri • 🧮 Unit calculator • 🧾 Sales • 📜 Stock log
     🔁 Kitna banana / mangwana hai — bikri ke hisab se

   Aur bakery ki apni:
     🌾 Recipe AAJ ke rate se — saamaan mehnga hua to foran pata
     🏭 Gudaam ke saamaan se abhi kitne ban sakte hain
     ⏱️ Taazgi — kaunsa batch pehle kharab hoga
   ⌨️ E edit • S stock • 1-6 tabs • G guide • P print • Esc band
   ═════════════════════════════════════════════════════════════ */

const ROUTES = {
  list: '/products',
  detail: (id: string) => `/bakery-products/${id}`,
  edit: (id: string) => `/bakery-products/${id}/edit`,
  labels: '/retail/barcode-labels',
  pos: '/pos',
  freshness: '/bakery/freshness',
  ingredients: '/bakery/ingredients',
  purchases: '/purchases',
  receipt: (id: string) => `/sales/${id}/receipt`,
};

type Tab = 'overview' | 'recipe' | 'freshness' | 'sales' | 'log' | 'details';
const TAB_KEYS: Tab[] = ['overview', 'recipe', 'freshness', 'sales', 'log', 'details'];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

function hoursLeft(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
}

function hoursPhrase(h: number): string {
  if (h < 0) {
    const p = Math.abs(h);
    return p < 24 ? `${Math.round(p)} ghante pehle kharab` : `${Math.round(p / 24)} din pehle kharab`;
  }
  if (h < 1) return `${Math.round(h * 60)} minute baqi`;
  if (h < 24) return `${Math.round(h)} ghante baqi`;
  return `${Math.round(h / 24)} din baqi`;
}

export default function BakeryProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  /* Dukaan ka apna karobari din — Settings se */

  const bdStart = useBusinessDayStart();

  const [tab, setTab] = useState<Tab>('overview');
  const [imgIndex, setImgIndex] = useState(0);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [convFrom, setConvFrom] = useState('base');
  const [convQty, setConvQty] = useState<number | ''>(1);

  /* ── Data ── */
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });
  const { data: profile } = useQuery({
    queryKey: ['bakery-profile-by-product', id],
    queryFn: () => bakeryProductsApi.byProduct(id!).catch(() => null),
    enabled: !!id,
  });
  const { data: freshLogs = [] } = useQuery({
    queryKey: ['bakery-freshness-for-product', id],
    queryFn: () => freshnessApi.list({ productId: id }).catch(() => [] as FreshnessLog[]),
    enabled: !!id,
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ['bakery-ingredients-list'],
    queryFn: () => ingredientsApi.list({}).catch(() => [] as any[]),
    enabled: !!id,
  });
  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });
  const { data: movementsRaw } = useQuery({
    queryKey: ['stock-movements-for-product', id],
    queryFn: () => (stockMovementsApi as any).list({ productId: id }).catch(() => []),
    enabled: !!id,
    retry: false,
  });
  const { data: relatedRaw } = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
    enabled: !!product?.categoryId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['product', id] });
    qc.invalidateQueries({ queryKey: ['bakery-all-products'] });
    qc.invalidateQueries({ queryKey: ['bakery-profiles-all'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['retail-products'] });
    qc.invalidateQueries({ queryKey: ['stock-movements-for-product', id] });
    forceRefreshProducts().catch(() => {});
  };

  /* ── Bunyadi hisab ── */
  const derived = useMemo(() => deriveBakeryCategory(product?.category?.name, product?.name), [product]);
  const recipe: any[] = useMemo(() => {
    const lines = (profile as any)?.ingredients?.lines;
    return Array.isArray(lines) ? lines : [];
  }, [profile]);
  const recipeYield = Number((profile as any)?.ingredients?.yield) || 1;
  const isMade = Boolean(profile?.isCakeCustomizable || profile?.isCustomizable || recipe.length > 0);

  const unit = product?.unit || 'pcs';
  const stock = Number(product?.shopStock ?? product?.stock ?? 0);
  const cost = Number(product?.costPrice ?? 0);
  const price = Number(product?.price ?? 0);
  const alertLevel = Number(product?.lowStockAlert ?? 5);
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= alertLevel;
  const shelfDays: number | null = profile?.shelfLifeDays ?? null;
  const shelfHours: number | null = profile?.shelfLifeHours ?? null;
  const noShelf = !shelfDays && !shelfHours;
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  /* ── Recipe — aaj ke rate se ──
     Recipe save karte waqt saamaan ka jo rate tha wo line me likha
     hota hai. Magar maida aaj mehnga ho chuka ho sakta hai. Is liye
     har line ko gudaam ke AAJ ke rate aur stock se milate hain. */
  const recipeRows = useMemo(() => {
    const byId = new Map((ingredients as any[]).map((i) => [i.id, i]));
    return recipe.map((l) => {
      const ing: any = byId.get(l.ingredientId);
      const qty = Number(l.qty || 0);
      const savedRate = Number(l.costPerUnit || 0);
      const nowRate = ing ? Number(ing.costPerUnit || 0) : savedRate;
      const have = ing ? Number(ing.currentStock || 0) : null;
      return {
        ...l, qty, savedRate, nowRate, have, missing: !ing,
        savedCost: qty * savedRate,
        lineCost: qty * nowRate,
        canMake: have !== null && qty > 0 ? Math.floor(have / qty) : null,
      };
    });
  }, [recipe, ingredients]);

  const recipe$ = useMemo(() => {
    const savedBatch = recipeRows.reduce((s, r) => s + r.savedCost, 0);
    const liveBatch = recipeRows.reduce((s, r) => s + r.lineCost, 0);
    const known = recipeRows.filter((r) => r.canMake !== null);
    const minBatches = known.length === recipeRows.length && known.length > 0
      ? Math.min(...known.map((r) => r.canMake as number)) : null;
    const limiting = known.length ? known.reduce((a, b) => ((a.canMake as number) <= (b.canMake as number) ? a : b)) : null;
    return {
      savedBatch, liveBatch,
      savedPerUnit: savedBatch / recipeYield,
      livePerUnit: liveBatch / recipeYield,
      changePct: savedBatch > 0 ? ((liveBatch - savedBatch) / savedBatch) * 100 : 0,
      capacity: minBatches !== null ? minBatches * recipeYield : null,
      limiting,
    };
  }, [recipeRows, recipeYield]);

  const costMismatch = recipe.length > 0 && Math.abs(cost - recipe$.livePerUnit) > 1;

  /* ── Aur kis naap me bikti hai ── */
  const otherRates = useMemo(() => {
    if (!product || !profile) return [] as any[];
    const base = unit.toLowerCase();
    return extraUnitsFor(base)
      .map((k) => ({
        ...unitDef(k),
        price: Number((profile as any)[priceField[k]] || 0),
        rate: rateBetween(k, base, { weightGrams: profile.weightGrams, slices: profile.numberOfSlices }),
      }))
      .filter((x) => x.price > 0);
  }, [product, profile, unit]);

  /* ── Bikri ── */
  const soldLines = useMemo(() => {
    if (!id) return [] as any[];
    return (allSales as any[]).flatMap((s) =>
      (s.items ?? [])
        .filter((it: any) => (it.product?.id ?? it.productId) === id)
        .map((it: any) => ({ ...it, sale: s })));
  }, [allSales, id]);

  const salesForProduct = useMemo(() => (allSales as any[])
    .filter((s) => (s.items ?? []).some((it: any) => (it.product?.id ?? it.productId) === id))
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    .slice(0, 30), [allSales, id]);

  const sales$ = useMemo(() => {
    const totalSold = soldLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const revenue = soldLines.reduce((a, it) => a + Number(it.total || 0), 0);
    const cogs = soldLines.reduce((a, it) => a + Number(it.costPrice || 0) * Number(it.quantity || 0), 0);
    const orders = new Set(soldLines.map((it) => it.sale.id)).size;
    const cutoff = Date.now() - 30 * 86400000;
    const sold30 = soldLines
      .filter((it) => new Date(it.sale.soldAt).getTime() >= cutoff)
      .reduce((a, it) => a + Number(it.quantity || 0), 0);
    const perDay = sold30 / 30;
    const daysLeft = perDay > 0 ? Math.floor(stock / perDay) : null;

    /* Bana hua maal 30 din ka nahi rakhte — jitne din theek rehta hai
       (zyada se zyada 3 din) utna hi banao. Bahar ka maal 30 din ka. */
    const coverDays = isMade ? Math.max(1, Math.min(shelfDays ?? 1, 3)) : 30;
    const need = Math.ceil(perDay * coverDays) - stock;
    const suggested = Math.max(need, perDay === 0 && (isOut || isLow) ? Math.max(alertLevel * 2, 5) : 0);
    return { totalSold, revenue, profit: revenue - cogs, orders, sold30, perDay, daysLeft, coverDays, suggested };
  }, [soldLines, stock, isMade, shelfDays, isOut, isLow, alertLevel]);

  const chartData = useMemo(() => {
    const b: Record<string, { label: string; revenue: number; qty: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); setToDayStart(d, bdStart);
      b[d.toISOString().slice(0, 10)] = { label: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, qty: 0 };
    }
    for (const it of soldLines) {
      const k = new Date(it.sale.soldAt).toISOString().slice(0, 10);
      if (b[k]) { b[k].revenue += Number(it.total || 0); b[k].qty += Number(it.quantity || 0); }
    }
    return Object.values(b);
  }, [soldLines]);

  /* ── Taazgi ── */
  const liveBatches = useMemo(
    () => (freshLogs as FreshnessLog[])
      .filter((f) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0)
      .map((f) => ({ ...f, left: hoursLeft(f.expiryDate || f.bestBefore) }))
      .sort((a, b) => (a.left ?? Infinity) - (b.left ?? Infinity)),
    [freshLogs],
  );
  const expiredBatches = liveBatches.filter((f) => f.left !== null && f.left <= 0);
  const soonBatches = liveBatches.filter((f) => f.left !== null && f.left > 0 && f.left <= 12);
  const expiredQty = expiredBatches.reduce((s, f) => s + Number(f.currentQty || 0), 0);

  const waste = useMemo(() => {
    const L = freshLogs as FreshnessLog[];
    const made = L.reduce((s, f) => s + Number(f.initialQty || 0), 0);
    const sold = L.reduce((s, f) => s + Number(f.soldQty || 0), 0);
    const wasted = L.reduce((s, f) => s + Number(f.wastedQty || 0), 0);
    const discounted = L.reduce((s, f) => s + Number(f.discountedQty || 0), 0);
    return { made, sold, wasted, discounted, pct: made > 0 ? (wasted / made) * 100 : 0, value: wasted * cost };
  }, [freshLogs, cost]);

  const wasteChart = useMemo(() => ([
    { name: 'Bik gaya', value: waste.sold, color: '#10b981' },
    { name: 'Discount par', value: waste.discounted, color: '#f59e0b' },
    { name: 'Phinka', value: waste.wasted, color: '#ef4444' },
  ].filter((x) => x.value > 0)), [waste]);

  const recipeChart = useMemo(
    () => recipeRows
      .map((r) => ({ name: String(r.name).slice(0, 12), value: r.lineCost }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value),
    [recipeRows],
  );

  /* ── Log + milti julti ── */
  const movements: any[] = useMemo(() => {
    const raw: any = movementsRaw;
    const arr = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return arr.filter((m: any) => !m.productId || m.productId === id).slice(0, 40);
  }, [movementsRaw, id]);

  const related: any[] = useMemo(() => {
    const arr: any[] = (relatedRaw as any)?.items ?? [];
    return arr.filter((p) => p.id !== id && p.categoryId === product?.categoryId).slice(0, 6);
  }, [relatedRaw, id, product?.categoryId]);

  /* ── Unit calculator ── */
  const unitOptions = useMemo(() => {
    const base = { key: 'base', name: unit, emoji: unitDef(unit.toLowerCase())?.emoji ?? '📦', rate: 1, price };
    return [base, ...otherRates.map((r) => ({ key: r.key, name: r.label, emoji: r.emoji, rate: r.rate, price: r.price }))];
  }, [otherRates, unit, price]);
  const activeConv = unitOptions.find((u) => u.key === convFrom) ?? unitOptions[0];
  const convBaseQty = Number(convQty || 0) * (activeConv?.rate || 1);

  /* ── Recipe wali cost laga do ── */
  const applyCost = useMutation({
    mutationFn: () => productsApi.update(id!, { costPrice: Number(recipe$.livePerUnit.toFixed(2)) } as any),
    onSuccess: () => { toast.success(`Cost ${formatPKR(recipe$.livePerUnit)} kar di gayi`); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cost update nahi hui'),
  });

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showStock) return; // modal khud band karta hai
        if (showTeacher) setShowTeacher(false);
        return;
      }
      if (showStock) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && id) navigate(ROUTES.edit(id));
      else if (k === 's') setShowStock(true);
      else if (k === 'g') setShowTeacher(true);
      else if (k === 'p') window.print();
      else if (k >= '1' && k <= '6') setTab(TAB_KEYS[Number(k) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showStock, showTeacher, id, navigate]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-4 pb-10 animate-pulse">
        <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800 w-1/2" />
        <div className="rounded-3xl bg-slate-200 dark:bg-slate-800 h-72" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Cake className="h-16 w-16 text-slate-300" />
        <p className="font-black text-slate-700 dark:text-slate-200 text-lg">Ye cheez nahi mili</p>
        <Link to={ROUTES.list} className="text-pink-600 font-bold hover:underline">← Wapas list par</Link>
      </div>
    );
  }

  const gallery: any[] = product.images ?? [];
  const img = gallery[imgIndex]?.url ?? gallery[0]?.url;
  const flavor = FLAVORS.find((f) => f.value === profile?.defaultFlavor);
  const shape = SHAPES.find((s) => s.value === profile?.defaultShape);
  const cream = CREAMS.find((c) => c.value === profile?.defaultCreamType);
  const custom = (profile as any)?.ingredients?.custom ?? {};
  const decorations: string[] = (profile as any)?.ingredients?.decorations ?? [];
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });
  const shelfText = shelfDays ? `${shelfDays} din` : shelfHours ? `${shelfHours} ghante` : '—';

  const TABS: { id: Tab; label: string; icon: any; count?: number; dot?: boolean }[] = [
    { id: 'overview', label: 'Hisab', icon: BarChart3 },
    { id: 'recipe', label: 'Recipe', icon: Wheat, count: recipe.length || undefined, dot: costMismatch },
    { id: 'freshness', label: 'Taazgi', icon: Timer, count: liveBatches.length || undefined, dot: expiredBatches.length > 0 },
    { id: 'sales', label: 'Bikri', icon: Receipt, count: salesForProduct.length || undefined },
    { id: 'log', label: 'Stock log', icon: History, count: movements.length || undefined },
    { id: 'details', label: 'Tafseel', icon: Info },
  ];

  const warnings: string[] = [];
  if (cost <= 0) warnings.push('cost');
  if (isMade && noShelf) warnings.push('shelf');
  if (costMismatch) warnings.push('recipe');

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showStock && (
        <BakeryQuickStock
          product={product} stock={stock} isMade={isMade}
          shelfDays={shelfDays} fridge={!!profile?.requiresRefrigeration}
          hideCost={hideCost} onClose={() => setShowStock(false)} onSaved={invalidateAll}
        />
      )}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} isMade={isMade} name={product.name} />}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-pink-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🍰 {tenant?.name || 'Bakery'} — {product.name}</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}Stock {fmtQty(stock)} {unit} • Rate {formatPKRFull(price)}
              {!hideCost && ` • Cost ${formatPKRFull(cost)}`}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <button onClick={() => navigate(ROUTES.list)}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-pink-600 transition">
          <ArrowLeft className="h-4 w-4" /> Saara maal
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <TopBtn onClick={() => setShowTeacher(true)} tone="amber"><GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span></TopBtn>
          <TopBtn onClick={() => window.print()}><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span></TopBtn>
          <button onClick={() => setShowStock(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-sm transition active:scale-[0.97]">
            <Plus className="h-4 w-4" /> {isMade ? 'Maal bana' : 'Stock add'} <Kbd>S</Kbd>
          </button>
          <Link to={ROUTES.edit(product.id)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 dark:bg-pink-500/15 border-2 border-pink-200 dark:border-pink-500/40 hover:bg-pink-100 dark:hover:bg-pink-500/25 text-pink-700 dark:text-pink-300 text-sm font-extrabold transition">
            <Edit3 className="h-4 w-4" /> Edit <Kbd light>E</Kbd>
          </Link>
          <Link to={ROUTES.pos} className={topCls}><ShoppingCart className="h-4 w-4" /> POS</Link>
          <PrivacyToggle compact />
          <Link to={ROUTES.labels} state={{ productIds: [product.id] }} className={topCls}>
            <Barcode className="h-4 w-4" /> Label
          </Link>
          <ProductDeleteButton
            id={product.id} name={product.name} size="md"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-sm font-extrabold"
            onDeleted={() => { invalidateAll(); navigate(ROUTES.list); }}
          />
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white shadow-2xl print:shadow-none print:rounded-xl">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl pointer-events-none print:hidden" />

        <div className="relative grid lg:grid-cols-[260px_1fr] gap-6 p-4 sm:p-6">
          {/* Gallery */}
          <div className="space-y-2 print:hidden">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {img ? (
                <img src={img} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(product.name)}`}>
                  <span className="text-7xl drop-shadow">{productEmoji(product.name, product.category?.name)}</span>
                </div>
              )}
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                {product.isFeatured && (
                  <span className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </span>
                )}
                {profile?.requiresRefrigeration && (
                  <span className="px-2 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                    <Snowflake className="h-3 w-3" /> FRIDGE
                  </span>
                )}
              </div>
              {!product.isActive && (
                <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-center text-xs font-extrabold">BAND HAI</div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5">
                {gallery.slice(0, 5).map((im: any, i: number) => (
                  <button key={im.id ?? i} onClick={() => setImgIndex(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition ${imgIndex === i ? 'border-white' : 'border-white/20 opacity-70 hover:opacity-100'}`}>
                    <img src={im.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-black border border-white/25 uppercase tracking-widest">
                {isMade ? <ChefHat className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {isMade ? 'Khud banate hain' : 'Bahar se laya'}
              </span>
              {product.category && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black border border-white/25">{product.category.name}</span>
              )}
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black border border-white/20">{prettyCategory(derived)}</span>
            </div>

            <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight break-words">{product.name}</h1>
            {product.description && (
              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-white/80 line-clamp-2 max-w-2xl">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {product.sku && <Chip icon={Hash}>{product.sku}</Chip>}
              {product.barcode && <Chip icon={Barcode}>{product.barcode}</Chip>}
              {product.brand && <Chip icon={Tag} tone="violet">{product.brand.name}</Chip>}
              {product.isActive ? <Chip icon={CheckCircle2} tone="emerald">Active</Chip> : <Chip icon={XCircle} tone="rose">Band</Chip>}
            </div>

            {(product.tags ?? []).length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {(product.tags ?? []).map((row: any) => {
                  const t = row?.tag ?? row;
                  if (!t?.name) return null;
                  return (
                    <Link key={t.id} to={`${ROUTES.list}?tag=${t.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl border-2 border-white/25 bg-white/15 hover:bg-white/25 backdrop-blur transition text-white">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: t.color || '#f472b6' }} />
                      #{t.name}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Rate */}
            <div className="mt-5 flex items-end gap-5 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Bechne ka rate</div>
                <div className="text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1">
                  {formatPKRFull(price)} <span className="text-sm font-bold text-white/70">/ {unit}</span>
                </div>
              </div>
              {!hideCost && cost > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">{isMade ? 'Banane ki cost' : 'Cost'}</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">{formatPKRFull(cost)}</div>
                </div>
              )}
              {!hideCost && cost > 0 && (
                <div className={`rounded-xl px-3 py-2 backdrop-blur border ${profit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'}`}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Munafa / {unit}</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">
                    {formatPKRFull(profit)} <span className="text-xs opacity-80">({margin.toFixed(0)}%)</span>
                  </div>
                </div>
              )}
              {otherRates.slice(0, 2).map((r) => (
                <div key={r.key}>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">{r.emoji} Per {r.label}</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">{formatPKRFull(r.price)}</div>
                </div>
              ))}
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Abhi stock" value={fmtQty(stock)} sub={isOut ? 'Khatam' : isLow ? 'Kam ho gaya' : unit}
                tone={isOut ? 'rose' : isLow ? 'amber' : 'sky'} onClick={() => setShowStock(true)} />
              <HeroStat icon={DollarSign} label="Stock ki qeemat" value={formatPKR(stock * price)}
                sub={hideCost ? '•••' : `lagat ${formatPKR(stock * cost)}`} tone="emerald" />
              <HeroStat icon={TrendingUp} label="Bika (30 din)" value={fmtQty(sales$.sold30)}
                sub={`roz ${sales$.perDay.toFixed(1)} ${unit}`} tone="violet" />
              <HeroStat icon={Timer} label="Kitni der theek" value={shelfText}
                sub={profile?.requiresRefrigeration ? 'Fridge me' : 'Aam jagah'} tone={isMade && noShelf ? 'amber' : 'pink'} />
            </div>

            <div className="mt-4 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center print:hidden">
              <Kbd>E</Kbd><span className="text-white/60">Edit</span>
              <span className="text-white/30 mx-1">•</span>
              <Kbd>S</Kbd><span className="text-white/60">Stock</span>
              <span className="text-white/30 mx-1">•</span>
              <Kbd>1</Kbd><span className="text-white/40">–</span><Kbd>6</Kbd><span className="text-white/60">Tabs</span>
              <span className="text-white/30 mx-1">•</span>
              <Kbd>G</Kbd><span className="text-white/60">Guide</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ALERTS ═══ */}
      {(isOut || isLow || sales$.suggested > 0 || expiredBatches.length > 0 || soonBatches.length > 0) && (
        <section className="grid md:grid-cols-2 gap-3 print:hidden">
          {(isOut || isLow) && (
            <AlertCard tone={isOut ? 'rose' : 'amber'} icon={isOut ? PackageX : AlertTriangle}
              title={isOut ? 'Counter par kuch nahi bacha' : `Sirf ${fmtQty(stock)} ${unit} bache hain`}
              body={sales$.daysLeft !== null
                ? `Roz ka average ${sales$.perDay.toFixed(1)} ${unit} — takreeban ${sales$.daysLeft} din chalega.`
                : `Low stock alert level: ${alertLevel} ${unit}`}
              action={{ label: isMade ? 'Maal bana — stock daalo' : 'Stock add karo', onClick: () => setShowStock(true) }} />
          )}
          {sales$.suggested > 0 && (
            <AlertCard tone="sky" icon={isMade ? ChefHat : RotateCcw}
              title={isMade ? `Banao: ${sales$.suggested} ${unit}` : `Mangwao: ${sales$.suggested} ${unit}`}
              body={isMade
                ? `Pichle 30 din me ${fmtQty(sales$.sold30)} ${unit} bika. ${sales$.coverDays} din ki bikri ke liye itna kaafi hai — zyada banaya to phinkna parega.${recipe$.capacity !== null ? ` Gudaam ke saamaan se ${recipe$.capacity} ban sakte hain.` : ''}`
                : `1 mahine ka stock rakhne ke liye itna mangwao${hideCost ? '.' : ` (takreeban ${formatPKR(sales$.suggested * cost)}).`}`}
              action={isMade
                ? { label: 'Recipe dekho', onClick: () => setTab('recipe') }
                : { label: 'Purchase banao', to: ROUTES.purchases }} />
          )}
          {expiredBatches.length > 0 && (
            <AlertCard tone="rose" icon={Flame}
              title={`${expiredBatches.length} batch kharab ho chuke (${fmtQty(expiredQty)} ${unit})`}
              body="Ye counter se hata dein — kharab maal bik gaya to customer wapas nahi aayega."
              action={{ label: 'Taazgi dekho', onClick: () => setTab('freshness') }} />
          )}
          {soonBatches.length > 0 && (
            <AlertCard tone="amber" icon={Clock}
              title={`${soonBatches.length} batch 12 ghante me kharab honge`}
              body="Discount laga kar jaldi bech dein — phinkne se aadha paisa behtar hai."
              action={{ label: 'Taazgi dekho', onClick: () => setTab('freshness') }} />
          )}
        </section>
      )}

      {/* ═══ WARNINGS ═══ */}
      {warnings.length > 0 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5 print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye theek kar lein</h3>
          </div>
          {warnings.includes('cost') && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>Cost bhari hi nahi.</strong> Munafa poora rate dikh raha hai, jo sach nahi — har report ghalat jayegi.
              {recipe.length > 0 && ' Recipe se cost nikal kar laga sakte hain (Recipe tab).'}
            </p>
          )}
          {warnings.includes('shelf') && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>"Kitni der theek rehti hai" likha nahi.</strong> Expiry ki warning kabhi nahi aayegi.
            </p>
          )}
          {warnings.includes('recipe') && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>Cost aur recipe me farq hai.</strong>{' '}
              {hideCost ? 'Saamaan ke rate badal gaye hain.' : <>Likhi hui {formatPKR(cost)}, aaj ke rate se {formatPKR(recipe$.livePerUnit)} banti hai.</>}
              {' '}<button onClick={() => setTab('recipe')} className="underline font-black">Recipe dekho</button>
            </p>
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <section className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-2 overflow-x-auto print:hidden">
        <div className="flex gap-1.5 min-w-max">
          {TABS.map((t, i) => {
            const on = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative px-4 py-2.5 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ${
                  on ? 'bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                <Icon className="h-4 w-4" /> {t.label}
                {t.count !== undefined && (
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold tabular-nums ${on ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>{t.count}</span>
                )}
                {t.dot && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                <span className={`hidden lg:inline text-[9px] font-mono font-bold ${on ? 'text-white/60' : 'text-slate-400'}`}>{i + 1}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ 1. HISAB ═══ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="Ek par munafa" value={money(profit)} sub={hideCost ? undefined : `${margin.toFixed(1)}%`} tone={profit > 0 ? 'emerald' : 'rose'} />
            <Stat icon={Receipt} label="Kul bikri" value={formatPKR(sales$.revenue)}
              sub={`${fmtQty(sales$.totalSold)} ${unit} • ${sales$.orders} orders`} tone="pink" />
            <Stat icon={TrendingUp} label="Kul munafa" value={money(sales$.profit)} sub="Bikri me se lagat nikal kar" tone="violet" />
            <Stat icon={Flame} label="Phinka hua" value={`${waste.pct.toFixed(1)}%`}
              sub={waste.value > 0 ? (hideCost ? 'Nuqsaan hua' : `${formatPKR(waste.value)} ka nuqsaan`) : 'Abhi tak kuch nahi'}
              tone={waste.pct > 10 ? 'rose' : 'emerald'} />
          </section>

          {/* 30 din */}
          <section className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <PanelHead icon={BarChart3} tone="emerald" title="Pichle 30 din ki bikri"
              desc={`${fmtQty(sales$.sold30)} ${unit} bika • roz ka average ${sales$.perDay.toFixed(1)} ${unit}`} />
            {chartData.some((d) => d.revenue > 0) ? (
              <div className="h-[240px] mt-4 print:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} strokeOpacity={0.4} />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={10} interval={4} />
                    <YAxis stroke={AXIS} fontSize={10} width={45} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                    <Tooltip contentStyle={TOOLTIP}
                      formatter={(v: any, n: any) => (n === 'Bikri' ? [formatPKR(Number(v)), n] : [v, n])} />
                    <Area type="monotone" dataKey="revenue" name="Bikri" stroke="#ec4899" strokeWidth={2.5} fill="url(#bkGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center gap-2">
                <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">Pichle 30 din me koi bikri nahi</p>
              </div>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Calculator} title="Ek cheez par paisa kahan jata hai">
              {hideCost ? (
                <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
              ) : (
                <div className="space-y-2.5 pt-2">
                  <Bar2 label="Bechne ka rate" value={price} max={price} tone="emerald" />
                  <Bar2 label="Banane ki cost" value={cost} max={price} tone="rose" />
                  <Bar2 label="Bachta hai" value={Math.max(profit, 0)} max={price} tone="pink" />
                  {recipe.length > 0 && (
                    <Bar2 label="Recipe se (aaj ke rate)" value={recipe$.livePerUnit} max={price} tone="violet" />
                  )}
                  {cost <= 0 && <p className="text-[11px] font-bold text-amber-600 pt-1">Cost bhare bagair ye hisab sirf andaza hai.</p>}
                </div>
              )}
            </ChartCard>

            <ChartCard icon={Flame} title="Bana hua maal kahan gaya">
              {wasteChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {wasteChart.map((x, i) => <Cell key={i} fill={x.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox text="Abhi is cheez ka koi batch record nahi hua" />}
            </ChartCard>
          </div>

          {/* Unit calculator */}
          <section className="rounded-3xl bg-gradient-to-br from-pink-50 to-white dark:from-pink-500/10 dark:to-slate-900/80 border-2 border-pink-200 dark:border-pink-500/30 shadow-sm p-5 space-y-4 print:hidden">
            <PanelHead icon={ArrowRightLeft} tone="pink" title="Naap ka calculator" desc={'"3 slice kitne ke?" — aur stock se kitna ghatega'} />
            <div className="grid sm:grid-cols-[120px_1fr] gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1">Kitne</label>
                <input type="number" min={0} step="any" value={convQty}
                  onChange={(e) => setConvQty(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="h-12 w-full rounded-xl border-2 border-pink-300 dark:border-pink-500/40 bg-white dark:bg-slate-800 px-3 text-center text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-pink-600 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1">Naap</label>
                <div className="flex flex-wrap gap-1.5">
                  {unitOptions.map((u) => (
                    <button key={u.key} onClick={() => setConvFrom(u.key)}
                      className={`px-3 h-12 rounded-xl border-2 text-sm font-extrabold capitalize transition ${
                        activeConv?.key === u.key ? 'border-pink-600 bg-pink-600 text-white shadow-md'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-pink-400'
                      }`}>
                      {u.emoji} {u.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 p-4 grid sm:grid-cols-3 gap-3">
              <ConvCell label="Stock se ghatega" value={`${fmtQty(convBaseQty)} ${unit}`} tone="pink" />
              <ConvCell label="Kitne paise banenge" value={formatPKRFull(Number(convQty || 0) * (activeConv?.price || 0))} tone="emerald" />
              <ConvCell label="Phir bachega" value={`${fmtQty(Math.max(stock - convBaseQty, 0))} ${unit}`} tone={convBaseQty > stock ? 'rose' : 'slate'} />
            </div>
            {convBaseQty > stock && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Itna stock nahi — sirf {fmtQty(stock)} {unit} hai
              </div>
            )}
            {otherRates.length === 0 && (
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Abhi sirf ek naap ({unit}) me bikti hai. Slice, pound ya dozen ka rate{' '}
                <Link to={ROUTES.edit(product.id)} className="text-pink-600 underline">Edit</Link> me daal dein — yahan khud aa jayega.
              </p>
            )}
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
                <PanelHead icon={Sparkles} tone="violet" title="Isi category ki cheezein" desc={product.category?.name ?? ''} />
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {related.map((r) => (
                  <Link key={r.id} to={ROUTES.detail(r.id)}
                    className="group rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-pink-400 hover:shadow-md overflow-hidden transition bg-white dark:bg-slate-800/60">
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {r.images?.[0]?.url ? (
                        <img src={r.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(r.name)}`}>
                          <span className="text-3xl">{productEmoji(r.name, r.category?.name)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[1.8rem]">{r.name}</div>
                      <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">{formatPKR(r.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ 2. RECIPE ═══ */}
      {tab === 'recipe' && (
        <div className="space-y-4">
          {recipe.length === 0 ? (
            <EmptyState icon={Wheat} title="Recipe bhari hi nahi"
              sub={isMade
                ? 'Is me kya kya lagta hai — wo likh dein to cost khud nikal aayegi, maida mehnga hote hi pata chal jayega, aur gudaam ke saamaan se kitne ban sakte hain wo bhi.'
                : 'Ye bahar se laya hua maal hai, is ki recipe nahi hoti.'}
              action={isMade ? { to: ROUTES.edit(product.id), label: 'Recipe bharein' } : undefined} />
          ) : (
            <>
              <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat icon={Layers} label="Ek batch me" value={`${recipeYield} ${unit}`} sub={`${recipe.length} saamaan lagta hai`} tone="violet" />
                <Stat icon={Calculator} label="Batch — aaj ke rate se" value={money(recipe$.liveBatch)}
                  sub={hideCost ? undefined : Math.abs(recipe$.changePct) >= 1
                    ? `${recipe$.changePct > 0 ? '▲' : '▼'} ${Math.abs(recipe$.changePct).toFixed(1)}% save karte waqt se`
                    : 'Rate wahi hain jo save karte waqt thay'}
                  tone={recipe$.changePct > 5 ? 'rose' : 'pink'} />
                <Stat icon={DollarSign} label="Ek cheez ka kharcha" value={money(recipe$.livePerUnit)}
                  sub={hideCost ? undefined : cost > 0 ? `Form me ${formatPKR(cost)} likhi hai` : 'Form me cost khali hai'}
                  tone={costMismatch ? 'amber' : 'emerald'} />
                <Stat icon={ChefHat} label="Abhi kitne ban sakte hain"
                  value={recipe$.capacity !== null ? `${recipe$.capacity} ${unit}` : '—'}
                  sub={recipe$.limiting ? `${recipe$.limiting.name} pehle khatam hoga` : 'Kuch saamaan gudaam me nahi mila'}
                  tone={recipe$.capacity === 0 ? 'rose' : 'emerald'} />
              </section>

              {costMismatch && !hideCost && (
                <section className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-center gap-3 flex-wrap">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="flex-1 min-w-[200px] text-[12px] font-bold text-amber-900 dark:text-amber-200">
                    Likhi hui cost <strong>{formatPKR(cost)}</strong> hai, aaj ke rate se <strong>{formatPKR(recipe$.livePerUnit)}</strong> banti hai.
                    {recipe$.livePerUnit > price && <> <span className="text-rose-600">Ye rate {formatPKR(price)} se bhi zyada hai — har cheez par nuqsaan!</span></>}
                  </p>
                  <button onClick={() => applyCost.mutate()} disabled={applyCost.isPending}
                    className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
                    <Calculator className="h-4 w-4" /> Ye cost laga do
                  </button>
                </section>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-violet-600" />
                    <h3 className="font-black text-slate-900 dark:text-white">Kya kya lagta hai</h3>
                    <Link to={ROUTES.ingredients} className="ml-auto text-xs font-black text-violet-600 print:hidden">Gudaam →</Link>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recipeRows.map((r, i) => {
                      const share = recipe$.liveBatch > 0 ? (r.lineCost / recipe$.liveBatch) * 100 : 0;
                      const up = r.nowRate > r.savedRate + 0.009;
                      const down = r.nowRate < r.savedRate - 0.009;
                      const short = r.have !== null && r.have < r.qty;
                      return (
                        <div key={i} className="p-3 flex items-center gap-3">
                          <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${short || r.missing ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-violet-100 dark:bg-violet-500/20'}`}>
                            <Wheat className={`h-4 w-4 ${short || r.missing ? 'text-rose-600' : 'text-violet-600 dark:text-violet-400'}`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              {r.name}
                              {!hideCost && up && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">▲ Mehnga</span>}
                              {!hideCost && down && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">▼ Sasta</span>}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                              {fmtQty(r.qty)} {r.unit}{!hideCost && <> × {formatPKR(r.nowRate)}</>}
                              {!hideCost && (up || down) && <span className="line-through ml-1">{formatPKR(r.savedRate)}</span>}
                            </div>
                            <div className={`text-[10px] font-black ${r.missing ? 'text-rose-600' : short ? 'text-rose-600' : 'text-slate-400'}`}>
                              {r.missing ? 'Ye saamaan gudaam se hat chuka hai'
                                : `Gudaam me ${fmtQty(r.have ?? 0)} ${r.unit}${short ? ' — ek batch ke liye kam hai' : ''}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-sm text-slate-900 dark:text-white tabular-nums">{money(r.lineCost)}</div>
                            <div className="text-[10px] font-bold text-slate-400">{share.toFixed(0)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <ChartCard icon={BarChart3} title="Kharcha kis saamaan par">
                  {hideCost ? <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
                    : recipeChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={recipeChart} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                          <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                          <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={80} />
                          <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Kharcha']} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {recipeChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyBox text="Kharcha nahi nikala ja saka" />}
                </ChartCard>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ 3. TAAZGI ═══ */}
      {tab === 'freshness' && (
        <div className="space-y-4">
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={ChefHat} label="Kul bana" value={fmtQty(waste.made)} tone="violet" />
            <Stat icon={CheckCircle2} label="Bik gaya" value={fmtQty(waste.sold)} tone="emerald" />
            <Stat icon={Tag} label="Discount par gaya" value={fmtQty(waste.discounted)} tone="amber" />
            <Stat icon={Flame} label="Phinka" value={fmtQty(waste.wasted)}
              sub={waste.value > 0 ? money(waste.value) : undefined} tone={waste.wasted > 0 ? 'rose' : 'emerald'} />
          </section>

          {liveBatches.length === 0 ? (
            <EmptyState icon={Timer} title="Abhi koi batch nahi"
              sub="Jab is cheez ka batch banega, yahan nazar aayega ke kab tak theek hai aur kitna bacha hua hai." />
          ) : (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 dark:text-white">Jo abhi para hai — pehle kharab hone wala upar</h3>
                <Link to={ROUTES.freshness} className="ml-auto text-xs font-black text-emerald-600 print:hidden">Poora safha →</Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {liveBatches.map((f) => {
                  const gone = f.left !== null && f.left <= 0;
                  const soon = f.left !== null && f.left > 0 && f.left <= 12;
                  const pct = Number(f.initialQty) > 0 ? (Number(f.currentQty) / Number(f.initialQty)) * 100 : 0;
                  return (
                    <div key={f.id} className={`p-3 flex items-center gap-3 ${gone ? 'bg-rose-50/60 dark:bg-rose-500/10' : ''}`}>
                      <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        gone ? 'bg-rose-100 dark:bg-rose-500/20' : soon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'
                      }`}>
                        <Clock className={`h-4 w-4 ${gone ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">{f.batchNumber ? `Batch ${f.batchNumber}` : 'Batch'}</div>
                        <div className={`text-[11px] font-black ${gone ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500'}`}>
                          {f.left !== null ? hoursPhrase(f.left) : 'Expiry likhi nahi'}
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[200px]">
                          <div className={`h-full rounded-full ${gone ? 'bg-rose-500' : soon ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{fmtQty(Number(f.currentQty))}</div>
                        <div className="text-[10px] font-bold text-slate-400">{fmtQty(Number(f.initialQty))} me se</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ 4. BIKRI ═══ */}
      {tab === 'sales' && (
        <Panel icon={Receipt} tone="emerald" title="Bikri ki history"
          desc={`${salesForProduct.length} haal ki receipts • kul ${fmtQty(sales$.totalSold)} ${unit} bika`}
          empty={salesForProduct.length === 0} emptyText="Abhi tak koi bikri nahi hui">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
            {salesForProduct.map((s: any) => {
              const lines = (s.items ?? []).filter((it: any) => (it.product?.id ?? it.productId) === id);
              const qty = lines.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
              const rev = lines.reduce((a: number, it: any) => a + Number(it.total || 0), 0);
              return (
                <Link key={s.id} to={ROUTES.receipt(s.id)} className="block px-5 py-3 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">{s.saleNumber}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                          {new Date(s.soldAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {Number(s.creditAmount) > 0 && <Pill tone="amber">Udhaar</Pill>}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {fmtQty(qty)} {unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKRFull(rev)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">kul {formatPKR(s.total)}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ═══ 5. STOCK LOG ═══ */}
      {tab === 'log' && (
        <Panel icon={History} tone="slate" title="Stock ka aana jana" desc={`${movements.length} entries`}
          empty={movements.length === 0} emptyText="Koi stock movement record nahi mila">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
            {movements.map((m: any, i: number) => {
              const qty = Number(m.quantity ?? m.qty ?? 0);
              const type = String(m.type || '');
              const isIn = qty > 0 || type.includes('IN') || type.includes('PURCHASE') || type.includes('PRODUCTION');
              return (
                <div key={m.id ?? i} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isIn ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}>
                    {isIn ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">{(type || 'MOVEMENT').replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                      {m.note || m.reason || m.reference || '—'}
                      {m.createdAt && ` • ${new Date(m.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </div>
                  </div>
                  <div className={`font-extrabold tabular-nums shrink-0 ${isIn ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {isIn && qty > 0 ? '+' : ''}{fmtQty(qty)} <span className="text-[10px] font-bold text-slate-500">{unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ═══ 6. TAFSEEL ═══ */}
      {tab === 'details' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <InfoCard icon={Package} title="Basic">
            <Row label="Naam" value={product.name} />
            <Row label="Category" value={product.category?.name ?? '—'} />
            <Row label="System ne samjha" value={prettyCategory(derived)} />
            <Row label="Type" value={isMade ? 'Khud banate hain' : 'Bahar se laya'} />
            <Row label="SKU" value={product.sku ?? '—'} />
            <Row label="Barcode" value={product.barcode ?? '—'} />
            <Row label="Unit" value={unit} />
            <Row label="Brand" value={product.brand?.name ?? '—'} />
            <Row label="Low stock alert" value={`${alertLevel} ${unit}`} />
            <Row label="Chal rahi hai" value={product.isActive ? 'Haan' : 'Nahi'} />
          </InfoCard>

          <InfoCard icon={DollarSign} title="Paisa">
            <Row label={`Bechne ka rate (per ${unit})`} value={formatPKR(price)} />
            <Row label="Cost" value={hideCost ? '••••' : cost > 0 ? formatPKR(cost) : 'Bhari nahi'} warn={!hideCost && cost <= 0} />
            <Row label="Ek par munafa" value={money(profit)} />
            <Row label="Munafa %" value={hideCost ? '••••' : `${margin.toFixed(1)}%`} />
            {recipe.length > 0 && <Row label="Recipe se cost (aaj)" value={money(recipe$.livePerUnit)} warn={costMismatch && !hideCost} />}
            <Row label="Tax" value={`${product.taxRate ?? 0}%`} />
          </InfoCard>

          {otherRates.length > 0 && (
            <InfoCard icon={Scale} title="Aur kis tarah bikti hai">
              {otherRates.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{r.emoji} Per {r.label}</span>
                  <span className="min-w-0 text-right">
                    <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(r.price)}</span>
                    <span className="block text-[10px] font-bold text-slate-400 tabular-nums">stock se {r.rate.toFixed(r.rate < 1 ? 3 : 2)} {unit}</span>
                  </span>
                </div>
              ))}
            </InfoCard>
          )}

          <InfoCard icon={Timer} title="Taazgi aur banana">
            <Row label="Kitni der theek" value={shelfText === '—' ? 'Likha nahi' : shelfText} warn={noShelf} />
            <Row label="Fridge chahiye" value={profile?.requiresRefrigeration ? 'Haan' : 'Nahi'} />
            <Row label="Banane me lagta hai" value={profile?.prepTimeHours ? `${profile.prepTimeHours} ghante` : '—'} />
            <Row label="Pehle se order" value={profile?.advanceOrderHours ? `${profile.advanceOrderHours} ghante` : '—'} />
            <Row label="Kam se kam order" value={String(profile?.minOrderQty ?? 1)} />
            {profile?.maxOrderQty ? <Row label="Zyada se zyada order" value={String(profile.maxOrderQty)} /> : null}
          </InfoCard>

          <InfoCard icon={Info} title="Is me kya hai">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {profile?.containsEgg && <Pill tone="amber">🥚 Anda</Pill>}
              {profile?.containsDairy && <Pill tone="amber">🥛 Doodh</Pill>}
              {profile?.containsNuts && <Pill tone="rose">🥜 Nuts</Pill>}
              {profile?.containsGluten && <Pill tone="amber">🌾 Gluten</Pill>}
              {profile?.isEggless && <Pill tone="emerald">Egg-free</Pill>}
              {profile?.isVegan && <Pill tone="emerald">Vegan</Pill>}
              {profile?.isSugarFree && <Pill tone="emerald">Sugar-free</Pill>}
              {profile?.isHalal && <Pill tone="emerald">Halal</Pill>}
            </div>
            {(profile?.allergens ?? []).length > 0 && <Row label="Allergens" value={(profile!.allergens as string[]).join(', ')} warn />}
            {profile?.caloriesPerServing ? <Row label="Calories / serving" value={String(profile.caloriesPerServing)} /> : null}
            {profile?.ingredientList && <Row label="Ingredients" value={profile.ingredientList} />}
            {profile?.servingSuggestions && <Row label="Kaise pesh karein" value={profile.servingSuggestions} />}
          </InfoCard>

          {isCakeLike(derived) && profile && (
            <InfoCard icon={Cake} title="Cake ki baat">
              <Row label="Flavour" value={custom.flavor || (flavor ? `${flavor.emoji} ${flavor.label}` : '—')} />
              <Row label="Shape" value={custom.shape || (shape ? `${shape.emoji} ${shape.label}` : '—')} />
              <Row label="Cream" value={custom.cream || (cream ? cream.label : '—')} />
              {profile.numberOfSlices ? <Row label="Slice" value={String(profile.numberOfSlices)} /> : null}
              {profile.weightGrams ? <Row label="Wazan" value={`${profile.weightGrams} g`} /> : null}
              <Row label="Customer marzi se bana sakta hai" value={profile.isCakeCustomizable ? 'Haan' : 'Nahi'} />
              <Row label="Cake par likhwa sakta hai" value={profile.allowsMessageOnCake ? 'Haan' : 'Nahi'} />
              <Row label="Photo laga sakta hai" value={profile.allowsPhotoOnCake ? 'Haan' : 'Nahi'} />
              {decorations.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {decorations.map((d) => <Pill key={d} tone="pink">{d}</Pill>)}
                </div>
              )}
            </InfoCard>
          )}

          {gallery.length > 0 && (
            <InfoCard icon={ImageIcon} title="Tasveerein">
              <div className="grid grid-cols-4 gap-2 pt-1">
                {gallery.map((im: any, i: number) => (
                  <button key={im.id ?? i} onClick={() => { setImgIndex(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${i === imgIndex ? 'border-pink-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          .max-h-\\[600px\\] { max-height: none !important; overflow: visible !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          [data-sonner-toaster] { display: none !important; }
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeUp 0.25s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .animate-in { animation: none; } }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QUICK STOCK — isi file me
   ➕ Bana / Aaya  •  ➖ Kam (kharab, toota)  •  ✍️ Ginti
   Enter = Save • Esc = Band
   ═════════════════════════════════════════════════════════════ */
type StockMode = 'add' | 'remove' | 'set';
const WEIGHED_UNITS = ['kg', 'pound', 'lb', 'gram', 'g', 'litre', 'ltr', 'l'];

function BakeryQuickStock({ product, stock, isMade, shelfDays, fridge, hideCost, onClose, onSaved }: {
  product: any; stock: number; isMade: boolean; shelfDays: number | null; fridge: boolean;
  hideCost: boolean; onClose: () => void; onSaved: () => void;
}) {
  const unit = product.unit || 'pcs';
  const weighed = WEIGHED_UNITS.includes(String(unit).toLowerCase());
  const chips = weighed ? [0.25, 0.5, 1, 2, 5, 10] : isMade ? [1, 6, 12, 24, 50] : [1, 5, 10, 12, 24, 50];
  const step = weighed ? 0.5 : 1;
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<StockMode>('add');
  const [qty, setQty] = useState<number | ''>('');
  const [setTo, setSetTo] = useState<number | ''>(stock);

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const finalStock = round(mode === 'add' ? stock + Number(qty || 0)
    : mode === 'remove' ? stock - Number(qty || 0) : Number(setTo || 0));
  const diff = round(finalStock - stock);
  const empty = mode === 'set' ? setTo === '' : qty === '';
  const canSave = !empty && diff !== 0 && finalStock >= 0;

  const mutation = useMutation({
    mutationFn: () => productsApi.update(product.id, { stock: finalStock } as any),
    onSuccess: () => {
      toast.success(`${product.name} — stock ${fmtQty(finalStock)} ${unit}`, {
        description: diff > 0 ? `+${fmtQty(diff)} ${unit} ${isMade ? 'bana' : 'aaya'}` : `${fmtQty(diff)} ${unit} kam hua`,
      });
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Stock update nahi hua'),
  });

  const switchMode = (m: StockMode) => { setMode(m); setQty(''); setTimeout(() => inputRef.current?.focus(), 50); };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Enter' && canSave && !mutation.isPending) { e.preventDefault(); mutation.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, mutation.isPending, finalStock]);

  const tone = mode === 'add'
    ? { field: 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 focus:border-emerald-600',
        btn: 'bg-emerald-600 hover:bg-emerald-700',
        chip: 'border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' }
    : { field: 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200 focus:border-rose-600',
        btn: 'bg-rose-600 hover:bg-rose-700',
        chip: 'border-rose-200 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-800 dark:text-rose-300' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Boxes className="h-3 w-3" /> Quick Stock • {isMade ? 'Khud banaya' : 'Bahar se'}
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{product.name}</h3>
            <div className="text-xs text-white/80 font-bold">Abhi stock: <strong>{fmtQty(stock)} {unit}</strong></div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ModeBtn active={mode === 'add'} onClick={() => switchMode('add')}
              activeCls="border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              title={isMade ? '➕ Bana' : '➕ Aaya'} sub="Add karo" />
            <ModeBtn active={mode === 'remove'} onClick={() => switchMode('remove')}
              activeCls="border-rose-600 bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300"
              title="➖ Kam" sub="Kharab / toota" />
            <ModeBtn active={mode === 'set'} onClick={() => switchMode('set')}
              activeCls="border-sky-600 bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300"
              title="✍️ Ginti" sub="Exact set" />
          </div>

          {mode !== 'set' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {mode === 'add' ? `Kitna ${isMade ? 'bana' : 'aaya'}? (${unit})` : `Kitna kam hua? (${unit})`}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(Math.max(0, round(Number(qty || 0) - step)))}
                  className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition">
                  <Minus className="h-5 w-5" />
                </button>
                <input ref={inputRef} autoFocus type="number" inputMode="decimal" step="any" min={0}
                  value={qty} placeholder="0"
                  onChange={(e) => setQty(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className={`h-14 flex-1 min-w-0 rounded-2xl border-2 px-4 text-center text-3xl font-extrabold tabular-nums focus:outline-none transition ${tone.field}`} />
                <button onClick={() => setQty(round(Number(qty || 0) + step))}
                  className={`h-14 w-14 rounded-2xl text-white flex items-center justify-center shrink-0 transition ${tone.btn}`}>
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} onClick={() => setQty(round(Number(qty || 0) + c))}
                    className={`px-3 py-1.5 rounded-xl border-2 bg-white dark:bg-slate-800 text-xs font-extrabold transition ${tone.chip}`}>+{c}</button>
                ))}
                {mode === 'remove' && stock > 0 && (
                  <button onClick={() => setQty(stock)}
                    className={`px-3 py-1.5 rounded-xl border-2 bg-white dark:bg-slate-800 text-xs font-extrabold transition ${tone.chip}`}>Sab ({fmtQty(stock)})</button>
                )}
                <button onClick={() => setQty('')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold transition">Clear</button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Counter par asal me kitna hai? ({unit})
              </label>
              <input ref={inputRef} autoFocus type="number" inputMode="decimal" step="any" min={0} value={setTo}
                onChange={(e) => setSetTo(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="h-14 w-full rounded-2xl border-2 border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-sky-900 dark:text-sky-200 focus:outline-none focus:border-sky-600 transition" />
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Naya stock</div>
              <div className={`text-2xl font-extrabold tabular-nums ${finalStock < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {fmtQty(finalStock)} <span className="text-sm font-bold text-slate-500">{unit}</span>
              </div>
            </div>
            {diff !== 0 && (
              <div className={`px-2.5 py-1 rounded-xl text-sm font-extrabold tabular-nums shrink-0 ${
                diff > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}>{diff > 0 ? '+' : ''}{fmtQty(diff)}</div>
            )}
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Bikri qeemat</div>
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {hideCost ? '••••' : formatPKRFull(Math.max(finalStock, 0) * Number(product.price || 0))}
              </div>
            </div>
          </div>

          {finalStock < 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Stock minus nahi ho sakta — abhi sirf {fmtQty(stock)} {unit} hai
            </div>
          )}
          {isMade && mode === 'add' && shelfDays != null && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-2.5 flex items-center gap-2 text-[11px] font-bold text-violet-900 dark:text-violet-200">
              <Timer className="h-4 w-4 shrink-0" /> Ye maal {shelfDays} din theek rahega{fridge ? ' — fridge me rakhein' : ''}.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSave}
            className="flex-1 bg-gradient-to-r from-pink-600 to-fuchsia-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> Stock save karo
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, activeCls, title, sub }: {
  active: boolean; onClick: () => void; activeCls: string; title: string; sub: string;
}) {
  return (
    <button onClick={onClick}
      className={`py-3 rounded-2xl border-2 font-extrabold text-xs sm:text-sm transition ${
        active ? activeCls : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
      }`}>
      {title}
      <div className="text-[10px] font-bold opacity-70">{sub}</div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
const topCls = 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-500/50 text-slate-700 dark:text-slate-200 text-sm font-extrabold transition';

function TopBtn({ children, onClick, tone }: any) {
  return (
    <button onClick={onClick}
      className={tone === 'amber'
        ? 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-300 dark:border-amber-500/40 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-sm font-extrabold transition'
        : topCls}>
      {children}
    </button>
  );
}

function Kbd({ children, light }: { children: any; light?: boolean }) {
  return (
    <kbd className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] shadow-sm ${
      light ? 'bg-pink-200/60 dark:bg-pink-500/30 border border-pink-300 dark:border-pink-500/40 text-pink-800 dark:text-pink-200'
        : 'bg-white/15 border border-white/25 text-white'
    }`}>{children}</kbd>
  );
}

function Chip({ icon: Icon, children, tone = 'default' }: any) {
  const tones: Record<string, string> = {
    default: 'bg-white/10',
    violet: 'bg-violet-500/30 border border-violet-300/40',
    emerald: 'bg-emerald-500/30 border border-emerald-300/40',
    rose: 'bg-rose-500/30 border border-rose-300/40',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur font-bold ${tones[tone]}`}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    sky: 'from-sky-400/30 to-sky-600/20 border-sky-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    rose: 'from-rose-400/40 to-rose-600/25 border-rose-300/50',
    pink: 'from-pink-400/30 to-fuchsia-600/20 border-pink-300/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3 text-left ${onClick ? 'hover:brightness-110 transition active:scale-[0.98]' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none break-words">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5">{sub}</div>}
    </Comp>
  );
}

function AlertCard({ tone, icon: Icon, title, body, action }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-50 to-white dark:from-rose-500/10 dark:to-slate-900/60 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200',
    amber: 'from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900/60 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200',
    sky: 'from-sky-50 to-white dark:from-sky-500/10 dark:to-slate-900/60 border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-200',
  };
  const btn: Record<string, string> = { rose: 'bg-rose-600 hover:bg-rose-700', amber: 'bg-amber-600 hover:bg-amber-700', sky: 'bg-sky-600 hover:bg-sky-700' };
  const cls = `mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-extrabold transition ${btn[tone]}`;
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 flex items-start gap-3 ${tones[tone]}`}>
      <div className={`h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md shrink-0 ${btn[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-sm">{title}</h3>
        <p className="text-xs font-semibold opacity-90 mt-0.5 leading-relaxed">{body}</p>
        {action && (action.to
          ? <Link to={action.to} className={cls}>{action.label} <ChevronRight className="h-3 w-3" /></Link>
          : <button onClick={action.onClick} className={cls}>{action.label} <ChevronRight className="h-3 w-3" /></button>)}
      </div>
    </div>
  );
}

const TONE_GRAD: Record<string, string> = {
  pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
  violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
  emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
  amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
  slate: 'from-slate-500 to-slate-700 shadow-slate-500/40',
};

function PanelHead({ icon: Icon, title, desc, tone }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${TONE_GRAD[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{title}</h3>
        {desc && <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{desc}</p>}
      </div>
    </div>
  );
}

function Panel({ icon, title, desc, tone, children, empty, emptyText }: any) {
  const Icon = icon;
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:rounded-xl">
      <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
        <PanelHead icon={icon} title={title} desc={desc} tone={tone} />
      </div>
      {empty ? (
        <div className="p-12 text-center">
          <Icon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700 dark:text-slate-300">{emptyText}</div>
        </div>
      ) : children}
    </section>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums break-words leading-tight">{value}</div>
          {sub && <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${TONE_GRAD[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-pink-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function Bar2({ label, value, max, tone }: any) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const tones: Record<string, string> = { emerald: 'bg-emerald-500', rose: 'bg-rose-500', pink: 'bg-pink-500', violet: 'bg-violet-500' };
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-black">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="text-slate-900 dark:text-white tabular-nums">{formatPKR(value)}</span>
      </div>
      <div className="mt-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${tones[tone]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConvCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'text-pink-700 dark:text-pink-400', emerald: 'text-emerald-700 dark:text-emerald-400',
    rose: 'text-rose-700 dark:text-rose-400', slate: 'text-slate-700 dark:text-slate-300',
  };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-xl font-extrabold tabular-nums mt-0.5 ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-pink-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value, warn }: any) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className={`text-[13px] font-extrabold text-right break-words ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    pink: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function EmptyState({ icon: Icon, title, sub, action }: any) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
      <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">{sub}</p>
      {action && (
        <Link to={action.to} className="mt-4 h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
          <Edit3 className="h-4 w-4" /> {action.label}
        </Link>
      )}
    </div>
  );
}

function Teacher({ onClose, isMade, name }: { onClose: () => void; isMade: boolean; name: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kya batata hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            <strong>"{name}"</strong> ki poori kahani — paisa, bikri, recipe aur taazgi ek jagah.
          </p>
          <Tip icon={BarChart3} title="1 · Hisab">Ek par munafa, 30 din ki bikri, phinka hua maal, aur naap ka calculator.</Tip>
          {isMade && (
            <Tip icon={Wheat} title="2 · Recipe">
              Kharcha <strong>aaj ke rate</strong> se nikalta hai. Maida mehnga hua to ▲ nishan aata hai, aur ek click
              se nayi cost laga sakte hain. Gudaam ke saamaan se abhi kitne ban sakte hain wo bhi.
            </Tip>
          )}
          <Tip icon={Timer} title="3 · Taazgi">Jo batch pehle kharab hoga wo upar. 12 ghante se kam baqi ho to warning.</Tip>
          <Tip icon={Receipt} title="4 · Bikri">Kab, kise, kitna bika — receipt par click kar ke khol lein.</Tip>
          <Tip icon={History} title="5 · Stock log">Maal kab aaya, kab gaya — poora record.</Tip>
          <Tip icon={Info} title="6 · Tafseel">Form me bhari har cheez — rate, anda/doodh, cake ki baat.</Tip>
          <Tip icon={isMade ? ChefHat : RotateCcw} title={isMade ? 'Kitna banana hai' : 'Kitna mangwana hai'}>
            {isMade
              ? 'Bikri aur taazgi se hisab — utna hi banao jitna shelf life me bik jaye, warna phinkna parega.'
              : 'Pichli bikri se 1 mahine ka hisab.'}
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-6</kbd> tab badlo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">S</kbd> stock</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">E</kbd> edit</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> ye madad</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">Esc</kbd> band</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
