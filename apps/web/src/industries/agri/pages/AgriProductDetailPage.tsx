import { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Wheat, Sprout, FlaskConical, Bug, Tractor, Leaf,
  ShieldAlert, ShieldCheck, AlertTriangle, Package, PackageX, DollarSign,
  CheckCircle2, XCircle, TrendingUp, BarChart3, Info, GraduationCap, X,
  Printer, Boxes, Star, Calculator, Tag, Layers, Clock, Scale, Plus, Minus,
  Save, Hash, Barcode, ShoppingCart, Receipt, History, ChevronRight,
  ArrowRightLeft, RotateCcw, Image as ImageIcon, Sparkles, Landmark,
  Calendar, Droplets, Beaker, ExternalLink, Timer,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productTint } from '@modules/inventory/products/lib/productEmoji';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { stockMovementsApi } from '@modules/inventory/stock-movements/api/stock-movements.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { agriProductsApi } from '../api/products.api';
import { useBusinessDayStart, setToDayStart, setToDayEnd } from '@core/lib/business-day';
import {
  agriUnitDef, agriUnitLabel, isMeasured, agriRate, agriExtraUnits,
  certStatus, SEASONS,
} from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, needsGovtReg,
  type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI — EK CHEEZ KI POORI KAHANI  (Bakery/Retail jaisa, poora)
   ─────────────────────────────────────────────────────────────
     🔒 Cost chhupao • ➕ Quick stock (S) — ISI file me
     🏷️ Label • 🛒 POS • 🗑️ Delete • 🖼️ Gallery • #Tags
     📈 30 din ki bikri • 🧮 Bori↔kilo calculator • 🧾 Sales • 📜 Stock log
     🔁 Kitna mangwana hai — bikri ke hisab se

   Aur agri ki apni teen cheezein:

     🛡️ REGISTRATION — meyaad khatam to bechna ghair-qanooni.
        Wo warning sab se ooper aati hai, kisi tab ke peeche nahi.

     🌾 KIS FASAL PAR — farmer ka pehla sawal. Fasal, keeray,
        mausam aur kitni miqdar — sab ek tab me.

     ☠️ ZEHREELAPAN — kitne din khet me na jayein, fasal kab
        kaat sakte hain, aur lag jaye to kya karein.
   ⌨️ E edit • S stock • 1-6 tabs • G guide • P print • Esc band
   ═════════════════════════════════════════════════════════════ */

const ROUTES = {
  list: '/agri/products',
  detail: (id: string) => `/agri-products/${id}`,
  edit: (id: string) => `/agri-products/${id}/edit`,
  labels: '/retail/barcode-labels',
  pos: '/pos',
  purchases: '/purchases',
  farmers: '/agri/farmers',
  receipt: (id: string) => `/sales/${id}/receipt`,
};

type Tab = 'overview' | 'usage' | 'safety' | 'sales' | 'log' | 'details';
const TAB_KEYS: Tab[] = ['overview', 'usage', 'safety', 'sales', 'log', 'details'];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const TOX: Record<string, { l: string; e: string; hint: string; tone: string }> = {
  GREEN: { l: 'Halka (green)', e: '🟢', hint: 'Aam ehtiyat kaafi hai', tone: 'emerald' },
  BLUE: { l: 'Darmiyana (blue)', e: '🔵', hint: 'Dastane aur mask pehnein', tone: 'sky' },
  YELLOW: { l: 'Zehreela (yellow)', e: '🟡', hint: 'Poora PPE zaroori hai', tone: 'amber' },
  RED: { l: 'Bohat zehreela (red)', e: '🔴', hint: 'Sirf tajurba-kaar chhirke', tone: 'rose' },
};

export default function AgriProductDetailPage() {
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
    queryKey: ['agri-profile-by-product', id],
    queryFn: () => agriProductsApi.byProduct(id!).catch(() => null),
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
    queryKey: ['agri-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
    enabled: !!product?.categoryId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['product', id] });
    qc.invalidateQueries({ queryKey: ['agri-all-products'] });
    qc.invalidateQueries({ queryKey: ['agri-profiles-all'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['stock-movements-for-product', id] });
    forceRefreshProducts().catch(() => {});
  };

  /* ── Bunyadi hisab ──
     Qism profile me likhi hai to wohi, warna category ke naam se
     nikaali hui. Purane products jin ka profile hi nahi — un par
     bhi safha theek chalta hai. */
  const kind: AgriKind = useMemo(
    () => (profile?.category as AgriKind) ?? deriveAgriKind(product?.category?.name, product?.name),
    [profile, product],
  );
  const isSeed = isSeedKind(kind);
  const isFert = isFertKind(kind);
  const isSpray = isSprayKind(kind);
  const isFeed = isFeedKind(kind);
  const isTool = isToolKind(kind);
  const wantsReg = needsGovtReg(kind);

  const unit = product?.unit || 'bag';
  const unitName = agriUnitLabel(unit);
  const stock = Number(product?.shopStock ?? product?.stock ?? 0);
  const cost = Number(product?.costPrice ?? 0);
  const price = Number(product?.price ?? 0);
  const alertLevel = Number(profile?.minStockAlert ?? profile?.reorderLevel ?? product?.lowStockAlert ?? 5);
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= alertLevel;
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  /* Thok rate Product ka apna column hai — agri profile me nahi. */
  const wholesale = Number((product as any)?.wholesalePrice ?? 0);
  const packSize = profile?.packSize ? Number(profile.packSize) : 0;
  const packUnit = profile?.packUnit ?? 'kg';
  const hasPack = packSize > 0 && !isMeasured(unit);
  const cert = certStatus(profile?.govtRegExpiry);
  const seasonDef = SEASONS.find((s) => s.v === profile?.season);
  const tox = profile?.toxicityLevel ? TOX[profile.toxicityLevel] : null;

  /* ── Aur kis naap me bikti hai ── */
  const otherRates = useMemo(() => {
    if (!product) return [] as any[];
    return agriExtraUnits(unit)
      .map((k) => ({
        ...agriUnitDef(k),
        rate: agriRate(k, unit, { packSize: packSize || undefined, packUnit }),
      }))
      .filter((x) => x.rate > 0);
  }, [product, unit, packSize, packUnit]);

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

    /* Agri me maal season par bikta hai — 45 din ka stock rakhna
       theek hai. Bakery ki tarah do din ka nahi. */
    const coverDays = 45;
    const need = Math.ceil(perDay * coverDays) - stock;
    const suggested = Math.max(need, perDay === 0 && (isOut || isLow) ? Math.max(alertLevel * 2, 5) : 0);
    return { totalSold, revenue, profit: revenue - cogs, orders, sold30, perDay, daysLeft, coverDays, suggested };
  }, [soldLines, stock, isOut, isLow, alertLevel]);

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

  /** Kaunsa farmer ye cheez sab se zyada leta hai */
  const topBuyers = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; amount: number }>();
    soldLines.forEach((it) => {
      const c = it.sale.customer;
      const key = c?.id ?? 'walkin';
      const e = m.get(key) ?? { name: c?.name ?? 'Walk-in', qty: 0, amount: 0 };
      e.qty += Number(it.quantity || 0);
      e.amount += Number(it.total || 0);
      m.set(key, e);
    });
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [soldLines]);

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

  /* ── Bori ↔ kilo calculator ── */
  const unitOptions = useMemo(() => {
    const base = { key: 'base', name: unitName, emoji: agriUnitDef(unit)?.emoji ?? '📦', rate: 1, price };
    return [base, ...otherRates.map((r) => ({
      key: r.key, name: r.label, emoji: r.emoji, rate: r.rate,
      /* Doosre naap ka rate base rate se nikalta hai — alag se
         bhara nahi jata, warna dono me farq reh jata hai. */
      price: price * r.rate,
    }))];
  }, [otherRates, unit, unitName, price]);
  const activeConv = unitOptions.find((u) => u.key === convFrom) ?? unitOptions[0];
  const convBaseQty = Number(convQty || 0) * (activeConv?.rate || 1);

  /* ── Registration ki tareekh aaj se ek saal aage ── */
  const renewReg = useMutation({
    mutationFn: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return agriProductsApi.upsert({
        productId: id!,
        category: kind as any,
        govtRegExpiry: d.toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      toast.success('Registration ek saal aage kar di — number Edit me theek kar lein');
      qc.invalidateQueries({ queryKey: ['agri-profile-by-product', id] });
      qc.invalidateQueries({ queryKey: ['agri-profiles-all'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update nahi hui'),
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
        <Wheat className="h-16 w-16 text-slate-300" />
        <p className="font-black text-slate-700 dark:text-slate-200 text-lg">Ye cheez nahi mili</p>
        <Link to={ROUTES.list} className="text-emerald-600 font-bold hover:underline">← Wapas list par</Link>
      </div>
    );
  }

  /* Tasveerein product par hain; profile wali sirf tab jab product
     par koi na ho (purane agri products aise hi bane thay). */
  const gallery: any[] = (product.images ?? []).length
    ? (product.images as any[])
    : (profile?.imageUrls ?? []).map((url: string, i: number) => ({ id: `p${i}`, url }));
  const img = gallery[imgIndex]?.url ?? gallery[0]?.url;
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  const crops = profile?.targetCrops ?? [];
  const pests = profile?.targetPests ?? [];
  const animals = profile?.targetAnimals ?? [];

  const TABS: { id: Tab; label: string; icon: any; count?: number; dot?: boolean }[] = [
    { id: 'overview', label: 'Hisab', icon: BarChart3 },
    { id: 'usage', label: 'Istemal', icon: Leaf, count: (crops.length + pests.length + animals.length) || undefined },
    { id: 'safety', label: 'Safety', icon: ShieldAlert, dot: cert.state === 'expired' || cert.state === 'soon' },
    { id: 'sales', label: 'Bikri', icon: Receipt, count: salesForProduct.length || undefined },
    { id: 'log', label: 'Stock log', icon: History, count: movements.length || undefined },
    { id: 'details', label: 'Tafseel', icon: Info },
  ];

  const warnings: string[] = [];
  if (cost <= 0) warnings.push('cost');
  if (wantsReg && cert.state === 'none') warnings.push('nocert');
  if (!hasPack && !isMeasured(unit) && unit !== 'pcs' && profile) warnings.push('nopack');
  if (!profile) warnings.push('noprofile');

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showStock && (
        <AgriQuickStock
          product={product} stock={stock} kind={kind}
          packSize={hasPack ? packSize : 0} packUnit={packUnit}
          cert={cert} restricted={!!profile?.isRestricted}
          hideCost={hideCost} onClose={() => setShowStock(false)} onSaved={invalidateAll}
        />
      )}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} kind={kind} name={product.name} />}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🌾 {tenant?.name || 'Agri'} — {product.name}</h1>
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
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition">
          <ArrowLeft className="h-4 w-4" /> Saara maal
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <TopBtn onClick={() => setShowTeacher(true)} tone="amber"><GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span></TopBtn>
          <TopBtn onClick={() => window.print()}><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span></TopBtn>
          <button onClick={() => setShowStock(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-sm transition active:scale-[0.97]">
            <Plus className="h-4 w-4" /> Stock add <Kbd>S</Kbd>
          </button>
          <Link to={ROUTES.edit(product.id)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-sm font-extrabold transition">
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

      {/* ═══ REGISTRATION KHATAM — sab se ooper ═══ */}
      {wantsReg && cert.state === 'expired' && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-400 dark:border-rose-500/50 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-black text-rose-900 dark:text-rose-200">🚫 Ye cheez abhi bechna ghair-qanooni hai</h3>
            <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
              {cert.text}. {isSeed ? 'Seed Act' : 'Agricultural Pesticides Ordinance'} ke tehat inspector
              jurmana kar sakta hai. Renew karwa ke nayi tareekh daal dein.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => renewReg.mutate()} disabled={renewReg.isPending}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-500/40 hover:border-rose-500 text-rose-700 dark:text-rose-300 text-xs font-black transition disabled:opacity-50">
              +1 saal
            </button>
            <Link to={ROUTES.edit(product.id)}
              className="h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <Edit3 className="h-3.5 w-3.5" /> Tareekh theek karein
            </Link>
          </div>
        </section>
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white shadow-2xl print:shadow-none print:rounded-xl">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl pointer-events-none print:hidden" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none print:hidden" />

        <div className="relative grid lg:grid-cols-[260px_1fr] gap-6 p-4 sm:p-6">
          {/* Gallery */}
          <div className="space-y-2 print:hidden">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {img ? (
                <img src={img} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(product.name)}`}>
                  <span className="text-7xl drop-shadow">{AGRI_KIND_EMOJI[kind]}</span>
                </div>
              )}
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                {product.isFeatured && (
                  <span className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </span>
                )}
                {profile?.isRestricted && (
                  <span className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> RESTRICTED
                  </span>
                )}
                {profile?.isOrganic && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                    <Leaf className="h-3 w-3" /> ORGANIC
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
                {AGRI_KIND_EMOJI[kind]} {prettyAgriKind(kind)}
              </span>
              {product.category && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black border border-white/25">{product.category.name}</span>
              )}
              {seasonDef && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black border border-white/20">{seasonDef.e} {seasonDef.l}</span>
              )}
            </div>

            <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight break-words">{product.name}</h1>
            {product.description && (
              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-white/80 line-clamp-2 max-w-2xl">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {product.sku && <Chip icon={Hash}>{product.sku}</Chip>}
              {product.barcode && <Chip icon={Barcode}>{product.barcode}</Chip>}
              {product.brand && <Chip icon={Tag} tone="violet">{product.brand.name}</Chip>}
              {profile?.manufacturer && <Chip icon={Landmark}>{profile.manufacturer}</Chip>}
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
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: t.color || '#34d399' }} />
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
                  {formatPKRFull(price)} <span className="text-sm font-bold text-white/70">/ {unitName}</span>
                </div>
                {hasPack && (
                  <div className="text-[11px] font-bold text-lime-200 mt-1">
                    1 {unitName} = {packSize} {packUnit}
                    {price > 0 && <> • {formatPKR(price / packSize)} per {packUnit}</>}
                  </div>
                )}
              </div>
              {!hideCost && cost > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cost</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/80 leading-none mt-1">{formatPKRFull(cost)}</div>
                </div>
              )}
              {!hideCost && cost > 0 && (
                <div className={`rounded-xl px-3 py-2 backdrop-blur border ${profit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'}`}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Munafa / {unitName}</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">
                    {formatPKRFull(profit)} <span className="text-xs opacity-80">({margin.toFixed(0)}%)</span>
                  </div>
                </div>
              )}
              {wholesale > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Thok rate</div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-300 leading-none mt-1">
                    {formatPKRFull(wholesale)}
                  </div>
                </div>
              )}
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Abhi stock" value={fmtQty(stock)}
                sub={isOut ? 'Khatam' : isLow ? 'Kam ho gaya' : hasPack ? `= ${fmtQty(stock * packSize)} ${packUnit}` : unitName}
                tone={isOut ? 'rose' : isLow ? 'amber' : 'sky'} onClick={() => setShowStock(true)} />
              <HeroStat icon={DollarSign} label="Stock ki qeemat" value={formatPKR(stock * price)}
                sub={hideCost ? '•••' : `lagat ${formatPKR(stock * cost)}`} tone="emerald" />
              <HeroStat icon={TrendingUp} label="Bika (30 din)" value={fmtQty(sales$.sold30)}
                sub={`roz ${sales$.perDay.toFixed(1)} ${unitName}`} tone="lime" />
              <HeroStat icon={ShieldCheck} label="Registration"
                value={!wantsReg ? '—' : cert.state === 'expired' ? 'Khatam' : cert.state === 'soon' ? `${cert.days} din` : cert.state === 'ok' ? 'Chal rahi' : 'Nahi likhi'}
                sub={!wantsReg ? 'Is par lagu nahi' : profile?.govtRegNumber || 'Number nahi bhara'}
                tone={cert.state === 'expired' ? 'rose' : cert.state === 'soon' ? 'amber' : 'emerald'}
                onClick={() => setTab('safety')} />
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
      {(isOut || isLow || sales$.suggested > 0 || (wantsReg && cert.state === 'soon')) && (
        <section className="grid md:grid-cols-2 gap-3 print:hidden">
          {(isOut || isLow) && (
            <AlertCard tone={isOut ? 'rose' : 'amber'} icon={isOut ? PackageX : AlertTriangle}
              title={isOut ? 'Gudaam me kuch nahi bacha' : `Sirf ${fmtQty(stock)} ${unitName} bache hain`}
              body={sales$.daysLeft !== null
                ? `Roz ka average ${sales$.perDay.toFixed(1)} ${unitName} — takreeban ${sales$.daysLeft} din chalega.`
                : `Low stock alert level: ${alertLevel} ${unitName}`}
              action={{ label: 'Stock add karo', onClick: () => setShowStock(true) }} />
          )}
          {sales$.suggested > 0 && (
            <AlertCard tone="sky" icon={RotateCcw}
              title={`Mangwao: ${sales$.suggested} ${unitName}`}
              body={`Pichle 30 din me ${fmtQty(sales$.sold30)} ${unitName} bika. Season ka stock (${sales$.coverDays} din) rakhne ke liye itna mangwao${hideCost ? '.' : ` — takreeban ${formatPKR(sales$.suggested * cost)}.`}`}
              action={{ label: 'Purchase banao', to: ROUTES.purchases }} />
          )}
          {wantsReg && cert.state === 'soon' && (
            <AlertCard tone="amber" icon={ShieldAlert}
              title={`Registration ${cert.days} din me khatam`}
              body="Renew karwa lein — meyaad khatam hone ke baad ye cheez bechna ghair-qanooni ho jayegi."
              action={{ label: 'Tareekh theek karein', to: ROUTES.edit(product.id) }} />
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
            </p>
          )}
          {warnings.includes('nocert') && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>Registration ki tareekh nahi bhari.</strong> Meyaad khatam hone par koi warning nahi aayegi.
            </p>
          )}
          {warnings.includes('nopack') && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>"1 {unitName} me kitna hai" likha nahi.</strong> POS par kilo ka hisab nahi ho payega.
            </p>
          )}
          {warnings.includes('noprofile') && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>Agri tafseel bhari hi nahi.</strong> Fasal, mausam, safety — kuch bhi nahi.{' '}
              <Link to={ROUTES.edit(product.id)} className="underline font-black">Abhi bharein</Link>
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
                  on ? 'bg-gradient-to-br from-emerald-600 to-lime-700 text-white shadow-md'
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
            <Stat icon={DollarSign} label={`Ek ${unitName} par munafa`} value={money(profit)}
              sub={hideCost ? undefined : `${margin.toFixed(1)}%`} tone={profit > 0 ? 'emerald' : 'rose'} />
            <Stat icon={Receipt} label="Kul bikri" value={formatPKR(sales$.revenue)}
              sub={`${fmtQty(sales$.totalSold)} ${unitName} • ${sales$.orders} orders`} tone="lime" />
            <Stat icon={TrendingUp} label="Kul munafa" value={money(sales$.profit)} sub="Bikri me se lagat nikal kar" tone="emerald" />
            <Stat icon={Boxes} label="Gudaam me para hai" value={money(stock * cost)}
              sub={hasPack ? `${fmtQty(stock)} ${unitName} = ${fmtQty(stock * packSize)} ${packUnit}` : `${fmtQty(stock)} ${unitName}`}
              tone="amber" />
          </section>

          {/* 30 din */}
          <section className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <PanelHead icon={BarChart3} tone="emerald" title="Pichle 30 din ki bikri"
              desc={`${fmtQty(sales$.sold30)} ${unitName} bika • roz ka average ${sales$.perDay.toFixed(1)} ${unitName}`} />
            {chartData.some((d) => d.revenue > 0) ? (
              <div className="h-[240px] mt-4 print:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="agGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} strokeOpacity={0.4} />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={10} interval={4} />
                    <YAxis stroke={AXIS} fontSize={10} width={60} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                    <Tooltip contentStyle={TOOLTIP}
                      formatter={(v: any, n: any) => (n === 'Bikri' ? [formatPKR(Number(v)), n] : [v, n])} />
                    <Area type="monotone" dataKey="revenue" name="Bikri" stroke="#10b981" strokeWidth={2.5} fill="url(#agGrad)" />
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
            <ChartCard icon={Calculator} title={`Ek ${unitName} par paisa kahan jata hai`}>
              {hideCost ? (
                <EmptyBox text="🔒 Cost chhupi hai — PIN se kholein" />
              ) : (
                <div className="space-y-2.5 pt-2">
                  <Bar2 label="Bechne ka rate" value={price} max={price} tone="emerald" />
                  <Bar2 label="Cost" value={cost} max={price} tone="rose" />
                  <Bar2 label="Bachta hai" value={Math.max(profit, 0)} max={price} tone="lime" />
                  {wholesale > 0 && (
                    <Bar2 label="Thok rate" value={wholesale} max={price} tone="amber" />
                  )}
                  {cost <= 0 && <p className="text-[11px] font-bold text-amber-600 pt-1">Cost bhare bagair ye hisab sirf andaza hai.</p>}
                </div>
              )}
            </ChartCard>

            <ChartCard icon={Sprout} title="Kaun farmer sab se zyada leta hai">
              {topBuyers.length > 0 ? (
                <div className="space-y-2 pt-1 overflow-y-auto h-full">
                  {topBuyers.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{b.name}</div>
                        <div className="text-[11px] font-bold text-slate-400 tabular-nums">{fmtQty(b.qty)} {unitName}</div>
                      </div>
                      <span className="text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                        {formatPKR(b.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <EmptyBox text="Abhi tak kisi ne ye cheez nahi li" />}
            </ChartCard>
          </div>

          {/* Bori ↔ kilo calculator */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900/80 border-2 border-emerald-200 dark:border-emerald-500/30 shadow-sm p-5 space-y-4 print:hidden">
            <PanelHead icon={ArrowRightLeft} tone="emerald" title="Naap ka calculator"
              desc={'"5 kilo kitne ka?" — aur stock se kitna ghatega'} />
            <div className="grid sm:grid-cols-[120px_1fr] gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1">Kitne</label>
                <input type="number" min={0} step="any" value={convQty}
                  onChange={(e) => setConvQty(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="h-12 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-slate-800 px-3 text-center text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1">Naap</label>
                <div className="flex flex-wrap gap-1.5">
                  {unitOptions.map((u) => (
                    <button key={u.key} onClick={() => setConvFrom(u.key)}
                      className={`px-3 h-12 rounded-xl border-2 text-sm font-extrabold capitalize transition ${
                        activeConv?.key === u.key ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                      }`}>
                      {u.emoji} {u.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 p-4 grid sm:grid-cols-3 gap-3">
              <ConvCell label="Stock se ghatega" value={`${fmtQty(convBaseQty)} ${unitName}`} tone="emerald" />
              <ConvCell label="Kitne paise banenge" value={formatPKRFull(Number(convQty || 0) * (activeConv?.price || 0))} tone="lime" />
              <ConvCell label="Phir bachega" value={`${fmtQty(Math.max(stock - convBaseQty, 0))} ${unitName}`} tone={convBaseQty > stock ? 'rose' : 'slate'} />
            </div>
            {convBaseQty > stock && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Itna stock nahi — sirf {fmtQty(stock)} {unitName} hai
              </div>
            )}
            {Number(profile?.bulkDiscountThreshold) > 0 && Number(profile?.bulkDiscountPct) > 0
              && Number(convQty || 0) >= Number(profile?.bulkDiscountThreshold) && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-200 dark:border-emerald-500/40 p-2.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Tag className="h-4 w-4 shrink-0" />
                Thok chhoot lagegi — {profile?.bulkDiscountPct}% kam, yani{' '}
                {formatPKRFull(Number(convQty || 0) * (activeConv?.price || 0) * (1 - Number(profile?.bulkDiscountPct) / 100))}
              </div>
            )}
            {otherRates.length === 0 && (
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Abhi sirf ek naap ({unitName}) me bikti hai. "1 {unitName} me kitna hai" wala khana{' '}
                <Link to={ROUTES.edit(product.id)} className="text-emerald-600 underline">Edit</Link> me bhar dein —
                kilo ka hisab yahan khud aa jayega.
              </p>
            )}
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
                <PanelHead icon={Sparkles} tone="lime" title="Isi category ki cheezein" desc={product.category?.name ?? ''} />
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {related.map((r) => (
                  <Link key={r.id} to={ROUTES.detail(r.id)}
                    className="group rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:shadow-md overflow-hidden transition bg-white dark:bg-slate-800/60">
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {r.images?.[0]?.url ? (
                        <img src={r.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(r.name)}`}>
                          <span className="text-3xl">{AGRI_KIND_EMOJI[deriveAgriKind(r.category?.name, r.name)]}</span>
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

      {/* ═══ 2. ISTEMAL — farmer ka pehla sawal ═══ */}
      {tab === 'usage' && (
        <div className="space-y-4">
          {!profile ? (
            <EmptyState icon={Leaf} title="Agri tafseel bhari hi nahi"
              sub="Kis fasal par chalti hai, kitni miqdar lagti hai, kis mausam ka maal hai — ye sab bhar dein to counter par farmer ke sawal ka jawab foran mil jayega."
              action={{ to: ROUTES.edit(product.id), label: 'Abhi bharein' }} />
          ) : (
            <>
              {isTool && (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 flex gap-2.5">
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                    Ye auzaar hai — fasal aur mausam ka sawal is par lagu nahi hota.
                  </p>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                {crops.length > 0 && (
                  <InfoCard icon={Wheat} title="Kis fasal par chalti hai">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {crops.map((c: string) => <Pill key={c} tone="emerald">🌾 {c}</Pill>)}
                    </div>
                  </InfoCard>
                )}

                {pests.length > 0 && (
                  <InfoCard icon={Bug} title="Kis keeray / beemari par">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pests.map((c: string) => <Pill key={c} tone="rose">🐛 {c}</Pill>)}
                    </div>
                  </InfoCard>
                )}

                {animals.length > 0 && (
                  <InfoCard icon={Sprout} title="Kis jaanwar ke liye">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {animals.map((c: string) => <Pill key={c} tone="amber">🐄 {c}</Pill>)}
                    </div>
                  </InfoCard>
                )}

                <InfoCard icon={Droplets} title="Kaise aur kitni lagani hai">
                  <Row label="Kitni miqdar" value={profile.applicationRate || 'Likha nahi'} warn={!profile.applicationRate && !isTool} />
                  <Row label="Kaise lagani hai" value={profile.applicationMethod || '—'} />
                  <Row label="Kitne din baad dobara" value={profile.applicationInterval || '—'} />
                  <Row label="Fasal ke kis waqt" value={profile.cropStage || '—'} />
                </InfoCard>

                <InfoCard icon={Calendar} title="Mausam">
                  <Row label="Kis mausam ka maal" value={seasonDef ? `${seasonDef.e} ${seasonDef.l}` : 'Likha nahi'} />
                  {seasonDef && <Row label="Kab chalta hai" value={seasonDef.hint} />}
                  {(profile.suitableFor ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {(profile.suitableFor as string[]).map((s) => <Pill key={s} tone="sky">{s}</Pill>)}
                    </div>
                  )}
                </InfoCard>

                {(isFert || isSpray) && (
                  <InfoCard icon={Beaker} title="Is me kya hai">
                    {isFert && <Row label="NPK" value={profile.npkRatio || '—'} />}
                    <Row label="Asal cheez (active ingredient)" value={profile.activeIngredient || '—'} />
                    <Row label="Kitni taakat (concentration)" value={profile.concentration || '—'} />
                    <Row label="Organic hai" value={profile.isOrganic ? 'Haan' : 'Nahi'} />
                    {profile.organicCertNumber && <Row label="Organic cert" value={profile.organicCertNumber} />}
                  </InfoCard>
                )}

                {isSeed && (
                  <InfoCard icon={Sprout} title="Beej ki baat">
                    <Row label="Beej ki qism" value={profile.seedType ? String(profile.seedType) : '—'} />
                    <Row label="Variety / sub-type" value={profile.subCategory || '—'} />
                    <Row label="Kitne din theek rehta" value={profile.shelfLifeMonths ? `${profile.shelfLifeMonths} mahine` : '—'} />
                  </InfoCard>
                )}

                {isFeed && (
                  <InfoCard icon={Wheat} title="Feed ki baat">
                    <Row label="Feed ki qism" value={profile.feedType ? String(profile.feedType) : '—'} />
                    <Row label="Kis umar ke liye" value={profile.subCategory || '—'} />
                  </InfoCard>
                )}

                <InfoCard icon={Timer} title="Rakhne ka tareeqa">
                  <Row label="Kitne mahine theek rehta" value={profile.shelfLifeMonths ? `${profile.shelfLifeMonths} mahine` : '—'} />
                  <Row label="Kitne temperature par" value={profile.storageTemp || '—'} />
                  <Row label="Kaise rakhein" value={profile.storageInstructions || '—'} />
                </InfoCard>
              </div>

              {profile.usageInstructions && (
                <InfoCard icon={Info} title="Farmer ko kya batana hai">
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pt-1">
                    {profile.usageInstructions}
                  </p>
                </InfoCard>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ 3. SAFETY ═══ */}
      {tab === 'safety' && (
        <div className="space-y-4">
          {/* Registration — sab ke liye pehla */}
          <section className={`rounded-3xl border-2 shadow-sm p-5 ${
            !wantsReg ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              : cert.state === 'expired' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
              : cert.state === 'soon' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
              : cert.state === 'ok' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
          }`}>
            <PanelHead icon={ShieldCheck} tone="emerald" title="Sarkari registration"
              desc={!wantsReg ? 'Is qism par sarkari registration lagu nahi hoti' : cert.text} />
            {wantsReg && (
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <SpecBox label="Registration number" value={profile?.govtRegNumber || 'Nahi bhara'} tone={profile?.govtRegNumber ? 'slate' : 'amber'} />
                <SpecBox label="Meyaad khatam"
                  value={profile?.govtRegExpiry ? new Date(profile.govtRegExpiry).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : 'Nahi bhari'}
                  tone={cert.state === 'expired' ? 'rose' : cert.state === 'soon' ? 'amber' : cert.state === 'ok' ? 'emerald' : 'amber'} />
                <SpecBox label="Kitne din baqi"
                  value={cert.days === null ? '—' : cert.days < 0 ? `${Math.abs(cert.days)} din pehle khatam` : `${cert.days} din`}
                  tone={cert.state === 'expired' ? 'rose' : cert.state === 'soon' ? 'amber' : 'emerald'} />
              </div>
            )}
            <div className="mt-4 flex gap-2 flex-wrap print:hidden">
              <Link to={ROUTES.edit(product.id)}
                className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-slate-700 dark:text-slate-200 text-xs font-black inline-flex items-center gap-1.5 transition">
                <Edit3 className="h-3.5 w-3.5" /> Tareekh theek karein
              </Link>
              {wantsReg && (cert.state === 'expired' || cert.state === 'soon') && (
                <button onClick={() => renewReg.mutate()} disabled={renewReg.isPending}
                  className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
                  <RotateCcw className="h-3.5 w-3.5" /> Renew — ek saal aage
                </button>
              )}
            </div>
          </section>

          {!isSpray ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 flex gap-2.5">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                Ye zehreeli cheez nahi hai — PPE, re-entry aur first aid wale sawal is par lagu nahi hote.
              </p>
            </div>
          ) : (
            <>
              <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat icon={ShieldAlert} label="Kitni zehreeli"
                  value={tox ? `${tox.e} ${tox.l}` : 'Likha nahi'}
                  sub={tox?.hint ?? 'Bharna zaroori hai'} tone={(tox?.tone as any) ?? 'amber'} />
                <Stat icon={Clock} label="Khet me kab ja sakte hain"
                  value={profile?.reEntryPeriod ? `${profile.reEntryPeriod} din baad` : '—'}
                  sub="Chhirakne ke baad" tone="rose" />
                <Stat icon={Wheat} label="Fasal kab kaat sakte hain"
                  value={profile?.ppePeriod ? `${profile.ppePeriod} din baad` : '—'}
                  sub="Aakhri spray ke baad" tone="amber" />
                <Stat icon={Landmark} label="Bechne par pabandi"
                  value={profile?.isRestricted ? 'Restricted' : profile?.requiresLicense ? 'License chahiye' : 'Koi nahi'}
                  sub={profile?.requiresLicense ? 'Farmer ka license dekh lein' : 'Aam farokht'}
                  tone={profile?.isRestricted ? 'rose' : 'emerald'} />
              </section>

              <div className="grid lg:grid-cols-2 gap-4">
                {profile?.warningLabel && (
                  <InfoCard icon={AlertTriangle} title="Packet par likhi warning">
                    <p className="text-[13px] font-extrabold text-rose-700 dark:text-rose-300 pt-1">{profile.warningLabel}</p>
                    {profile.hazardClass && <Row label="Hazard class" value={profile.hazardClass} />}
                  </InfoCard>
                )}

                {profile?.precautions && (
                  <InfoCard icon={ShieldAlert} title="Ehtiyat — farmer ko batayein">
                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pt-1">
                      {profile.precautions}
                    </p>
                  </InfoCard>
                )}

                {profile?.firstAid && (
                  <InfoCard icon={Info} title="Agar lag jaye to kya karein">
                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pt-1">
                      {profile.firstAid}
                    </p>
                  </InfoCard>
                )}

                {(profile?.msdsUrl || profile?.brochureUrl || profile?.videoUrl) && (
                  <InfoCard icon={ExternalLink} title="Kaghazat aur video">
                    {profile?.msdsUrl && <LinkRow label="MSDS (safety sheet)" href={profile.msdsUrl} />}
                    {profile?.brochureUrl && <LinkRow label="Brochure" href={profile.brochureUrl} />}
                    {profile?.videoUrl && <LinkRow label="Video" href={profile.videoUrl} />}
                  </InfoCard>
                )}
              </div>

              {!profile?.toxicityLevel && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="flex-1 text-[12px] font-bold text-amber-900 dark:text-amber-200">
                    Is dawa ka zehreelapan likha hi nahi. Farmer ko ye batana zaroori hai ke kitne din
                    khet me na jaye aur fasal kab kaat sakta hai —{' '}
                    <Link to={ROUTES.edit(product.id)} className="underline font-black">abhi bhar dein</Link>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ 4. BIKRI ═══ */}
      {tab === 'sales' && (
        <Panel icon={Receipt} tone="emerald" title="Bikri ki history"
          desc={`${salesForProduct.length} haal ki receipts • kul ${fmtQty(sales$.totalSold)} ${unitName} bika`}
          empty={salesForProduct.length === 0} emptyText="Abhi tak koi bikri nahi hui">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
            {salesForProduct.map((s: any) => {
              const lines = (s.items ?? []).filter((it: any) => (it.product?.id ?? it.productId) === id);
              const qty = lines.reduce((a: number, it: any) => a + Number(it.quantity || 0), 0);
              const rev = lines.reduce((a: number, it: any) => a + Number(it.total || 0), 0);
              return (
                <Link key={s.id} to={ROUTES.receipt(s.id)} className="block px-5 py-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition">
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
                        {s.customer?.name || 'Walk-in'} • {fmtQty(qty)} {unitName}
                        {hasPack && ` (${fmtQty(qty * packSize)} ${packUnit})`}
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
              const isIn = qty > 0 || type.includes('IN') || type.includes('PURCHASE');
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
                    {isIn && qty > 0 ? '+' : ''}{fmtQty(qty)} <span className="text-[10px] font-bold text-slate-500">{unitName}</span>
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
            <Row label="System ne samjha" value={`${AGRI_KIND_EMOJI[kind]} ${prettyAgriKind(kind)}`} />
            <Row label="SKU" value={product.sku ?? '—'} />
            <Row label="Barcode" value={product.barcode ?? '—'} />
            <Row label="Naap" value={unitName} />
            <Row label="Brand" value={product.brand?.name ?? '—'} />
            <Row label="Banane wali company" value={profile?.manufacturer ?? '—'} />
            <Row label="Kis mulk ka" value={profile?.countryOfOrigin ?? '—'} />
            <Row label="Low stock alert" value={`${alertLevel} ${unitName}`} />
            <Row label="Chal rahi hai" value={product.isActive ? 'Haan' : 'Nahi'} />
          </InfoCard>

          <InfoCard icon={DollarSign} title="Paisa">
            <Row label={`Bechne ka rate (per ${unitName})`} value={formatPKR(price)} />
            <Row label="Cost" value={hideCost ? '••••' : cost > 0 ? formatPKR(cost) : 'Bhari nahi'} warn={!hideCost && cost <= 0} />
            <Row label="Ek par munafa" value={money(profit)} />
            <Row label="Munafa %" value={hideCost ? '••••' : `${margin.toFixed(1)}%`} />
            {wholesale > 0 && <Row label="Thok rate" value={formatPKR(wholesale)} />}
            {Number(profile?.bulkDiscountThreshold) > 0 && (
              <Row label="Thok chhoot"
                value={`${profile?.bulkDiscountThreshold}+ par ${profile?.bulkDiscountPct}% kam`} />
            )}
            <Row label="Tax" value={`${product.taxRate ?? 0}%`} />
          </InfoCard>

          <InfoCard icon={Scale} title="Naap ka hisab">
            <Row label="Base naap" value={unitName} />
            {hasPack ? (
              <>
                <Row label={`1 ${unitName} me`} value={`${packSize} ${packUnit}`} />
                <Row label={`Per ${packUnit} rate`} value={price > 0 ? formatPKR(price / packSize) : '—'} />
                <Row label="Poora stock" value={`${fmtQty(stock * packSize)} ${packUnit}`} />
              </>
            ) : (
              <Row label={`1 ${unitName} me`} value="Likha nahi" warn={!isMeasured(unit) && unit !== 'pcs'} />
            )}
            {otherRates.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{r.emoji} Per {r.label}</span>
                <span className="min-w-0 text-right">
                  <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(price * r.rate)}</span>
                  <span className="block text-[10px] font-bold text-slate-400 tabular-nums">stock se {r.rate.toFixed(r.rate < 1 ? 4 : 2)} {unitName}</span>
                </span>
              </div>
            ))}
          </InfoCard>

          <InfoCard icon={ShieldCheck} title="Registration aur pabandi">
            <Row label="Registration lagu hoti hai" value={wantsReg ? 'Haan' : 'Nahi'} />
            {wantsReg && <Row label="Registration number" value={profile?.govtRegNumber || 'Nahi bhara'} warn={!profile?.govtRegNumber} />}
            {wantsReg && (
              <Row label="Meyaad"
                value={profile?.govtRegExpiry ? new Date(profile.govtRegExpiry).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : 'Nahi bhari'}
                warn={cert.state === 'expired' || cert.state === 'soon' || cert.state === 'none'} />
            )}
            <Row label="Restricted" value={profile?.isRestricted ? 'Haan' : 'Nahi'} warn={!!profile?.isRestricted} />
            <Row label="License dekhna zaroori" value={profile?.requiresLicense ? 'Haan' : 'Nahi'} />
            <Row label="Organic" value={profile?.isOrganic ? 'Haan' : 'Nahi'} />
            {profile?.organicCertNumber && <Row label="Organic cert" value={profile.organicCertNumber} />}
          </InfoCard>

          {profile && (
            <InfoCard icon={Star} title="Catalog par nishan">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.isFeatured && <Pill tone="amber">⭐ Featured</Pill>}
                {profile.isPopular && <Pill tone="emerald">🔥 Popular</Pill>}
                {profile.isBestSeller && <Pill tone="lime">🏆 Best seller</Pill>}
                {profile.isSeasonal && <Pill tone="sky">📅 Seasonal</Pill>}
                {!profile.isFeatured && !profile.isPopular && !profile.isBestSeller && !profile.isSeasonal && (
                  <span className="text-[12px] font-bold text-slate-400">Koi nishan nahi laga</span>
                )}
              </div>
              <Row label="Kul bika" value={`${fmtQty(Number(profile.totalSold || 0))} ${unitName}`} />
              <Row label="Kul paisa" value={money(Number(profile.totalRevenue || 0))} />
            </InfoCard>
          )}

          {gallery.length > 0 && (
            <InfoCard icon={ImageIcon} title="Tasveerein">
              <div className="grid grid-cols-4 gap-2 pt-1">
                {gallery.map((im: any, i: number) => (
                  <button key={im.id ?? i} onClick={() => { setImgIndex(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${i === imgIndex ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-700'}`}>
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
   ➕ Aaya  •  ➖ Kam (kharab, phata)  •  ✍️ Ginti
   Bori wali cheez par sath hi kilo ka hisab bhi.
   Enter = Save • Esc = Band
   ═════════════════════════════════════════════════════════════ */
type StockMode = 'add' | 'remove' | 'set';

function AgriQuickStock({ product, stock, kind, packSize, packUnit, cert, restricted, hideCost, onClose, onSaved }: {
  product: any; stock: number; kind: AgriKind; packSize: number; packUnit: string;
  cert: ReturnType<typeof certStatus>; restricted: boolean;
  hideCost: boolean; onClose: () => void; onSaved: () => void;
}) {
  const unit = product.unit || 'bag';
  const unitName = agriUnitLabel(unit);
  const weighed = isMeasured(unit);
  const chips = weighed ? [0.5, 1, 5, 10, 25, 50] : [1, 5, 10, 20, 50, 100];
  const current = stock;

  const [mode, setMode] = useState<StockMode>('add');
  const [qty, setQty] = useState<number | ''>('');
  const [setTo, setSetTo] = useState<number | ''>(current);

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const finalStock = round(
    mode === 'add' ? current + Number(qty || 0)
      : mode === 'remove' ? current - Number(qty || 0)
      : Number(setTo || 0),
  );
  const diff = round(finalStock - current);
  const empty = mode === 'set' ? setTo === '' : qty === '';
  const canSave = !empty && diff !== 0 && finalStock >= 0;

  const mutation = useMutation({
    mutationFn: () => productsApi.update(product.id, { stock: finalStock } as any),
    onSuccess: () => {
      toast.success(`${product.name} — stock ${fmtQty(finalStock)} ${unitName}`, {
        description: diff > 0 ? `+${fmtQty(diff)} ${unitName} aaya` : `${fmtQty(diff)} ${unitName} kam hua`,
      });
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Stock update nahi hua'),
  });

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
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-emerald-600 to-lime-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Boxes className="h-3 w-3" /> Quick Stock • {AGRI_KIND_EMOJI[kind]} {prettyAgriKind(kind)}
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{product.name}</h3>
            <div className="text-xs text-white/80 font-bold">
              Abhi stock: <strong>{fmtQty(current)} {unitName}</strong>
              {packSize > 0 && ` = ${fmtQty(current * packSize)} ${packUnit}`}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ModeBtn active={mode === 'add'} onClick={() => { setMode('add'); setQty(''); }}
              activeCls="border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              title="➕ Aaya" sub="Add karo" />
            <ModeBtn active={mode === 'remove'} onClick={() => { setMode('remove'); setQty(''); }}
              activeCls="border-rose-600 bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300"
              title="➖ Kam" sub="Kharab / phata" />
            <ModeBtn active={mode === 'set'} onClick={() => { setMode('set'); setQty(''); }}
              activeCls="border-sky-600 bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300"
              title="✍️ Ginti" sub="Exact set" />
          </div>

          {mode !== 'set' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {mode === 'add' ? `Kitna aaya? (${unitName})` : `Kitna kam hua? (${unitName})`}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(Math.max(0, round(Number(qty || 0) - (weighed ? 0.5 : 1))))}
                  className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition">
                  <Minus className="h-5 w-5" />
                </button>
                <input autoFocus type="number" inputMode="decimal" step="any" min={0}
                  value={qty} placeholder="0"
                  onChange={(e) => setQty(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className={`h-14 flex-1 min-w-0 rounded-2xl border-2 px-4 text-center text-3xl font-extrabold tabular-nums focus:outline-none transition ${tone.field}`} />
                <button onClick={() => setQty(round(Number(qty || 0) + (weighed ? 0.5 : 1)))}
                  className={`h-14 w-14 rounded-2xl text-white flex items-center justify-center shrink-0 transition ${tone.btn}`}>
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} onClick={() => setQty(round(Number(qty || 0) + c))}
                    className={`px-3 py-1.5 rounded-xl border-2 bg-white dark:bg-slate-800 text-xs font-extrabold transition ${tone.chip}`}>
                    +{c}
                  </button>
                ))}
                {mode === 'remove' && current > 0 && (
                  <button onClick={() => setQty(current)}
                    className={`px-3 py-1.5 rounded-xl border-2 bg-white dark:bg-slate-800 text-xs font-extrabold transition ${tone.chip}`}>
                    Sab ({fmtQty(current)})
                  </button>
                )}
                <button onClick={() => setQty('')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold transition">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Gudaam me asal me kitna hai? ({unitName})
              </label>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0}
                value={setTo}
                onChange={(e) => setSetTo(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="h-14 w-full rounded-2xl border-2 border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-sky-900 dark:text-sky-200 focus:outline-none focus:border-sky-600 transition" />
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Naya stock</div>
              <div className={`text-2xl font-extrabold tabular-nums ${finalStock < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {fmtQty(finalStock)} <span className="text-sm font-bold text-slate-500">{unitName}</span>
              </div>
              {packSize > 0 && finalStock >= 0 && (
                <div className="text-[10px] font-bold text-slate-500 tabular-nums">= {fmtQty(finalStock * packSize)} {packUnit}</div>
              )}
            </div>
            {diff !== 0 && (
              <div className={`px-2.5 py-1 rounded-xl text-sm font-extrabold tabular-nums shrink-0 ${
                diff > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
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
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stock minus nahi ho sakta — abhi sirf {fmtQty(current)} {unitName} hai
            </div>
          )}
          {cert.state === 'expired' && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-start gap-2 text-[11px] font-bold text-rose-800 dark:text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{cert.text} — stock daal to sakte hain, magar bechne se pehle renew karwa lein.</span>
            </div>
          )}
          {restricted && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex items-start gap-2 text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <Landmark className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Restricted cheez hai — har kisi ko nahi bechni.</span>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSave}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-lime-700 disabled:opacity-50">
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
        active ? activeCls
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
      }`}>
      {title}
      <div className="text-[10px] font-bold opacity-70">{sub}</div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
const topCls = 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-200 text-sm font-extrabold transition';

function TopBtn({ children, onClick, tone }: any) {
  return (
    <button onClick={onClick}
      className={tone === 'amber'
        ? 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-300 dark:border-amber-500/40 hover:bg-amber-200 text-amber-800 dark:text-amber-200 text-sm font-extrabold transition'
        : topCls}>
      {children}
    </button>
  );
}

function Kbd({ children, light }: { children: any; light?: boolean }) {
  return (
    <kbd className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
      light ? 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40'
        : 'bg-white/15 border border-white/25 text-white'
    }`}>{children}</kbd>
  );
}

function Chip({ icon: Icon, children, tone = 'default' }: any) {
  const tones: Record<string, string> = {
    default: 'bg-white/15 border-white/25 text-white',
    emerald: 'bg-emerald-400/25 border-emerald-300/40 text-emerald-50',
    rose: 'bg-rose-400/25 border-rose-300/40 text-rose-50',
    violet: 'bg-violet-400/25 border-violet-300/40 text-violet-50',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 border backdrop-blur text-[11px] font-extrabold ${tones[tone]}`}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone, onClick }: any) {
  const tones: Record<string, string> = {
    sky: 'from-sky-400/25 to-sky-500/10 border-sky-300/30',
    emerald: 'from-emerald-400/25 to-emerald-500/10 border-emerald-300/30',
    lime: 'from-lime-400/25 to-lime-500/10 border-lime-300/30',
    amber: 'from-amber-400/25 to-amber-500/10 border-amber-300/30',
    rose: 'from-rose-400/25 to-rose-500/10 border-rose-300/30',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={`rounded-2xl bg-gradient-to-br ${tones[tone] ?? tones.emerald} border backdrop-blur p-3 text-left w-full transition ${onClick ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-white/80" />
        <span className="text-[9px] uppercase font-extrabold text-white/70 tracking-wider truncate">{label}</span>
      </div>
      <div className="mt-1 text-lg font-black tabular-nums leading-none truncate">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5 truncate">{sub}</div>}
    </Comp>
  );
}

function AlertCard({ tone, icon: Icon, title, body, action }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200',
    sky: 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-200',
  };
  const btn: Record<string, string> = {
    rose: 'bg-rose-600 hover:bg-rose-700', amber: 'bg-amber-600 hover:bg-amber-700', sky: 'bg-sky-600 hover:bg-sky-700',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${tones[tone]}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <h4 className="font-black text-sm leading-tight">{title}</h4>
        <p className="text-[12px] font-bold opacity-90 mt-0.5 leading-snug">{body}</p>
      </div>
      {action && (action.to ? (
        <Link to={action.to} className={`h-9 px-3 rounded-xl ${btn[tone]} text-white text-xs font-black inline-flex items-center shrink-0 transition`}>
          {action.label}
        </Link>
      ) : (
        <button onClick={action.onClick} className={`h-9 px-3 rounded-xl ${btn[tone]} text-white text-xs font-black shrink-0 transition`}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

const TONE_GRAD: Record<string, string> = {
  emerald: 'from-emerald-500 to-green-600',
  lime: 'from-lime-500 to-green-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-rose-700',
  sky: 'from-sky-500 to-blue-600',
  slate: 'from-slate-500 to-slate-700',
};

function PanelHead({ icon: Icon, title, desc, tone }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${TONE_GRAD[tone] ?? TONE_GRAD.emerald} text-white flex items-center justify-center shadow shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
        {desc && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}

function Panel({ icon, title, desc, tone, children, empty, emptyText }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
        <PanelHead icon={icon} title={title} desc={desc} tone={tone} />
      </div>
      {empty ? <div className="p-10 text-center text-sm font-bold text-slate-400">{emptyText}</div> : children}
    </section>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400', lime: 'text-lime-600 dark:text-lime-400',
    amber: 'text-amber-600 dark:text-amber-400', rose: 'text-rose-600 dark:text-rose-400',
    sky: 'text-sky-600 dark:text-sky-400', slate: 'text-slate-600 dark:text-slate-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${tones[tone] ?? tones.emerald}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function Bar2({ label, value, max, tone }: any) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500', lime: 'bg-lime-500', rose: 'bg-rose-500', amber: 'bg-amber-500',
  };
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span className="tabular-nums">{formatPKR(value)}</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${tones[tone] ?? tones.emerald}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConvCell({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400', lime: 'text-lime-700 dark:text-lime-400',
    rose: 'text-rose-700 dark:text-rose-400', slate: 'text-slate-900 dark:text-white',
  };
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-black tabular-nums ${tones[tone] ?? tones.slate}`}>{value}</div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <h3 className="font-black text-slate-900 dark:text-white mb-2.5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, value, warn }: any) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className={`text-[13px] font-extrabold text-right min-w-0 break-words ${
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
      }`}>{value}</span>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0 group">
      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 group-hover:underline">
        Kholein <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

function SpecBox({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 ${tones[tone] ?? tones.slate}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-0.5 text-sm font-black break-words">{value}</div>
    </div>
  );
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    lime: 'bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    sky: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${tones[tone] ?? tones.slate}`}>{children}</span>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function EmptyState({ icon: Icon, title, sub, action }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-14 text-center">
      <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Icon className="h-8 w-8 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">{sub}</p>
      {action && (
        <Link to={action.to}
          className="mt-5 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
          <Edit3 className="h-4 w-4" /> {action.label}
        </Link>
      )}
    </section>
  );
}

function Teacher({ onClose, kind, name }: { onClose: () => void; kind: AgriKind; name: string }) {
  const spray = isSprayKind(kind);
  const seed = isSeedKind(kind);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kaise chalta hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            <strong>{name}</strong> ki poori kahani — paisa, istemal, safety aur bikri.
          </p>
          {(spray || seed) && (
            <Tip icon={ShieldAlert} title="Registration — sab se ahem">
              {seed ? 'Seed Act' : 'Pesticides Ordinance'} ke tehat meyaad khatam hone par ye cheez
              bechna ghair-qanooni hai. Safety tab me tareekh dikhti hai aur wahin se renew bhi ho jati hai.
            </Tip>
          )}
          <Tip icon={Scale} title="Naap ka calculator">
            Farmer 5 kilo maange to yahan likh kar dekh lein ke kitne paise banenge aur stock se
            kitni bori ghategi. Thok chhoot bhi khud lag jati hai.
          </Tip>
          <Tip icon={Leaf} title="Istemal wala tab">
            Kis fasal par, kis keeray par, kitni miqdar, kis mausam me — farmer ke sab sawal ek jagah.
          </Tip>
          {spray && (
            <Tip icon={Clock} title="Safety wala tab">
              Chhirakne ke baad kitne din khet me na jayein aur fasal kab kaat sakte hain —
              ye farmer ko zaroor batayein.
            </Tip>
          )}
          <Tip icon={RotateCcw} title="Kitna mangwana hai">
            Pichle 30 din ki bikri dekh kar system khud batata hai ke season ke liye kitna stock chahiye.
          </Tip>
          <Tip icon={Boxes} title="Quick stock">S dabayein ya "Stock add" — foran maal daalein.</Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">E</kbd> edit</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">S</kbd> stock</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1–6</kbd> tabs</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> guide</div>
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
      <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
