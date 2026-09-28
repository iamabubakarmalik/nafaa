import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Plus, X, Save, RefreshCw, Sprout, Trash2, Search, Wheat,
  GraduationCap, FileSpreadsheet, Printer, BarChart3, AlertTriangle,
  CheckCircle2, Package, Clock, ArrowRight, Layers, TrendingUp, Scissors,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { seasonalPlansApi, type SeasonalPlan } from '../api/seasonal-plans.api';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, type AgriKind } from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   FASAL KA CALENDAR — KAB KYA RAKHNA HAI
   ─────────────────────────────────────────────────────────────
   Pehle ye safha sirf tareekhein likhta tha. Us se dukaan-daar ka
   koi kaam nahi banta — usay tareekh nahi, ye jawab chahiye:

     "Gandum ki bijai 12 din me shuru ho rahi hai. Mere paas
      gandum ka beej hai ya nahi? DAP kitni bori bachi hai?"

   Is liye ab har plan apne aap ko DUKAAN KE STOCK se milata hai.
   Product ke andar jo "kis fasal par chalta hai" bhara hota hai,
   usi se jor lagta hai. Jahan bijai qareeb hai aur maal khatam,
   wahan laal patti aa jati hai.

   Bijai ka waqt hi wo waqt hai jab farmer sab se zyada kharch
   karta hai. Wo mauqa nikal jaye to saara season nikal jata hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'now' | 'calendar' | 'analytics';

const SEASONS = [
  { value: 'KHARIF', label: 'Kharif', emoji: '🌧️', hint: 'Mai–Oct: chawal, kapas, makai', color: 'from-sky-500 to-cyan-600', bar: '#0ea5e9' },
  { value: 'RABI', label: 'Rabi', emoji: '❄️', hint: 'Nov–Apr: gandum, chana, sarson', color: 'from-cyan-500 to-teal-600', bar: '#14b8a6' },
  { value: 'ZAID', label: 'Zaid', emoji: '☀️', hint: 'Mar–Jun: tarbooz, sabzi', color: 'from-amber-500 to-orange-600', bar: '#f59e0b' },
  { value: 'ALL_SEASON', label: 'Har mausam', emoji: '🔄', hint: 'Saal bhar chalta hai', color: 'from-emerald-500 to-green-600', bar: '#10b981' },
];

const CROPS = [
  'Gandum', 'Chawal', 'Kapas', 'Ganna', 'Makai', 'Aloo', 'Tamatar', 'Pyaz',
  'Mirch', 'Dalein', 'Chara', 'Soybean', 'Sarson', 'Sooraj mukhi', 'Chana', 'Tarbooz',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dis'];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);
const dayMs = 86_400_000;

/**
 * Saal chhor kar sirf din-mahina dekhna.
 *
 * Plan 2024 ka bhara ho magar bijai har saal usi mahine hoti hai.
 * Is liye tareekh ko IS saal par la kar ginte hain — warna purana
 * plan hamesha "guzar chuka" dikhta rehta.
 */
function thisYear(iso: string, ref = new Date()): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(ref.getFullYear(), d.getMonth(), d.getDate());
}

/** Kitne din baad — manfi ka matlab guzar chuka */
function daysTo(d: Date | null, ref = new Date()): number | null {
  if (!d) return null;
  const a = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.round((d.getTime() - a.getTime()) / dayMs);
}

/** Saal me kaunsa din — calendar patti me jagah nikalne ke liye */
function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / dayMs);
}

export default function SeasonalPlansPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('now');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [removeFor, setRemoveFor] = useState<SeasonalPlan | null>(null);

  /* ── Data ── */
  const plansQ = useQuery({
    queryKey: ['seasonal-plans-all'],
    queryFn: () => seasonalPlansApi.list({ active: true }),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
  });
  const stockQ = useQuery({
    queryKey: ['agri-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }).catch(() => null),
  });

  const isLoading = plansQ.isLoading;
  const isRefetching = plansQ.isRefetching || profilesQ.isRefetching || stockQ.isRefetching;
  const refetchAll = () => { plansQ.refetch(); profilesQ.refetch(); stockQ.refetch(); };

  const remove = useMutation({
    mutationFn: (id: string) => seasonalPlansApi.remove(id),
    onSuccess: () => {
      toast.success('Plan hata diya');
      setRemoveFor(null);
      qc.invalidateQueries({ queryKey: ['seasonal-plans-all'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  /* ── Har fasal ka maal ──
     Product ke agri profile me "kis fasal par chalta hai" bhara
     hota hai. Usi se fasal ka naam milate hain — dono taraf se,
     kyunke dukaan-daar "Gandum" likhta hai aur plan me "Wheat"
     ho sakta hai. */
  const stockByCrop = useMemo(() => {
    const rows = stockQ.data?.rows ?? [];
    const byId = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) byId.set(p.productId, p); });

    const m = new Map<string, any[]>();
    rows.forEach((r) => {
      const profile = byId.get(r.productId);
      const crops = profile?.targetCrops ?? [];
      if (crops.length === 0) return;
      const kind = (profile?.category as AgriKind) ?? deriveAgriKind(r.category, r.productName);
      const item = {
        ...r, profile, kind,
        isOut: r.stockStatus === 'OUT_OF_STOCK',
        isLow: r.stockStatus === 'LOW_STOCK',
      };
      crops.forEach((c: string) => {
        const key = c.trim().toLowerCase();
        if (!key) return;
        m.set(key, [...(m.get(key) ?? []), item]);
      });
    });
    return m;
  }, [stockQ.data, profilesQ.data]);

  /** Ek fasal ka naam de kar us ka saara maal — dono taraf se milan */
  const matchCrop = (cropName: string) => {
    const key = (cropName || '').trim().toLowerCase();
    if (!key) return [] as any[];
    const exact = stockByCrop.get(key);
    if (exact) return exact;
    const out: any[] = [];
    stockByCrop.forEach((items, k) => {
      if (k.includes(key) || key.includes(k)) out.push(...items);
    });
    /* Ek hi cheez do fasalon par chalti ho to do dafa aa sakti hai */
    return [...new Map(out.map((i) => [i.productId, i])).values()];
  };

  /* ── Rows — har plan + us ka stock ── */
  const rows = useMemo(() => {
    const list = plansQ.data ?? [];
    return list.map((p) => {
      const sowStart = thisYear(p.sowingStart);
      const sowEnd = thisYear(p.sowingEnd);
      const harvStart = thisYear(p.harvestStart);
      const harvEnd = thisYear(p.harvestEnd);

      const toSow = daysTo(sowStart);
      const sowOver = daysTo(sowEnd);
      const toHarv = daysTo(harvStart);
      const harvOver = daysTo(harvEnd);

      const sowingNow = toSow !== null && sowOver !== null && toSow <= 0 && sowOver >= 0;
      const harvestNow = toHarv !== null && harvOver !== null && toHarv <= 0 && harvOver >= 0;
      /* Agle 45 din me bijai — abhi se maal rakhna shuru karna hai */
      const sowingSoon = toSow !== null && toSow > 0 && toSow <= 45;

      const items = matchCrop(p.cropName);
      const out = items.filter((i) => i.isOut);
      const low = items.filter((i) => i.isLow);
      const stockValue = items.reduce((s, i) => s + Number(i.stockValue || 0), 0);

      return {
        ...p,
        sowStart, sowEnd, harvStart, harvEnd,
        toSow, sowOver, toHarv, harvOver,
        sowingNow, harvestNow, sowingSoon,
        items, out, low, stockValue,
        /* Bijai qareeb hai aur maal nahi — ye sab se bara masla hai */
        risky: (sowingNow || sowingSoon) && (items.length === 0 || out.length > 0),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plansQ.data, stockByCrop]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (seasonFilter !== 'all') out = out.filter((r) => r.season === seasonFilter);
    if (q) out = out.filter((r) =>
      (r.cropName || '').toLowerCase().includes(q)
      || (r.season || '').toLowerCase().includes(q)
      || String(r.year).includes(q));
    /* Jo abhi chal raha hai wo pehle, phir jo qareeb aa raha hai */
    return [...out].sort((a, b) => {
      const rank = (r: any) => (r.sowingNow ? 0 : r.sowingSoon ? 1 : r.harvestNow ? 2 : 3);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return (a.toSow ?? 999) - (b.toSow ?? 999);
    });
  }, [rows, seasonFilter, q]);

  /* ── Abhi ka kaam ── */
  const sowingNow = useMemo(() => shown.filter((r) => r.sowingNow), [shown]);
  const sowingSoon = useMemo(() => shown.filter((r) => r.sowingSoon), [shown]);
  const harvestNow = useMemo(() => shown.filter((r) => r.harvestNow), [shown]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const risky = rows.filter((r) => r.risky);
    return {
      total: rows.length,
      sowingNow: rows.filter((r) => r.sowingNow).length,
      sowingSoon: rows.filter((r) => r.sowingSoon).length,
      harvestNow: rows.filter((r) => r.harvestNow).length,
      risky: risky.length,
      riskyCrops: risky.slice(0, 6),
      noStock: rows.filter((r) => r.items.length === 0).length,
      seasonStockValue: rows
        .filter((r) => r.sowingNow || r.sowingSoon)
        .reduce((s, r) => s + r.stockValue, 0),
    };
  }, [rows]);

  /* ── Charts ── */
  const seasonPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const def = SEASONS.find((s) => s.value === r.season);
      const label = def ? `${def.emoji} ${def.label}` : 'Aur koi';
      m.set(label, (m.get(label) ?? 0) + 1);
    });
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  const monthChart = useMemo(() => {
    /* Har mahine kitni fasalon ki bijai shuru hoti hai — usi mahine
       dukaan par sab se zyada rush hota hai */
    const sow = new Array(12).fill(0);
    const harv = new Array(12).fill(0);
    rows.forEach((r) => {
      if (r.sowStart) sow[r.sowStart.getMonth()] += 1;
      if (r.harvStart) harv[r.harvStart.getMonth()] += 1;
    });
    return MONTHS.map((name, i) => ({ name, bijai: sow[i], katai: harv[i] }));
  }, [rows]);

  const cropStockChart = useMemo(
    () => [...rows]
      .filter((r) => r.stockValue > 0)
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 8)
      .map((r) => ({ name: r.cropName.slice(0, 14), value: Math.round(r.stockValue) })),
    [rows],
  );

  /* ── CSV ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Fasal ka calendar — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Abhi bijai: ${stats.sowingNow}  •  Jald bijai: ${stats.sowingSoon}  •  Maal ki kami: ${stats.risky}`],
      [''],
    ];
    const head = ['Fasal', 'Mausam', 'Saal', 'Bijai shuru', 'Bijai khatam',
      'Katai shuru', 'Katai khatam', 'Abhi kya', 'Kitne din me bijai',
      'Maal ki cheezein', 'Khatam', 'Kam', 'Stock ki lagat'];
    const body = shown.map((r) => [
      r.cropName,
      SEASONS.find((s) => s.value === r.season)?.label ?? r.season,
      r.year,
      String(r.sowingStart).slice(0, 10), String(r.sowingEnd).slice(0, 10),
      String(r.harvestStart).slice(0, 10), String(r.harvestEnd).slice(0, 10),
      r.sowingNow ? 'Bijai chal rahi' : r.harvestNow ? 'Katai chal rahi' : r.sowingSoon ? 'Bijai qareeb' : '—',
      r.toSow !== null && r.toSow > 0 ? r.toSow : '',
      r.items.length, r.out.length, r.low.length, Math.round(r.stockValue),
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasal-calendar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${shown.length} plans CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (removeFor) return setRemoveFor(null);
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return setShowForm(false);
        return;
      }
      if (showForm || removeFor) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); setShowForm(true); }
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') doPrint();
      if (e.key === '1') setTab('now');
      if (e.key === '2') setTab('calendar');
      if (e.key === '3') setTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showForm, removeFor]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">📅 {tenant?.name || 'Agri'} — Fasal ka calendar</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{shown.length} fasalein •
              Abhi bijai {stats.sowingNow} • Jald {stats.sowingSoon}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Calendar className="h-3.5 w-3.5 text-lime-300" /> Fasal ka calendar
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">📅 Kab Kya Rakhna Hai</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-lime-200">{stats.sowingNow}</strong> fasalon ki bijai abhi chal rahi ·{' '}
              <strong className="text-amber-200">{stats.sowingSoon}</strong> jald shuru ·{' '}
              <strong className="text-rose-200">{stats.risky}</strong> par maal ki kami
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={exportCsv}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={doPrint} title="Print (P)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={refetchAll} disabled={isRefetching} title="Taaza"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowForm(true)}
              className="h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Nayi fasal
            </button>
          </div>
        </div>
      </section>

      {/* ═══ MAAL KI KAMI — sab se ooper ═══ */}
      {stats.risky > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">
              ⚠️ {stats.risky} fasalon ki bijai aa rahi hai magar maal poora nahi
            </h3>
            <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
              Bijai ka waqt hi wo waqt hai jab farmer sab se zyada kharch karta hai. Maal na
              hua to wo doosri dukaan chala jayega — aur agle season bhi wahin jayega.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.riskyCrops.map((r: any) => (
                <span key={r.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 text-[11px] font-extrabold text-rose-900 dark:text-rose-200">
                  🌾 {r.cropName}
                  <span className="text-rose-600 dark:text-rose-400">
                    {' '}({r.items.length === 0 ? 'koi maal nahi' : `${r.out.length} khatam`})
                  </span>
                </span>
              ))}
            </div>
          </div>
          <Link to="/low-stock"
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 inline-flex items-center gap-1.5 transition active:scale-[0.97]">
            Kya mangwana hai <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Sprout} label="Bijai abhi chal rahi" value={stats.sowingNow}
          sub="Farmer aaj kharidta hai" tone="emerald"
          onClick={() => setTab('now')} active={tab === 'now'} />
        <Kpi icon={Clock} label="Jald bijai" value={stats.sowingSoon}
          sub="Agle 45 din me — abhi mangwa lein" tone="amber"
          onClick={() => setTab('now')} />
        <Kpi icon={Scissors} label="Katai chal rahi" value={stats.harvestNow}
          sub="Farmer ke paas paisa aata hai" tone="lime"
          onClick={() => setTab('now')} />
        <Kpi icon={Package} label="Season ka stock" value={formatPKR(stats.seasonStockValue)}
          sub={stats.risky > 0 ? `${stats.risky} fasalon par kami` : 'Maal poora hai'}
          tone={stats.risky > 0 ? 'rose' : 'emerald'} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([
          ['now', 'Abhi ka kaam', Sprout, sowingNow.length + sowingSoon.length + harvestNow.length, '1'],
          ['calendar', 'Poora saal', Calendar, shown.length, '2'],
          ['analytics', 'Analytics', BarChart3, undefined, '3'],
        ] as const).map(([id, label, Icon, count, key]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
            {count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg tabular-nums ${
                tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
              }`}>{count}</span>
            )}
            <kbd className="hidden sm:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {showForm && (
        <SeasonalPlanForm onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['seasonal-plans-all'] }); }} />
      )}

      {removeFor && (
        <RemoveModal plan={removeFor} onClose={() => setRemoveFor(null)}
          onConfirm={() => remove.mutate(removeFor.id)} saving={remove.isPending} />
      )}

      {/* ═══ TOOLBAR ═══ */}
      {tab !== 'analytics' && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
          <div className="relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Fasal ka naam… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setSeasonFilter('all')}
              className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                seasonFilter === 'all' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
              }`}>Har mausam ({rows.length})</button>
            {SEASONS.map((s) => {
              const n = rows.filter((r) => r.season === s.value).length;
              return (
                <button key={s.value} onClick={() => setSeasonFilter(s.value)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    seasonFilter === s.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{s.emoji} {s.label} ({n})</button>
              );
            })}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty onNew={() => setShowForm(true)} onGuide={() => setShowTeacher(true)} />
      ) : tab === 'analytics' ? (
        <Analytics stats={stats} seasonPie={seasonPie} monthChart={monthChart}
          cropStockChart={cropStockChart} rows={rows} />
      ) : tab === 'now' ? (
        <NowTab sowingNow={sowingNow} sowingSoon={sowingSoon} harvestNow={harvestNow}
          onRemove={setRemoveFor} />
      ) : (
        <CalendarTab rows={shown} onRemove={setRemoveFor} />
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 1 — ABHI KA KAAM
   ═════════════════════════════════════════════════════════════ */
function NowTab({ sowingNow, sowingSoon, harvestNow, onRemove }: {
  sowingNow: any[]; sowingSoon: any[]; harvestNow: any[]; onRemove: (p: any) => void;
}) {
  if (sowingNow.length === 0 && sowingSoon.length === 0 && harvestNow.length === 0) {
    return (
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-14 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Abhi koi bijai ya katai nahi</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
          Agle 45 din me kisi fasal ki bijai shuru nahi ho rahi. "Poora saal" wala tab kholein
          to saal bhar ki tasveer nazar aa jayegi.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {sowingNow.length > 0 && (
        <Group
          icon={Sprout} tone="emerald"
          title="Bijai abhi chal rahi hai"
          desc="Farmer aaj beej aur khaad kharid raha hai — maal counter par hona chahiye"
          rows={sowingNow} onRemove={onRemove} />
      )}
      {sowingSoon.length > 0 && (
        <Group
          icon={Clock} tone="amber"
          title="Bijai jald shuru ho rahi hai"
          desc="Abhi mangwa lein — season shuru hone par rate barh jata hai aur maal milta bhi nahi"
          rows={sowingSoon} onRemove={onRemove} />
      )}
      {harvestNow.length > 0 && (
        <Group
          icon={Scissors} tone="lime"
          title="Katai chal rahi hai"
          desc="Farmer ke paas paisa aa raha hai — purana udhaar wusool karne ka behtareen waqt"
          rows={harvestNow} onRemove={onRemove} />
      )}
    </div>
  );
}

function Group({ icon: Icon, tone, title, desc, rows, onRemove }: any) {
  const head: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    lime: 'bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30 text-lime-900 dark:text-lime-200',
  };
  const icon: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600', amber: 'from-amber-500 to-orange-600', lime: 'from-lime-500 to-green-600',
  };
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className={`px-4 py-3 border-b-2 flex items-center gap-2.5 ${head[tone]}`}>
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${icon[tone]} text-white flex items-center justify-center shadow shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-sm leading-tight">{title} · {rows.length}</h3>
          <p className="text-[11px] font-bold opacity-80">{desc}</p>
        </div>
      </div>
      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r: any) => <PlanCard key={r.id} r={r} onRemove={onRemove} />)}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   EK FASAL KA CARD — sath hi us ka maal
   ═════════════════════════════════════════════════════════════ */
function PlanCard({ r, onRemove }: { r: any; onRemove: (p: any) => void }) {
  const season = SEASONS.find((s) => s.value === r.season);
  const status = r.sowingNow
    ? { text: `Bijai chal rahi — ${r.sowOver} din aur`, tone: 'emerald' as const }
    : r.sowingSoon
    ? { text: `Bijai ${r.toSow} din me shuru`, tone: 'amber' as const }
    : r.harvestNow
    ? { text: `Katai chal rahi — ${r.harvOver} din aur`, tone: 'lime' as const }
    : r.toSow !== null && r.toSow > 0
    ? { text: `Bijai ${r.toSow} din me`, tone: 'slate' as const }
    : { text: 'Is saal ka waqt guzar gaya', tone: 'slate' as const };

  const toneCls: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    lime: 'bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300',
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm overflow-hidden avoid-break transition hover:shadow-lg ${
      r.risky ? 'border-rose-300 dark:border-rose-500/50' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className={`p-4 text-white bg-gradient-to-br ${season?.color ?? 'from-slate-500 to-slate-700'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="text-3xl">{season?.emoji}</div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-extrabold uppercase">{r.year}</span>
            <button onClick={() => onRemove(r)} title="Hatao"
              className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition print:hidden">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 text-[10px] uppercase font-extrabold text-white/80 tracking-widest">{season?.label}</div>
        <div className="text-xl font-black">{r.cropName}</div>
      </div>

      <div className="p-4 space-y-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${toneCls[status.tone]}`}>
          <Clock className="h-3 w-3" /> {status.text}
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2">
            <div className="text-[9px] uppercase font-black tracking-widest text-emerald-700 dark:text-emerald-400">Bijai</div>
            <div className="text-[11px] font-extrabold text-slate-900 dark:text-white">
              {r.sowStart?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })} –{' '}
              {r.sowEnd?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2">
            <div className="text-[9px] uppercase font-black tracking-widest text-amber-700 dark:text-amber-400">Katai</div>
            <div className="text-[11px] font-extrabold text-slate-900 dark:text-white">
              {r.harvStart?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })} –{' '}
              {r.harvEnd?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>

        {/* Is fasal ka maal — asal kaam ki cheez */}
        <div className={`rounded-xl border-2 p-2.5 ${
          r.items.length === 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
            : r.out.length > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Is fasal ka maal</span>
            {r.stockValue > 0 && (
              <span className="text-[11px] font-black tabular-nums text-slate-700 dark:text-slate-200">
                {formatPKR(r.stockValue)}
              </span>
            )}
          </div>

          {r.items.length === 0 ? (
            <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mt-1 leading-snug">
              Koi cheez is fasal se juri nahi. Product ke andar "kis fasal par chalta hai"
              bhar dein — phir yahan khud aa jayegi.
            </p>
          ) : (
            <>
              <div className="mt-1 flex items-center gap-2 text-[11px] font-extrabold">
                <span className="text-slate-700 dark:text-slate-200">{r.items.length} cheezein</span>
                {r.out.length > 0 && <span className="text-rose-600 dark:text-rose-400">{r.out.length} khatam</span>}
                {r.low.length > 0 && <span className="text-amber-600 dark:text-amber-400">{r.low.length} kam</span>}
                {r.out.length === 0 && r.low.length === 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> poora hai
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.items.slice(0, 4).map((i: any) => (
                  <Link key={i.productId} to={`/agri-products/${i.productId}`}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold transition hover:underline ${
                      i.isOut ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : i.isLow ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}>
                    {AGRI_KIND_EMOJI[i.kind as AgriKind]} {String(i.productName).slice(0, 14)}
                  </Link>
                ))}
                {r.items.length > 4 && (
                  <span className="text-[10px] font-extrabold text-slate-400">+{r.items.length - 4}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 2 — POORA SAAL
   ─────────────────────────────────────────────────────────────
   Har fasal ki bijai aur katai ek hi patti par — aaj ka nishan
   sath me. Ek nazar me pata chal jata hai ke agla rush kab hai.
   ═════════════════════════════════════════════════════════════ */
function CalendarTab({ rows, onRemove }: { rows: any[]; onRemove: (p: any) => void }) {
  const todayPct = (dayOfYear(new Date()) / 365) * 100;

  if (rows.length === 0) {
    return (
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
        <Calendar className="h-12 w-12 text-slate-400 mx-auto" />
        <p className="mt-3 font-black text-slate-800 dark:text-slate-100">Is chaant par kuch nahi mila</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Saal bhar ki patti</h3>
          <div className="ml-auto flex items-center gap-3 text-[10px] font-black">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Bijai
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Katai
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
              <span className="h-2.5 w-0.5 bg-rose-500" /> Aaj
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Mahine ka header */}
            <div className="flex gap-2 mb-2">
              <div className="w-32 shrink-0" />
              <div className="flex-1 grid grid-cols-12 gap-0">
                {MONTHS.map((m) => (
                  <div key={m} className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                    {m}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.id} className="flex gap-2 items-center group">
                  <div className="w-32 shrink-0 min-w-0">
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-white truncate">
                      {r.cropName}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 truncate">
                      {SEASONS.find((s) => s.value === r.season)?.emoji}{' '}
                      {r.items.length > 0
                        ? `${r.items.length} cheezein${r.out.length > 0 ? ` · ${r.out.length} khatam` : ''}`
                        : 'koi maal nahi'}
                    </div>
                  </div>

                  <div className="flex-1 relative h-9 rounded-lg bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
                    {/* Mahine ki lakeerein */}
                    <div className="absolute inset-0 grid grid-cols-12">
                      {MONTHS.map((m, i) => (
                        <div key={m} className={i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''} />
                      ))}
                    </div>

                    <Band start={r.sowStart} end={r.sowEnd} cls="bg-emerald-500" top="top-1" label="Bijai" />
                    <Band start={r.harvStart} end={r.harvEnd} cls="bg-amber-500" top="top-[1.15rem]" label="Katai" />

                    {/* Aaj ki lakeer */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                      style={{ left: `${todayPct}%` }} />
                  </div>

                  <button onClick={() => onRemove(r)} title="Hatao"
                    className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition opacity-0 group-hover:opacity-100 print:hidden">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => <PlanCard key={r.id} r={r} onRemove={onRemove} />)}
      </section>
    </div>
  );
}

/** Calendar patti par ek rang ka hissa */
function Band({ start, end, cls, top, label }: {
  start: Date | null; end: Date | null; cls: string; top: string; label: string;
}) {
  if (!start || !end) return null;
  const s = dayOfYear(start);
  const e = dayOfYear(end);
  /* Bijai Dec me shuru ho kar Jan me khatam ho sakti hai — us
     soorat me do hisson me tor kar dikhate hain. */
  if (e < s) {
    return (
      <>
        <Piece from={s} to={365} cls={cls} top={top} label={label} />
        <Piece from={0} to={e} cls={cls} top={top} label={label} />
      </>
    );
  }
  return <Piece from={s} to={e} cls={cls} top={top} label={label} />;
}

function Piece({ from, to, cls, top, label }: {
  from: number; to: number; cls: string; top: string; label: string;
}) {
  const left = (from / 365) * 100;
  const width = Math.max(((to - from) / 365) * 100, 1.2);
  return (
    <div title={label}
      className={`absolute ${top} h-3 rounded-full ${cls} shadow-sm`}
      style={{ left: `${left}%`, width: `${width}%` }} />
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, seasonPie, monthChart, cropStockChart, rows }: any) {
  const busiest = useMemo(() => {
    let best = { name: '—', n: 0 };
    monthChart.forEach((m: any) => { if (m.bijai > best.n) best = { name: m.name, n: m.bijai }; });
    return best;
  }, [monthChart]);

  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Calendar} label="Kul fasalein" value={stats.total} tone="emerald" />
        <MiniStat icon={TrendingUp} label="Sab se masroof mahina" value={busiest.name}
          sub={busiest.n > 0 ? `${busiest.n} fasalon ki bijai` : undefined} tone="lime" />
        <MiniStat icon={Package} label="Season ka stock" value={formatPKR(stats.seasonStockValue)} tone="amber" />
        <MiniStat icon={AlertTriangle} label="Maal se juri nahi" value={stats.noStock}
          sub="In fasalon ka koi product nahi" tone="rose" />
      </section>

      {stats.noStock > 0 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye safha aadha khali chal raha hai</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
            <strong>{stats.noStock}</strong> fasalon ka koi product juda hua nahi hai. Har cheez
            ke andar <strong>"kis fasal par chalta hai"</strong> bhar dein — phir ye safha khud
            bata dega ke bijai se pehle kya kya mangwana hai.{' '}
            <Link to="/agri/products" className="underline font-black">Maal ki list kholein</Link>
          </p>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={BarChart3} title="Kis mahine sab se zyada rush" wide>
          {monthChart.some((m: any) => m.bijai > 0 || m.katai > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={40} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [v, n === 'bijai' ? 'Bijai shuru' : 'Katai shuru']} />
                <Legend formatter={(v) => (v === 'bijai' ? 'Bijai shuru' : 'Katai shuru')} />
                <Bar dataKey="bijai" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="katai" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi plan nahi" />}
        </ChartCard>

        <ChartCard icon={Layers} title="Mausam ke hisab se">
          {seasonPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={seasonPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {seasonPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi plan nahi" />}
        </ChartCard>

        <ChartCard icon={Package} title="Kis fasal ka kitna maal para hai">
          {cropStockChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropStockChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Stock ki lagat']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {cropStockChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Kisi cheez par fasal likhi hi nahi" />}
        </ChartCard>
      </div>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Sprout className="h-4 w-4 text-emerald-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Agli bijai — tarteeb se</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...rows]
            .filter((r: any) => r.toSow !== null && r.toSow >= 0)
            .sort((a: any, b: any) => (a.toSow ?? 0) - (b.toSow ?? 0))
            .slice(0, 8)
            .map((r: any) => (
              <div key={r.id} className="p-3 flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                  {SEASONS.find((s) => s.value === r.season)?.emoji ?? '🌾'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.cropName}</div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {r.items.length > 0 ? `${r.items.length} cheezein juri hain` : 'koi maal juda nahi'}
                    {r.out.length > 0 && <span className="text-rose-500"> · {r.out.length} khatam</span>}
                  </div>
                </div>
                <span className={`text-[11px] font-black tabular-nums shrink-0 px-2 py-1 rounded-lg ${
                  r.toSow === 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : r.toSow <= 45 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {r.toSow === 0 ? 'aaj se' : `${r.toSow} din`}
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAYI FASAL KA PLAN
   ═════════════════════════════════════════════════════════════ */
function SeasonalPlanForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    season: 'RABI',
    year: new Date().getFullYear(),
    cropName: 'Gandum',
    sowingStart: '', sowingEnd: '', harvestStart: '', harvestEnd: '',
  });
  const [ownCrop, setOwnCrop] = useState(false);

  const errors: string[] = [];
  if (!form.cropName.trim()) errors.push('Fasal ka naam likhein');
  if (!form.sowingStart || !form.sowingEnd) errors.push('Bijai ki dono tareekhein bharein');
  if (!form.harvestStart || !form.harvestEnd) errors.push('Katai ki dono tareekhein bharein');
  if (form.sowingStart && form.sowingEnd && form.sowingEnd < form.sowingStart) {
    errors.push('Bijai khatam hone ki tareekh shuru se pehle nahi ho sakti');
  }
  const valid = errors.length === 0;

  const save = useMutation({
    mutationFn: () => seasonalPlansApi.create({ ...form, year: Number(form.year) }),
    onSuccess: () => { toast.success('Plan ban gaya'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Plan nahi bana'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-lg overflow-hidden print:hidden">
      <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between">
        <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Nayi fasal ka plan
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
          <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 text-[12px] font-bold text-slate-600 dark:text-slate-300">
          Fasal ka naam wohi likhein jo aap product ke andar "kis fasal par chalta hai" me
          likhte hain — tabhi dono aapas me jur payenge.
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Mausam" req>
            <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className={inp}>
              {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
          </Field>
          <Field label="Saal" req>
            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
              className={`${inp} tabular-nums`} />
          </Field>
          <Field label="Fasal" req>
            {ownCrop ? (
              <input autoFocus value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })}
                placeholder="Fasal ka naam" className={inp} />
            ) : (
              <select value={form.cropName}
                onChange={(e) => {
                  if (e.target.value === '__own') { setOwnCrop(true); setForm({ ...form, cropName: '' }); }
                  else setForm({ ...form, cropName: e.target.value });
                }}
                className={inp}>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__own">✍️ Apna naam likhein…</option>
              </select>
            )}
          </Field>
        </div>

        {SEASONS.find((s) => s.value === form.season) && (
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {SEASONS.find((s) => s.value === form.season)!.hint}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sprout className="h-4 w-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                Bijai ka waqt
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shuru">
                <input type="date" value={form.sowingStart}
                  onChange={(e) => setForm({ ...form, sowingStart: e.target.value })} className={inp} />
              </Field>
              <Field label="Khatam">
                <input type="date" value={form.sowingEnd}
                  onChange={(e) => setForm({ ...form, sowingEnd: e.target.value })} className={inp} />
              </Field>
            </div>
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              Isi waqt farmer beej aur khaad kharidta hai
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                Katai ka waqt
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shuru">
                <input type="date" value={form.harvestStart}
                  onChange={(e) => setForm({ ...form, harvestStart: e.target.value })} className={inp} />
              </Field>
              <Field label="Khatam">
                <input type="date" value={form.harvestEnd}
                  onChange={(e) => setForm({ ...form, harvestEnd: e.target.value })} className={inp} />
              </Field>
            </div>
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
              Isi waqt farmer ke paas paisa aata hai — udhaar wusool karein
            </p>
          </div>
        </div>

        {!valid && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 mb-1">
              Ye reh gaya hai
            </div>
            <ul className="space-y-0.5">
              {errors.map((e) => (
                <li key={e} className="text-[12px] font-bold text-rose-800 dark:text-rose-300">• {e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-lime-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!valid}>
            <Save className="h-4 w-4" /> Plan bana dein
          </Button>
        </div>
      </div>
    </section>
  );
}

function RemoveModal({ plan, onClose, onConfirm, saving }: any) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">Plan hatayein</div>
            <h3 className="font-extrabold text-lg truncate">{plan.cropName}</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
            Is fasal ka calendar hat jayega. Aap ka maal aur stock waise ka waisa rahega —
            bas ye yaad-dehani band ho jayegi ke is fasal ki bijai kab hai.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" loading={saving} onClick={onConfirm}>
              <Trash2 className="h-4 w-4" /> Hata dein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition';

function Field({ label, req, children }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
        {label}{req && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all duration-200',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer active:scale-[0.98]' : '',
        active ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
      ].join(' ')}>
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

function MiniStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400', lime: 'text-lime-600 dark:text-lime-400',
    amber: 'text-amber-600 dark:text-amber-400', rose: 'text-rose-600 dark:text-rose-400',
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

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function Empty({ onNew, onGuide }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Calendar className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Abhi koi fasal ka plan nahi</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">
        Gandum, kapas, chawal — jo fasalein aap ke ilaqe me hoti hain, un ki bijai aur katai
        ki tareekhein daal dein. Phir ye safha khud bata dega ke kab kya mangwana hai.
      </p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        <button onClick={onGuide}
          className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
          <GraduationCap className="h-4 w-4" /> Pehle seekh lo
        </button>
        <button onClick={onNew}
          className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
          <Plus className="h-4 w-4" /> Nayi fasal
        </button>
      </div>
    </section>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kaise kaam aata hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Ye sirf tareekhon ki list nahi hai. Har fasal apne aap ko <strong>aap ke stock se
              milati hai</strong> — aur bata deti hai ke bijai se pehle kya kya mangwana hai.
            </p>
          </div>
          <Tip icon={Sprout} title="Bijai ka waqt = kamai ka waqt">
            Saal bhar me do-teen hafte aise hote hain jab farmer sab se zyada kharch karta hai —
            bijai ke din. Us waqt maal na ho to wo doosri dukaan chala jata hai, aur aksar
            wahin ka ho kar reh jata hai.
          </Tip>
          <Tip icon={Clock} title="45 din pehle se warning">
            Bijai shuru hone se 45 din pehle hi fasal "jald bijai" wale hisse me aa jati hai.
            Utna waqt kaafi hota hai supplier se maal mangwane ke liye — aur rate bhi tab
            kam hota hai.
          </Tip>
          <Tip icon={Package} title="Stock se jor">
            Har card par us fasal ka maal dikhta hai. Ye jor product ke andar wale{' '}
            <strong>"kis fasal par chalta hai"</strong> se banta hai. Wahan fasal ka naam bhar
            dein, warna ye safha khali chalega.
          </Tip>
          <Tip icon={Calendar} title="Poora saal ki patti">
            Doosre tab me saal bhar ki patti hai — hari lakeer bijai, peeli katai, aur laal
            lakeer aaj ka din. Ek nazar me pata chal jata hai ke agla rush kab hai.
          </Tip>
          <Tip icon={Scissors} title="Katai ke din udhaar wusool karein">
            Katai ke waqt farmer ke paas paisa aata hai. Purana udhaar maangne ka yehi sab se
            behtar waqt hai — is ke baad paisa kahin aur lag jata hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> nayi fasal</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-3</kbd> tabs</div>
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
