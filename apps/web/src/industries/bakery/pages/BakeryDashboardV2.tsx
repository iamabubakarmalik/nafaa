import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Cake, ChefHat, Wheat, Timer, ShoppingBag, RefreshCw, TrendingUp,
  Package, DollarSign, Clock, ArrowRight, AlertTriangle, CheckCircle2,
  Flame, BarChart3, GraduationCap, X, Wallet, Users, Snowflake,
  Calendar, Croissant, Boxes, Receipt, Printer,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { dashboardApi } from '@modules/dashboard/api/dashboard.api';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { productionApi } from '../api/production.api';
import { ingredientsApi } from '../api/ingredients.api';
import { freshnessApi } from '../api/freshness.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { SubscriptionBanner } from '@modules/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';

/* ═════════════════════════════════════════════════════════════
   BAKERY DASHBOARD — AAJ KA KAAM, TARTEEB SE
   ─────────────────────────────────────────────────────────────
   Dashboard ka kaam number dikhana nahi — ye batana hai ke *abhi
   kya karna hai*. Bakery wale ka din hamesha isi tarteeb se
   chalta hai:

     1. Kya jald kharab ho raha hai — wo aaj hi nikalna hai
     2. Aaj kya banana hai
     3. Aaj kis ko order dena hai
     4. Saamaan hai ya nahi
     5. Aur phir: aaj kitna bika

   Upar "Aaj ka kaam" ki ek hi patti hai. Jahan kuch karna ho
   wahan seedha button — dhoondne ki zaroorat nahi.
   ═════════════════════════════════════════════════════════════ */

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);
const hoursTo = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
};

export default function BakeryDashboardV2() {
  const tenant = useAuthStore((s) => s.tenant);
  const userName = useAuthStore((s: any) => s.user?.fullName ?? '');
  const [showTeacher, setShowTeacher] = useState(false);

  const overviewQ = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const cakeQ = useQuery({ queryKey: ['cake-orders'], queryFn: () => cakeOrdersApi.list({}).catch(() => []) });
  const bulkQ = useQuery({ queryKey: ['bulk-orders'], queryFn: () => bulkOrdersApi.list({}).catch(() => []) });
  const prodQ = useQuery({ queryKey: ['bakery-production-today'], queryFn: () => productionApi.today().catch(() => []) });
  const ingQ = useQuery({ queryKey: ['bakery-ingredients'], queryFn: () => ingredientsApi.list({}).catch(() => []) });
  const freshQ = useQuery({ queryKey: ['freshness-logs'], queryFn: () => freshnessApi.list({}).catch(() => []) });

  const refetchAll = () => {
    overviewQ.refetch(); cakeQ.refetch(); bulkQ.refetch();
    prodQ.refetch(); ingQ.refetch(); freshQ.refetch();
  };

  const o = overviewQ.data;
  const stats = o?.stats;

  /* ── 1. Jald kharab hone wala ── */
  const fresh = useMemo(() => {
    const live = (freshQ.data ?? []).filter((f: any) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0);
    const withLeft = live.map((f: any) => ({ ...f, left: hoursTo(f.expiryDate || f.bestBefore) ?? 999 }));
    return {
      expired: withLeft.filter((f) => f.left <= 0),
      urgent: withLeft.filter((f) => f.left > 0 && f.left <= 12),
      qty: withLeft.filter((f) => f.left <= 12).reduce((s, f) => s + Number(f.currentQty || 0), 0),
      list: withLeft.filter((f) => f.left <= 24).sort((a, b) => a.left - b.left).slice(0, 5),
    };
  }, [freshQ.data]);

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
      due: all.reduce((s, x) => s + x.due, 0),
      list: [...all].sort((a, b) => (a.left ?? 99999) - (b.left ?? 99999)).slice(0, 5),
    };
  }, [cakeQ.data, bulkQ.data]);

  /* ── 4. Saamaan ── */
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
      value: list.reduce((s: number, i: any) => s + Number(i.currentStock || 0) * Number(i.costPerUnit || 0), 0),
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
    if ((stats?.lowStockCount ?? 0) > 0) t.push({
      icon: Package, tone: 'slate',
      text: `${stats?.lowStockCount} cheez counter par kam ho gayi`,
      to: '/low-stock', cta: 'Kya banana hai',
    });
    return t;
  }, [fresh, orders, raw, production, stats]);

  /* ── Charts ── */
  const trend = useMemo(
    () => (o?.salesTrend7Days ?? []).map((p: any) => ({
      name: new Date(p.date).toLocaleDateString('en-PK', { weekday: 'short' }),
      bikri: Math.round(Number(p.sales ?? p.total ?? 0)),
    })),
    [o],
  );

  const hourly = useMemo(
    () => (o?.hourlySalesToday ?? []).map((h: any) => ({
      name: `${h.hour}`, bikri: Math.round(Number(h.sales ?? h.total ?? 0)),
    })),
    [o],
  );

  const moneyPie = useMemo(() => ([
    { name: 'Counter par maal', value: Math.round(Number(stats?.inventoryValueAtCost ?? 0)) },
    { name: 'Banane ka saamaan', value: Math.round(raw.value) },
  ].filter((x) => x.value > 0)), [stats, raw.value]);

  const topProducts = useMemo(
    () => (o?.topProducts ?? []).slice(0, 8).map((p: any) => ({
      name: (p.product?.name ?? '—').slice(0, 14),
      value: Math.round(Number(p.revenue || 0)),
    })),
    [o],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'r') refetchAll();
      if (e.key.toLowerCase() === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Subah bakhair' : hour < 17 ? 'Assalam o alaikum' : 'Shaam bakhair';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <EmailVerifyBanner />
      <SubscriptionBanner />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Cake className="h-3.5 w-3.5 text-amber-300" /> {tenant?.name || 'Bakery'}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
              🍰 {greet}{userName ? `, ${String(userName).split(' ')[0]}` : ''}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              Aaj ki bikri <strong className="text-emerald-200">{formatPKR(stats?.salesToday ?? 0)}</strong> ·{' '}
              {stats?.ordersToday ?? 0} bill ·{' '}
              munafa <strong>{formatPKR(stats?.grossProfitToday ?? 0)}</strong>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Link to="/pos"
              className="h-11 px-4 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Receipt className="h-4 w-4" /> Counter
            </Link>
            <button onClick={() => setShowTeacher(true)}
              className="h-11 w-11 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg transition">
              <GraduationCap className="h-4 w-4" />
            </button>
            <button onClick={refetchAll} disabled={overviewQ.isRefetching}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${overviewQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ AAJ KA KAAM ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-pink-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Aaj ka kaam</h3>
          <span className="ml-auto text-xs font-black text-slate-500">{todo.length} cheezein</span>
        </div>
        {todo.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="mt-2 font-black text-slate-800 dark:text-slate-100">Sab kuch theek hai</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
              Na koi cheez kharab ho rahi, na koi order late. Aaram se kaam karein.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todo.map((t, i) => <TodoRow key={i} {...t} />)}
          </div>
        )}
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={DollarSign} label="Aaj ki bikri" value={formatPKR(stats?.salesToday ?? 0)}
          sub={`${stats?.ordersToday ?? 0} bill · ausat ${formatPKR(stats?.aovToday ?? 0)}`} tone="emerald" to="/sales" />
        <Kpi icon={Croissant} label="Aaj ki baking" value={`${production.done} / ${production.total}`}
          sub={production.inOven > 0 ? `${production.inOven} oven me` : `${production.pending} baqi`} tone="amber" to="/bakery/production" />
        <Kpi icon={Cake} label="Chal rahe orders" value={orders.active.length}
          sub={orders.due > 0 ? `${formatPKR(orders.due)} lena baqi` : 'Sab paisa mil gaya'} tone="pink" to="/bakery/cake-orders" />
        <Kpi icon={Boxes} label="Phansa hua paisa" value={formatPKR(Number(stats?.inventoryValueAtCost ?? 0) + raw.value)}
          sub={`Saamaan ${formatPKR(raw.value)}`} tone="violet" to="/stock-report" />
      </section>

      {/* ═══ CHARTS ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={TrendingUp} title="Pichhle 7 din ki bikri">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="bkTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={11} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Area type="monotone" dataKey="bikri" stroke="#ec4899" strokeWidth={3} fill="url(#bkTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyBox />}
        </ChartCard>

        <ChartCard icon={Clock} title="Aaj kis waqt bika">
          {hourly.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} interval={1} />
                <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="bikri" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Aaj abhi koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Package} title="Sab se zyada kya bika">
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox />}
        </ChartCard>

        <ChartCard icon={Boxes} title="Paisa kis me phansa hai">
          {moneyPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={moneyPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  <Cell fill="#ec4899" /><Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox />}
        </ChartCard>
      </div>

      {/* ═══ LISTS ═══ */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ListCard icon={Timer} title="Jaldi bech dein" to="/bakery/freshness" tone="emerald"
          empty="Sab kuch taaza hai">
          {fresh.list.map((f: any) => (
            <Row key={f.id} name={f.productName}
              sub={f.left <= 0 ? 'Waqt guzar gaya' : `${Math.round(f.left)} ghante baqi`}
              value={fmtQty(Number(f.currentQty))}
              tone={f.left <= 0 ? 'rose' : 'amber'} />
          ))}
        </ListCard>

        <ListCard icon={Cake} title="Agle orders" to="/bakery/cake-orders" tone="pink"
          empty="Koi order baqi nahi">
          {orders.list.map((x) => (
            <Row key={`${x.kind}-${x.id}`} name={x.name}
              sub={x.left === null ? 'Tareekh nahi'
                : x.left < 0 ? `${Math.round(Math.abs(x.left) / 24) || 1} din late`
                : x.left <= 24 ? 'Aaj dena hai' : `${Math.round(x.left / 24)} din baad`}
              value={formatPKR(x.total)}
              tone={x.left !== null && x.left < 0 ? 'rose' : x.left !== null && x.left <= 24 ? 'amber' : 'slate'} />
          ))}
        </ListCard>

        <ListCard icon={Wheat} title="Saamaan khatam ho raha" to="/bakery/ingredients" tone="violet"
          empty="Saamaan poora hai">
          {raw.list.map((i: any) => (
            <Row key={i.id} name={i.name}
              sub={Number(i.currentStock) <= 0 ? 'Bilkul khatam' : `${fmtQty(Number(i.currentStock))} ${i.unit} bacha`}
              value={formatPKR(Number(i.currentStock || 0) * Number(i.costPerUnit || 0))}
              tone={Number(i.currentStock) <= 0 ? 'rose' : 'amber'} />
          ))}
        </ListCard>
      </div>

      {/* ═══ QUICK LINKS ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {([
          ['/pos', 'Counter', Receipt, 'pink'],
          ['/bakery/production', 'Baking', ChefHat, 'amber'],
          ['/bakery/freshness', 'Taazgi', Timer, 'emerald'],
          ['/bakery/ingredients', 'Saamaan', Wheat, 'violet'],
          ['/bakery/cake-orders', 'Cake orders', Cake, 'pink'],
          ['/bakery/bulk-orders', 'Bare orders', ShoppingBag, 'amber'],
        ] as const).map(([to, label, Icon, tone]) => (
          <Link key={to} to={to}
            className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-3.5 text-center hover:-translate-y-0.5 hover:shadow-md hover:border-pink-400 transition-all">
            <div className={`h-10 w-10 rounded-xl mx-auto flex items-center justify-center ${
              tone === 'pink' ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400'
                : tone === 'amber' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : tone === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-2 text-[12px] font-black text-slate-900 dark:text-white">{label}</div>
          </Link>
        ))}
      </section>

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function TodoRow({ icon: Icon, tone, text, to, cta }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  };
  return (
    <div className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
      <span className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="min-w-0 flex-1 text-[13px] font-extrabold text-slate-800 dark:text-slate-100 leading-snug">{text}</p>
      <Link to={to}
        className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 transition">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, to }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    pink: 'from-pink-500 to-fuchsia-600 shadow-pink-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
  };
  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
        <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums break-words leading-tight">{value}</div>
        {sub && <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{sub}</div>}
      </div>
      <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
  const cls = 'rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm block transition-all hover:-translate-y-0.5 hover:shadow-md';
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
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

function ListCard({ icon: Icon, title, to, tone, empty, children }: any) {
  const kids = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600', pink: 'text-pink-600', violet: 'text-violet-600',
  };
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
        <h3 className="font-black text-slate-900 dark:text-white text-sm">{title}</h3>
        <Link to={to} className="ml-auto text-[11px] font-black text-slate-500 hover:text-pink-600 inline-flex items-center gap-1">
          Sab <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {kids.length === 0 ? (
        <div className="p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <p className="mt-2 text-[12px] font-extrabold text-slate-600 dark:text-slate-300">{empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{kids}</div>
      )}
    </section>
  );
}

function Row({ name, sub, value, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-600 dark:text-amber-400',
    slate: 'text-slate-500 dark:text-slate-400',
  };
  return (
    <div className="px-4 py-2.5 flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-[13px] text-slate-900 dark:text-white truncate">{name}</div>
        <div className={`text-[11px] font-black ${tones[tone] ?? tones.slate}`}>{sub}</div>
      </div>
      <span className="text-[13px] font-black tabular-nums text-slate-900 dark:text-white shrink-0">{value}</span>
    </div>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Dashboard
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Is safhe ka kaam number dikhana nahi — ye batana hai ke <strong>abhi kya karna hai</strong>.
          </p>
          <Tip icon={CheckCircle2} title="Aaj ka kaam">
            Sab se upar wali patti. Jo cheez jitni zaroori hai utni upar — kharab hone wala maal
            pehle, phir late orders, phir saamaan. Har line ke saath seedha button hai.
          </Tip>
          <Tip icon={Timer} title="Jaldi bech dein">
            Bakery ka sab se bara nuqsaan yehi hai. Jo maal aaj na bika wo kal raddi hai.
          </Tip>
          <Tip icon={Cake} title="Agle orders">
            Cake aur bare order dono ek jagah, waqt ke hisaab se. Late laal, aaj wale amber.
          </Tip>
          <Tip icon={Boxes} title="Phansa hua paisa">
            Counter ka maal aur gudaam ka saamaan milakar. Bakery me aksar saamaan ka paisa
            bane hue maal se zyada hota hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">R</kbd> taaza karein</div>
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
