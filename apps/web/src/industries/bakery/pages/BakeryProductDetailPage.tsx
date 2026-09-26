import { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2, Cake, Timer, Snowflake, AlertTriangle,
  Package, DollarSign, ChefHat, ShoppingBag, Wheat, CheckCircle2,
  XCircle, Award, TrendingUp, BarChart3, Info, GraduationCap, X,
  Printer, Boxes, Flame, Star, Calculator, Tag, Layers, Clock, Scale,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { bakeryProductsApi } from '../api/products.api';
import { freshnessApi, type FreshnessLog } from '../api/freshness.api';
import { FLAVORS, SHAPES, CREAMS } from '../api/constants';
import {
  deriveBakeryCategory, isCakeLike, prettyCategory,
} from '../lib/bakeryCategory';
import { unitDef, rateBetween, priceField, extraUnitsFor } from '../lib/bakeryUnits';

/* ═════════════════════════════════════════════════════════════
   BAKERY — EK CHEEZ KI POORI KAHANI
   ─────────────────────────────────────────────────────────────
   Purane safhe par sirf wo dikhta tha jo form me bhara gaya tha:
   naam, rate, flavour. Us se dukaan-daar ko koi faisla karne me
   madad nahi milti thi.

   Ab teen sawal ka jawab yahan milta hai:
     • Is par paisa lag raha hai ya ban raha hai? (cost vs rate)
     • Ek banane me kya kya lagta hai aur kitna kharcha? (recipe)
     • Jo bana hua para hai wo kab tak theek hai? (taazgi)
   ═════════════════════════════════════════════════════════════ */

type Tab = 'overview' | 'recipe' | 'freshness' | 'details';

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
    return p < 24 ? `${Math.round(p)} ghante guzar gaye` : `${Math.round(p / 24)} din guzar gaye`;
  }
  if (h < 1) return `${Math.round(h * 60)} minute baqi`;
  if (h < 24) return `${Math.round(h)} ghante baqi`;
  return `${Math.round(h / 24)} din baqi`;
}

export default function BakeryProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);

  const [tab, setTab] = useState<Tab>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const [showTeacher, setShowTeacher] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const removeMut = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Band kar di gayi' : 'Delete ho gayi');
      qc.invalidateQueries({ queryKey: ['bakery-all-products'] });
      navigate('/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hui'),
  });

  /* ── Hisab ── */
  const derived = useMemo(
    () => deriveBakeryCategory(product?.category?.name, product?.name),
    [product],
  );

  const recipe = useMemo(() => {
    const lines = (profile as any)?.ingredients?.lines;
    return Array.isArray(lines) ? lines : [];
  }, [profile]);

  const recipeYield = Number((profile as any)?.ingredients?.yield) || 1;
  const batchCost = recipe.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.costPerUnit || 0), 0);
  const recipeCostPerUnit = recipeYield > 0 ? batchCost / recipeYield : batchCost;

  const isMade = Boolean(profile?.isCakeCustomizable || profile?.isCustomizable || recipe.length > 0);

  /** Base unit ke ilawa jin naapon ka rate bhara hua hai */
  const otherRates = useMemo(() => {
    if (!product || !profile) return [] as any[];
    const base = (product.unit || 'pcs').toLowerCase();
    return extraUnitsFor(base)
      .map((k) => ({
        ...unitDef(k),
        price: Number((profile as any)[priceField[k]] || 0),
        rate: rateBetween(k, base, {
          weightGrams: profile.weightGrams,
          slices: profile.numberOfSlices,
        }),
      }))
      .filter((x) => x.price > 0);
  }, [product, profile]);
  const stock = Number(product?.shopStock ?? product?.stock ?? 0);
  const cost = Number(product?.costPrice ?? 0);
  const price = Number(product?.price ?? 0);
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const stockValue = stock * cost;
  const retailValue = stock * price;
  const isOut = stock <= 0;
  const isLow = stock > 0 && stock <= Number(product?.lowStockAlert ?? 0);

  const liveBatches = useMemo(
    () => freshLogs
      .filter((f) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0)
      .map((f) => ({ ...f, left: hoursLeft(f.expiryDate || f.bestBefore) }))
      .sort((a, b) => (a.left ?? 0) - (b.left ?? 0)),
    [freshLogs],
  );

  const wasteStats = useMemo(() => {
    const made = freshLogs.reduce((s, f) => s + Number(f.initialQty || 0), 0);
    const sold = freshLogs.reduce((s, f) => s + Number(f.soldQty || 0), 0);
    const wasted = freshLogs.reduce((s, f) => s + Number(f.wastedQty || 0), 0);
    const discounted = freshLogs.reduce((s, f) => s + Number(f.discountedQty || 0), 0);
    return {
      made, sold, wasted, discounted,
      wastePct: made > 0 ? (wasted / made) * 100 : 0,
      wasteValue: wasted * cost,
    };
  }, [freshLogs, cost]);

  const recipeChart = useMemo(
    () => recipe
      .map((l: any) => ({ name: String(l.name).slice(0, 12), value: Number(l.qty || 0) * Number(l.costPerUnit || 0) }))
      .filter((x: any) => x.value > 0)
      .sort((a: any, b: any) => b.value - a.value),
    [recipe],
  );

  const wasteChart = useMemo(() => ([
    { name: 'Bik gaya', value: wasteStats.sold },
    { name: 'Discount par', value: wasteStats.discounted },
    { name: 'Phinka', value: wasteStats.wasted },
  ].filter((x) => x.value > 0)), [wasteStats]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDelete) return setConfirmDelete(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') window.print();
      if (e.key.toLowerCase() === 'e' && id) navigate(`/bakery-products/${id}/edit`);
      if (e.key === '1') setTab('overview');
      if (e.key === '2') setTab('recipe');
      if (e.key === '3') setTab('freshness');
      if (e.key === '4') setTab('details');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete, showTeacher, id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Cake className="h-16 w-16 text-slate-300" />
        <p className="font-black text-slate-700 dark:text-slate-200 text-lg">Ye cheez nahi mili</p>
        <Link to="/products" className="text-pink-600 font-bold hover:underline">← Wapas list par</Link>
      </div>
    );
  }

  const images = product.images ?? [];
  const img = images[activeImage]?.url ?? images[0]?.url;
  const flavor = FLAVORS.find((f) => f.value === profile?.defaultFlavor);
  const shape = SHAPES.find((s) => s.value === profile?.defaultShape);
  const cream = CREAMS.find((c) => c.value === profile?.defaultCreamType);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{product.name}</h1>
        <p className="text-xs text-slate-600">
          {tenant?.name} • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-pink-600 transition">
          <ArrowLeft className="h-4 w-4" /> Wapas list par
        </Link>
        <div className="flex gap-2">
          <button onClick={() => setShowTeacher(true)}
            className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 transition">
            <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
          </button>
          <button onClick={() => window.print()}
            className="h-10 w-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-pink-400 transition">
            <Printer className="h-4 w-4 text-slate-500" />
          </button>
          <Link to={`/bakery-products/${id}/edit`}
            className="h-10 px-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <button onClick={() => setConfirmDelete(true)}
            className="h-10 w-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-rose-400 transition">
            <Trash2 className="h-4 w-4 text-rose-500" />
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl print:hidden" />
        <div className="relative grid lg:grid-cols-[220px_1fr] gap-5 items-start">
          <div className="rounded-2xl overflow-hidden bg-white/10 backdrop-blur aspect-square flex items-center justify-center">
            {img ? (
              <img src={img} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-6xl">{isMade ? '🧁' : '📦'}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-black border border-white/25 uppercase tracking-widest">
                {isMade ? <ChefHat className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {isMade ? 'Khud banate hain' : 'Bahar se laya'}
              </span>
              {product.category && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black border border-white/25">
                  {product.category.name}
                </span>
              )}
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black border border-white/20">
                {prettyCategory(derived)}
              </span>
              {!product.isActive && (
                <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black">Band hai</span>
              )}
            </div>

            <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight break-words">{product.name}</h1>

            {product.description && (
              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-white/80 line-clamp-2">{product.description}</p>
            )}

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <HeroStat label="Bechne ka rate" value={formatPKR(price)} sub={`per ${product.unit}`} />
              <HeroStat label="Banane ki cost" value={cost > 0 ? formatPKR(cost) : '—'}
                sub={cost > 0 ? `${margin.toFixed(0)}% munafa` : 'Bhari nahi'} warn={cost <= 0} />
              <HeroStat label="Abhi stock" value={`${fmtQty(stock)} ${product.unit}`}
                sub={isOut ? 'Khatam' : isLow ? 'Kam ho gaya' : 'Theek hai'} warn={isOut || isLow} />
              <HeroStat label="Kitni der theek" value={profile?.shelfLifeDays ? `${profile.shelfLifeDays} din` : profile?.shelfLifeHours ? `${profile.shelfLifeHours} ghante` : '—'}
                sub={profile?.requiresRefrigeration ? 'Fridge me' : 'Aam jagah'} warn={!profile?.shelfLifeDays && !profile?.shelfLifeHours} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WARNINGS ═══ */}
      {(cost <= 0 || (isMade && !profile?.shelfLifeDays && !profile?.shelfLifeHours) || (recipe.length > 0 && Math.abs(cost - recipeCostPerUnit) > 1)) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5 print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye theek kar lein</h3>
          </div>
          {cost <= 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>Cost bhari hi nahi.</strong> Is ka munafa poora {formatPKR(price)} dikh raha hai,
              jo sach nahi. Har report is se ghalat jayegi.
            </p>
          )}
          {isMade && !profile?.shelfLifeDays && !profile?.shelfLifeHours && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>"Kitni der theek rehti hai" likha nahi.</strong> Is ki expiry ki warning kabhi
              nahi aayegi — bana hua maal chup-chaap kharab ho jayega.
            </p>
          )}
          {recipe.length > 0 && Math.abs(cost - recipeCostPerUnit) > 1 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>Cost aur recipe me farq hai.</strong> Aap ne {formatPKR(cost)} likhi hai,
              recipe se {formatPKR(recipeCostPerUnit)} banti hai. Saamaan mehnga ho gaya hoga.
            </p>
          )}
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-4 gap-2 print:hidden">
        {([
          ['overview', 'Hisab', BarChart3, '1'],
          ['recipe', 'Recipe', Wheat, '2'],
          ['freshness', 'Taazgi', Timer, '3'],
          ['details', 'Tafseel', Info, '4'],
        ] as const).map(([v, label, Icon, key]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`py-3 rounded-2xl border-2 font-black text-[11px] sm:text-sm inline-flex items-center justify-center gap-1.5 transition ${
              tab === v
                ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-pink-400'
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
            <kbd className="hidden lg:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="Ek par munafa" value={formatPKR(profit)} sub={`${margin.toFixed(1)}%`} tone={profit > 0 ? 'emerald' : 'rose'} />
            <Stat icon={Boxes} label="Stock ki lagat" value={formatPKR(stockValue)} sub={`${fmtQty(stock)} ${product.unit}`} tone="violet" />
            <Stat icon={TrendingUp} label="Sab bik jaye to" value={formatPKR(retailValue)} sub={`Munafa ${formatPKR(retailValue - stockValue)}`} tone="pink" />
            <Stat icon={Flame} label="Phinka hua" value={`${wasteStats.wastePct.toFixed(1)}%`}
              sub={wasteStats.wasteValue > 0 ? `${formatPKR(wasteStats.wasteValue)} ka nuqsaan` : 'Abhi tak kuch nahi'}
              tone={wasteStats.wastePct > 10 ? 'rose' : 'emerald'} />
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Calculator} title="Ek cheez par paisa kahan jata hai">
              <div className="space-y-2.5 pt-2">
                <Bar2 label="Bechne ka rate" value={price} max={price} tone="emerald" />
                <Bar2 label="Banane ki cost" value={cost} max={price} tone="rose" />
                <Bar2 label="Bachta hai" value={Math.max(profit, 0)} max={price} tone="pink" />
                {cost <= 0 && (
                  <p className="text-[11px] font-bold text-amber-600 pt-1">
                    Cost bhare bagair ye hisab sirf andaza hai.
                  </p>
                )}
              </div>
            </ChartCard>

            <ChartCard icon={Flame} title="Bana hua maal kahan gaya">
              {wasteChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyBox text="Abhi is cheez ka koi batch record nahi hua" />
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ═══ RECIPE ═══ */}
      {tab === 'recipe' && (
        <div className="space-y-4">
          {recipe.length === 0 ? (
            <EmptyState icon={Wheat} title="Recipe bhari hi nahi"
              sub={isMade
                ? 'Is cheez me kya kya lagta hai — wo likh dein to cost khud nikal aayegi, aur maida mehnga hote hi pata chal jayega.'
                : 'Ye bahar se laya hua maal hai, is ki recipe nahi hoti.'}
              action={isMade ? { to: `/bakery-products/${id}/edit`, label: 'Recipe bharein' } : undefined} />
          ) : (
            <>
              <section className="grid sm:grid-cols-3 gap-3">
                <Stat icon={Layers} label="Ek batch me" value={`${recipeYield} cheezein`} sub={`${recipe.length} saamaan lagta hai`} tone="violet" />
                <Stat icon={Calculator} label="Poore batch ka kharcha" value={formatPKR(batchCost)} tone="pink" />
                <Stat icon={DollarSign} label="Ek cheez ka kharcha" value={formatPKR(recipeCostPerUnit)}
                  sub={cost > 0 ? `Form me ${formatPKR(cost)} likhi hai` : 'Form me cost khali hai'}
                  tone={Math.abs(cost - recipeCostPerUnit) > 1 ? 'amber' : 'emerald'} />
              </section>

              <div className="grid lg:grid-cols-2 gap-4">
                <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-violet-600" />
                    <h3 className="font-black text-slate-900 dark:text-white">Kya kya lagta hai</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recipe.map((l: any, i: number) => {
                      const lineCost = Number(l.qty || 0) * Number(l.costPerUnit || 0);
                      const share = batchCost > 0 ? (lineCost / batchCost) * 100 : 0;
                      return (
                        <div key={i} className="p-3 flex items-center gap-3">
                          <span className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                            <Wheat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{l.name}</div>
                            <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                              {fmtQty(Number(l.qty || 0))} {l.unit} × {formatPKR(l.costPerUnit)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-sm text-slate-900 dark:text-white tabular-nums">{formatPKR(lineCost)}</div>
                            <div className="text-[10px] font-bold text-slate-400">{share.toFixed(0)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <ChartCard icon={BarChart3} title="Kharcha kis saamaan par">
                  {recipeChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recipeChart} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                        <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={80} />
                        <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Kharcha']} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {recipeChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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

      {/* ═══ FRESHNESS ═══ */}
      {tab === 'freshness' && (
        <div className="space-y-4">
          <section className="grid sm:grid-cols-4 gap-3">
            <Stat icon={ChefHat} label="Kul bana" value={fmtQty(wasteStats.made)} tone="violet" />
            <Stat icon={CheckCircle2} label="Bik gaya" value={fmtQty(wasteStats.sold)} tone="emerald" />
            <Stat icon={Tag} label="Discount par gaya" value={fmtQty(wasteStats.discounted)} tone="amber" />
            <Stat icon={Flame} label="Phinka" value={fmtQty(wasteStats.wasted)}
              sub={wasteStats.wasteValue > 0 ? formatPKR(wasteStats.wasteValue) : undefined}
              tone={wasteStats.wasted > 0 ? 'rose' : 'emerald'} />
          </section>

          {liveBatches.length === 0 ? (
            <EmptyState icon={Timer} title="Abhi koi batch nahi"
              sub="Jab is cheez ka batch banega, yahan uski taazgi ka hisab nazar aayega — kab tak theek hai aur kitna bacha hua hai." />
          ) : (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 dark:text-white">Jo abhi para hua hai</h3>
                <Link to="/bakery/freshness" className="ml-auto text-xs font-black text-emerald-600 print:hidden">Poora safha →</Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {liveBatches.map((f) => {
                  const gone = (f.left ?? 0) <= 0;
                  const soon = (f.left ?? 0) > 0 && (f.left ?? 0) <= 4;
                  return (
                    <div key={f.id} className="p-3 flex items-center gap-3">
                      <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        gone ? 'bg-rose-100 dark:bg-rose-500/20' : soon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'
                      }`}>
                        <Clock className={`h-4 w-4 ${gone ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {f.batchNumber ? `Batch ${f.batchNumber}` : 'Batch'}
                        </div>
                        <div className={`text-[11px] font-black ${gone ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500'}`}>
                          {hoursPhrase(f.left ?? 0)}
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

      {/* ═══ DETAILS ═══ */}
      {tab === 'details' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <InfoCard icon={Package} title="Basic">
            <Row label="Naam" value={product.name} />
            <Row label="Category" value={product.category?.name ?? '—'} />
            <Row label="System ne samjha" value={prettyCategory(derived)} />
            <Row label="SKU" value={product.sku ?? '—'} />
            <Row label="Barcode" value={product.barcode ?? '—'} />
            <Row label="Unit" value={product.unit} />
            <Row label="Brand" value={product.brand?.name ?? '—'} />
            <Row label="Chal rahi hai" value={product.isActive ? 'Haan' : 'Nahi'} />
          </InfoCard>

          <InfoCard icon={DollarSign} title="Paisa">
            <Row label={`Bechne ka rate (per ${product.unit})`} value={formatPKR(price)} />
            <Row label="Banane ki cost" value={cost > 0 ? formatPKR(cost) : 'Bhari nahi'} warn={cost <= 0} />
            <Row label="Ek par munafa" value={formatPKR(profit)} />
            <Row label="Munafa %" value={`${margin.toFixed(1)}%`} />
            <Row label="Tax" value={`${product.taxRate ?? 0}%`} />
          </InfoCard>

          {/* ── Aur kis tarah bikti hai ──
              Sirf rate likh dena kaafi nahi — sath me ye bhi dikhna
              chahiye ke ek slice bikne par stock se kitna ghatega.
              Yehi wo hisab hai jo pehle POS me lagta hi nahi tha. */}
          {otherRates.length > 0 && (
            <InfoCard icon={Scale} title="Aur kis tarah bikti hai">
              {otherRates.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    {r.emoji} Per {r.label}
                  </span>
                  <span className="min-w-0 text-right">
                    <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatPKR(r.price)}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 tabular-nums">
                      stock se {r.rate.toFixed(r.rate < 1 ? 3 : 2)} {product.unit}
                    </span>
                  </span>
                </div>
              ))}
            </InfoCard>
          )}

          <InfoCard icon={Timer} title="Taazgi aur rakhna">
            <Row label="Kitni der theek" value={
              profile?.shelfLifeDays ? `${profile.shelfLifeDays} din`
                : profile?.shelfLifeHours ? `${profile.shelfLifeHours} ghante` : 'Likha nahi'
            } warn={!profile?.shelfLifeDays && !profile?.shelfLifeHours} />
            <Row label="Fridge chahiye" value={profile?.requiresRefrigeration ? 'Haan' : 'Nahi'} />
            <Row label="Banane me lagta hai" value={profile?.prepTimeHours ? `${profile.prepTimeHours} ghante` : '—'} />
            <Row label="Pehle se order" value={profile?.advanceOrderHours ? `${profile.advanceOrderHours} ghante` : '—'} />
            <Row label="Kam se kam order" value={String(profile?.minOrderQty ?? 1)} />
          </InfoCard>

          <InfoCard icon={Info} title="Khane ki baat">
            <Row label="Anda hai" value={profile?.containsEgg ? 'Haan' : 'Nahi'} />
            <Row label="Doodh / dairy" value={profile?.containsDairy ? 'Haan' : 'Nahi'} />
            <Row label="Nuts" value={profile?.containsNuts ? 'Haan' : 'Nahi'} />
            <Row label="Gluten" value={profile?.containsGluten ? 'Haan' : 'Nahi'} />
            <Row label="Egg-free" value={profile?.isEggless ? 'Haan' : 'Nahi'} />
            <Row label="Vegan" value={profile?.isVegan ? 'Haan' : 'Nahi'} />
            <Row label="Sugar-free" value={profile?.isSugarFree ? 'Haan' : 'Nahi'} />
            <Row label="Halal" value={profile?.isHalal ? 'Haan' : 'Nahi'} />
          </InfoCard>

          {isCakeLike(derived) && profile && (
            <InfoCard icon={Cake} title="Cake ki baat">
              <Row label="Flavour" value={flavor ? `${flavor.emoji} ${flavor.label}` : '—'} />
              <Row label="Shape" value={shape ? `${shape.emoji} ${shape.label}` : '—'} />
              <Row label="Cream" value={cream ? cream.label : '—'} />
              <Row label="Customer marzi se bana sakta hai" value={profile.isCakeCustomizable ? 'Haan' : 'Nahi'} />
              <Row label="Cake par likhwa sakta hai" value={profile.allowsMessageOnCake ? 'Haan' : 'Nahi'} />
              <Row label="Photo laga sakta hai" value={profile.allowsPhotoOnCake ? 'Haan' : 'Nahi'} />
            </InfoCard>
          )}

          {images.length > 0 && (
            <InfoCard icon={Cake} title="Tasveerein">
              <div className="grid grid-cols-4 gap-2 pt-1">
                {images.map((im: any, i: number) => (
                  <button key={im.id ?? i} onClick={() => setActiveImage(i)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${
                      i === activeImage ? 'border-pink-500' : 'border-slate-200 dark:border-slate-700'
                    }`}>
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      )}

      {/* ═══ DELETE ═══ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-rose-600" />
            </div>
            <h3 className="mt-3 text-center font-black text-slate-900 dark:text-white text-lg">Pakka delete karna hai?</h3>
            <p className="mt-1 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
              <strong>{product.name}</strong> hat jayegi. Agar is ki bikri ho chuki hai to sirf band hogi,
              taake purani report kharab na ho.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>Rehne dein</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" loading={removeMut.isPending}
                onClick={() => removeMut.mutate()}>Haan, delete</Button>
            </div>
          </div>
        </div>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} isMade={isMade} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function HeroStat({ label, value, sub, warn }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur p-3 border ${warn ? 'bg-amber-400/20 border-amber-300/40' : 'bg-white/10 border-white/20'}`}>
      <div className="text-[9px] font-black uppercase tracking-widest text-white/70">{label}</div>
      <div className="mt-1 text-base sm:text-lg font-black tabular-nums break-words leading-tight">{value}</div>
      {sub && <div className={`text-[10px] font-bold mt-0.5 ${warn ? 'text-amber-200' : 'text-white/60'}`}>{sub}</div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums break-words leading-tight">{value}</div>
          {sub && <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
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
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500', rose: 'bg-rose-500', pink: 'bg-pink-500',
  };
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
      <span className={`text-[13px] font-extrabold text-right break-words ${
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
      }`}>{value}</span>
    </div>
  );
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

function Teacher({ onClose, isMade }: { onClose: () => void; isMade: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kya batata hai
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Ek cheez ki poori kahani — teen sawal ka jawab.
          </p>
          <Tip icon={BarChart3} title="Hisab">
            Is par paisa lag raha hai ya ban raha hai. Ek par kitna munafa, gudaam me kitna
            phansa hua hai, aur kitna maal phinka.
          </Tip>
          {isMade && (
            <Tip icon={Wheat} title="Recipe">
              Kya kya lagta hai aur kis saamaan par sab se zyada kharcha. Agar cost aur recipe
              me farq aa jaye to upar warning aa jati hai — matlab saamaan mehnga ho gaya hai
              aur rate dobara dekhna chahiye.
            </Tip>
          )}
          <Tip icon={Timer} title="Taazgi">
            Jo batch abhi para hua hai, kab tak theek hai. Jo sab se pehle kharab hoga wo upar.
          </Tip>
          <Tip icon={Info} title="Tafseel">
            Sab kuch jo form me bhara gaya — rate, anda/doodh, cake ki baat. Customer ke poochne
            par foran jawab mil jata hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-4</kbd> tab badlo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">E</kbd> edit</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> ye madad</div>
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
