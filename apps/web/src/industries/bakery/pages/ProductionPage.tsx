import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat, Plus, X, RefreshCw, Play, CheckCircle2, Flame, Clock,
  Search, AlertTriangle, BarChart3, GraduationCap, FileSpreadsheet,
  Printer, Package, Trash2, Loader2, Thermometer, Award, TrendingDown,
  Calendar, Layers, ArrowRight, Timer, Wheat,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { productionApi, type ProductionPlan, type ProductionItem } from '../api/production.api';
import { freshnessApi } from '../api/freshness.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   PRODUCTION — AAJ KI BAKING
   ─────────────────────────────────────────────────────────────
   Subah bawarchi ko batana parta hai ke aaj kya kitna banana hai,
   aur shaam ko dekhna parta hai ke kitna bana aur kitna kharab
   hua. Purana safha sirf list dikhata tha — chalane ke control
   nahi thay.

   Ab poora amal yahin hota hai: plan banao, shuru karo, oven me
   daalo, aur "ban gaya" par seedha taazgi ka batch bhi khud ban
   jata hai — warna wo qadam hamesha bhool jata tha aur expiry ki
   warning kabhi aati hi nahi thi.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'today' | 'all' | 'analytics';

const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  PLANNED:       { label: 'Banana hai', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  IN_PROGRESS:   { label: 'Kaam chal raha', chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  BAKING:        { label: 'Oven me hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  COOLING:       { label: 'Thanda ho raha', chip: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  DECORATING:    { label: 'Sajawat ho rahi', chip: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300', dot: 'bg-pink-500' },
  QUALITY_CHECK: { label: 'Check ho raha', chip: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  COMPLETED:     { label: 'Ban gaya', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  FAILED:        { label: 'Kharab hua', chip: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  ON_HOLD:       { label: 'Roka hua', chip: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
};

const GRID = '#94a3b8';
const AXIS = '#64748b';
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);
const st = (s?: string) => STATUS[s ?? 'PLANNED'] ?? STATUS.PLANNED;

export default function ProductionPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [creating, setCreating] = useState(false);
  const [finishItem, setFinishItem] = useState<any>(null);
  const [bakeItem, setBakeItem] = useState<any>(null);

  const todayQ = useQuery({
    queryKey: ['bakery-production-today'],
    queryFn: () => productionApi.today(),
    refetchInterval: 60_000,
  });

  const allQ = useQuery({
    queryKey: ['bakery-production-all'],
    queryFn: () => productionApi.listPlans({}),
    enabled: tab !== 'today',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bakery-production-today'] });
    qc.invalidateQueries({ queryKey: ['bakery-production-all'] });
  };

  const startPlan = useMutation({
    mutationFn: (id: string) => productionApi.startPlan(id),
    onSuccess: () => { toast.success('Kaam shuru'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Shuru nahi hua'),
  });

  const completePlan = useMutation({
    mutationFn: (id: string) => productionApi.completePlan(id),
    onSuccess: () => { toast.success('Plan mukammal'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  const plans: ProductionPlan[] = (tab === 'today' ? todayQ.data : allQ.data) ?? [];
  const allPlans: ProductionPlan[] = allQ.data ?? todayQ.data ?? [];

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!q) return plans;
    return plans.filter((p) =>
      p.planNumber.toLowerCase().includes(q) ||
      p.items.some((i) => (i.productName || '').toLowerCase().includes(q)));
  }, [plans, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const items = plans.flatMap((p) => p.items ?? []);
    const planned = items.reduce((s, i) => s + Number(i.plannedQty || 0), 0);
    const produced = items.reduce((s, i) => s + Number(i.producedQty || 0), 0);
    const failed = items.reduce((s, i) => s + Number(i.failedQty || 0), 0);
    return {
      planCount: plans.length,
      itemCount: items.length,
      planned, produced, failed,
      done: items.filter((i) => i.status === 'COMPLETED').length,
      inOven: items.filter((i) => i.status === 'BAKING').length,
      pending: items.filter((i) => i.status === 'PLANNED').length,
      failRate: produced + failed > 0 ? (failed / (produced + failed)) * 100 : 0,
      cost: plans.reduce((s, p) => s + Number(p.totalCost || 0), 0),
    };
  }, [plans]);

  /* ── Charts ── */
  const statusPie = useMemo(() => {
    const items = allPlans.flatMap((p) => p.items ?? []);
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.status, (m.get(i.status) ?? 0) + 1));
    return [...m.entries()].map(([k, v]) => ({ name: st(k).label, value: v }));
  }, [allPlans]);

  const plannedVsMade = useMemo(() => {
    const items = allPlans.flatMap((p) => p.items ?? []);
    const m = new Map<string, { planned: number; made: number; failed: number }>();
    items.forEach((i) => {
      const key = i.productName || '—';
      const e = m.get(key) ?? { planned: 0, made: 0, failed: 0 };
      e.planned += Number(i.plannedQty || 0);
      e.made += Number(i.producedQty || 0);
      e.failed += Number(i.failedQty || 0);
      m.set(key, e);
    });
    return [...m.entries()]
      .sort((a, b) => b[1].planned - a[1].planned).slice(0, 10)
      .map(([name, v]) => ({ name: name.slice(0, 14), socha: v.planned, bana: v.made, kharab: v.failed }));
  }, [allPlans]);

  const worstFail = useMemo(() => {
    const items = allPlans.flatMap((p) => p.items ?? []);
    const m = new Map<string, number>();
    items.forEach((i) => {
      const f = Number(i.failedQty || 0);
      if (f > 0) m.set(i.productName || '—', (m.get(i.productName || '—') ?? 0) + f);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: name.slice(0, 14), value }));
  }, [allPlans]);

  const exportCsv = () => {
    const head = ['Plan', 'Tareekh', 'Cheez', 'Socha tha', 'Bana', 'Kharab', 'Halat', 'Oven', 'Baker'];
    const body = shown.flatMap((p) => (p.items ?? []).map((i) => [
      p.planNumber, new Date(p.planDate).toLocaleDateString('en-PK'),
      i.productName, i.plannedQty, i.producedQty, i.failedQty,
      st(i.status).label, i.ovenNumber ?? '', i.bakerName ?? '',
    ]));
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `production-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (finishItem) return setFinishItem(null);
        if (bakeItem) return setBakeItem(null);
        if (creating) return setCreating(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'n') setCreating(true);
      if (e.key.toLowerCase() === 'p') window.print();
      if (e.key === '1') setTab('today');
      if (e.key === '2') setTab('all');
      if (e.key === '3') setTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finishItem, bakeItem, creating, showTeacher]);

  const isLoading = tab === 'today' ? todayQ.isLoading : allQ.isLoading;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Aaj ki baking</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" /> Bakery · Production
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">👨‍🍳 Aaj Ki Baking</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-white">{stats.pending}</strong> banana baqi ·{' '}
              <strong className="text-orange-200">{stats.inOven}</strong> oven me ·{' '}
              <strong className="text-emerald-200">{stats.done}</strong> ban gaya
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setCreating(true)}
              className="h-11 px-3.5 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya plan
            </button>
            <button onClick={() => setShowTeacher(true)}
              className="h-11 w-11 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg transition">
              <GraduationCap className="h-4 w-4" />
            </button>
            <button onClick={exportCsv}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" />
            </button>
            <button onClick={() => window.print()}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={() => { todayQ.refetch(); allQ.refetch(); }}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <RefreshCw className={`h-4 w-4 ${todayQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Layers} label="Socha tha" value={fmtQty(stats.planned)} sub={`${stats.itemCount} cheezein`} tone="amber" />
        <Kpi icon={CheckCircle2} label="Ban gaya" value={fmtQty(stats.produced)}
          sub={stats.planned > 0 ? `${((stats.produced / stats.planned) * 100).toFixed(0)}% poora` : undefined} tone="emerald" />
        <Kpi icon={TrendingDown} label="Kharab hua" value={fmtQty(stats.failed)}
          sub={`${stats.failRate.toFixed(1)}% nuqsaan`} tone={stats.failRate > 5 ? 'rose' : 'emerald'} />
        <Kpi icon={Flame} label="Oven me" value={stats.inOven} sub={`${stats.pending} baqi`} tone="orange" />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([['today', 'Aaj', Calendar, '1'], ['all', 'Poora record', Layers, '2'], ['analytics', 'Analytics', BarChart3, '3']] as const).map(([v, label, Icon, key]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition ${
              tab === v
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-400'
            }`}>
            <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{label}</span>
            <kbd className="hidden lg:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {tab !== 'analytics' && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
          <div className="relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Plan number ya cheez ka naam… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 transition" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </section>
      )}

      {tab === 'analytics' ? (
        <div className="space-y-4">
          {stats.failRate > 5 && (
            <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-rose-900 dark:text-rose-200">Kharabi zyada ho rahi hai</h3>
                <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                  Har 100 me se <strong>{stats.failRate.toFixed(0)}</strong> kharab ho rahe hain. Neeche
                  dekhein kis cheez me sab se zyada — shayad oven ka temperature ya batch ka size
                  dekhna chahiye.
                </p>
              </div>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard icon={Layers} title="Kaam kis halat me hai">
              {statusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {statusPie.map((_, i) => <Cell key={i} fill={['#10b981', '#f97316', '#3b82f6', '#94a3b8', '#ef4444', '#8b5cf6'][i % 6]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>

            <ChartCard icon={TrendingDown} title="Kis cheez me sab se zyada kharabi">
              {worstFail.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={worstFail}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Kharab']} />
                    <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox text="Abhi tak kuch kharab nahi hua — shabash" />}
            </ChartCard>

            <ChartCard icon={BarChart3} title="Socha tha kitna, bana kitna" wide>
              {plannedVsMade.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plannedVsMade}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis stroke={AXIS} fontSize={11} width={50} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend />
                    <Bar dataKey="socha" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="bana" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="kharab" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyBox />}
            </ChartCard>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
          <div className="h-16 w-16 rounded-3xl bg-orange-100 dark:bg-orange-500/20 mx-auto flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
            {tab === 'today' ? 'Aaj ka koi plan nahi' : 'Koi plan nahi mila'}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
            Subah plan bana lein — bawarchi ko pata chal jayega ke kya kitna banana hai, aur
            shaam ko hisab bhi saaf rahega.
          </p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Naya plan
            </Button>
            <Link to="/low-stock"
              className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-black inline-flex items-center gap-2 hover:border-orange-400 transition">
              Aaj kya banana hai <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((p) => (
            <PlanCard key={p.id} plan={p}
              onStart={() => startPlan.mutate(p.id)}
              onComplete={() => completePlan.mutate(p.id)}
              onBake={setBakeItem}
              onFinish={setFinishItem}
              busy={startPlan.isPending || completePlan.isPending} />
          ))}
        </div>
      )}

      {creating && <NewPlanModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); invalidate(); }} />}
      {bakeItem && <BakeModal item={bakeItem} onClose={() => setBakeItem(null)} onDone={() => { setBakeItem(null); invalidate(); }} />}
      {finishItem && <FinishModal item={finishItem} onClose={() => setFinishItem(null)} onDone={() => { setFinishItem(null); invalidate(); }} />}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ PLAN CARD ═══ */
function PlanCard({ plan, onStart, onComplete, onBake, onFinish, busy }: any) {
  const s = st(plan.status);
  const items: ProductionItem[] = plan.items ?? [];
  const done = items.filter((i) => i.status === 'COMPLETED').length;
  const pct = items.length > 0 ? (done / items.length) * 100 : 0;

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden avoid-break">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot} shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-slate-900 dark:text-white">{plan.planNumber}</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${s.chip}`}>{s.label}</span>
            {plan.shift && <span className="text-[10px] font-black text-slate-400">{plan.shift}</span>}
          </div>
          <div className="text-[11px] font-bold text-slate-400">
            {new Date(plan.planDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })} · {items.length} cheezein
          </div>
        </div>

        <div className="flex gap-1.5 print:hidden">
          {plan.status === 'PLANNED' && (
            <button onClick={onStart} disabled={busy}
              className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-60 transition">
              <Play className="h-3.5 w-3.5" /> Kaam shuru
            </button>
          )}
          {plan.status === 'IN_PROGRESS' && (
            <button onClick={onComplete} disabled={busy}
              className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-60 transition">
              <CheckCircle2 className="h-3.5 w-3.5" /> Plan mukammal
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-2.5">
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[10px] font-bold text-slate-400">{done} / {items.length} ban gaya</div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
        {items.map((i) => {
          const isDone = i.status === 'COMPLETED';
          const isBaking = i.status === 'BAKING';
          const shortfall = Number(i.plannedQty || 0) - Number(i.producedQty || 0);
          return (
            <div key={i.id} className="p-3 sm:p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDone ? 'bg-emerald-100 dark:bg-emerald-500/20' : isBaking ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    : isBaking ? <Flame className="h-5 w-5 text-orange-600" />
                    : <Package className="h-5 w-5 text-slate-500" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{i.productName}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${st(i.status).chip}`}>{st(i.status).label}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                    {i.ovenNumber ? `Oven ${i.ovenNumber} · ` : ''}
                    {i.bakingTempC ? `${i.bakingTempC}°C · ` : ''}
                    {i.bakerName ? `${i.bakerName} · ` : ''}
                    {i.batchNumber ? `Batch ${i.batchNumber}` : ''}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                    {isDone ? fmtQty(Number(i.producedQty)) : fmtQty(Number(i.plannedQty))}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    {isDone ? `${fmtQty(Number(i.plannedQty))} socha tha` : 'banana hai'}
                  </div>
                  {isDone && Number(i.failedQty) > 0 && (
                    <div className="text-[10px] font-black text-rose-600">{fmtQty(Number(i.failedQty))} kharab</div>
                  )}
                </div>
              </div>

              {isDone && shortfall > 0 && (
                <p className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {fmtQty(shortfall)} kam bana — socha {fmtQty(Number(i.plannedQty))} tha.
                </p>
              )}

              {!isDone && (
                <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
                  {i.status === 'PLANNED' && (
                    <button onClick={() => onBake(i)}
                      className="h-9 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                      <Flame className="h-3.5 w-3.5" /> Oven me daala
                    </button>
                  )}
                  <button onClick={() => onFinish(i)}
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ban gaya
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ═══ BAKE MODAL ═══ */
function BakeModal({ item, onClose, onDone }: any) {
  const [temp, setTemp] = useState<number | ''>(180);
  const [oven, setOven] = useState(item.ovenNumber ?? '');

  const mut = useMutation({
    mutationFn: () => productionApi.startBaking(item.id, {
      bakingTempC: temp === '' ? undefined : Number(temp),
      ovenNumber: oven || undefined,
    }),
    onSuccess: () => { toast.success('Oven me daal diya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  return (
    <Modal title="Oven me daala" icon={Flame} onClose={onClose}>
      <Field label="Temperature (°C)">
        <input type="number" value={temp} autoFocus
          onChange={(e) => setTemp(e.target.value === '' ? '' : Number(e.target.value))} className={inp} />
      </Field>
      <div className="flex gap-1.5">
        {[160, 180, 200, 220].map((t) => (
          <button key={t} onClick={() => setTemp(t)}
            className={`flex-1 h-9 rounded-lg text-[11px] font-black transition ${
              temp === t ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>{t}°</button>
        ))}
      </div>
      <Field label="Oven number">
        <input value={oven} onChange={(e) => setOven(e.target.value)} placeholder="1, 2, bara wala…" className={inp} />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
        <Button className="flex-[2] bg-orange-600 hover:bg-orange-700" loading={mut.isPending} onClick={() => mut.mutate()}>
          <Flame className="h-4 w-4" /> Shuru
        </Button>
      </div>
    </Modal>
  );
}

/* ═══ FINISH MODAL ═══ */
function FinishModal({ item, onClose, onDone }: any) {
  const [made, setMade] = useState<number | ''>(item.plannedQty ?? '');
  const [failed, setFailed] = useState<number | ''>(0);
  const [hours, setHours] = useState<number | ''>(24);
  const [makeBatch, setMakeBatch] = useState(true);
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: async () => {
      await productionApi.completeItem(item.id, {
        producedQty: Number(made) || 0,
        failedQty: Number(failed) || 0,
        qualityNotes: notes || undefined,
      });

      /* Taazgi ka batch yahin bana dete hain. Pehle ye qadam alag
         tha aur hamesha bhool jata tha — natija ye ke bana hua maal
         kabhi taazgi ke safhe par aata hi nahi tha, aur expiry ki
         warning kabhi nahi aati thi. */
      if (makeBatch && item.productId && Number(made) > 0) {
        const now = new Date();
        const best = new Date(now.getTime() + (Number(hours) || 24) * 3_600_000);
        try {
          await freshnessApi.create({
            productId: item.productId,
            productName: item.productName,
            batchNumber: item.batchNumber || undefined,
            productionDate: now.toISOString(),
            bestBefore: best.toISOString(),
            expiryDate: best.toISOString(),
            initialQty: Number(made),
            currentQty: Number(made),
          } as any);
        } catch {
          toast.warning('Bana hua darj ho gaya, magar taazgi ka batch nahi ban saka');
        }
      }
    },
    onSuccess: () => { toast.success('Ban gaya darj ho gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  const bad = made === '' || Number(made) < 0;
  const shortfall = Number(item.plannedQty || 0) - Number(made || 0);

  return (
    <Modal title="Ban gaya" icon={CheckCircle2} onClose={onClose} sub={item.productName}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kitne bane">
          <input type="number" min={0} step="any" autoFocus value={made}
            onChange={(e) => setMade(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
        </Field>
        <Field label="Kitne kharab">
          <input type="number" min={0} step="any" value={failed}
            onChange={(e) => setFailed(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-rose-500" />
        </Field>
      </div>

      {shortfall > 0 && (
        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
          Socha {fmtQty(Number(item.plannedQty))} tha — {fmtQty(shortfall)} kam ban raha hai.
        </p>
      )}

      <button type="button" onClick={() => setMakeBatch((v) => !v)}
        className={`w-full text-left rounded-2xl border-2 p-3 flex items-start gap-2.5 transition ${
          makeBatch ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`}>
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
          makeBatch ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
        }`}><Timer className="h-4 w-4" /></span>
        <span className="min-w-0">
          <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white">Taazgi ka batch bhi bana do</span>
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Warna expiry ki warning kabhi nahi aayegi
          </span>
        </span>
      </button>

      {makeBatch && (
        <>
          <Field label="Kitne ghante theek rahega">
            <input type="number" min={1} value={hours}
              onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))} className={inp} />
          </Field>
          <div className="flex gap-1.5">
            {[6, 12, 24, 48, 72].map((h) => (
              <button key={h} onClick={() => setHours(h)}
                className={`flex-1 h-9 rounded-lg text-[11px] font-black transition ${
                  hours === h ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>{h}h</button>
            ))}
          </div>
        </>
      )}

      <Field label="Koi baat likhni ho">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thora jal gaya tha…" className={inp} />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
        <Button className="flex-[2] bg-emerald-600 hover:bg-emerald-700" disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
          <CheckCircle2 className="h-4 w-4" /> Darj karein
        </Button>
      </div>
    </Modal>
  );
}

/* ═══ NEW PLAN ═══ */
function NewPlanModal({ onClose, onDone }: any) {
  const [shift, setShift] = useState('Subah');
  const [lines, setLines] = useState<Array<{ productId: string; productName: string; plannedQty: number | '' }>>([]);
  const [search, setSearch] = useState('');

  const { data } = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({}) });
  const products = data?.items ?? [];
  const chosen = new Set(lines.map((l) => l.productId));
  const q = search.trim().toLowerCase();
  const options = useMemo(
    () => products.filter((p) => !chosen.has(p.id) && (q ? p.name.toLowerCase().includes(q) : true)).slice(0, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, q, lines],
  );

  const mut = useMutation({
    mutationFn: () => productionApi.createPlan({
      planDate: new Date().toISOString(),
      shift,
      items: lines.map((l) => ({ productId: l.productId, productName: l.productName, plannedQty: Number(l.plannedQty) || 0 })),
    }),
    onSuccess: () => { toast.success('Plan ban gaya'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Plan nahi bana'),
  });

  const bad = lines.length === 0 || lines.some((l) => l.plannedQty === '' || Number(l.plannedQty) <= 0);

  return (
    <Modal title="Naya baking plan" icon={ChefHat} onClose={onClose} wide>
      <Field label="Kaunsi shift">
        <div className="flex gap-1.5">
          {['Subah', 'Dopahar', 'Shaam'].map((s) => (
            <button key={s} onClick={() => setShift(s)}
              className={`flex-1 h-10 rounded-lg text-xs font-black transition ${
                shift === s ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>{s}</button>
          ))}
        </div>
      </Field>

      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.productId} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate flex-1">{l.productName}</span>
              <input type="number" min={1} step="any" value={l.plannedQty}
                onChange={(e) => setLines((xs) => xs.map((x) => x.productId === l.productId
                  ? { ...x, plannedQty: e.target.value === '' ? '' : Number(e.target.value) } : x))}
                placeholder="0"
                className="h-10 w-24 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:border-orange-500" />
              <button onClick={() => setLines((xs) => xs.filter((x) => x.productId !== l.productId))}
                className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 hover:border-rose-400 transition">
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Field label="Kya banana hai">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cheez dhoondein…" className={inp} />
      </Field>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {options.map((p) => (
            <button key={p.id}
              onClick={() => { setLines((xs) => [...xs, { productId: p.id, productName: p.name, plannedQty: '' }]); setSearch(''); }}
              className="h-9 px-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-400 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition">
              <Plus className="h-3.5 w-3.5 text-orange-500" /> {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
        <Button className="flex-[2] bg-orange-600 hover:bg-orange-700" disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
          <Plus className="h-4 w-4" /> Plan banao
        </Button>
      </div>
    </Modal>
  );
}

/* ═══ CHHOTE HISSE ═══ */
const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500';

function Modal({ title, sub, icon: Icon, onClose, wide, children }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between sticky top-0 z-10">
          <div className="min-w-0">
            <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
              <Icon className="h-5 w-5" /> {title}
            </h3>
            {sub && <p className="text-[11px] font-bold text-orange-700 dark:text-orange-300 truncate">{sub}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center shrink-0">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    orange: 'from-orange-500 to-red-500 shadow-orange-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm">
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
    </div>
  );
}

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-orange-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Production ka safha
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Subah bawarchi ko batana, shaam ko hisab dekhna — dono kaam yahin se.
          </p>
          <Tip icon={Plus} title="Naya plan">
            Subah plan bana lein: kya kitna banana hai. Kaun si shift hai wo bhi chun lein.
          </Tip>
          <Tip icon={Play} title="Kaam shuru">
            Plan par <strong>Kaam shuru</strong> daba dein — ab sab ko pata hai ke kaam chal raha hai.
          </Tip>
          <Tip icon={Flame} title="Oven me daala">
            Temperature aur oven number darj kar dein. Baad me pata chal jata hai ke kis
            temperature par cheez achi bani thi.
          </Tip>
          <Tip icon={CheckCircle2} title="Ban gaya">
            Kitne bane aur kitne kharab. Sath hi <strong>taazgi ka batch</strong> khud ban jata hai —
            ye qadam pehle alag tha aur hamesha bhool jata tha, jis se expiry ki warning kabhi
            aati hi nahi thi.
          </Tip>
          <Tip icon={BarChart3} title="Analytics">
            Socha kitna tha aur bana kitna. Kis cheez me sab se zyada kharabi — us ka oven ya
            batch ka size dekhna chahiye.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> naya plan</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-3</kbd> tab badlo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
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
      <div className="h-8 w-8 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
