import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Wheat, Sprout, Package, Tractor, TrendingUp, Award,
  Calendar, Wallet, Clock, Layers, ShieldAlert, RefreshCw,
  GraduationCap, FileSpreadsheet, Printer, X, ArrowRight, Scale,
  Banknote, Users, MapPin, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI REPORTS — PAISA KAHAN SE AATA HAI, KAHAN JATA HAI
   ─────────────────────────────────────────────────────────────
   Paisa ka hisab (P&L, rujhan, hafte ka din) shared
   `useReportsData` se aata hai — wohi hisab jo har industry ke
   reports safhe par chalta hai, server par bana hua. Us ko dobara
   likhna sirf numbers me farq paida karta.

   Magar agri ke apne sawal server ke paas nahi hote: kis QISM se
   kitna bana, kis MAUSAM ka maal bika, kis FASAL ka, aur kitna
   paisa UDHAAR me bahar gaya. Ye char cheezein sales ki lines ko
   agri profile se mila kar yahin banti hain.

   Rendering agri ke apne hisson se hai (shared reports components
   sirf light theme ke hain aur violet) — magar numbers wohi hain
   jo Sales aur Dashboard dikhate hain.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'khulasa' | 'qism' | 'mausam' | 'udhaar' | 'farmer';

const TABS: Array<{ id: Tab; label: string; icon: any }> = [
  { id: 'khulasa', label: 'Khulasa', icon: BarChart3 },
  { id: 'qism', label: 'Qism', icon: Layers },
  { id: 'mausam', label: 'Mausam', icon: Calendar },
  { id: 'udhaar', label: 'Udhaar', icon: Wallet },
  { id: 'farmer', label: 'Farmer', icon: Tractor },
];

const KINDS: Array<{ v: string; l: string; e: string; hex: string; test: (k: AgriKind) => boolean }> = [
  { v: 'seed', l: 'Beej', e: '🌱', hex: '#84cc16', test: isSeedKind },
  { v: 'fert', l: 'Khaad', e: '🧪', hex: '#10b981', test: isFertKind },
  { v: 'spray', l: 'Dawa', e: '🐛', hex: '#ef4444', test: isSprayKind },
  { v: 'feed', l: 'Feed', e: '🐄', hex: '#f59e0b', test: isFeedKind },
  { v: 'tool', l: 'Auzaar', e: '🔧', hex: '#64748b', test: isToolKind },
];

const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];

const dayMs = 86_400_000;
const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);
const dayLabel = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export default function AgriReportsV2() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideAmounts = useCostHidden();

  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<Tab>('khulasa');
  const [showTeacher, setShowTeacher] = useState(false);

  /* Paisa ka hisab — server se, wohi jo har industry istemal karti hai */
  const reports = useReportsData(days);

  /* Agri ke apne sawal — sales ki lines ko profile se mila kar */
  const salesQ = useQuery({ queryKey: ['sales-list'], queryFn: () => salesApi.list() });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * 60_000,
  });
  const farmersQ = useQuery({
    queryKey: ['agri-farmers-all'],
    queryFn: () => farmersApi.list({}).catch(() => [] as any[]),
  });

  const isRefetching = salesQ.isRefetching || profilesQ.isRefetching || farmersQ.isRefetching;
  const refetchAll = () => { salesQ.refetch(); profilesQ.refetch(); farmersQ.refetch(); };
  const money = (v: number) => (hideAmounts ? '••••' : formatPKR(v));

  const infoBy = useMemo(() => {
    const m = new Map<string, { kind: AgriKind; group: string; season?: string | null; crops: string[] }>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (!p.productId) return;
      const k = (p.category as AgriKind) ?? 'OTHER';
      m.set(p.productId, {
        kind: k,
        group: KINDS.find((x) => x.test(k))?.v ?? 'tool',
        season: p.season ?? null,
        crops: p.targetCrops ?? [],
      });
    });
    return m;
  }, [profilesQ.data]);

  const infoOf = (i: any) => {
    const hit = infoBy.get(i.product?.id ?? i.productId);
    if (hit) return hit;
    const k = deriveAgriKind(i.product?.category?.name, i.product?.name);
    return { kind: k, group: KINDS.find((x) => x.test(k))?.v ?? 'tool', season: null, crops: [] as string[] };
  };

  /* Muddat ke andar ki bikri — days selector ke mutabiq */
  const live = useMemo(() => {
    const from = Date.now() - days * dayMs;
    return (salesQ.data ?? [])
      .filter((s: any) => s.status !== 'VOIDED' && new Date(s.soldAt).getTime() >= from);
  }, [salesQ.data, days]);

  /**
   * Agri ki char taqseem — ek hi pass me, kyunke bill hazaron ho
   * sakte hain aur har chart ke liye alag guzarna faltu hai.
   *
   * Cost line par mile to margin bhi nikal aata hai; na mile to
   * sirf bikri dikhate hain — jhoota munafa dikhane se behtar hai.
   */
  const agg = useMemo(() => {
    const kind = new Map<string, { rev: number; cost: number; qty: number }>();
    const season = new Map<string, number>();
    const crop = new Map<string, number>();
    const item = new Map<string, { name: string; unit: string; qty: number; rev: number; kind: AgriKind }>();
    let haveCost = false;

    live.forEach((s: any) => (s.items ?? []).forEach((i: any) => {
      const rev = Number(i.lineTotal ?? i.total ?? 0);
      const qty = Number(i.quantity || 0);
      const cost = Number(i.costPrice || 0) * qty;
      if (cost > 0) haveCost = true;
      const info = infoOf(i);

      const ke = kind.get(info.group) ?? { rev: 0, cost: 0, qty: 0 };
      ke.rev += rev; ke.cost += cost; ke.qty += qty;
      kind.set(info.group, ke);

      const sdef = SEASONS.find((x) => x.v === info.season);
      season.set(sdef ? `${sdef.e} ${sdef.l}` : 'Likha nahi',
        (season.get(sdef ? `${sdef.e} ${sdef.l}` : 'Likha nahi') ?? 0) + rev);

      /* Ek cheez kai fasalon par chalti hai — paisa baant dete hain,
         warna kul jama asli bikri se zyada ho jata hai. */
      if (info.crops.length > 0) {
        const share = rev / info.crops.length;
        info.crops.forEach((c) => crop.set(c, (crop.get(c) ?? 0) + share));
      }

      const name = i.product?.name ?? 'Doosri cheez';
      const ie = item.get(name) ?? {
        name, unit: agriUnitLabel(i.product?.unit ?? ''), qty: 0, rev: 0, kind: info.kind,
      };
      ie.qty += qty; ie.rev += rev;
      item.set(name, ie);
    }));

    return {
      haveCost,
      kinds: KINDS.map((k) => {
        const e = kind.get(k.v) ?? { rev: 0, cost: 0, qty: 0 };
        return {
          ...k,
          rev: Math.round(e.rev),
          munafa: Math.round(e.rev - e.cost),
          qty: e.qty,
          margin: e.rev > 0 ? ((e.rev - e.cost) / e.rev) * 100 : 0,
        };
      }).filter((k) => k.rev > 0).sort((a, b) => b.rev - a.rev),
      seasons: [...season.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter((x) => x.value > 0).sort((a, b) => b.value - a.value),
      crops: [...crop.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value).slice(0, 10),
      items: [...item.values()].sort((a, b) => b.rev - a.rev).slice(0, 10),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, infoBy]);

  /* ── Udhaar — agri ka asal sawal ── */
  const credit = useMemo(() => {
    const withCredit = live.filter((s: any) => Number(s.creditAmount) > 0);
    const total = live.reduce((x: number, s: any) => x + Number(s.total || 0), 0);
    const out = withCredit.reduce((x: number, s: any) => x + Number(s.creditAmount || 0), 0);

    const farmers = (farmersQ.data ?? []) as any[];
    const rows = farmers.map((f) => {
      const owed = Number(f.currentBalance || 0) || Number(f.totalOutstanding || 0);
      const cd = Number(f.creditDays || 60);
      const since = f.lastPurchaseAt
        ? Math.floor((Date.now() - new Date(f.lastPurchaseAt).getTime()) / dayMs) : null;
      const overdueBy = owed > 0 && since !== null ? since - cd : null;
      return { ...f, owed, overdueBy, overdue: owed > 0 && overdueBy !== null && overdueBy > 0 };
    });
    const owing = rows.filter((r) => r.owed > 0);

    /* Kitne arse se atka hai — yehi batata hai ke paisa wapas aayega ya nahi */
    const buckets = [
      { name: 'Waqt baqi', value: 0 },
      { name: '1 mahina late', value: 0 },
      { name: '1–3 mahine late', value: 0 },
      { name: '3 mahine se zyada', value: 0 },
    ];
    owing.forEach((r) => {
      const d = r.overdueBy;
      if (d === null || d <= 0) buckets[0].value += r.owed;
      else if (d <= 30) buckets[1].value += r.owed;
      else if (d <= 90) buckets[2].value += r.owed;
      else buckets[3].value += r.owed;
    });

    return {
      periodCredit: out,
      periodPct: total > 0 ? (out / total) * 100 : 0,
      creditBills: withCredit.length,
      totalOwed: owing.reduce((s, r) => s + r.owed, 0),
      owingCount: owing.length,
      overdue: rows.filter((r) => r.overdue),
      buckets: buckets.map((b) => ({ ...b, value: Math.round(b.value) })).filter((b) => b.value > 0),
      top: [...owing].sort((a, b) => b.owed - a.owed).slice(0, 8),
    };
  }, [live, farmersQ.data]);

  /* ── Farmer ── */
  const farmerAgg = useMemo(() => {
    const rows = (farmersQ.data ?? []) as any[];
    const dist = new Map<string, number>();
    const crops = new Map<string, number>();
    rows.forEach((f) => {
      dist.set(f.district || 'Likha nahi', (dist.get(f.district || 'Likha nahi') ?? 0) + 1);
      (f.primaryCrops ?? []).forEach((c: string) => crops.set(c, (crops.get(c) ?? 0) + 1));
    });

    const byCustomer = new Map<string, { id: string; name: string; total: number; bills: number }>();
    live.forEach((s: any) => {
      if (!s.customer) return;
      const e = byCustomer.get(s.customer.id) ?? { id: s.customer.id, name: s.customer.name, total: 0, bills: 0 };
      e.total += Number(s.total || 0); e.bills += 1;
      byCustomer.set(s.customer.id, e);
    });

    return {
      total: rows.length,
      acres: rows.reduce((s, f) => s + Number(f.landAreaAcres || 0), 0),
      districts: [...dist.entries()].map(([name, value]) => ({ name: name.slice(0, 14), value }))
        .sort((a, b) => b.value - a.value).slice(0, 8),
      crops: [...crops.entries()].map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 8),
      top: [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 8),
      walkIn: live.filter((s: any) => !s.customer).length,
    };
  }, [farmersQ.data, live]);

  const pl = reports.profitLoss;

  /* ── CSV — jo tab khula hai usi ka ── */
  const exportCsv = () => {
    const head = [
      [`Agri report — ${tenant?.name || 'Nafaa'}`],
      [`Dukaan: ${shopName || 'Sab'}  •  Muddat: pichle ${days} din  •  Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      ...(pl ? [[`Bikri: ${pl.netRevenue.toFixed(2)}  •  Munafa: ${pl.grossProfit.toFixed(2)} (${pl.grossMargin.toFixed(1)}%)  •  Udhaar: ${pl.credit.toFixed(2)}`]] : []),
      [''],
    ];

    let cols: string[] = [];
    let body: (string | number)[][] = [];

    if (tab === 'qism') {
      cols = ['Qism', 'Bikri', 'Munafa', 'Margin %', 'Tadaad'];
      body = agg.kinds.map((k) => [`${k.e} ${k.l}`, k.rev, k.munafa, k.margin.toFixed(1), fmtQty(k.qty)]);
    } else if (tab === 'mausam') {
      cols = ['Mausam', 'Bikri'];
      body = agg.seasons.map((s) => [s.name, s.value]);
    } else if (tab === 'udhaar') {
      cols = ['Farmer', 'Phone', 'Gaon', 'Udhaar', 'Din late'];
      body = credit.top.map((r: any) => [
        r.fullName, r.phone ?? '', [r.village, r.district].filter(Boolean).join(', '),
        Math.round(r.owed), r.overdueBy !== null && r.overdueBy > 0 ? r.overdueBy : '',
      ]);
    } else if (tab === 'farmer') {
      cols = ['Farmer', 'Bill', 'Kharidari'];
      body = farmerAgg.top.map((f) => [f.name, f.bills, Math.round(f.total)]);
    } else {
      cols = ['Cheez', 'Qism', 'Tadaad', 'Naap', 'Bikri'];
      body = agg.items.map((i) => [i.name, prettyAgriKind(i.kind), fmtQty(i.qty), i.unit, Math.round(i.rev)]);
    }

    if (body.length === 0) return toast.error('Is muddat me koi data nahi');
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...head, cols, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-report-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${body.length} lines CSV me`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') window.print();
      if (k === 'r') refetchAll();
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">📊 {tenant?.name || 'Agri'} — Report</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}Pichle {days} din
              {pl && ` • Bikri ${formatPKR(pl.netRevenue)} • Munafa ${formatPKR(pl.grossProfit)}`}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <BarChart3 className="h-3.5 w-3.5 text-lime-300" /> Agri · Report
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">📊 Paisa Ka Hisab</h1>
            {pl && (
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
                Pichle {days} din · bikri <strong>{money(pl.netRevenue)}</strong> ·
                munafa <strong className="text-emerald-300">{money(pl.grossProfit)}</strong>
                {pl.credit > 0 && <> · <span className="text-amber-200">{money(pl.credit)} udhaar gaya</span></>}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={exportCsv} title="CSV"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" />
            </button>
            <button onClick={() => window.print()} title="Print (P)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={refetchAll} disabled={isRefetching} title="Taaza (R)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Muddat */}
        <div className="relative mt-4 flex gap-1.5 flex-wrap">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`h-9 px-3 rounded-xl text-xs font-black transition ${
                days === d ? 'bg-white text-emerald-700 shadow-lg'
                  : 'bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur'
              }`}>{d} din</button>
          ))}
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 print:hidden">
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition ${
              tab === t.id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <t.icon className="h-4 w-4" />
            <span className="truncate">{t.label}</span>
            <kbd className="hidden lg:inline text-[9px] opacity-60">{i + 1}</kbd>
          </button>
        ))}
      </div>

      {reports.isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
          </div>
          <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      ) : tab === 'khulasa' ? (
        <KhulasaTab reports={reports} pl={pl} money={money} days={days} hideAmounts={hideAmounts} agg={agg} />
      ) : tab === 'qism' ? (
        <QismTab agg={agg} money={money} hideAmounts={hideAmounts} />
      ) : tab === 'mausam' ? (
        <MausamTab agg={agg} money={money} />
      ) : tab === 'udhaar' ? (
        <UdhaarTab credit={credit} money={money} days={days} />
      ) : (
        <FarmerTab data={farmerAgg} money={money} />
      )}

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
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 1 — KHULASA
   ═════════════════════════════════════════════════════════════ */
function KhulasaTab({ reports, pl, money, days, hideAmounts, agg }: any) {
  const trend = useMemo(
    () => (reports.trend ?? []).map((t: any) => ({
      name: dayLabel(t.date),
      bikri: Math.round(Number(t.sales || 0)),
      munafa: Math.round(Number(t.profit || 0)),
      udhaar: Math.round(Number(t.credit || 0)),
    })),
    [reports.trend],
  );

  const pay = useMemo(
    () => (reports.paymentMethods ?? []).map((p: any) => ({
      name: p.paymentMethod, value: Math.round(Number(p.total || 0)),
    })).filter((x: any) => x.value > 0),
    [reports.paymentMethods],
  );

  const weekday = useMemo(
    () => (reports.weekdayPattern ?? []).map((w: any) => ({
      name: w.day?.slice(0, 3) ?? '', bikri: Math.round(Number(w.sales || 0)),
    })),
    [reports.weekdayPattern],
  );

  const inv = reports.inventoryValue?.totals;

  return (
    <div className="space-y-4">
      {pl && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={TrendingUp} label="Bikri" value={money(pl.netRevenue)}
            sub={`${pl.orderCount} bill · ${days} din`} tone="emerald" />
          <Kpi icon={Award} label="Munafa" value={money(pl.grossProfit)}
            sub={`${pl.grossMargin.toFixed(1)}% margin`} tone="lime" />
          <Kpi icon={Wallet} label="Udhaar gaya" value={money(pl.credit)}
            sub={pl.netRevenue > 0 ? `${((pl.credit / pl.netRevenue) * 100).toFixed(0)}% bikri` : '—'}
            tone="amber" />
          <Kpi icon={Banknote} label="Cash aaya" value={money(pl.paid)}
            sub={pl.expenses > 0 ? `kharch ${formatPKR(pl.expenses)}` : 'Koi kharch nahi'} tone="rose" />
        </section>
      )}

      {pl && pl.netRevenue > 0 && pl.credit / pl.netRevenue > 0.5 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Aadhi se zyada bikri udhaar par</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
            In {days} din me <strong>{((pl.credit / pl.netRevenue) * 100).toFixed(0)}%</strong> maal
            udhaar par gaya. Agri me ye aam hai, magar itna paisa bahar hone par naya maal mangwane
            ke liye cash nahi bachta. "Udhaar" tab me dekhein ke kis ka waqt guzar chuka.
          </p>
        </section>
      )}

      <ChartCard icon={TrendingUp} title={`Pichle ${days} din`} wide>
        {trend.some((t: any) => t.bikri > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={days > 30 ? 4 : 0} />
              <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n]} />
              <Legend />
              <Area type="monotone" dataKey="bikri" name="Bikri" stroke="#10b981" fill="#10b981" fillOpacity={0.18} strokeWidth={2.5} />
              <Bar dataKey="udhaar" name="Udhaar" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Line type="monotone" dataKey="munafa" name="Munafa" stroke="#84cc16" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <EmptyBox text="Is muddat me koi bikri nahi" />}
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Banknote} title="Paisa kaise aaya">
          {pay.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pay} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {pay.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Hafte ka kaunsa din bhara">
          {weekday.some((w: any) => w.bikri > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekday}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={65} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="bikri" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi bikri nahi" />}
        </ChartCard>
      </div>

      {inv && !hideAmounts && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" /> Gudaam
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Box label="Stock ki lagat" value={formatPKR(inv.totalCostValue)} tone="lime" />
            <Box label="Sab bik jaye to" value={formatPKR(inv.totalSellValue)} tone="emerald" />
            <Box label="Munafa banega" value={formatPKR(inv.potentialProfit)} tone="emerald" />
            <Box label="Margin" value={`${Number(inv.potentialMargin || 0).toFixed(1)}%`} tone="slate" />
          </div>
        </section>
      )}

      <ListCard icon={Wheat} title={`Pichle ${days} din — kya sab se zyada bika`} to="/sales"
        rows={agg.items.map((i: any) => ({
          key: i.name,
          title: `${AGRI_KIND_EMOJI[i.kind as AgriKind]} ${i.name}`,
          sub: `${fmtQty(i.qty)} ${i.unit}`,
          value: money(i.rev),
        }))} emptyText="Is muddat me koi bikri nahi" />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 2 — QISM
   ─────────────────────────────────────────────────────────────
   Agri me margin har qism ka bohat alag hota hai: dawa par 25%
   aur khaad par 6% aam baat hai. "Kul bikri" is farq ko chhupa
   deti hai, is liye yahan har qism ka apna margin dikhta hai.
   ═════════════════════════════════════════════════════════════ */
function QismTab({ agg, money, hideAmounts }: any) {
  if (agg.kinds.length === 0) {
    return <EmptyState icon={Layers} title="Is muddat me koi bikri nahi"
      sub="Ooper se koi doosri muddat chun kar dekhein." />;
  }

  const best = [...agg.kinds].sort((a: any, b: any) => b.margin - a.margin)[0];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {agg.kinds.map((k: any) => (
          <div key={k.v} className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">
              {k.e} {k.l}
            </div>
            <div className="mt-1 text-base font-black text-slate-900 dark:text-white tabular-nums truncate">
              {money(k.rev)}
            </div>
            {agg.haveCost && !hideAmounts && (
              <div className={`text-[11px] font-black tabular-nums ${
                k.margin > 20 ? 'text-emerald-600 dark:text-emerald-400'
                  : k.margin > 0 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>{k.margin.toFixed(1)}% margin</div>
            )}
          </div>
        ))}
      </section>

      {agg.haveCost && !hideAmounts && best && (
        <section className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-emerald-600" />
            <h3 className="font-black text-emerald-900 dark:text-emerald-200">Sab se behtar margin</h3>
          </div>
          <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <strong>{best.e} {best.l}</strong> par <strong>{best.margin.toFixed(1)}%</strong> margin
            hai. Agri me dawa ka margin aksar khaad se kayi guna zyada hota hai — bikri bari lagti
            hai magar bacha kam. Stock aur counter ki jagah usi hisab se rakhein.
          </p>
        </section>
      )}

      {!agg.haveCost && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Margin nahi nikal saka</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
            Kisi bhi bikri par cost darj nahi hui, is liye sirf bikri dikhai ja rahi hai. Product
            me cost bhar dein — phir har qism ka asal munafa nazar aayega.
          </p>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Layers} title="Kis qism se kitni bikri">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={agg.kinds} dataKey="rev" nameKey="l" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {agg.kinds.map((k: any, i: number) => <Cell key={i} fill={k.hex} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Award} title={agg.haveCost ? 'Bikri aur munafa' : 'Bikri'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agg.kinds}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="l" stroke={AXIS} fontSize={10} fontWeight={700} />
              <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'rev' ? 'Bikri' : 'Munafa']} />
              <Legend formatter={(v) => (v === 'rev' ? 'Bikri' : 'Munafa')} />
              <Bar dataKey="rev" fill="#84cc16" radius={[6, 6, 0, 0]} />
              {agg.haveCost && <Bar dataKey="munafa" fill="#10b981" radius={[6, 6, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ListCard icon={Wheat} title="Kya sab se zyada bika" to="/sales"
        rows={agg.items.map((i: any) => ({
          key: i.name,
          title: `${AGRI_KIND_EMOJI[i.kind as AgriKind]} ${i.name}`,
          sub: `${fmtQty(i.qty)} ${i.unit} · ${prettyAgriKind(i.kind)}`,
          value: money(i.rev),
        }))} emptyText="Is muddat me koi bikri nahi" />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 3 — MAUSAM
   ═════════════════════════════════════════════════════════════ */
function MausamTab({ agg, money }: any) {
  const noSeason = agg.seasons.find((s: any) => s.name === 'Likha nahi');
  const total = agg.seasons.reduce((s: number, x: any) => s + x.value, 0);
  const noPct = noSeason && total > 0 ? (noSeason.value / total) * 100 : 0;

  return (
    <div className="space-y-4">
      {noPct > 30 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Mausam ka hisab adhoora hai</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
            <strong>{noPct.toFixed(0)}%</strong> bikri aisi cheezon ki hai jin par mausam likha hi
            nahi. Product ke andar mausam bhar dein — phir ye chart bata payega ke Kharif aur Rabi
            me se kis se zyada kamai hoti hai, aur agle season ki kharidari usi hisab se hogi.{' '}
            <Link to="/agri/products" className="underline font-black">Maal kholein</Link>
          </p>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Calendar} title="Kis mausam ka maal bika">
          {agg.seasons.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={agg.seasons} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {agg.seasons.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Is muddat me koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Sprout} title="Kis fasal ka maal bika">
          {agg.crops.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agg.crops} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Cheezon par fasal likhi hi nahi" />}
        </ChartCard>
      </div>

      <section className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <h3 className="font-black text-emerald-900 dark:text-emerald-200">Is se kya faida uthana hai</h3>
        </div>
        <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
          Jis mausam aur fasal se sab se zyada kamai hui, agle saal usi ka stock pehle aur zyada
          rakhein. "Fasal ka calendar" me dekhein ke us ki bijai kab hai — season shuru hone se
          45 din pehle mangwana sab se behtar hota hai, us waqt rate bhi kam hota hai.
        </p>
        <Link to="/agri/seasonal-plans"
          className="mt-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
          <Calendar className="h-3.5 w-3.5" /> Fasal ka calendar
        </Link>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 4 — UDHAAR
   ═════════════════════════════════════════════════════════════ */
function UdhaarTab({ credit, money, days }: any) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Wallet} label="Kul bahar para" value={money(credit.totalOwed)}
          sub={`${credit.owingCount} farmer ke paas`} tone="amber" />
        <Kpi icon={TrendingUp} label={`${days} din me gaya`} value={money(credit.periodCredit)}
          sub={`${credit.periodPct.toFixed(0)}% bikri · ${credit.creditBills} bill`} tone="lime" />
        <Kpi icon={Clock} label="Waqt guzar gaya" value={credit.overdue.length}
          sub={credit.overdue.length > 0 ? money(credit.overdue.reduce((s: number, r: any) => s + r.owed, 0)) : 'Koi late nahi'}
          tone="rose" />
        <Kpi icon={Users} label="Khata saaf" value={Math.max(credit.owingCount - credit.overdue.length, 0)}
          sub="Waqt se andar" tone="emerald" />
      </section>

      <ChartCard icon={Clock} title="Udhaar kitne arse se atka hai" wide>
        {credit.buckets.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={credit.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
              <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Udhaar']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {credit.buckets.map((_: any, i: number) => (
                  <Cell key={i} fill={['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyBox text="Kisi ka udhaar baqi nahi" />}
      </ChartCard>

      <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-4 w-4 text-amber-600" />
          <h3 className="font-black text-amber-900 dark:text-amber-200">Ye chart kya batata hai</h3>
        </div>
        <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
          Jitna udhaar dayein taraf jata hai, us ke wapas aane ka imkaan utna kam. Teen mahine se
          purana paisa aksar season badalne tak nahi aata. Jo "waqt baqi" me hai us ki fikar nahi —
          asal kaam un logon se hai jo laal aur narangi me hain.
        </p>
        <Link to="/agri/farmers"
          className="mt-2 h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
          <Tractor className="h-3.5 w-3.5" /> Wusooli ki list
        </Link>
      </section>

      <ListCard icon={Tractor} title="Sab se zyada udhaar kis par" to="/agri/farmers"
        rows={credit.top.map((r: any) => ({
          key: r.id, to: `/agri/farmers/${r.id}`,
          title: r.fullName,
          sub: `${[r.village, r.district].filter(Boolean).join(', ') || 'Gaon nahi'}${
            r.overdue ? ` · ${r.overdueBy} din late` : ''}`,
          value: money(r.owed),
        }))} emptyText="Kisi ka udhaar baqi nahi" />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 5 — FARMER
   ═════════════════════════════════════════════════════════════ */
function FarmerTab({ data, money }: any) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Kul farmer" value={data.total} sub="Register shuda" tone="emerald" />
        <Kpi icon={Layers} label="Kul raqba" value={`${Math.round(data.acres)} acre`}
          sub={data.total > 0 ? `aam ${(data.acres / data.total).toFixed(1)} acre` : undefined} tone="lime" />
        <Kpi icon={MapPin} label="Zila" value={data.districts.length} sub="Jahan se farmer aate hain" tone="amber" />
        <Kpi icon={Wheat} label="Bina farmer bill" value={data.walkIn}
          sub={data.walkIn > 0 ? 'In par udhaar nahi chal sakta' : 'Sab bill farmer par'} tone="rose" />
      </section>

      {data.walkIn > 0 && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">{data.walkIn} bill par farmer nahi laga</h3>
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
            In bills ka kisi khate se ta'alluq nahi — na udhaar chal sakta hai, na ye pata chalega
            ke kaun kya le gaya. POS par farmer chunna aadat bana lein.
          </p>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={MapPin} title="Kis zila se kitne farmer">
          {data.districts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.districts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Farmer']} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Zila likha hi nahi gaya" />}
        </ChartCard>

        <ChartCard icon={Sprout} title="Kaun si fasal sab se zyada ugti hai">
          {data.crops.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.crops} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {data.crops.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Farmer par fasal likhi hi nahi" />}
        </ChartCard>
      </div>

      <ListCard icon={Award} title="Sab se bare farmer" to="/agri/farmers"
        rows={data.top.map((f: any) => ({
          key: f.id, to: `/customers/${f.id}`,
          title: f.name, sub: `${f.bills} bill`,
          value: money(f.total),
        }))} emptyText="Kisi bill par farmer nahi laga" />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
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
    </div>
  );
}

function Box({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    lime: 'bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30 text-lime-900 dark:text-lime-200',
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 ${tones[tone] ?? tones.slate}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-0.5 text-lg font-black tabular-nums break-words">{value}</div>
    </div>
  );
}

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div className="h-72">{children}</div>
    </section>
  );
}

function ListCard({ icon: Icon, title, rows, emptyText, to }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
        {to && (
          <Link to={to} className="ml-auto text-xs font-black text-emerald-600 hover:underline inline-flex items-center gap-1 print:hidden">
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-slate-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r: any, i: number) => {
            const body = (
              <>
                <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.title}</span>
                  <span className="block text-[11px] font-bold text-slate-400 truncate">{r.sub}</span>
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{r.value}</span>
              </>
            );
            return r.to ? (
              <Link key={r.key} to={r.to} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                {body}
              </Link>
            ) : (
              <div key={r.key} className="p-3 flex items-center gap-3">{body}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function EmptyState({ icon: Icon, title, sub }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-14 text-center">
      <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Icon className="h-8 w-8 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">{sub}</p>
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
            <GraduationCap className="h-5 w-5" /> Ye report kaise parhein
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={BarChart3} title="Khulasa">
            Kul bikri, munafa, cash aur udhaar — ek nazar me. Rujhan wale chart me hari lakeer
            bikri, peele bar udhaar, aur halki hari lakeer munafa hai.
          </Tip>
          <Tip icon={Layers} title="Qism — sab se kaam ka tab">
            Agri me dawa par 25% aur khaad par 6% margin aam baat hai. "Kul bikri" ye farq chhupa
            deti hai: khaad ki bikri bari lagti hai magar bacha kam. Yahan har qism ka apna margin
            dikhta hai — isi se tay karein ke counter par kya rakhna hai.
          </Tip>
          <Tip icon={Calendar} title="Mausam aur fasal">
            Jis mausam se zyada kamai hui, agle saal us ka stock pehle rakhein. Ye chart tabhi
            bharta hai jab product ke andar mausam aur fasal likhi ho.
          </Tip>
          <Tip icon={Wallet} title="Udhaar — kitna purana">
            Jitna udhaar dayein taraf jata hai, wapas aane ka imkaan utna kam. Teen mahine se
            purana paisa aksar season badalne tak nahi aata.
          </Tip>
          <Tip icon={Tractor} title="Farmer">
            Kahan se farmer aate hain, kya ugate hain, aur kaun sab se bara gahak hai. "Bina farmer
            bill" ka number zyada ho to POS par farmer chunna aadat banayein.
          </Tip>
          <Tip icon={Scale} title="Numbers kahan se aate hain">
            Paisa ka hisab server se aata hai — wohi jo Sales safhe par hai. Qism, mausam aur fasal
            wali taqseem yahin banti hai, is liye har jagah numbers mel khate hain.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-5</kbd> tabs</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">R</kbd> taaza</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> guide</div>
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
