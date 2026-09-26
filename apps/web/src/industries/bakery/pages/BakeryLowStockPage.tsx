import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Package, Search, X, RefreshCw, ChefHat, Wheat,
  Timer, FileSpreadsheet, Printer, GraduationCap, MessageCircle,
  Copy, CheckCircle2, BarChart3, Croissant, Snowflake, Flame,
  ArrowRight, ClipboardList, TrendingDown, Phone, Clock,
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
import { ingredientsApi, type Ingredient } from '../api/ingredients.api';
import { freshnessApi, type FreshnessLog } from '../api/freshness.api';

/* ═════════════════════════════════════════════════════════════
   BAKERY — AAJ KYA BANANA HAI
   ─────────────────────────────────────────────────────────────
   Kiryana aur bakery ka masla ek jaisa nahi hai.

   Kiryana wala sochta hai: "ye cheez khatam ho rahi hai, supplier
   se mangwa lo." Bakery wala sochta hai teen cheezein, roz subah:

     1. Counter par kya kam hai — yani AAJ kya banana hai.
     2. Maida, cheeni, makkhan — saamaan hai ya nahi. Saamaan na
        ho to banana mumkin hi nahi.
     3. Kal ka maal jo aaj bikna chahiye, warna phinkna parega.

   Is liye ye safha teen hisson me hai. Sirf "stock kam hai" ki
   list se bakery ka kaam nahi chalta.
   ═════════════════════════════════════════════════════════════ */

const fmtQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

type Tab = 'bake' | 'ingredients' | 'freshness';
type Urgency = 'all' | 'critical' | 'warning';

/* Chart ke rang — dono theme me saaf nazar aane wale */
const GRID = '#94a3b8';
const AXIS = '#64748b';
const C = {
  bake: '#f59e0b',
  ing: '#8b5cf6',
  fresh: '#10b981',
  danger: '#ef4444',
  warn: '#f97316',
};
const PIE = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#8b5cf6'];
const TOOLTIP = {
  borderRadius: 12,
  border: '2px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: 12,
};

/** Kitne ghante me expire — manfi ka matlab guzar chuka */
function hoursLeft(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / 3_600_000;
}

function hoursPhrase(h: number): string {
  if (h < 0) {
    const past = Math.abs(h);
    if (past < 24) return `${Math.round(past)} ghante guzar gaye`;
    return `${Math.round(past / 24)} din guzar gaye`;
  }
  if (h < 1) return `${Math.round(h * 60)} minute baqi`;
  if (h < 24) return `${Math.round(h)} ghante baqi`;
  return `${Math.round(h / 24)} din baqi`;
}

export default function BakeryLowStockPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('bake');
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('all');
  const [stockModalRow, setStockModalRow] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ── Data ── */
  const stockQ = useQuery({
    queryKey: ['bakery-low-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }),
  });

  const ingQ = useQuery({
    queryKey: ['bakery-ingredients-low'],
    queryFn: () => ingredientsApi.list({}),
  });

  const freshQ = useQuery({
    queryKey: ['bakery-freshness-low'],
    queryFn: () => freshnessApi.list({}),
  });

  const isLoading = stockQ.isLoading || ingQ.isLoading || freshQ.isLoading;
  const isRefetching = stockQ.isRefetching || ingQ.isRefetching || freshQ.isRefetching;
  const refetchAll = () => { stockQ.refetch(); ingQ.refetch(); freshQ.refetch(); };

  /* ── 1. Aaj kya banana hai ── */
  const bakeRows = useMemo(() => {
    const rows = stockQ.data?.rows ?? [];
    return rows
      .filter((r) => r.stockStatus === 'LOW_STOCK' || r.stockStatus === 'OUT_OF_STOCK')
      .map((r) => {
        const target = Math.max(Number(r.lowStockAlert) || 0, 1);
        const have = Number(r.stock) || 0;
        /* Kitna banana hai: hadd tak pahunchane ke liye. Hadd
           khud bhi kam ho to kam se kam ek batch. */
        const toBake = Math.max(target - have, 0);
        return { ...r, toBake, target, have };
      })
      .sort((a, b) => {
        // Jo bilkul khatam hai wo sab se upar
        if ((a.have === 0) !== (b.have === 0)) return a.have === 0 ? -1 : 1;
        return b.toBake - a.toBake;
      });
  }, [stockQ.data]);

  /* ── 2. Ingredients ── */
  const lowIngredients = useMemo(() => {
    const list = ingQ.data ?? [];
    return list
      .filter((i) => i.isActive !== false)
      .map((i) => {
        const level = Number(i.reorderLevel ?? i.minStock ?? 0);
        const have = Number(i.currentStock) || 0;
        const short = Math.max(level - have, 0);
        return { ...i, level, have, short };
      })
      .filter((i) => i.have <= i.level)
      .sort((a, b) => {
        if ((a.have === 0) !== (b.have === 0)) return a.have === 0 ? -1 : 1;
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        return b.short - a.short;
      });
  }, [ingQ.data]);

  /* ── 3. Freshness ── */
  const freshRows = useMemo(() => {
    const list = freshQ.data ?? [];
    return list
      .filter((f) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0)
      .map((f) => ({ ...f, left: hoursLeft(f.expiryDate || f.bestBefore) }))
      .filter((f) => f.left !== null && f.left < 24)
      .sort((a, b) => (a.left ?? 0) - (b.left ?? 0));
  }, [freshQ.data]);

  /* ── Search + urgency ── */
  const q = search.trim().toLowerCase();

  const shownBake = useMemo(() => {
    let rows = bakeRows;
    if (urgency === 'critical') rows = rows.filter((r) => r.have === 0);
    if (urgency === 'warning') rows = rows.filter((r) => r.have > 0);
    if (!q) return rows;
    return rows.filter((r) =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.sku || '').toLowerCase().includes(q));
  }, [bakeRows, urgency, q]);

  const shownIngredients = useMemo(() => {
    let rows = lowIngredients;
    if (urgency === 'critical') rows = rows.filter((r) => r.have === 0 || r.isCritical);
    if (urgency === 'warning') rows = rows.filter((r) => r.have > 0 && !r.isCritical);
    if (!q) return rows;
    return rows.filter((r) =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.supplierName || '').toLowerCase().includes(q));
  }, [lowIngredients, urgency, q]);

  const shownFresh = useMemo(() => {
    let rows = freshRows;
    if (urgency === 'critical') rows = rows.filter((r) => (r.left ?? 0) <= 0);
    if (urgency === 'warning') rows = rows.filter((r) => (r.left ?? 0) > 0);
    if (!q) return rows;
    return rows.filter((r) =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.batchNumber || '').toLowerCase().includes(q));
  }, [freshRows, urgency, q]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const outOfStock = bakeRows.filter((r) => r.have === 0).length;
    const expired = freshRows.filter((r) => (r.left ?? 0) <= 0);
    const expiringSoon = freshRows.filter((r) => (r.left ?? 0) > 0);
    const wasteValue = expired.reduce((s, f) => {
      const row = (stockQ.data?.rows ?? []).find((r) => r.productId === f.productId);
      return s + Number(f.currentQty) * Number(row?.salePrice ?? 0);
    }, 0);
    const ingCost = lowIngredients.reduce((s, i) => s + i.short * Number(i.costPerUnit || 0), 0);
    return {
      bakeCount: bakeRows.length,
      outOfStock,
      ingCount: lowIngredients.length,
      ingCritical: lowIngredients.filter((i) => i.isCritical || i.have === 0).length,
      ingCost,
      expiredCount: expired.length,
      expiringCount: expiringSoon.length,
      wasteValue,
    };
  }, [bakeRows, lowIngredients, freshRows, stockQ.data]);

  /* ── Charts ── */
  const bakeChart = useMemo(
    () => shownBake.slice(0, 10).map((r) => ({
      name: (r.productName || '').slice(0, 14),
      banana: r.toBake,
      hai: r.have,
    })),
    [shownBake],
  );

  const ingChart = useMemo(
    () => shownIngredients.slice(0, 10).map((i) => ({
      name: (i.name || '').slice(0, 14),
      kami: i.short,
      hai: i.have,
    })),
    [shownIngredients],
  );

  const freshPie = useMemo(() => {
    const buckets = [
      { name: 'Guzar chuka', value: freshRows.filter((r) => (r.left ?? 0) <= 0).length },
      { name: '2 ghante me', value: freshRows.filter((r) => (r.left ?? 0) > 0 && (r.left ?? 0) <= 2).length },
      { name: 'Aaj shaam tak', value: freshRows.filter((r) => (r.left ?? 0) > 2 && (r.left ?? 0) <= 8).length },
      { name: 'Kal tak', value: freshRows.filter((r) => (r.left ?? 0) > 8).length },
    ];
    return buckets.filter((b) => b.value > 0);
  }, [freshRows]);

  /* ── Baking list / order list ── */
  const bakeListText = useMemo(() => {
    const lines = shownBake.map((r, i) => `${i + 1}. ${r.productName} — ${fmtQty(r.toBake)} ${r.unit}`);
    return [
      `🧁 *${tenant?.name || 'Bakery'}* — aaj ki baking list`,
      shopName ? `📍 ${shopName}` : '',
      `📅 ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
      '',
      ...lines,
      '',
      `Kul ${shownBake.length} cheezein`,
    ].filter(Boolean).join('\n');
  }, [shownBake, tenant, shopName]);

  const ingOrderText = useMemo(() => {
    const lines = shownIngredients.map((i, n) => `${n + 1}. ${i.name} — ${fmtQty(i.short)} ${i.unit}`);
    return [
      `🛒 *${tenant?.name || 'Bakery'}* — saamaan ki list`,
      shopName ? `📍 ${shopName}` : '',
      '',
      ...lines,
      '',
      `Andazan kharcha: ${formatPKR(stats.ingCost)}`,
    ].filter(Boolean).join('\n');
  }, [shownIngredients, tenant, shopName, stats.ingCost]);

  const activeText = tab === 'ingredients' ? ingOrderText : bakeListText;

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

    if (tab === 'bake') {
      head = ['Cheez', 'Category', 'Abhi hai', 'Hadd', 'Banana hai', 'Unit', 'Rate'];
      body = shownBake.map((r) => [
        r.productName, r.category || '', r.have, r.target, r.toBake, r.unit, r.salePrice,
      ]);
    } else if (tab === 'ingredients') {
      head = ['Saamaan', 'Category', 'Abhi hai', 'Hadd', 'Kami', 'Unit', 'Rate', 'Supplier', 'Phone'];
      body = shownIngredients.map((i) => [
        i.name, i.category || '', i.have, i.level, i.short, i.unit,
        i.costPerUnit, i.supplierName || '', i.supplierPhone || '',
      ]);
    } else {
      head = ['Cheez', 'Batch', 'Bachi hui', 'Kab tak', 'Halat'];
      body = shownFresh.map((f) => [
        f.productName, f.batchNumber || '', f.currentQty,
        new Date(f.expiryDate || f.bestBefore).toLocaleString('en-PK'),
        (f.left ?? 0) <= 0 ? 'Guzar chuka' : hoursPhrase(f.left ?? 0),
      ]);
    }

    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakery-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
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
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'p') doPrint();
      if (e.key === '1') setTab('bake');
      if (e.key === '2') setTab('ingredients');
      if (e.key === '3') setTab('freshness');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, stockModalRow]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Aaj ka kaam</h1>
        <p className="text-xs text-slate-600">
          {shopName ? `${shopName} • ` : ''}{printDate}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-orange-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" /> Bakery · Roz subah
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🧁 Aaj Kya Banana Hai</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-amber-200">{stats.bakeCount}</strong> cheezein banani hain ·{' '}
              <strong className="text-violet-200">{stats.ingCount}</strong> saamaan kam ·{' '}
              <strong className="text-rose-200">{stats.expiredCount + stats.expiringCount}</strong> jaldi bikne wali
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
        <Kpi icon={Croissant} label="Banana hai" value={stats.bakeCount}
          sub={stats.outOfStock > 0 ? `${stats.outOfStock} bilkul khatam` : 'Sab kuch maujood'}
          tone="amber" onClick={() => setTab('bake')} active={tab === 'bake'} />
        <Kpi icon={Wheat} label="Saamaan kam" value={stats.ingCount}
          sub={stats.ingCost > 0 ? `${formatPKR(stats.ingCost)} ka mangwana hai` : 'Sab poora hai'}
          tone="violet" onClick={() => setTab('ingredients')} active={tab === 'ingredients'} />
        <Kpi icon={Timer} label="Jaldi bech dein" value={stats.expiringCount}
          sub={stats.expiredCount > 0 ? `${stats.expiredCount} ki tareekh guzar gayi` : 'Sab taaza hai'}
          tone="emerald" onClick={() => setTab('freshness')} active={tab === 'freshness'} />
        <Kpi icon={TrendingDown} label="Zaya ka khatra" value={formatPKR(stats.wasteValue)}
          sub="Jis ki tareekh guzar chuki" tone="rose" />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([
          ['bake', 'Aaj banana hai', Croissant, shownBake.length, '1'],
          ['ingredients', 'Saamaan', Wheat, shownIngredients.length, '2'],
          ['freshness', 'Taazgi', Timer, shownFresh.length, '3'],
        ] as const).map(([id, label, Icon, count, key]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
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
              placeholder="Naam, category, supplier… (/ dabao)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition" />
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
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                }`}>{l}</button>
            ))}
          </div>

          {tab !== 'freshness' && (
            <div className="flex gap-1.5">
              <button onClick={copyList}
                className="h-12 px-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 hover:border-amber-400 inline-flex items-center gap-1.5 transition">
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? 'Copy hui' : 'List copy'}</span>
              </button>
              <button onClick={whatsappList}
                className="h-12 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
                <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'bake' && (
            <BakeTab rows={shownBake} chart={bakeChart} onStock={setStockModalRow} />
          )}
          {tab === 'ingredients' && (
            <IngredientsTab rows={shownIngredients} chart={ingChart} totalCost={stats.ingCost} />
          )}
          {tab === 'freshness' && (
            <FreshnessTab rows={shownFresh} pie={freshPie} />
          )}
        </>
      )}

      {stockModalRow && (
        <QuickStockModal product={stockModalRow} onClose={() => setStockModalRow(null)} />
      )}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 1 — AAJ BANANA HAI
   ═════════════════════════════════════════════════════════════ */
function BakeTab({ rows, chart, onStock }: {
  rows: any[]; chart: any[]; onStock: (r: any) => void;
}) {
  if (rows.length === 0) return <Empty icon={CheckCircle2} title="Counter bhara hua hai" sub="Abhi kuch banane ki zaroorat nahi — sab cheezein hadd se upar hain." />;

  return (
    <div className="space-y-4">
      {chart.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
          <h3 className="font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-600" /> Sab se ziyada kya banana hai
          </h3>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-3">
            Neeche wali patti = abhi counter par kitna hai
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={60}
                  tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP}
                  formatter={(v: any, n: any) => [v, n === 'banana' ? 'Banana hai' : 'Abhi hai']} />
                <Legend formatter={(v) => (v === 'banana' ? 'Banana hai' : 'Abhi hai')} />
                <Bar dataKey="hai" stackId="a" fill="#cbd5e1" radius={[0, 0, 6, 6]} />
                <Bar dataKey="banana" stackId="a" fill={C.bake} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Aaj ki baking list</h3>
          <span className="ml-auto text-xs font-black text-slate-500">{rows.length} cheezein</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => {
            const out = r.have === 0;
            return (
              <div key={r.productId} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition avoid-break">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  out ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-amber-100 dark:bg-amber-500/20'
                }`}>
                  {out ? <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                       : <Croissant className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                </div>

                <div className="min-w-0 flex-1">
                  <Link to={`/products/${r.productId}`}
                    className="block truncate font-extrabold text-sm text-slate-900 dark:text-white hover:text-amber-600">
                    {r.productName}
                  </Link>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {r.category && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{r.category}</span>
                    )}
                    <span className={`text-[11px] font-black ${out ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {out ? 'Bilkul khatam' : `Abhi ${fmtQty(r.have)} ${r.unit}`}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Banana hai</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {fmtQty(r.toBake)} <span className="text-xs">{r.unit}</span>
                  </div>
                </div>

                <button onClick={() => onStock(r)}
                  className="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 inline-flex items-center gap-1.5 transition print:hidden">
                  <ChefHat className="h-4 w-4" /> <span className="hidden sm:inline">Ban gaya</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 2 — SAAMAAN (INGREDIENTS)
   ═════════════════════════════════════════════════════════════ */
function IngredientsTab({ rows, chart, totalCost }: {
  rows: any[]; chart: any[]; totalCost: number;
}) {
  if (rows.length === 0) return <Empty icon={CheckCircle2} title="Saamaan poora hai" sub="Maida, cheeni, makkhan — sab hadd se upar hai. Abhi kuch mangwane ki zaroorat nahi." />;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-4 flex items-center gap-3 flex-wrap">
        <Wheat className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
        <p className="text-sm font-extrabold text-violet-900 dark:text-violet-200 min-w-0">
          {rows.length} saamaan kam hai — andazan <strong>{formatPKR(totalCost)}</strong> ka mangwana parega
        </p>
        <Link to="/bakery/ingredients"
          className="ml-auto h-10 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition print:hidden">
          Saamaan ka safha <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {chart.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
          <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-600" /> Kis cheez ki sab se ziyada kami
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={60}
                  tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP}
                  formatter={(v: any, n: any) => [v, n === 'kami' ? 'Kami' : 'Abhi hai']} />
                <Legend formatter={(v) => (v === 'kami' ? 'Kami' : 'Abhi hai')} />
                <Bar dataKey="hai" stackId="a" fill="#cbd5e1" radius={[0, 0, 6, 6]} />
                <Bar dataKey="kami" stackId="a" fill={C.ing} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Wheat className="h-4 w-4 text-violet-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Mangwane ki list</h3>
          <span className="ml-auto text-xs font-black text-slate-500">{rows.length} cheezein</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((i: Ingredient & { have: number; level: number; short: number }) => {
            const out = i.have === 0;
            return (
              <div key={i.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition avoid-break">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  out ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-violet-100 dark:bg-violet-500/20'
                }`}>
                  {i.requiresRefrigeration
                    ? <Snowflake className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    : <Wheat className={`h-5 w-5 ${out ? 'text-rose-600 dark:text-rose-400' : 'text-violet-600 dark:text-violet-400'}`} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate font-extrabold text-sm text-slate-900 dark:text-white">{i.name}</span>
                    {i.isCritical && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        Zaroori
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className={`text-[11px] font-black ${out ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {out ? 'Bilkul khatam' : `Abhi ${fmtQty(i.have)} ${i.unit}`}
                    </span>
                    {i.supplierName && (
                      <span className="text-[11px] font-bold text-slate-400 truncate">· {i.supplierName}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mangwana</div>
                  <div className="text-lg font-black text-violet-600 dark:text-violet-400 tabular-nums">
                    {fmtQty(i.short)} <span className="text-xs">{i.unit}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                    ≈ {formatPKR(i.short * Number(i.costPerUnit || 0))}
                  </div>
                </div>

                {i.supplierPhone && (
                  <a href={`https://wa.me/${i.supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Assalam o alaikum, ${i.name} chahiye — ${fmtQty(i.short)} ${i.unit}`,
                  )}`} target="_blank" rel="noreferrer"
                    className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 transition print:hidden">
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAB 3 — TAAZGI
   ═════════════════════════════════════════════════════════════ */
function FreshnessTab({ rows, pie }: { rows: any[]; pie: any[] }) {
  if (rows.length === 0) return <Empty icon={CheckCircle2} title="Sab kuch taaza hai" sub="Agle 24 ghante me kisi cheez ki tareekh nahi guzar rahi." />;

  return (
    <div className="space-y-4">
      {pie.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
          <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-600" /> Kitna waqt bacha hai
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {pie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Jaldi bech dein</h3>
          <Link to="/bakery/freshness"
            className="ml-auto text-xs font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 print:hidden">
            Taazgi ka safha <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((f: FreshnessLog & { left: number }) => {
            const gone = f.left <= 0;
            const soon = f.left > 0 && f.left <= 2;
            return (
              <div key={f.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition avoid-break">
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  gone ? 'bg-rose-100 dark:bg-rose-500/20'
                    : soon ? 'bg-orange-100 dark:bg-orange-500/20'
                    : 'bg-emerald-100 dark:bg-emerald-500/20'
                }`}>
                  <Clock className={`h-5 w-5 ${
                    gone ? 'text-rose-600 dark:text-rose-400'
                      : soon ? 'text-orange-600 dark:text-orange-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold text-sm text-slate-900 dark:text-white">{f.productName}</div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {f.batchNumber && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Batch {f.batchNumber}</span>
                    )}
                    <span className={`text-[11px] font-black ${
                      gone ? 'text-rose-600 dark:text-rose-400'
                        : soon ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {hoursPhrase(f.left)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bachi hui</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{fmtQty(Number(f.currentQty))}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl border-2 p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-amber-500 dark:border-amber-500/60 ring-2 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      ].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight break-words">
            {value}
          </div>
          {sub && (
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1.5 leading-snug line-clamp-2">{sub}</div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function Empty({ icon: Icon, title, sub }: any) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
      <div className="h-16 w-16 rounded-3xl bg-emerald-100 dark:bg-emerald-500/20 mx-auto flex items-center justify-center">
        <Icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">{title}</p>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">{sub}</p>
    </div>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kya karta hai
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Bakery ka masla kiryana jaisa nahi hota. Is liye ye safha teen hisson me hai —
            roz subah teenon dekh lein, poora din aasan ho jata hai.
          </p>
          <Tip icon={Croissant} title="Aaj banana hai">
            Counter par jo cheez hadd se neeche aa gayi. "Banana hai" ka number wo hai jo
            hadd tak pahunchane ke liye chahiye. <strong>Ban gaya</strong> daba kar seedha
            stock barha dein.
          </Tip>
          <Tip icon={Wheat} title="Saamaan">
            Maida, cheeni, makkhan. Saamaan na ho to banana mumkin hi nahi — is liye ye
            alag hissa hai. Supplier ka number saved ho to seedha WhatsApp ka button
            aata hai.
          </Tip>
          <Tip icon={Timer} title="Taazgi">
            Jo agle 24 ghante me kharab ho jayegi. Ye bakery ka sab se bara nuqsaan hai:
            maal bana hua hai, paisa lag chuka hai, aur na bika to phinkna parega. Discount
            laga kar aaj hi nikal dein.
          </Tip>
          <Tip icon={MessageCircle} title="List bhejna">
            <strong>List copy</strong> ya <strong>WhatsApp</strong> — poori list ek click me
            bawarchi ya supplier ko chali jayegi.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1 2 3</kbd> tab badlo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
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
      <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
