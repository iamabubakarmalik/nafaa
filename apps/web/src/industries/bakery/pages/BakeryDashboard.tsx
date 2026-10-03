import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Cake, ChefHat, Wheat, Timer, ShoppingBag, RefreshCw, TrendingUp, TrendingDown,
  Package, DollarSign, Clock, ArrowRight, AlertTriangle, Plus,
  Flame, BarChart3, GraduationCap, X, Wallet, Users,
  Croissant, Boxes, Receipt, Printer, PiggyBank, Hourglass, Rocket,
  BookOpen, Building2, Banknote, CreditCard, Smartphone, Zap,
  ShoppingCart, Target, Sparkles, PackageX, Crown, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { retailDashboardApi } from '@industries/retail/api/dashboard.api';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { productionApi } from '../api/production.api';
import { ingredientsApi } from '../api/ingredients.api';
import { freshnessApi } from '../api/freshness.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';

/* ═════════════════════════════════════════════════════════════
   BAKERY DASHBOARD — AAJ KA KAAM, PHIR POORA HISAB
   ─────────────────────────────────────────────────────────────
   Bakery wale ka din hamesha isi tarteeb se chalta hai:

     1. Kya jald kharab ho raha hai — wo aaj hi nikalna hai
     2. Aaj kya banana hai
     3. Aaj kis ko order dena hai
     4. Saamaan hai ya nahi
     5. Aur phir: paisa kahan hai

   Upar "Aaj ka kaam" ki patti hai — jahan kuch karna ho wahan
   seedha button. Us ke neeche wohi poora hisab jo retail ke
   safhe par hai: paisa kahan khara hai, kharcha kahan gaya,
   mahine ka nafa-nuqsan, kaunsa maal chal raha hai aur kaunsa
   atka hua hai.

   NOTE — "paisa kahan hai", ghanton ka naqsha aur sust maal
   `/retail/dashboard/*` se aate hain. Naam retail ka hai magar
   backend me ye `BusinessPulseService` hai jo har industry ke
   liye ek jaisa chalta hai (tenant + shop se chhanta hai, industry
   se nahi). Is liye bakery inhi raaston se laati hai — alag API
   banane ki zaroorat nahi.
   ═════════════════════════════════════════════════════════════ */

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981', CARD: '#3b82f6', JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e', BANK_TRANSFER: '#8b5cf6', CREDIT: '#f43f5e',
};
const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2, CREDIT: BookOpen,
};

/* Jin kharcha-categories ka apna rang set nahi — ye aath rang
   colour-blindness ke sath bhi alag rehte hain. Har patti par naam
   aur raqam bhi likhi hai, to pehchan kabhi sirf rang par nahi. */
const CATEGORY_FALLBACK = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const CATEGORY_FALLBACK_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
const hourTick = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);
const formatPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const formatDate = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

const hoursTo = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
};

type Range = '7d' | '30d';

export default function BakeryDashboardV2() {
  const hideCost = useCostHidden();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const userName = useAuthStore((s: any) => s.user?.fullName?.split(' ')[0] ?? 'Boss');
  const [showTeacher, setShowTeacher] = useState(false);
  const [range, setRange] = useState<Range>('7d');
  /* Masroof ghante: sirf aaj, ya hafte ka rozana ausat. Ausat is liye
     ke ek din ka rush ittefaq ho sakta hai — hafte ka naqsha asli
     aadat dikhata hai. Bakery me ye subah ke batch ka waqt tay karta hai. */
  const [hourDays, setHourDays] = useState<1 | 7>(1);

  /* ── Data ── */
  const overviewQ = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });
  const moneyQ = useQuery({
    queryKey: ['retail-money-map'],
    queryFn: () => retailDashboardApi.moneyMap().catch(() => null),
    refetchInterval: 60_000,
  });
  const hourlyQ = useQuery({
    queryKey: ['retail-hourly', hourDays],
    queryFn: () => retailDashboardApi.salesByHour(hourDays).catch(() => null),
    refetchInterval: 60_000,
  });
  const slowQ = useQuery({
    queryKey: ['retail-slow-movers'],
    queryFn: () => retailDashboardApi.slowMovers(30).catch(() => [] as any[]),
    refetchInterval: 5 * 60_000,
  });

  const cakeQ = useQuery({ queryKey: ['cake-orders'], queryFn: () => cakeOrdersApi.list({}).catch(() => []) });
  const bulkQ = useQuery({ queryKey: ['bulk-orders'], queryFn: () => bulkOrdersApi.list({}).catch(() => []) });
  const prodQ = useQuery({ queryKey: ['bakery-production-today'], queryFn: () => productionApi.today().catch(() => []) });
  const ingQ = useQuery({ queryKey: ['bakery-ingredients'], queryFn: () => ingredientsApi.list({}).catch(() => []) });
  const freshQ = useQuery({ queryKey: ['freshness-logs'], queryFn: () => freshnessApi.list({}).catch(() => []) });

  /* Taazgi ke log me sirf productId aur naam hota hai, rate nahi —
     is liye maal ki list se rate nikal kar jorte hain. Warna "3 batch
     kharab ho raha hai" sunne me chhoti baat lagti hai; "Rs 4,500 ka
     maal" sunte hi dukaan-daar harkat me aata hai. */
  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
    staleTime: 5 * 60_000,
  });

  const priceById = useMemo(() => {
    const m = new Map<string, number>();
    (productsQ.data?.items ?? []).forEach((p: any) => m.set(p.id, Number(p.price || 0)));
    return m;
  }, [productsQ.data]);

  const refetchAll = () => {
    overviewQ.refetch(); moneyQ.refetch(); hourlyQ.refetch(); slowQ.refetch(); productsQ.refetch();
    cakeQ.refetch(); bulkQ.refetch(); prodQ.refetch(); ingQ.refetch(); freshQ.refetch();
  };

  const o = overviewQ.data;
  const s = (o?.stats ?? {}) as any;
  const money = moneyQ.data as any;
  const slowMovers: any[] = (slowQ.data as any[]) ?? [];

  /* ── 1. Jald kharab hone wala ── */
  const fresh = useMemo(() => {
    const live = (freshQ.data ?? []).filter((f: any) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0);
    const withLeft = live.map((f: any) => ({ ...f, left: hoursTo(f.expiryDate || f.bestBefore) ?? 999 }));
    return {
      expired: withLeft.filter((f) => f.left <= 0),
      urgent: withLeft.filter((f) => f.left > 0 && f.left <= 12),
      qty: withLeft.filter((f) => f.left <= 12).reduce((x, f) => x + Number(f.currentQty || 0), 0),
      /* Jo maal aaj nahi nikla wo kal kachra hai — qeemat bhi jor lete
         hain, warna "3 batch" sunne me chhota lagta hai. */
      value: withLeft.filter((f) => f.left <= 24)
        .reduce((x, f) => x + Number(f.currentQty || 0) * (priceById.get(f.productId) ?? 0), 0),
      list: withLeft.filter((f) => f.left <= 24).sort((a, b) => a.left - b.left).slice(0, 5),
    };
  }, [freshQ.data, priceById]);

  /* ── 2. Aaj ki baking ── */
  const production = useMemo(() => {
    const plans = prodQ.data ?? [];
    const items = plans.flatMap((p: any) => p.items ?? []);
    return {
      planCount: plans.length,
      pending: items.filter((i: any) => i.status === 'PLANNED').length,
      inOven: items.filter((i: any) => i.status === 'BAKING').length,
      done: items.filter((i: any) => i.status === 'COMPLETED').length,
      total: items.length,
    };
  }, [prodQ.data]);

  /* ── 3. Aaj dena hai ── */
  const orders = useMemo(() => {
    const cakes = (cakeQ.data ?? []).map((c: any) => ({
      kind: 'cake' as const, id: c.id, name: c.customerName,
      number: c.orderNumber, status: c.status,
      left: hoursTo(c.deliveryDate || c.neededBy),
      total: Number(c.total || 0),
      due: Math.max(Number(c.total || 0) - Number(c.paidAmount || 0), 0),
      done: ['DELIVERED', 'CANCELLED'].includes(c.status),
    }));
    const bulks = (bulkQ.data ?? []).map((b: any) => ({
      kind: 'bulk' as const, id: b.id, name: b.organizationName,
      number: b.orderNumber, status: b.status,
      left: hoursTo(b.eventDate),
      total: Number(b.finalPrice ?? b.quotedPrice ?? 0),
      due: Math.max(Number(b.finalPrice ?? b.quotedPrice ?? 0) - Number(b.paidAmount || 0), 0),
      done: ['DELIVERED', 'CANCELLED'].includes(b.status),
    }));
    const all = [...cakes, ...bulks].filter((x) => !x.done);
    return {
      late: all.filter((x) => x.left !== null && x.left < 0),
      today: all.filter((x) => x.left !== null && x.left >= 0 && x.left <= 24),
      active: all,
      due: all.reduce((x, y) => x + y.due, 0),
      value: all.reduce((x, y) => x + y.total, 0),
      list: [...all].sort((a, b) => (a.left ?? 99999) - (b.left ?? 99999)).slice(0, 5),
    };
  }, [cakeQ.data, bulkQ.data]);

  /* ── 4. Banane ka saamaan ── */
  const raw = useMemo(() => {
    const list = (ingQ.data ?? []).filter((i: any) => i.isActive !== false);
    const low = list.filter((i: any) => {
      const level = Number(i.reorderLevel ?? i.minStock ?? 0);
      return Number(i.currentStock || 0) <= level;
    });
    return {
      total: list.length,
      low: low.length,
      critical: low.filter((i: any) => i.isCritical || Number(i.currentStock || 0) <= 0).length,
      value: list.reduce((x: number, i: any) => x + Number(i.currentStock || 0) * Number(i.costPerUnit || 0), 0),
      list: low.slice(0, 5),
    };
  }, [ingQ.data]);

  /* ── Aaj ka kaam ── */
  const todo = useMemo(() => {
    const t: Array<{ icon: any; tone: string; text: string; to: string; cta: string }> = [];
    if (fresh.expired.length > 0) t.push({
      icon: Flame, tone: 'rose',
      text: `${fresh.expired.length} batch ka waqt guzar chuka — aaj hi nikalna ya phenkna hai`,
      to: '/bakery/freshness', cta: 'Taazgi dekhein',
    });
    if (orders.late.length > 0) t.push({
      icon: AlertTriangle, tone: 'rose',
      text: `${orders.late.length} order late hai — customer ko batana zaroori hai`,
      to: '/bakery/cake-orders', cta: 'Orders dekhein',
    });
    if (fresh.urgent.length > 0) t.push({
      icon: Timer, tone: 'amber',
      text: `${fresh.urgent.length} batch agle 12 ghante me kharab ho jayega — discount laga dein`,
      to: '/bakery/freshness', cta: 'Jaldi bechein',
    });
    if (raw.critical > 0) t.push({
      icon: Wheat, tone: 'amber',
      text: `${raw.critical} zaroori saamaan khatam — is ke bagair banana ruk jayega`,
      to: '/bakery/ingredients', cta: 'Saamaan mangwayein',
    });
    if (orders.today.length > 0) t.push({
      icon: Cake, tone: 'violet',
      text: `${orders.today.length} order aaj dena hai`,
      to: '/bakery/cake-orders', cta: 'Dekhein',
    });
    if (production.pending > 0) t.push({
      icon: Croissant, tone: 'violet',
      text: `${production.pending} cheez abhi banani baqi hai`,
      to: '/bakery/production', cta: 'Baking dekhein',
    });
    if (production.planCount === 0) t.push({
      icon: ChefHat, tone: 'slate',
      text: 'Aaj ka koi baking plan nahi bana — subah plan banana asaan kar deta hai',
      to: '/bakery/production', cta: 'Plan banayein',
    });
    if ((s.lowStockCount ?? 0) > 0) t.push({
      icon: Package, tone: 'slate',
      text: `${s.lowStockCount} cheez counter par kam ho gayi`,
      to: '/low-stock', cta: 'Kya banana hai',
    });
    return t;
  }, [fresh, orders, raw, production, s.lowStockCount]);

  /* ── Charts ── */
  const trend7 = useMemo(() => (o?.salesTrend7Days ?? []).map((p: any) => {
    const d = new Date(p.date);
    return { ...p, label: ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'][d.getDay()].slice(0, 3) };
  }), [o]);

  const trend30 = useMemo(() => (o?.salesTrend30Days ?? []).map((p: any) => {
    const d = new Date(p.date);
    return { ...p, label: `${d.getDate()}/${d.getMonth() + 1}` };
  }), [o]);

  const chartData = range === '30d' ? trend30 : trend7;

  const hourlyRaw: any[] = (hourlyQ.data as any)?.hours ?? [];
  const peakHour: number | null = (hourlyQ.data as any)?.peakHour ?? null;
  const currentHour: number | undefined = (hourlyQ.data as any)?.currentHour;

  const hourlyData = useMemo(() => hourlyRaw
    /* Band ghanton ka khali khana chart me jagah kha jata hai — sirf
       wohi ghante jin me kuch bika, aur bakery ka aam waqt (subah 6 se). */
    .filter((h) => h.total > 0 || (h.hour >= 6 && h.hour <= 22))
    .map((h) => ({
      ...h,
      label: hourTick(h.hour),
      fullLabel: hourLabel(h.hour),
      isPeak: h.hour === peakHour && h.total > 0,
      isNow: hourDays === 1 && h.hour === currentHour,
    })), [hourlyRaw, peakHour, currentHour, hourDays]);

  const paymentData = useMemo(() => (o?.paymentBreakdown ?? []).map((p: any) => ({
    name: p.method || p.paymentMethod,
    value: Number(p.total ?? p._sum?.total ?? 0),
    color: PAYMENT_COLORS[p.method || p.paymentMethod] || '#64748b',
  })).filter((p) => p.value > 0), [o]);

  const totalPayments = paymentData.reduce((x, p) => x + p.value, 0);

  /* P&L — money-map ko tarjeeh, kyunke uski din/mahine ki haddein
     dukaan ke timezone par bani hain. Na aaye to purane stats se. */
  const pnl = useMemo(() => {
    const revenue = money?.profit?.monthRevenue ?? s.salesMonth ?? 0;
    const cogs = money?.profit?.monthCogs ?? s.cogsMonth ?? 0;
    const expenses = money?.profit?.monthExpenses ?? s.expensesMonth ?? 0;
    const gross = revenue - cogs;
    const net = gross - expenses;
    return {
      revenue, cogs, expenses, gross, net,
      grossPct: revenue > 0 ? (gross / revenue) * 100 : 0,
      netPct: revenue > 0 ? (net / revenue) * 100 : 0,
    };
  }, [money, s.salesMonth, s.cogsMonth, s.expensesMonth]);

  const growthYest = s.salesGrowthVsYesterday ?? 0;
  const growthMonth = s.salesGrowthVsLastMonth ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'g') setShowTeacher(true);
      if (k === 'r') refetchAll();
      if (k === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher]);

  const hour = new Date().getHours();
  const greet = hour < 5 ? { text: 'Raat ki shift', emoji: '🌙' }
    : hour < 12 ? { text: 'Subah bakhair', emoji: '☀️' }
      : hour < 17 ? { text: 'Dopahar bakhair', emoji: '🌤️' }
        : hour < 20 ? { text: 'Shaam bakhair', emoji: '🌆' }
          : { text: 'Raat bakhair', emoji: '🌙' };

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      <EmailVerifyBanner />
      <SubscriptionBanner />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
                <Cake className="h-3.5 w-3.5 text-amber-300" /> Bakery
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
                {greet.emoji} {greet.text}, {userName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
                {todo.length > 0
                  ? `Aaj ${todo.length} kaam tawajjo maangte hain`
                  : 'Sab theek hai — koi kaam latka hua nahi'}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap items-center shrink-0">
              <PrivacyToggle compact />
              <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
                className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
              </button>
              <button onClick={refetchAll} disabled={overviewQ.isRefetching} title="Taaza (R)"
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur disabled:opacity-50 transition">
                <RefreshCw className={`h-4 w-4 ${overviewQ.isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => window.print()} title="Print (P)"
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" />
              </button>
              <Link to="/pos"
                className="h-11 px-4 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
                <ShoppingCart className="h-4 w-4" /> Counter
              </Link>
            </div>
          </div>

          {/* Hero tiles */}
          <div className="relative mt-4 grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            <HeroTile icon={TrendingUp} tone="emerald" label="Aaj ki bikri"
              value={hideCost ? '••••' : formatPKR(s.salesToday ?? 0)}
              trend={growthYest} />
            <HeroTile icon={Receipt} tone="blue" label="Aaj ke bill"
              value={s.ordersToday ?? 0}
              sub={`Ausat ${hideCost ? '••••' : formatPKR(s.aovToday ?? 0)}`} />
            <HeroTile icon={Croissant} tone="violet" label="Aaj banana hai"
              value={production.total > 0 ? `${production.done}/${production.total}` : '—'}
              sub={production.inOven > 0 ? `${production.inOven} oven me` : `${production.pending} baqi`} />
            <HeroTile icon={Cake} tone="amber" label="Order dene hain"
              value={orders.today.length}
              sub={orders.late.length > 0 ? `${orders.late.length} late!` : `${orders.active.length} kul chaalu`}
              urgent={orders.late.length > 0} />
            <HeroTile icon={Timer} tone="rose" label="Jald kharab"
              value={fresh.expired.length + fresh.urgent.length}
              sub={fresh.value > 0 && !hideCost ? `${formatPKR(fresh.value)} ka maal` : `${fmtQty(fresh.qty)} cheezein`}
              urgent={fresh.expired.length > 0} />
          </div>
        </div>
      </section>

      {/* ═══ AAJ KA KAAM ═══ */}
      {todo.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white flex items-center justify-center shrink-0">
              <Target className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Aaj ka kaam</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Oopar wala sab se zaroori — neeche tak aate aate halka hota jata hai
              </p>
            </div>
          </header>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todo.map((t, i) => (
              <TodoRow key={i} {...t} />
            ))}
          </div>
        </section>
      )}

      {/* ═══ MAIN CHARTS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <Card>
          <CardHeader icon={TrendingUp} title="Bikri ka rujhan" tone="pink"
            subtitle={range === '7d' ? 'Pichhle 7 din' : 'Pichhle 30 din'}
            right={
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {(['7d', '30d'] as const).map((r) => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition ${
                      range === r ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
                    }`}>{r === '7d' ? '7 din' : '30 din'}</button>
                ))}
              </div>
            } />
          {chartData.length > 0 ? (
            <>
              <div className="h-[240px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bakerySale" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc', fontWeight: 700 }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 700 }} />
                    <Area type="monotone" dataKey="sales" name="Bikri" stroke="#ec4899" strokeWidth={2.5} fill="url(#bakerySale)" />
                    {!hideCost && <Area type="monotone" dataKey="profit" name="Munafa" stroke="#10b981" strokeWidth={2} fill="transparent" />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend items={hideCost
                ? [{ color: '#ec4899', label: 'Bikri' }]
                : [{ color: '#ec4899', label: 'Bikri' }, { color: '#10b981', label: 'Munafa' }]} />
            </>
          ) : <EmptyChart icon={BarChart3} message="Abhi koi bikri nahi" />}
        </Card>

        <Card>
          <CardHeader icon={Clock} title="Kis waqt rush hota hai" tone="amber"
            subtitle={peakHour != null ? `Sab se masroof ${hourLabel(peakHour)}` : 'Batch isi hisab se lagayein'}
            right={
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {([[1, 'Aaj'], [7, 'Hafta']] as const).map(([d, l]) => (
                  <button key={d} onClick={() => setHourDays(d as 1 | 7)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition ${
                      hourDays === d ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
                    }`}>{l}</button>
                ))}
              </div>
            } />
          {hourlyData.length > 0 ? (
            <>
              <div className="h-[240px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      labelFormatter={(_: any, p: any) => p?.[0]?.payload?.fullLabel ?? ''}
                      contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc', fontWeight: 700 }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {hourlyData.map((h, i) => (
                        <Cell key={i} fill={h.isPeak ? '#db2777' : h.isNow ? '#f59e0b' : '#f9a8d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center">
                {hourDays === 1 ? 'Aaj ka hisab' : 'Hafte ka rozana ausat'} · gehra rang = sab se masroof ghanta
                {peakHour != null && ' — us se pehle wala batch tayyar hona chahiye'}
              </p>
            </>
          ) : <EmptyChart icon={Clock} message="Abhi ghanton ka hisab nahi" />}
        </Card>
      </section>

      {/* ═══ PAISA KAHAN HAI ═══ */}
      {money && !hideCost && (
        <section>
          <SectionHead icon={PiggyBank} tone="emerald" title="Paisa kahan hai 💰"
            sub="Maal, saamaan, kharcha, lena aur dena — sab ek nazar me" />

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
            <MoneyTile icon={Boxes} tone="teal" to="/stock-report" label="Counter par maal"
              value={formatPKR(money.inventory.valueAtCost)}
              sub={`${money.inventory.productCount} cheezein • bikne par ${formatPKR(money.inventory.valueAtRetail)}`} />
            <MoneyTile icon={Wheat} tone="orange" to="/bakery/ingredients" label="Banane ka saamaan"
              value={formatPKR(raw.value)}
              sub={raw.low > 0 ? `${raw.total} cheezein • ${raw.low} kam ho gayi` : `${raw.total} cheezein`}
              urgent={raw.critical > 0} />
            <MoneyTile icon={ShoppingBag} tone="violet" to="/purchases" label="Is mahine maal aaya"
              value={formatPKR(money.purchases.monthTotal)}
              sub={`${money.purchases.monthCount} bill${money.purchases.monthUnpaid > 0 ? ` • ${formatPKR(money.purchases.monthUnpaid)} baqi` : ''}`} />
            <MoneyTile icon={Wallet} tone="amber" to="/expenses" label="Is mahine kharcha"
              value={formatPKR(money.expenses.month)}
              sub={`${money.expenses.monthCount} entries • pichhle mahine ${formatPKR(money.expenses.lastMonth ?? 0)}`} />
            <MoneyTile icon={BookOpen} tone="rose" to="/khata" label="Logon se lena"
              value={formatPKR(money.receivable.total)}
              sub={`${money.receivable.customerCount} logon ka udhaar${orders.due > 0 ? ` • orders par ${formatPKR(orders.due)}` : ''}`}
              urgent={money.receivable.total > 0} />
            <MoneyTile icon={Banknote} tone="emerald" to="/cash-register" label="Counter me cash"
              value={money.cash.registerOpen ? formatPKR(money.cash.expected) : '—'}
              sub={money.cash.registerOpen ? `Opening ${formatPKR(money.cash.opening)}` : 'Register band hai'} />
          </div>

          {/* Bakery ka apna phansa hua paisa: wo maal jo kal kachra hai */}
          {fresh.value > 0 && (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/15 dark:to-amber-500/15 border-2 border-rose-200 dark:border-rose-500/30 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Timer className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 dark:text-white text-sm">
                  {formatPKR(fresh.value)} ka maal 24 ghante me kharab ho jayega
                </div>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Ye paisa aaj nahi nikla to kal kachra hai — discount laga dein, ya staff ko de dein
                </div>
              </div>
              <Link to="/bakery/freshness"
                className="shrink-0 text-rose-700 dark:text-rose-300 text-xs font-black inline-flex items-center gap-1 hover:underline">
                Taazgi dekhein <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {money.inventory.deadStockValue > 0 && (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-slate-50 to-violet-50 dark:from-slate-800/60 dark:to-violet-500/15 border-2 border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-violet-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Hourglass className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 dark:text-white text-sm">
                  {formatPKR(money.inventory.deadStockValue)} ka maal atka hua hai
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {money.inventory.deadStockCount} cheezein 60 din se nahi bikin — deal bana kar nikalein
                </div>
              </div>
              <Link to="/bakery/products"
                className="shrink-0 text-violet-700 dark:text-violet-300 text-xs font-black inline-flex items-center gap-1 hover:underline">
                Maal dekhein <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ═══ KHARCHA + KHARIDARI ═══ */}
      {money && !hideCost && (
        <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader icon={Wallet} title="Kharcha kahan gaya" subtitle="Is mahine, sab se bara pehle" tone="amber"
              right={<Link to="/expenses" className="text-pink-700 dark:text-pink-400 text-xs font-black inline-flex items-center gap-1 hover:underline">Sab <ArrowRight className="h-3.5 w-3.5" /></Link>} />
            {money.expenses.byCategory?.length > 0
              ? <ExpenseBars rows={money.expenses.byCategory} total={money.expenses.month} />
              : <EmptyList icon={Wallet} message="Is mahine koi kharcha darj nahi" />}
          </Card>

          <Card noPad>
            <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shrink-0">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Maal ki kharidari</h3>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Aaj {formatPKR(money.purchases.todayTotal)} • mahine {formatPKR(money.purchases.monthTotal)}
                </p>
              </div>
              <Link to="/purchases" className="text-pink-700 dark:text-pink-400 text-xs font-black inline-flex items-center gap-1 hover:underline shrink-0">
                Sab <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
              {money.purchases.recent?.length ? money.purchases.recent.map((pu: any) => {
                const due = Number(pu.total) - Number(pu.paidAmount);
                return (
                  <Link key={pu.id} to={`/purchases/${pu.id}`}
                    className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-900 dark:text-white truncate text-sm">{pu.supplier?.name || 'Supplier'}</div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate font-mono">
                        {pu.purchaseNumber} • {formatDate(pu.purchasedAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-slate-900 dark:text-white text-sm tabular-nums">{formatPKR(pu.total)}</div>
                      {due > 0 && <div className="text-[10px] font-black text-amber-700 dark:text-amber-400">Baqi: {formatPKR(due)}</div>}
                    </div>
                  </Link>
                );
              }) : <EmptyList icon={ShoppingBag} message="Abhi koi kharidari nahi" />}
            </div>
          </Card>
        </section>
      )}

      {/* ═══ P&L + PAYMENT ═══ */}
      {!hideCost && (
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
          <Card>
            <CardHeader icon={PiggyBank} title="Nafa aur nuqsan (mahina)" subtitle="Bechne se le kar haath me bachne tak" tone="emerald"
              right={growthMonth !== 0 && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black border ${
                  growthMonth >= 0
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                }`}>
                  {growthMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {formatPercent(growthMonth)}
                </div>
              )} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <PnLCell label="Bikri" value={formatPKR(pnl.revenue)} sub={`${s.ordersMonth ?? 0} bill`} tone="emerald" icon={TrendingUp} />
              <PnLCell label="− Maal ki lagat" value={formatPKR(pnl.cogs)} sub="Saamaan + banane ka kharch" tone="rose" icon={TrendingDown} />
              <PnLCell label="= Seedha munafa" value={formatPKR(pnl.gross)} sub={`${pnl.grossPct.toFixed(1)}% margin`} tone="emerald" icon={Sparkles} />
              <PnLCell label="− Kharche" value={formatPKR(pnl.expenses)} sub="Bijli, kiraya, tankhwah" tone="amber" icon={Wallet} />
              <PnLCell label="= Haath me bacha" value={formatPKR(pnl.net)} sub={`Margin ${pnl.netPct.toFixed(1)}%`} tone="pink" icon={Target} highlight />
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="text-[10px] uppercase tracking-wider font-black text-slate-600 dark:text-slate-400 shrink-0">Aaj</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Bikri</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(s.salesToday ?? 0)}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Kharcha</span>
                <span className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatPKR(money?.expenses?.today ?? s.expensesToday ?? 0)}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Bacha</span>
                <span className={`text-sm font-black tabular-nums ${
                  (money?.profit?.todayNet ?? s.netProfitToday ?? 0) >= 0
                    ? 'text-pink-700 dark:text-pink-400' : 'text-rose-700 dark:text-rose-400'
                }`}>{formatPKR(money?.profit?.todayNet ?? s.netProfitToday ?? 0)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={DollarSign} title="Paisa kaise aaya" subtitle="Is mahine ka split" tone="pink" />
            {paymentData.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" outerRadius={75} innerRadius={45}
                        dataKey="value" labelLine={false} paddingAngle={3}>
                        {paymentData.map((p) => <Cell key={p.name} fill={p.color} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                        contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: 'rgba(15,23,42,0.95)', color: '#f8fafc' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  {paymentData.map((p) => {
                    const Icon = PAYMENT_ICONS[p.name] || CreditCard;
                    const pct = totalPayments > 0 ? (p.value / totalPayments) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center gap-2 text-xs">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: p.color }}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-black text-slate-700 dark:text-slate-200 min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="font-bold text-slate-500 dark:text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
                        <span className="font-black text-slate-900 dark:text-white tabular-nums shrink-0">{formatPKR(p.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <EmptyChart icon={DollarSign} message="Abhi koi bikri nahi" />}
          </Card>
        </section>
      )}

      {/* ═══ JALDI KAAM ═══ */}
      <section>
        <SectionHead icon={Rocket} tone="pink" title="Jaldi kaam 🚀" sub="Bakery ki har cheez ek jagah" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          <OpsCard to="/pos" icon={ShoppingCart} title="Counter" desc="Bikri karein" tone="pink" primary />
          <OpsCard to="/bakery/cake-orders/new" icon={Cake} title="Cake order" desc="Naya order" tone="fuchsia" />
          <OpsCard to="/bakery/production" icon={ChefHat} title="Baking" desc={production.total > 0 ? `${production.done}/${production.total} hua` : 'Plan banayein'} tone="violet" />
          <OpsCard to="/bakery/freshness" icon={Timer} title="Taazgi" desc={fresh.expired.length > 0 ? `${fresh.expired.length} guzar gaya` : 'Sab theek'} tone="rose" />
          <OpsCard to="/bakery/ingredients" icon={Wheat} title="Saamaan" desc={raw.low > 0 ? `${raw.low} kam` : `${raw.total} cheezein`} tone="orange" />
          <OpsCard to="/bakery-products/new" icon={Plus} title="Nayi cheez" desc="Maal me daalein" tone="emerald" />
          <OpsCard to="/bakery/products" icon={Package} title="Maal" desc={`${s.totalProducts ?? 0} cheezein`} tone="teal" />
          <OpsCard to="/bakery/bulk-orders" icon={ShoppingBag} title="Bare order" desc="Shadi, daftar" tone="amber" />
          <OpsCard to="/customers" icon={Users} title="Grahak" desc={`${s.totalCustomers ?? 0} log`} tone="blue" />
          <OpsCard to="/khata" icon={BookOpen} title="Khata" desc={hideCost ? '••••' : formatPKR(s.totalUdhaar ?? 0)} tone="rose" />
          <OpsCard to="/sales" icon={Receipt} title="Bikri record" desc="Purane bill" tone="indigo" />
          <OpsCard to="/reports" icon={BarChart3} title="Reports" desc="Poora hisab" tone="purple" />
        </div>
      </section>

      {/* ═══ KPI GRID ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard title="Kul maal" value={s.totalProducts ?? 0} icon={Package} tone="pink" link="/bakery/products" />
        <StatCard title="Kam ho gaya" value={s.lowStockCount ?? 0} icon={AlertTriangle} tone="amber" link="/low-stock" alert sub="Banana parega" />
        <StatCard title="Khatam" value={s.outOfStockCount ?? 0} icon={PackageX} tone="orange" link="/low-stock" alert />
        <StatCard title="Grahak" value={s.totalCustomers ?? 0} icon={Users} tone="violet" link="/customers" />
        <StatCard title="Udhaar" value={hideCost ? '••••' : formatPKR(s.totalUdhaar ?? 0)} icon={BookOpen} tone="rose" link="/khata"
          sub={`${s.customersWithUdhaar ?? 0} logon par`} />
        <StatCard title="Chaalu order" value={orders.active.length} icon={Cake} tone="fuchsia" link="/bakery/cake-orders"
          sub={hideCost ? undefined : formatPKR(orders.value)} />
      </section>

      {/* ═══ KYA CHAL RAHA, KYA ATKA ═══ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shrink-0">
              <Crown className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Sab se zyada kya bika</h3>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Is mahine — isi ka batch bara rakhein</p>
            </div>
            <Link to="/reports" className="text-pink-700 dark:text-pink-400 text-xs font-black inline-flex items-center gap-1 hover:underline shrink-0">
              Sab <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
            {(o?.topProducts ?? []).length > 0 ? (o?.topProducts ?? []).slice(0, 8).map((p: any, i: number) => (
              <Link key={p.productId ?? i} to={`/bakery-products/${p.productId}`}
                className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <span className={`h-8 w-8 rounded-xl text-white text-xs font-black flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                    : i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                      : i === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 dark:text-white truncate text-sm">{p.product?.name ?? 'Cheez'}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {fmtQty(Number(p.quantitySold || 0))} {p.product?.unit ?? ''} · {p.orderCount ?? 0} bill
                  </div>
                </div>
                <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm tabular-nums shrink-0">
                  {hideCost ? '••••' : formatPKR(p.revenue || 0)}
                </div>
              </Link>
            )) : <EmptyList icon={Crown} message="Abhi koi bikri nahi" />}
          </div>
        </Card>

        <Card noPad>
          <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-500 to-violet-700 text-white flex items-center justify-center shadow-lg shrink-0">
              <Hourglass className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Kaunsa maal atka hua hai</h3>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">30 din se nahi bika — ya deal banayein ya banana band</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
            {slowMovers.length > 0 ? slowMovers.slice(0, 8).map((p: any) => (
              <Link key={p.id} to={`/bakery-products/${p.id}`}
                className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 dark:text-white truncate text-sm">{p.name}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Stock {fmtQty(Number(p.stock || 0))} {p.unit ?? ''}
                    {p.lastSoldAt ? ` · aakhri bikri ${formatDate(p.lastSoldAt)}` : ' · kabhi nahi bika'}
                  </div>
                </div>
                {!hideCost && (
                  <div className="font-black text-slate-700 dark:text-slate-300 text-sm tabular-nums shrink-0">
                    {formatPKR(Number(p.stock || 0) * Number(p.costPrice ?? p.price ?? 0))}
                  </div>
                )}
              </Link>
            )) : <EmptyList icon={Star} message="Shabash — sab maal chal raha hai" />}
          </div>
        </Card>
      </section>

      {/* ═══ BAKERY KI APNI LISTEIN ═══ */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Card noPad>
          <ListHead icon={Timer} tone="from-rose-500 to-orange-600" title="Jald kharab hone wala"
            sub={fresh.value > 0 && !hideCost ? `${formatPKR(fresh.value)} ka maal` : '24 ghante ke andar'}
            to="/bakery/freshness" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {fresh.list.length > 0 ? fresh.list.map((f: any) => (
              <div key={f.id} className="px-4 py-2.5 flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                  f.left <= 0 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600'
                }`}>
                  {f.left <= 0 ? <Flame className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {f.productName ?? 'Batch'}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {fmtQty(Number(f.currentQty || 0))} baqi
                    {f.batchNumber && ` · ${f.batchNumber}`}
                    {priceById.get(f.productId) && !hideCost
                      ? ` · ${formatPKR(Number(f.currentQty || 0) * (priceById.get(f.productId) ?? 0))}`
                      : ''}
                  </div>
                </div>
                <span className={`text-[11px] font-black shrink-0 ${f.left <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {f.left <= 0 ? 'Guzar gaya' : `${Math.round(f.left)}h`}
                </span>
              </div>
            )) : <EmptyList icon={Timer} message="Kuch jald kharab nahi ho raha" />}
          </div>
        </Card>

        <Card noPad>
          <ListHead icon={Cake} tone="from-pink-500 to-fuchsia-700" title="Aane wale order"
            sub={orders.due > 0 && !hideCost ? `${formatPKR(orders.due)} baqi lena hai` : `${orders.active.length} chaalu`}
            to="/bakery/cake-orders" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.list.length > 0 ? orders.list.map((x: any) => (
              <Link key={x.id} to={x.kind === 'cake' ? '/bakery/cake-orders' : '/bakery/bulk-orders'}
                className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <span className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 text-pink-600 flex items-center justify-center shrink-0">
                  {x.kind === 'cake' ? <Cake className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">{x.name || 'Grahak'}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono truncate">{x.number}</div>
                </div>
                <span className={`text-[11px] font-black shrink-0 ${
                  x.left == null ? 'text-slate-400' : x.left < 0 ? 'text-rose-600' : x.left <= 24 ? 'text-amber-600' : 'text-slate-500'
                }`}>
                  {x.left == null ? '—' : x.left < 0 ? 'Late!' : x.left <= 24 ? `${Math.round(x.left)}h` : `${Math.round(x.left / 24)}d`}
                </span>
              </Link>
            )) : <EmptyList icon={Cake} message="Koi order baqi nahi" />}
          </div>
        </Card>

        <Card noPad>
          <ListHead icon={Wheat} tone="from-amber-500 to-orange-600" title="Saamaan kam ho gaya"
            sub={raw.critical > 0 ? `${raw.critical} bilkul khatam` : `${raw.low} cheezein kam`}
            to="/bakery/ingredients" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {raw.list.length > 0 ? raw.list.map((i: any) => (
              <div key={i.id} className="px-4 py-2.5 flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Wheat className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">{i.name}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {fmtQty(Number(i.currentStock || 0))} {i.unit ?? ''} baqi
                  </div>
                </div>
                {Number(i.currentStock || 0) <= 0 && (
                  <span className="text-[10px] font-black text-rose-600 shrink-0">Khatam</span>
                )}
              </div>
            )) : <EmptyList icon={Wheat} message="Saara saamaan poora hai" />}
          </div>
        </Card>
      </section>

      {/* ═══ HAALIYA BIKRI + KAM STOCK ═══ */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card noPad>
          <ListHead icon={Receipt} tone="from-pink-500 to-fuchsia-700" title="Haaliya bikri" sub="Aakhri bill" to="/sales" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
            {(o?.recentSales ?? []).length > 0 ? (o?.recentSales ?? []).slice(0, 8).map((sale: any) => (
              <Link key={sale.id} to={`/sales/${sale.id}/receipt`}
                className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (PAYMENT_COLORS[sale.paymentMethod] ?? '#64748b') + '22' }}>
                  <Receipt className="h-4 w-4" style={{ color: PAYMENT_COLORS[sale.paymentMethod] ?? '#64748b' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 dark:text-white truncate text-sm font-mono">{sale.saleNumber}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                    {sale.customer?.name ?? 'Walk-in'} · {formatDate(sale.soldAt)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 dark:text-white text-sm tabular-nums">
                    {hideCost ? '••••' : formatPKR(sale.total)}
                  </div>
                  {Number(sale.creditAmount) > 0 && (
                    <div className="text-[10px] font-black text-amber-700 dark:text-amber-400">
                      {formatPKR(sale.creditAmount)} udhaar
                    </div>
                  )}
                </div>
              </Link>
            )) : <EmptyList icon={Receipt} message="Aaj abhi koi bill nahi bana" />}
          </div>
        </Card>

        <Card noPad>
          <ListHead icon={AlertTriangle} tone="from-amber-500 to-orange-600" title="Counter par kam ho gaya"
            sub="Agla batch isi ka" to="/low-stock" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
            {(o?.lowStockProducts ?? []).length > 0 ? (o?.lowStockProducts ?? []).slice(0, 8).map((p: any) => (
              <Link key={p.id} to={`/bakery-products/${p.id}`}
                className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  Number(p.stock) <= 0 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600'
                }`}>
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 dark:text-white truncate text-sm">{p.name}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {fmtQty(Number(p.stock || 0))} {p.unit} baqi · alert {p.lowStockAlert}
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                  Number(p.stock) <= 0
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}>{Number(p.stock) <= 0 ? 'Khatam' : 'Kam'}</span>
              </Link>
            )) : <EmptyList icon={Package} message="Sab cheezein poori hain" />}
          </div>
        </Card>
      </section>

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

function Card({ children, noPad = false }: any) {
  return (
    <div className={[
      'rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm',
      'border-2 border-slate-200 dark:border-slate-800',
      'shadow-sm dark:shadow-black/20 overflow-hidden',
      noPad ? '' : 'p-4 sm:p-5',
    ].join(' ')}>
      {children}
    </div>
  );
}

const HEAD_TONES: Record<string, string> = {
  pink: 'from-pink-500 to-fuchsia-600',
  violet: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-red-600',
};

function CardHeader({ icon: Icon, title, subtitle, tone, right }: any) {
  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${HEAD_TONES[tone] ?? HEAD_TONES.pink} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function SectionHead({ icon: Icon, title, sub, tone }: any) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${HEAD_TONES[tone] ?? HEAD_TONES.pink} text-white flex items-center justify-center shadow-lg`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function ListHead({ icon: Icon, tone, title, sub, to }: any) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">{title}</h3>
        {sub && <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">{sub}</p>}
      </div>
      {to && (
        <Link to={to} className="text-pink-700 dark:text-pink-400 text-xs font-black inline-flex items-center gap-1 hover:underline shrink-0">
          Sab <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
      {items.map((it) => (
        <div key={it.label} className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

const HERO_TONES: Record<string, string> = {
  emerald: 'from-emerald-400/40 to-emerald-600/25 border-emerald-300/50',
  blue: 'from-blue-400/40 to-blue-600/25 border-blue-300/50',
  amber: 'from-amber-400/40 to-amber-600/25 border-amber-300/50',
  violet: 'from-violet-400/40 to-violet-600/25 border-violet-300/50',
  rose: 'from-rose-400/40 to-rose-600/25 border-rose-300/50',
};

function HeroTile({ icon: Icon, label, value, sub, trend, tone, urgent }: any) {
  return (
    <div className={[
      'relative rounded-2xl bg-gradient-to-br backdrop-blur-md border p-3 shadow-lg',
      HERO_TONES[tone],
      urgent ? 'ring-2 ring-amber-300/60' : '',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-white/90" />
        <div className="text-[10px] uppercase tracking-widest font-black text-white/95 truncate">{label}</div>
      </div>
      <div className="text-lg sm:text-2xl font-black text-white tabular-nums leading-tight truncate drop-shadow-sm">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-[11px] font-bold text-white/85 mt-1 truncate">
        {trend !== undefined ? (
          <span className={`inline-flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPercent(trend)} vs kal
          </span>
        ) : sub}
      </div>
    </div>
  );
}

/* ── Aaj ka kaam ki ek line ── */
const TODO_TONES: Record<string, { grad: string; text: string; border: string }> = {
  rose: { grad: 'from-rose-500 to-red-600', text: 'text-rose-700 dark:text-rose-300', border: 'hover:border-rose-300' },
  amber: { grad: 'from-amber-500 to-orange-600', text: 'text-amber-700 dark:text-amber-300', border: 'hover:border-amber-300' },
  violet: { grad: 'from-violet-500 to-purple-600', text: 'text-violet-700 dark:text-violet-300', border: 'hover:border-violet-300' },
  slate: { grad: 'from-slate-500 to-slate-700', text: 'text-slate-600 dark:text-slate-300', border: 'hover:border-slate-300' },
};

function TodoRow({ icon: Icon, tone, text, to, cta }: any) {
  const t = TODO_TONES[tone] ?? TODO_TONES.slate;
  return (
    <Link to={to} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
      <span className={`h-10 w-10 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={`flex-1 min-w-0 text-[13px] font-bold ${t.text}`}>{text}</p>
      <span className="shrink-0 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-black inline-flex items-center gap-1 group-hover:bg-pink-100 dark:group-hover:bg-pink-500/20 group-hover:text-pink-700 dark:group-hover:text-pink-300 transition">
        {cta} <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}

const PNL_TONES: Record<string, string> = {
  emerald: 'text-emerald-700 dark:text-emerald-400',
  rose: 'text-rose-700 dark:text-rose-400',
  amber: 'text-amber-700 dark:text-amber-400',
  pink: 'text-pink-700 dark:text-pink-400',
};

function PnLCell({ label, value, sub, tone, icon: Icon, highlight }: any) {
  return (
    <div className={[
      'rounded-2xl p-3 border-2',
      highlight
        ? 'bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 border-pink-300 dark:border-pink-500/40'
        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3 w-3 ${PNL_TONES[tone]}`} />
        <div className="text-[10px] uppercase tracking-wider font-black text-slate-600 dark:text-slate-400 truncate">{label}</div>
      </div>
      <div className={`text-base sm:text-xl font-black tabular-nums leading-tight ${PNL_TONES[tone]}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1 truncate">{sub}</div>
    </div>
  );
}

const OPS_TONES: Record<string, string> = {
  pink: 'from-pink-500 to-fuchsia-600',
  fuchsia: 'from-fuchsia-500 to-purple-600',
  violet: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-red-600',
  orange: 'from-orange-500 to-amber-600',
  emerald: 'from-emerald-500 to-green-600',
  teal: 'from-teal-500 to-emerald-600',
  amber: 'from-amber-500 to-orange-500',
  blue: 'from-blue-500 to-indigo-600',
  indigo: 'from-indigo-500 to-blue-600',
  purple: 'from-purple-500 to-fuchsia-600',
};

function OpsCard({ to, icon: Icon, title, desc, tone, primary }: any) {
  return (
    <Link to={to} className={[
      'rounded-2xl border-2 p-3 sm:p-4 group hover:-translate-y-1 transition-all duration-200',
      primary
        ? 'bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 border-pink-300 dark:border-pink-500/40 shadow-lg'
        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-500/50 hover:shadow-lg',
    ].join(' ')}>
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${OPS_TONES[tone] ?? OPS_TONES.pink} text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">{title}</div>
      <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 truncate">{desc}</div>
    </Link>
  );
}

const MONEY_TONES: Record<string, { grad: string; ring: string }> = {
  teal: { grad: 'from-teal-500 to-emerald-600', ring: 'hover:border-teal-300 dark:hover:border-teal-500/50' },
  violet: { grad: 'from-violet-500 to-purple-600', ring: 'hover:border-violet-300 dark:hover:border-violet-500/50' },
  amber: { grad: 'from-amber-500 to-orange-600', ring: 'hover:border-amber-300 dark:hover:border-amber-500/50' },
  rose: { grad: 'from-rose-500 to-red-600', ring: 'hover:border-rose-300 dark:hover:border-rose-500/50' },
  orange: { grad: 'from-orange-500 to-amber-600', ring: 'hover:border-orange-300 dark:hover:border-orange-500/50' },
  emerald: { grad: 'from-emerald-500 to-green-600', ring: 'hover:border-emerald-300 dark:hover:border-emerald-500/50' },
};

function MoneyTile({ icon: Icon, label, value, sub, tone, to, urgent }: any) {
  const t = MONEY_TONES[tone] ?? MONEY_TONES.teal;
  return (
    <Link to={to} className={[
      'rounded-2xl bg-white dark:bg-slate-900/60 border-2 p-3 sm:p-4',
      'shadow-sm dark:shadow-black/20 hover:shadow-lg transition-all hover:-translate-y-0.5',
      urgent ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
      t.ring,
    ].join(' ')}>
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-md mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] uppercase tracking-wider font-black text-slate-600 dark:text-slate-400 truncate">{label}</div>
      <div className="mt-0.5 text-base sm:text-xl font-black text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1 leading-snug line-clamp-2">{sub}</div>
    </Link>
  );
}

/**
 * Kharche ki categories — sab se bari pehle.
 *
 * Gol chart ki jagah seedhi patiyan: "kaunsa kharcha sab se bara hai"
 * tarteeb ka sawal hai, aur lambai ka muqabla gole ke tukron se kahin
 * aasan hai. Har patti par naam aur raqam likhi hai — rang sirf
 * sajawat hai, pehchan nahi.
 */
function ExpenseBars({ rows, total }: { rows: any[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const fallback = isDark ? CATEGORY_FALLBACK_DARK : CATEGORY_FALLBACK;
        const color = r.color && r.color !== '#f59e0b' ? r.color : fallback[i % fallback.length];
        const pctOfTotal = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <div key={r.categoryId ?? `none-${i}`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{r.name}</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">×{r.count}</span>
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                {formatPKR(r.amount)}
                <span className="ml-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">{pctOfTotal.toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max((r.amount / max) * 100, 2)}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
      <div className="pt-2 mt-1 border-t-2 border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Kul kharcha</span>
        <span className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">{formatPKR(total)}</span>
      </div>
    </div>
  );
}

const STAT_TONES: Record<string, string> = {
  pink: 'from-pink-500 to-fuchsia-600',
  fuchsia: 'from-fuchsia-500 to-purple-600',
  violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600',
  orange: 'from-orange-500 to-red-600',
  rose: 'from-rose-500 to-red-600',
};

function StatCard({ title, value, icon: Icon, tone, link, alert, sub }: any) {
  const inner = (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/60 border-2 p-3 sm:p-4',
      'shadow-sm dark:shadow-black/20 hover:shadow-lg transition-all hover:-translate-y-0.5 relative',
      alert && Number(value) > 0 ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      {alert && Number(value) > 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping" />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider font-black text-slate-600 dark:text-slate-400 truncate">{title}</div>
          <div className="mt-1 text-lg sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {sub && <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${STAT_TONES[tone] ?? STAT_TONES.pink} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

function EmptyChart({ icon: Icon, message }: any) {
  return (
    <div className="h-[240px] sm:h-[280px] flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
      <Icon className="h-10 w-10" />
      <p className="text-sm font-black">{message}</p>
    </div>
  );
}

function EmptyList({ icon: Icon, message }: any) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-black text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

/* ── Sikhein ── */
function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Ye safha kya batata hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Upar se neeche, isi tarteeb se parhein</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Target, t: 'Aaj ka kaam — sab se pehle yehi', d: 'Oopar wali patti batati hai ke abhi kya karna hai. Sab se upar wala sab se zaroori hai. Har line par seedha button — dhoondna nahi parta.' },
            { i: Timer, t: 'Taazgi sab se pehle aati hai', d: 'Jo maal aaj nahi nikla wo kal kachra hai. Is liye "jald kharab" ki qeemat bhi likhi hai — "3 batch" sunne me chhota lagta hai, magar Rs 4,500 sunte hi baat samajh aa jati hai.' },
            { i: Clock, t: 'Rush ka waqt dekh kar batch lagayein', d: 'Chart me gehra rang sab se masroof ghanta hai. Us se pehle wala batch tayyar hona chahiye. "Hafta" dabayein to ek din ka ittefaq nahi, asli aadat dikhti hai.' },
            { i: PiggyBank, t: 'Paisa kahan hai', d: 'Counter ka maal, banane ka saamaan, mahine ka kharcha, logon se lena, aur counter ka cash — chhe khane. Har khana apni jagah le jata hai.' },
            { i: Wallet, t: 'Kharcha kahan gaya', d: 'Patiyon me, sab se bara pehle. Gol chart se behtar hai kyunke lambai ka muqabla aasan hota hai, aur har patti par naam aur raqam likhi hai.' },
            { i: PiggyBank, t: 'Nafa-nuqsan ka poora silsila', d: 'Bikri → maal ki lagat → seedha munafa → kharche → haath me bacha. Is se pata chalta hai ke munafa rate se kam hua ya kharchon se. Neeche "Aaj" ki alag line bhi hai.' },
            { i: Hourglass, t: 'Atka hua maal', d: '30 din se jo nahi bika — ya deal bana kar nikalein, ya wo cheez banana band kar dein. Har mahine ye list chhoti honi chahiye.' },
            { i: DollarSign, t: 'Paisa chhupana ho to', d: 'Upar 🔒 wala button dabayein — lagat, munafa aur kul raqam chhup jati hai. Staff ke samne safha kholna ho to kaam aata hai.' },
          ].map((x, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white flex items-center justify-center shrink-0">
                <x.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{x.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{x.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['G', 'Ye safha'], ['R', 'Taaza karein'], ['P', 'Print'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-pink-600 to-fuchsia-700">Samajh gaya</Button>
        </footer>
      </div>
    </div>
  );
}
