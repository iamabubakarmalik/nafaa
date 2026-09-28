import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Package, Search, X, RefreshCw, Wheat, Sprout,
  FileSpreadsheet, Printer, GraduationCap, MessageCircle, Copy,
  CheckCircle2, ShieldAlert, ShieldCheck, Calendar, TrendingDown,
  Truck, Boxes, Clock, ShoppingCart, Edit3, Scale, Landmark,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { QuickStockModal } from '@industries/retail/components/QuickStockModal';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { certStatus, isMeasured, agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, needsGovtReg, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI — AAJ KYA MANGWANA HAI
   ─────────────────────────────────────────────────────────────
   Kiryana aur agri ka masla ek jaisa nahi.

   Kiryana wala sirf ye dekhta hai ke cheez khatam ho rahi hai ya
   nahi. Agri wale ko teen cheezein dekhni parti hain:

     1. Stock kam — bori, bottle, packet. Season se pehle mangwana
        parta hai, warna rate barh jata hai.

     2. SARKARI REGISTRATION — beej aur zehreeli dawa ki meyaad
        khatam ho jaye to wo cheez bechna ghair-qanooni hai.
        Stock poora hone ke bawajood wo bik nahi sakti. Ye masla
        kisi aur industry me hota hi nahi.

     3. MAUSAM — Rabi aane wala hai aur gandum ka beej gudaam me
        nahi? Wo season nikal jayega. Yahan pehle se pata chal
        jata hai.

   Is liye ye safha teen hisson me hai.
   ═════════════════════════════════════════════════════════════ */

const fmtQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

type Tab = 'order' | 'cert' | 'season';
type Urgency = 'all' | 'critical' | 'warning';

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#84cc16'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

/**
 * Aaj ke mahine se abhi ka mausam.
 *
 * Pakistan me Kharif Mai se October, Rabi November se April.
 * Zaid in ke beech March–June me chalta hai, is liye wo alag se
 * nahi ginta — us ka maal "abhi ka" tab hi hai jab mahina mil jaye.
 */
function currentSeasons(d = new Date()): string[] {
  const m = d.getMonth() + 1;
  const out: string[] = ['ALL_SEASON'];
  if (m >= 5 && m <= 10) out.push('KHARIF');
  else out.push('RABI');
  if (m >= 3 && m <= 6) out.push('ZAID');
  return out;
}

/** Agla mausam kaunsa hai — us ka maal pehle se mangwana hota hai */
function nextSeason(d = new Date()): string {
  const m = d.getMonth() + 1;
  return m >= 5 && m <= 10 ? 'RABI' : 'KHARIF';
}

export default function AgriLowStockPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('order');
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('all');
  const [stockModalRow, setStockModalRow] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ── Data ── */
  const stockQ = useQuery({
    queryKey: ['agri-low-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}),
  });

  const isLoading = stockQ.isLoading || profilesQ.isLoading;
  const isRefetching = stockQ.isRefetching || profilesQ.isRefetching;
  const refetchAll = () => { stockQ.refetch(); profilesQ.refetch(); };

  const profileBy = useMemo(() => {
    const m = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /** Har row + uski agri tafseel — qism, registration, packSize */
  const rows = useMemo(() => {
    const list = stockQ.data?.rows ?? [];
    return list.map((r) => {
      const profile = profileBy.get(r.productId);
      const kind = (profile?.category as AgriKind) ?? deriveAgriKind(r.category, r.productName);
      const packSize = profile?.packSize ? Number(profile.packSize) : 0;
      /* Reorder level agri profile me alag se hota hai — wahan
         bhara ho to wohi chalega, warna product ka apna. */
      const level = Math.max(
        Number(profile?.reorderLevel ?? profile?.minStockAlert ?? r.lowStockAlert) || 0, 0,
      );
      const have = Number(r.stock) || 0;
      return {
        ...r,
        profile, kind,
        level,
        have,
        short: Math.max(level - have, 0),
        cert: certStatus(profile?.govtRegExpiry),
        regulated: needsGovtReg(kind),
        packSize: packSize > 0 && !isMeasured(r.unit) ? packSize : 0,
        packUnit: profile?.packUnit ?? 'kg',
        season: profile?.season ?? null,
        restricted: !!profile?.isRestricted,
      };
    });
  }, [stockQ.data, profileBy]);

  /* ── 1. Mangwana hai ── */
  const orderRows = useMemo(
    () => rows
      .filter((r) => r.have <= r.level)
      .sort((a, b) => {
        if ((a.have === 0) !== (b.have === 0)) return a.have === 0 ? -1 : 1;
        return b.short - a.short;
      }),
    [rows],
  );

  /* ── 2. Registration ── */
  const certRows = useMemo(
    () => rows
      .filter((r) => r.regulated && (r.cert.state === 'expired' || r.cert.state === 'soon' || r.cert.state === 'none'))
      .sort((a, b) => {
        const rank = (s: string) => (s === 'expired' ? 0 : s === 'soon' ? 1 : 2);
        const d = rank(a.cert.state) - rank(b.cert.state);
        return d !== 0 ? d : (a.cert.days ?? 9999) - (b.cert.days ?? 9999);
      }),
    [rows],
  );

  /* ── 3. Mausam ──
     Abhi jo mausam chal raha hai aur jo aane wala hai — un ka maal
     agar khatam ya kam hai to season nikal jayega. */
  const nowSeasons = currentSeasons();
  const coming = nextSeason();
  const seasonRows = useMemo(
    () => rows
      .filter((r) => r.season && (nowSeasons.includes(r.season) || r.season === coming))
      .filter((r) => r.have <= r.level || r.have === 0)
      .sort((a, b) => {
        /* Abhi ka mausam pehle, phir aane wala */
        const aNow = nowSeasons.includes(a.season!) ? 0 : 1;
        const bNow = nowSeasons.includes(b.season!) ? 0 : 1;
        if (aNow !== bNow) return aNow - bNow;
        return a.have - b.have;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );

  /* ── Search + urgency ── */
  const q = search.trim().toLowerCase();
  const matches = (r: any) =>
    !q || (r.productName || '').toLowerCase().includes(q)
      || (r.category || '').toLowerCase().includes(q)
      || (r.sku || '').toLowerCase().includes(q)
      || (r.brand || '').toLowerCase().includes(q)
      || (r.profile?.targetCrops ?? []).some((c: string) => c.toLowerCase().includes(q));

  const shownOrder = useMemo(() => {
    let out = orderRows;
    if (urgency === 'critical') out = out.filter((r) => r.have === 0);
    if (urgency === 'warning') out = out.filter((r) => r.have > 0);
    return out.filter(matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRows, urgency, q]);

  const shownCert = useMemo(() => {
    let out = certRows;
    if (urgency === 'critical') out = out.filter((r) => r.cert.state === 'expired');
    if (urgency === 'warning') out = out.filter((r) => r.cert.state !== 'expired');
    return out.filter(matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certRows, urgency, q]);

  const shownSeason = useMemo(() => {
    let out = seasonRows;
    if (urgency === 'critical') out = out.filter((r) => r.have === 0);
    if (urgency === 'warning') out = out.filter((r) => r.have > 0);
    return out.filter(matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonRows, urgency, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const out = orderRows.filter((r) => r.have === 0).length;
    const orderCost = orderRows.reduce((s, r) => s + r.short * Number(r.costPrice || 0), 0);
    const expired = certRows.filter((r) => r.cert.state === 'expired');
    /* Jis cheez ki registration khatam ho chuki, uska poora stock
       abhi bik nahi sakta — wo paisa phansa hua hai. */
    const blockedValue = expired.reduce((s, r) => s + Number(r.stock || 0) * Number(r.salePrice || 0), 0);
    return {
      orderCount: orderRows.length,
      outOfStock: out,
      orderCost,
      certCount: certRows.length,
      expiredCount: expired.length,
      soonCount: certRows.filter((r) => r.cert.state === 'soon').length,
      missingCount: certRows.filter((r) => r.cert.state === 'none').length,
      blockedValue,
      seasonCount: seasonRows.length,
      seasonOut: seasonRows.filter((r) => r.have === 0).length,
    };
  }, [orderRows, certRows, seasonRows]);

  /* ── Charts ── */
  const orderChart = useMemo(
    () => shownOrder.slice(0, 10).map((r) => ({
      name: (r.productName || '').slice(0, 14),
      mangwao: r.short,
      hai: r.have,
    })),
    [shownOrder],
  );

  const certPie = useMemo(() => ([
    { name: 'Khatam ho chuki', value: stats.expiredCount },
    { name: '60 din me khatam', value: stats.soonCount },
    { name: 'Tareekh likhi hi nahi', value: stats.missingCount },
  ].filter((x) => x.value > 0)), [stats]);

  const kindChart = useMemo(() => {
    const m = new Map<string, number>();
    shownOrder.forEach((r) => {
      const k = prettyAgriKind(r.kind);
      m.set(k, (m.get(k) ?? 0) + r.short * Number(r.costPrice || 0));
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [shownOrder]);

  /* ── Order list — supplier ko bhejne ke liye ── */
  const orderText = useMemo(() => {
    const lines = shownOrder.map((r, i) =>
      `${i + 1}. ${r.productName} — ${fmtQty(r.short)} ${agriUnitLabel(r.unit)}`
      + (r.packSize ? ` (${fmtQty(r.short * r.packSize)} ${r.packUnit})` : ''));
    return [
      `🌾 *${tenant?.name || 'Agri'}* — maal ki list`,
      shopName ? `📍 ${shopName}` : '',
      `📅 ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
      '',
      ...lines,
      '',
      `Kul ${shownOrder.length} cheezein • andazan ${formatPKR(stats.orderCost)}`,
    ].filter(Boolean).join('\n');
  }, [shownOrder, tenant, shopName, stats.orderCost]);

  const certText = useMemo(() => {
    const lines = shownCert.map((r, i) =>
      `${i + 1}. ${r.productName} — ${r.cert.state === 'none' ? 'tareekh nahi bhari' : r.cert.text}`);
    return [
      `🛡️ *${tenant?.name || 'Agri'}* — registration wali list`,
      shopName ? `📍 ${shopName}` : '',
      '',
      ...lines,
      '',
      'In ki registration renew karwani hai.',
    ].filter(Boolean).join('\n');
  }, [shownCert, tenant, shopName]);

  const activeText = tab === 'cert' ? certText : orderText;

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('List copy ho gayi');
    } catch {
      toast.error('Copy nahi ho saki');
    }
  };

  const whatsappList = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(activeText)}`, '_blank');
  };

  /* ── CSV ── */
  const exportCsv = () => {
    let head: string[] = [];
    let body: (string | number)[][] = [];

    if (tab === 'order') {
      head = ['Cheez', 'Qism', 'Category', 'Abhi hai', 'Hadd', 'Mangwana hai', 'Naap', '1 me kitna', 'Cost', 'Kharcha', 'Rate'];
      body = shownOrder.map((r) => [
        r.productName, prettyAgriKind(r.kind), r.category || '',
        r.have, r.level, r.short, r.unit,
        r.packSize ? `${r.packSize} ${r.packUnit}` : '',
        r.costPrice, Math.round(r.short * Number(r.costPrice || 0)), r.salePrice,
      ]);
    } else if (tab === 'cert') {
      head = ['Cheez', 'Qism', 'Reg number', 'Meyaad', 'Halat', 'Stock', 'Phansa paisa'];
      body = shownCert.map((r) => [
        r.productName, prettyAgriKind(r.kind),
        r.profile?.govtRegNumber || '',
        r.profile?.govtRegExpiry ? String(r.profile.govtRegExpiry).slice(0, 10) : '',
        r.cert.state === 'expired' ? 'Khatam' : r.cert.state === 'soon' ? 'Jald khatam' : 'Nahi bhari',
        r.stock, Math.round(Number(r.stock || 0) * Number(r.salePrice || 0)),
      ]);
    } else {
      head = ['Cheez', 'Mausam', 'Abhi hai', 'Hadd', 'Mangwana hai', 'Naap', 'Fasal'];
      body = shownSeason.map((r) => [
        r.productName,
        SEASONS.find((s) => s.v === r.season)?.l ?? '',
        r.have, r.level, r.short, r.unit,
        (r.profile?.targetCrops ?? []).join(' / '),
      ]);
    }

    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV nikal gayi');
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (stockModalRow) return setStockModalRow(null);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') doPrint();
      if (e.key === '1') setTab('order');
      if (e.key === '2') setTab('cert');
      if (e.key === '3') setTab('season');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, stockModalRow]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });
  const comingDef = SEASONS.find((s) => s.v === coming);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Agri'} — Kya mangwana hai</h1>
        <p className="text-xs text-slate-600">{shopName ? `${shopName} • ` : ''}{printDate}</p>
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
              <Wheat className="h-3.5 w-3.5 text-lime-300" /> Agri · Roz subah
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🌾 Kya Mangwana Hai</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-lime-200">{stats.orderCount}</strong> cheezein kam ·{' '}
              <strong className="text-rose-200">{stats.expiredCount}</strong> ki registration khatam ·{' '}
              <strong className="text-amber-200">{stats.seasonCount}</strong> is mausam ka maal
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={exportCsv} title="CSV"
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
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Truck} label="Mangwana hai" value={stats.orderCount}
          sub={stats.outOfStock > 0 ? `${stats.outOfStock} bilkul khatam` : 'Sab kuch maujood'}
          tone="emerald" onClick={() => setTab('order')} active={tab === 'order'} />
        <Kpi icon={Boxes} label="Andazan kharcha" value={formatPKR(stats.orderCost)}
          sub="Hadd tak bharne ke liye" tone="lime" />
        <Kpi icon={ShieldAlert} label="Registration" value={stats.certCount}
          sub={stats.expiredCount > 0 ? `${stats.expiredCount} khatam ho chuki` : `${stats.soonCount} jald khatam`}
          tone="rose" onClick={() => setTab('cert')} active={tab === 'cert'} />
        <Kpi icon={Calendar} label="Is mausam ka maal" value={stats.seasonCount}
          sub={comingDef ? `Aage ${comingDef.e} ${comingDef.l}` : 'Season ka hisab'}
          tone="amber" onClick={() => setTab('season')} active={tab === 'season'} />
      </section>

      {/* ═══ REGISTRATION KHATAM — sab se ooper ═══ */}
      {stats.expiredCount > 0 && tab !== 'cert' && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">
              🚫 {stats.expiredCount} cheezon ki registration khatam — {formatPKR(stats.blockedValue)} ka maal phansa hua hai
            </h3>
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">
              Stock gudaam me para hai magar qanooni tor par bik nahi sakta. Renew karwa kar tareekh update karein.
            </p>
          </div>
          <button onClick={() => { setTab('cert'); setUrgency('critical'); }}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 transition active:scale-[0.97]">
            Dekhein →
          </button>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([
          ['order', 'Mangwana hai', Truck, shownOrder.length, '1'],
          ['cert', 'Registration', ShieldCheck, shownCert.length, '2'],
          ['season', 'Mausam', Calendar, shownSeason.length, '3'],
        ] as const).map(([id, label, Icon, count, key]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${
              tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
            }`}>{count}</span>
            <kbd className="hidden sm:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {/* ═══ SEARCH + FILTER ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, category, brand, fasal… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            {([['all', 'Sab'], ['critical', '🔴 Foran'], ['warning', '🟡 Jald']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setUrgency(v as Urgency)}
                className={`h-12 px-3.5 rounded-2xl border-2 text-xs font-black transition ${
                  urgency === v
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                }`}>{l}</button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <button onClick={copyList}
              className="h-12 px-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 hover:border-emerald-400 inline-flex items-center gap-1.5 transition">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? 'Copy hui' : 'List copy'}</span>
            </button>
            <button onClick={whatsappList}
              className="h-12 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'order' && (
            <OrderTab rows={shownOrder} chart={orderChart} kindChart={kindChart}
              totalCost={stats.orderCost} onStock={setStockModalRow} />
          )}
          {tab === 'cert' && <CertTab rows={shownCert} pie={certPie} blockedValue={stats.blockedValue} />}
          {tab === 'season' && (
            <SeasonTab rows={shownSeason} nowSeasons={nowSeasons} coming={coming} onStock={setStockModalRow} />
          )}
        </>
      )}

      {stockModalRow && <QuickStockModal product={stockModalRow} onClose={() => setStockModalRow(null)} />}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

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
          thead th { background: #059669 !important; color: white !important; }
          tbody tr { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 1 — MANGWANA HAI
   ═════════════════════════════════════════════════════════════ */
function OrderTab({ rows, chart, kindChart, totalCost, onStock }: {
  rows: any[]; chart: any[]; kindChart: any[]; totalCost: number; onStock: (r: any) => void;
}) {
  if (rows.length === 0) {
    return <Empty icon={CheckCircle2} title="Gudaam bhara hua hai"
      sub="Abhi kuch mangwane ki zaroorat nahi — sab cheezein hadd se ooper hain." />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-emerald-500/10 dark:to-lime-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4 flex items-center gap-3 flex-wrap print:hidden">
        <Truck className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="flex-1 min-w-[200px] text-[12px] font-bold text-emerald-900 dark:text-emerald-200">
          <strong>{rows.length}</strong> cheezein hadd se neeche hain. Sab ko hadd tak bharne ka
          andazan kharcha <strong>{formatPKR(totalCost)}</strong> hai.
        </p>
        <Link to="/purchases/new"
          className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
          <Truck className="h-4 w-4" /> Purchase banayein
        </Link>
      </section>

      <div className="grid lg:grid-cols-2 gap-4 print:hidden">
        <ChartCard icon={Package} title="Sab se zyada kis ki kami hai">
          {chart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [v, n === 'mangwao' ? 'Mangwana hai' : 'Abhi hai']} />
                <Legend formatter={(v) => (v === 'mangwao' ? 'Mangwana hai' : 'Abhi hai')} />
                <Bar dataKey="hai" stackId="s" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="mangwao" stackId="s" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Boxes} title="Kis qism par kitna kharcha">
          {kindChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kindChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Kharcha']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {kindChart.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
              <tr>
                <Th>Cheez</Th>
                <Th>Qism</Th>
                <Th className="text-right">Abhi hai</Th>
                <Th className="text-right">Hadd</Th>
                <Th className="text-right">Mangwana hai</Th>
                <Th className="text-right">Kharcha</Th>
                <Th className="text-right print:hidden">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => {
                const out = r.have === 0;
                return (
                  <tr key={r.productId} className={`transition avoid-break ${out ? 'bg-rose-50/60 dark:bg-rose-500/5' : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5'}`}>
                    <td className="px-3 py-2.5">
                      <Link to={`/agri-products/${r.productId}`} className="group flex items-center gap-2.5">
                        <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                          {AGRI_KIND_EMOJI[r.kind as AgriKind]}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600">
                            {r.productName}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 truncate">
                            {r.category || '—'}
                            {r.packSize ? ` • 1 ${agriUnitLabel(r.unit)} = ${r.packSize} ${r.packUnit}` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {prettyAgriKind(r.kind)}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-extrabold tabular-nums ${out ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {fmtQty(r.have)} <span className="text-[10px] font-bold text-slate-500">{r.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-500 tabular-nums">{fmtQty(r.level)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {fmtQty(r.short)} <span className="text-[10px] font-bold text-slate-500">{r.unit}</span>
                      </div>
                      {r.packSize > 0 && (
                        <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                          = {fmtQty(r.short * r.packSize)} {r.packUnit}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatPKR(r.short * Number(r.costPrice || 0))}
                    </td>
                    <td className="px-3 py-2.5 print:hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onStock(r)} title="Stock daalein"
                          className="h-8 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1 transition">
                          <Boxes className="h-3.5 w-3.5" /> Stock
                        </button>
                        <Link to={`/agri-products/${r.productId}/edit`} title="Edit"
                          className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 2 — REGISTRATION
   ─────────────────────────────────────────────────────────────
   Ye agri ka apna masla hai. Stock poora hone ke bawajood maal
   bik nahi sakta agar sarkari meyaad guzar chuki ho.
   ═════════════════════════════════════════════════════════════ */
function CertTab({ rows, pie, blockedValue }: { rows: any[]; pie: any[]; blockedValue: number }) {
  if (rows.length === 0) {
    return <Empty icon={ShieldCheck} title="Sab registration chal rahi hain"
      sub="Beej aur dawa — kisi ki meyaad khatam nahi ho rahi. Ye achhi khabar hai." />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex items-start gap-3 print:hidden">
        <Landmark className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-rose-900 dark:text-rose-200">
            Pakistan me beej <strong>Seed Act</strong> aur zehreeli dawa{' '}
            <strong>Agricultural Pesticides Ordinance</strong> ke tehat registration ke baghair
            bechna ghair-qanooni hai. Inspector aaye to stock zabt bhi ho sakta hai.
          </p>
          {blockedValue > 0 && (
            <p className="text-[12px] font-extrabold text-rose-800 dark:text-rose-300 mt-1">
              Abhi {formatPKR(blockedValue)} ka maal is wajah se bik nahi sakta.
            </p>
          )}
        </div>
      </section>

      {pie.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4 print:hidden">
          <ChartCard icon={ShieldAlert} title="Registration ki halat">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {pie.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-600" /> Sab se pehle ye
            </h3>
            <div className="space-y-2">
              {rows.slice(0, 6).map((r) => (
                <Link key={r.productId} to={`/agri-products/${r.productId}/edit`}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition group">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    r.cert.state === 'expired' ? 'bg-rose-500' : r.cert.state === 'soon' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                      {r.productName}
                    </span>
                    <span className="block text-[11px] font-bold text-slate-500">
                      {r.cert.state === 'none' ? 'Tareekh bhari hi nahi' : r.cert.text}
                    </span>
                  </span>
                  <Edit3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
              <tr>
                <Th>Cheez</Th>
                <Th>Reg number</Th>
                <Th>Meyaad</Th>
                <Th className="text-center">Halat</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Phansa paisa</Th>
                <Th className="text-right print:hidden">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => {
                const gone = r.cert.state === 'expired';
                const blocked = Number(r.stock || 0) * Number(r.salePrice || 0);
                return (
                  <tr key={r.productId} className={`transition avoid-break ${gone ? 'bg-rose-50/60 dark:bg-rose-500/5' : 'hover:bg-amber-50/40 dark:hover:bg-amber-500/5'}`}>
                    <td className="px-3 py-2.5">
                      <Link to={`/agri-products/${r.productId}`} className="group flex items-center gap-2.5">
                        <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                          {AGRI_KIND_EMOJI[r.kind as AgriKind]}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600">
                            {r.productName}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400">{prettyAgriKind(r.kind)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                      {r.profile?.govtRegNumber || <span className="text-amber-600 font-sans">Nahi bhara</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                      {r.profile?.govtRegExpiry
                        ? new Date(r.profile.govtRegExpiry).toLocaleDateString('en-PK', { dateStyle: 'medium' })
                        : <span className="text-amber-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {gone ? <Pill tone="rose">Khatam</Pill>
                        : r.cert.state === 'soon' ? <Pill tone="amber">{r.cert.days} din</Pill>
                        : <Pill tone="slate">Nahi likhi</Pill>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {fmtQty(Number(r.stock || 0))} <span className="text-[10px] font-bold text-slate-500">{r.unit}</span>
                    </td>
                    <td className={`px-3 py-2.5 text-right text-xs font-black tabular-nums ${gone ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500'}`}>
                      {gone ? formatPKR(blocked) : '—'}
                    </td>
                    <td className="px-3 py-2.5 print:hidden">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/agri-products/${r.productId}/edit`}
                          className="h-8 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-[11px] font-black inline-flex items-center gap-1 transition">
                          <Edit3 className="h-3.5 w-3.5" /> Tareekh
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 3 — MAUSAM
   ─────────────────────────────────────────────────────────────
   Season nikal gaya to maal saal bhar para rehta hai. Rabi se
   pehle gandum ka beej, Kharif se pehle kapas ka — yahan pehle
   se pata chal jata hai.
   ═════════════════════════════════════════════════════════════ */
function SeasonTab({ rows, nowSeasons, coming, onStock }: {
  rows: any[]; nowSeasons: string[]; coming: string; onStock: (r: any) => void;
}) {
  const comingDef = SEASONS.find((s) => s.v === coming);
  const nowDef = SEASONS.filter((s) => nowSeasons.includes(s.v) && s.v !== 'ALL_SEASON');

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <SeasonBanner nowDef={nowDef} comingDef={comingDef} />
        <Empty icon={CheckCircle2} title="Is mausam ka maal poora hai"
          sub="Jo cheezein abhi ke aur aane wale season ki hain, un ka stock hadd se ooper hai." />
      </div>
    );
  }

  const nowRows = rows.filter((r) => nowSeasons.includes(r.season));
  const nextRows = rows.filter((r) => !nowSeasons.includes(r.season));

  return (
    <div className="space-y-4">
      <SeasonBanner nowDef={nowDef} comingDef={comingDef} />

      {nowRows.length > 0 && (
        <SeasonGroup title="Abhi ka mausam — foran chahiye" tone="rose" rows={nowRows} onStock={onStock} />
      )}
      {nextRows.length > 0 && (
        <SeasonGroup
          title={`Aane wala mausam ${comingDef ? `— ${comingDef.e} ${comingDef.l}` : ''} — abhi mangwa lein`}
          tone="amber" rows={nextRows} onStock={onStock} />
      )}
    </div>
  );
}

function SeasonBanner({ nowDef, comingDef }: { nowDef: any[]; comingDef: any }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-lime-50 dark:from-amber-500/10 dark:to-lime-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 print:hidden">
      <div className="flex items-start gap-3 flex-wrap">
        <Calendar className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
            Abhi chal raha hai: {nowDef.map((s) => `${s.e} ${s.l}`).join(', ') || 'Har mausam'}
          </h3>
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
            {nowDef[0]?.hint}
            {comingDef && ` • Aage ${comingDef.e} ${comingDef.l} aa raha hai — ${comingDef.hint}`}
          </p>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
            Season se pehle mangwa lein — baad me rate barh jata hai aur maal milta bhi nahi.
          </p>
        </div>
      </div>
    </section>
  );
}

function SeasonGroup({ title, tone, rows, onStock }: {
  title: string; tone: 'rose' | 'amber'; rows: any[]; onStock: (r: any) => void;
}) {
  const head = tone === 'rose'
    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
    : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200';
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className={`px-4 py-3 border-b-2 font-black text-sm ${head}`}>{title} · {rows.length}</div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((r) => {
          const s = SEASONS.find((x) => x.v === r.season);
          const crops = r.profile?.targetCrops ?? [];
          return (
            <div key={r.productId} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition avoid-break">
              <span className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                {AGRI_KIND_EMOJI[r.kind as AgriKind]}
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/agri-products/${r.productId}`}
                  className="font-extrabold text-sm text-slate-900 dark:text-white truncate hover:text-emerald-600 block">
                  {r.productName}
                </Link>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {s ? `${s.e} ${s.l}` : ''}
                  {crops.length > 0 && ` • 🌾 ${crops.slice(0, 3).join(', ')}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-lg font-black tabular-nums ${r.have === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {fmtQty(r.have)} <span className="text-xs">{r.unit}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                  {r.short > 0 ? `${fmtQty(r.short)} mangwana hai` : 'hadd par hai'}
                </div>
              </div>
              <button onClick={() => onStock(r)}
                className="h-9 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1 shrink-0 transition print:hidden">
                <Boxes className="h-3.5 w-3.5" /> Stock
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
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

function EmptyChart() {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400">Abhi dikhane ko kuch nahi</p></div>;
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ${className}`}>{children}</th>;
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function Empty({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Icon className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">{sub}</p>
      <Link to="/agri/products"
        className="mt-5 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
        <Package className="h-4 w-4" /> Saara maal dekhein
      </Link>
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
            <GraduationCap className="h-5 w-5" /> Ye safha kaise chalta hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Roz subah ye safha kholein — teen cheezein foran samne aa jayengi.
          </p>
          <Tip icon={Truck} title="1. Mangwana hai">
            Jo cheezein hadd se neeche hain. Har ek par "kitni mangwani hai" aur kitna kharcha
            hoga likha hai. List copy karke ya WhatsApp par seedha supplier ko bhej dein.
          </Tip>
          <Tip icon={ShieldAlert} title="2. Registration — agri ka apna masla">
            Beej aur zehreeli dawa ki sarkari meyaad khatam ho jaye to wo bechna ghair-qanooni hai.
            Stock poora hone ke bawajood wo maal phansa hua hota hai. Yahan sab se pehle wohi
            dikhta hai jis ki meyaad guzar chuki.
          </Tip>
          <Tip icon={Calendar} title="3. Mausam">
            Rabi aa raha hai aur gandum ka beej gudaam me nahi? Season nikal gaya to maal saal
            bhar para rahega. Yahan abhi ka aur aane wala — dono mausam ka maal dikhta hai.
          </Tip>
          <Tip icon={Scale} title="Bori ka hisab">
            Jahan "1 bori = 50 kg" bhara hua hai, wahan mangwane ki miqdar bori aur kilo dono
            me dikhti hai — supplier ko dono zubaan me samajh aa jata hai.
          </Tip>
          <Tip icon={Boxes} title="Stock foran daalein">
            Har row par "Stock" ka button — maal aate hi wahin se daal dein, safha chhorne ki
            zaroorat nahi.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-3</kbd> tabs</div>
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
