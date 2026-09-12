// apps/web/src/industries/mobile/pages/MobileStockReportPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Boxes, Smartphone, RefreshCw, Search, FileSpreadsheet, Printer, ShieldCheck,
  Hourglass, Flame, Wallet, TrendingDown, PackageSearch, Layers, Cable,
  RotateCcw, GraduationCap, Keyboard, X, CheckCircle2, Sparkles, ChevronDown,
  ChevronRight, AlertTriangle, TrendingUp, Hash, Tag, Store, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import {
  mobileReportsApi, type AgingItem, type StockAccessoryRow,
} from '../api/mobile-reports.api';
import { PTA_STATUS_LABELS, PTA_STATUS_COLORS, type PtaStatus } from '../api/imei.api';
import { PrintStyles } from '@core/components/print/PrintStyles';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — STOCK REPORT
   ─────────────────────────────────────────────────────────────
   📱 Naye phone (IMEI) • 🔄 Used phone • 🎧 Accessories
   ⏳ Maal ki umar + 🔥 dead stock + 🛡️ PTA breakdown
   🔽 Har item ki poori tafseel dropdown me
   🎓 Guide • ⌨️ Shortcuts • 🖨️ Print + CSV • 🌗 Dark/light
   ═════════════════════════════════════════════════════════════ */

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#10b981',
  '31-60': '#f59e0b',
  '61-90': '#f97316',
  '90+': '#e11d48',
};

type KindFilter = 'all' | 'NEW' | 'USED' | 'ACCESSORY';

const KIND_META = {
  NEW: { label: 'Naye Phone', icon: Smartphone, grad: 'from-blue-600 to-indigo-700', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  USED: { label: 'Used Phone', icon: RotateCcw, grad: 'from-violet-600 to-fuchsia-700', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  ACCESSORY: { label: 'Accessory', icon: Cable, grad: 'from-emerald-600 to-teal-700', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
} as const;

const ageTone = (days: number) =>
  days > 90 ? 'text-rose-600 dark:text-rose-400'
  : days > 60 ? 'text-orange-600 dark:text-orange-400'
  : days > 30 ? 'text-amber-600 dark:text-amber-400'
  : 'text-emerald-600 dark:text-emerald-400';

/** Ek hi shakl me teeno kism ka maal */
type Row =
  | ({ kind: 'NEW' | 'USED' } & AgingItem)
  | ({ kind: 'ACCESSORY'; ageDays: null; bucket: null } & StockAccessoryRow);

export default function MobileStockReportPage() {
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [bucket, setBucket] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-stock-aging', currentShopId],
    queryFn: () => mobileReportsApi.stockAging(currentShopId || undefined),
  });

  const { data: pta = [] } = useQuery({
    queryKey: ['mobile-reports-pta'],
    queryFn: () => mobileReportsApi.ptaBreakdown(),
  });

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const t = data?.totals;

  /* ─── Ek list me teeno kism ─── */
  const allRows: Row[] = useMemo(() => {
    const devices = (data?.items ?? []).map((i) => ({ ...i, kind: i.kind })) as Row[];
    const accessories = (data?.accessories ?? [])
      .filter((a) => a.stock > 0)
      .map((a) => ({ ...a, kind: 'ACCESSORY' as const, ageDays: null, bucket: null })) as Row[];
    return [...devices, ...accessories];
  }, [data]);

  const rows = useMemo(() => {
    let list = allRows;
    if (kind !== 'all') list = list.filter((r) => r.kind === kind);
    if (bucket) list = list.filter((r) => r.kind !== 'ACCESSORY' && (r as any).bucket === bucket);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((r: any) =>
        (r.name ?? '').toLowerCase().includes(q) ||
        (r.ref ?? '').toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q) ||
        (r.variantName ?? '').toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [allRows, kind, bucket, search]);

  const chartData = useMemo(
    () => (data?.buckets ?? []).map((b) => ({
      name: b.label,
      key: b.key,
      Units: b.phones + b.usedPhones,
      Value: Math.round(b.phoneValue + b.usedValue),
    })),
    [data],
  );

  /* Stock value ka bantwara — kis kism me kitna paisa phansa hai */
  const valueSplit = useMemo(() => {
    if (!t) return [];
    return [
      { name: 'Naye Phone', value: Math.round(t.phoneValue), color: '#2563eb' },
      { name: 'Used Phone', value: Math.round(t.usedValue), color: '#7c3aed' },
      { name: 'Accessories', value: Math.round(t.accessoryValue), color: '#059669' },
    ].filter((x) => x.value > 0);
  }, [t]);

  const lowAccessories = useMemo(
    () => (data?.accessories ?? []).filter((a) => a.isLow),
    [data],
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exportCsv = () => {
    const rowsOut: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Mobile Stock Report`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA', 'Ginti', 'Lagat Value', 'Bechne Ki Value'],
      ['Naye Phone', String(t?.phones ?? 0), String(Math.round(t?.phoneValue ?? 0)), ''],
      ['Used Phone', String(t?.usedPhones ?? 0), String(Math.round(t?.usedValue ?? 0)), ''],
      ['Accessories', `${t?.accessories ?? 0} items / ${t?.accessoryUnits ?? 0} units`, String(Math.round(t?.accessoryValue ?? 0)), ''],
      ['KUL', '', String(Math.round(t?.totalValue ?? 0)), String(Math.round(t?.totalRetailValue ?? 0))],
      ['Mumkin Munafa', '', '', String(Math.round(t?.potentialProfit ?? 0))],
      [],
      ['Kism', 'Naam', 'Ref / SKU', 'Brand', 'Halat / PTA', 'Umar (din)', 'Stock', 'Lagat', 'Sale Price', 'Value'],
      ...rows.map((r: any) => [
        KIND_META[r.kind as keyof typeof KIND_META].label,
        r.name,
        r.ref ?? r.sku ?? '',
        r.brand ?? '',
        r.ptaStatus ? PTA_STATUS_LABELS[r.ptaStatus as PtaStatus] : (r.condition ?? r.category ?? ''),
        r.ageDays != null ? String(r.ageDays) : '',
        r.kind === 'ACCESSORY' ? `${r.stock} ${r.unit}` : '1',
        String(Math.round(r.kind === 'ACCESSORY' ? r.unitCost : r.cost)),
        String(Math.round(r.price)),
        String(Math.round(r.kind === 'ACCESSORY' ? r.value : r.cost)),
      ]),
    ];
    const csv = rowsOut.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const counts = {
    all: allRows.length,
    NEW: allRows.filter((r) => r.kind === 'NEW').length,
    USED: allRows.filter((r) => r.kind === 'USED').length,
    ACCESSORY: allRows.filter((r) => r.kind === 'ACCESSORY').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Stock Report" subtitle="Naye phone + used phone + accessories" />

      {showTeacher && <StockTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <Boxes className="h-3.5 w-3.5 text-amber-300" /> Stock Report
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📦 Kitna paisa stock me phansa hai?</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
                Naye phone + used phone + accessories — sab khareed qeemat par
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur-md transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
                <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>

          {/* Bara number + bantwara */}
          <div className="mt-5 grid lg:grid-cols-[1.1fr_2fr] gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider inline-flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Kul Stock Value
              </div>
              <div className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                {hideCost ? '••••••' : formatPKR(t?.totalValue ?? 0)}
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-white/80">
                Bechne par milega{' '}
                <strong className="text-emerald-300">{formatPKR(t?.totalRetailValue ?? 0)}</strong>
                {(t?.potentialProfit ?? 0) > 0 && (
                  <> · mumkin munafa <strong className="text-amber-300">{hideCost ? '•••' : formatPKR(t?.potentialProfit ?? 0)}</strong></>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HeroSplit label="Naye Phone" count={t?.phones ?? 0} sub="device" value={hideCost ? '•••' : formatPKR(t?.phoneValue ?? 0)} icon={Smartphone} />
              <HeroSplit label="Used Phone" count={t?.usedPhones ?? 0} sub="device" value={hideCost ? '•••' : formatPKR(t?.usedValue ?? 0)} icon={RotateCcw} />
              <HeroSplit label="Accessories" count={t?.accessories ?? 0} sub={`${t?.accessoryUnits ?? 0} units`} value={hideCost ? '•••' : formatPKR(t?.accessoryValue ?? 0)} icon={Cable} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ALERTS ═══ */}
      {((data?.deadStock.count ?? 0) > 0 || lowAccessories.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 print:hidden">
          {(data?.deadStock.count ?? 0) > 0 && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
                <Flame className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-rose-900 dark:text-rose-200 min-w-0">
                <strong>{data?.deadStock.count} device 60+ din se pade hain</strong> —{' '}
                {hideCost ? '•••••' : formatPKR(data?.deadStock.value ?? 0)} phansa hai. Discount lagao.
              </div>
              <button onClick={() => { setBucket(null); setKind('all'); setSearch(''); }}
                className="px-3 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow transition shrink-0">
                <TrendingDown className="h-3.5 w-3.5" /> Dekho
              </button>
            </div>
          )}
          {lowAccessories.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-amber-900 dark:text-amber-200 min-w-0">
                <strong>{lowAccessories.length} accessory kam ho rahi hain</strong> — dobara mangwane ka waqt
              </div>
              <Link to="/low-stock"
                className="px-3 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow transition shrink-0">
                Low Stock <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ═══ CHARTS ═══ */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3 items-start print:hidden">
        {/* Aging */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Hourglass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">Maal Ki Umar</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Sirf phone — accessories ki umar track nahi hoti</p>
              </div>
            </div>
            {bucket && (
              <button onClick={() => setBucket(null)}
                className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                Filter hatao
              </button>
            )}
          </div>

          {(t?.phones ?? 0) + (t?.usedPhones ?? 0) === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-center">
              <Smartphone className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi phone stock me nahi</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs">
                IMEI Inventory se naya phone add karo ya trade-in se used phone
              </p>
            </div>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} className="fill-slate-500" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} className="fill-slate-500" tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: any, n: any) => [n === 'Value' ? formatPKR(Number(v)) : v, n === 'Value' ? 'Stock Value' : 'Devices']}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }}
                    />
                    <Bar dataKey="Units" radius={[6, 6, 0, 0]} onClick={(d: any) => setBucket(d.key === bucket ? null : d.key)} className="cursor-pointer">
                      {chartData.map((d) => (
                        <Cell key={d.key} fill={BUCKET_COLORS[d.key] ?? '#64748b'} opacity={bucket && bucket !== d.key ? 0.35 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(data?.buckets ?? []).map((b) => (
                  <button key={b.key} onClick={() => { setBucket(bucket === b.key ? null : b.key); setKind('all'); }}
                    className={`rounded-xl border-2 p-2.5 text-left transition ${
                      bucket === b.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/40'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: BUCKET_COLORS[b.key] }} />
                      <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 truncate">{b.label}</span>
                    </div>
                    <div className="mt-0.5 font-extrabold text-slate-900 dark:text-white tabular-nums">{b.phones + b.usedPhones}</div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums truncate">
                      {hideCost ? '•••' : formatPKR(b.phoneValue + b.usedValue)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Value split + PTA */}
        <div className="space-y-3">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Paisa Kahan Phansa Hai</h3>
            </div>
            {valueSplit.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-6 text-center">Stock khaali hai</p>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={valueSplit} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={3}>
                      {valueSplit.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">PTA Status</h3>
            </div>
            {pta.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-4 text-center">Koi IMEI stock me nahi</p>
            ) : (
              <div className="space-y-2">
                {pta.map((row) => {
                  const cfg = PTA_STATUS_COLORS[row.ptaStatus as PtaStatus];
                  return (
                    <div key={row.ptaStatus} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-extrabold uppercase ${cfg?.bg} ${cfg?.text} ${cfg?.border}`}>
                          {PTA_STATUS_LABELS[row.ptaStatus as PtaStatus]}
                        </span>
                        <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          Tax: {hideCost ? '•••' : formatPKR(row.taxPaid)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{row.count}</div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {hideCost ? '•••' : formatPKR(row.stockValue)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ STOCK LIST ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">
                Stock Me Mojood <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({rows.length})</span>
              </h3>
            </div>
            <div className="relative print:hidden">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="IMEI, model, brand, SKU... (/)"
                className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition" />
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap print:hidden">
            {([
              { v: 'all', label: 'Sab', icon: Layers },
              { v: 'NEW', label: 'Naye Phone', icon: Smartphone },
              { v: 'USED', label: 'Used Phone', icon: RotateCcw },
              { v: 'ACCESSORY', label: 'Accessories', icon: Cable },
            ] as { v: KindFilter; label: string; icon: any }[]).map((k) => (
              <button key={k.v} onClick={() => { setKind(k.v); if (k.v === 'ACCESSORY') setBucket(null); }}
                className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                  kind === k.v
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-transparent shadow'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                }`}>
                <k.icon className="h-3.5 w-3.5" /> {k.label}
                <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${kind === k.v ? 'bg-black/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {counts[k.v]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <PackageSearch className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {search || kind !== 'all' || bucket ? 'In filters se kuch nahi mila' : 'Stock bilkul khaali hai'}
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {search || kind !== 'all' || bucket
                ? 'Filter badlo ya search saaf karo'
                : 'Purchase ya IMEI Inventory se maal andar lao'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.slice(0, 300).map((r: any) => {
              const meta = KIND_META[r.kind as keyof typeof KIND_META];
              const Icon = meta.icon;
              const id = `${r.kind}-${r.id}`;
              const isOpen = expanded.has(id);
              const rowValue = r.kind === 'ACCESSORY' ? r.value : r.cost;
              return (
                <div key={id}>
                  <button onClick={() => toggle(id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shrink-0 shadow`}>
                      <Icon className="h-4.5 w-4.5 h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                        {r.name}
                        {r.variantName && <span className="ml-1.5 text-violet-700 dark:text-violet-400">{r.variantName}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${meta.chip}`}>{meta.label}</span>
                        {(r.ref || r.sku) && <span className="font-mono">{r.ref ?? r.sku}</span>}
                        {r.brand && <span>{r.brand}</span>}
                        {r.ptaStatus && (
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${PTA_STATUS_COLORS[r.ptaStatus as PtaStatus]?.bg} ${PTA_STATUS_COLORS[r.ptaStatus as PtaStatus]?.text} ${PTA_STATUS_COLORS[r.ptaStatus as PtaStatus]?.border}`}>
                            {PTA_STATUS_LABELS[r.ptaStatus as PtaStatus]}
                          </span>
                        )}
                        {r.condition && <span className="text-violet-600 dark:text-violet-400">{r.condition}</span>}
                        {r.isLow && r.kind === 'ACCESSORY' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-[9px] font-extrabold">KAM STOCK</span>
                        )}
                      </div>
                    </div>

                    {r.ageDays != null && (
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className={`text-sm font-extrabold tabular-nums ${ageTone(r.ageDays)}`}>{r.ageDays}d</div>
                        <div className="text-[10px] font-bold text-slate-400">umar</div>
                      </div>
                    )}

                    {r.kind === 'ACCESSORY' && (
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{r.stock}</div>
                        <div className="text-[10px] font-bold text-slate-400">{r.unit}</div>
                      </div>
                    )}

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {hideCost ? '•••' : formatPKR(rowValue)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        → {formatPKR(r.kind === 'ACCESSORY' ? r.retailValue : r.price)}
                      </div>
                    </div>

                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>

                  {/* ─── Dropdown: poori tafseel ─── */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50 dark:bg-slate-800/40">
                      <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                        {r.kind === 'ACCESSORY' ? (
                          <>
                            <Detail label="Stock" value={`${r.stock} ${r.unit}`} icon={Boxes} />
                            <Detail label="Alert level" value={String(r.lowStockAlert)} icon={AlertTriangle} />
                            <Detail label="SKU" value={r.sku} icon={Hash} mono />
                            <Detail label="Brand" value={r.brand} icon={Tag} />
                            <Detail label="Category" value={r.category} icon={Layers} />
                            <Detail label="Per unit lagat" value={hideCost ? '•••' : formatPKR(r.unitCost)} icon={Wallet} />
                            <Detail label="Per unit sale" value={formatPKR(r.price)} icon={TrendingUp} />
                            <Detail label="Kul lagat" value={hideCost ? '•••' : formatPKR(r.value)} icon={Wallet} strong />
                            <Detail label="Bechne par" value={formatPKR(r.retailValue)} icon={TrendingUp} strong tone="emerald" />
                            <Detail
                              label="Mumkin munafa"
                              value={hideCost ? '•••' : formatPKR(r.retailValue - r.value)}
                              icon={Sparkles} strong tone="emerald"
                            />
                          </>
                        ) : (
                          <>
                            <Detail label={r.kind === 'NEW' ? 'IMEI' : 'Code'} value={r.ref} icon={Hash} mono />
                            <Detail label="Model" value={r.name} icon={Smartphone} />
                            <Detail label="Variant" value={r.variantName} icon={Layers} />
                            <Detail label="Brand" value={r.brand} icon={Tag} />
                            <Detail label="Color" value={r.color} icon={Sparkles} />
                            <Detail
                              label="PTA"
                              value={r.ptaStatus ? PTA_STATUS_LABELS[r.ptaStatus as PtaStatus] : null}
                              icon={ShieldCheck}
                            />
                            <Detail label="Halat" value={r.condition} icon={CheckCircle2} />
                            <Detail label="Stock me" value={`${r.ageDays} din se`} icon={Hourglass}
                              tone={r.ageDays > 60 ? 'rose' : r.ageDays > 30 ? 'amber' : 'emerald'} />
                            <Detail label="Umar bucket" value={r.bucket} icon={Hourglass} />
                            <Detail label="Khareed qeemat" value={hideCost ? '•••' : formatPKR(r.cost)} icon={Wallet} strong />
                            <Detail label="Sale price" value={formatPKR(r.price)} icon={TrendingUp} strong tone="emerald" />
                            <Detail
                              label="Mumkin munafa"
                              value={hideCost ? '•••' : formatPKR(Math.max(r.price - r.cost, 0))}
                              icon={Sparkles} strong tone="emerald"
                            />
                          </>
                        )}
                      </div>

                      {r.kind !== 'ACCESSORY' && r.ageDays > 60 && (
                        <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 flex items-start gap-2">
                          <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                            Ye device <strong>{r.ageDays} din</strong> se para hai. Mobile ki qeemat har mahine girti
                            hai — discount ya bundle laga kar nikal do.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {rows.length > 300 && (
          <div className="p-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t-2 border-slate-100 dark:border-slate-800">
            Pehle 300 dikhaye — poori list CSV me download karo
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroSplit({ label, count, sub, value, icon: Icon }: any) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums">{count}</div>
      <div className="text-[10px] font-bold text-white/70">{sub}</div>
      <div className="mt-1 text-[11px] font-extrabold text-emerald-300 tabular-nums truncate">{value}</div>
    </div>
  );
}

const DETAIL_TONES: Record<string, string> = {
  slate: 'text-slate-900 dark:text-white',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  amber: 'text-amber-700 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
};

function Detail({ label, value, icon: Icon, mono, strong, tone = 'slate' }: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 shrink-0">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </span>
      <span className={`text-[12px] tabular-nums truncate ${mono ? 'font-mono' : ''} ${strong ? 'font-extrabold' : 'font-bold'} ${DETAIL_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function StockTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border-2 border-transparent dark:border-slate-800">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 border-b-2 border-amber-200 dark:border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Stock Report Kaise Parhein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <GuideStep n={1} title="Kul Stock Value"
            body="Aap ka kitna paisa maal ki shakal me para hua hai — khareed qeemat par. Sath me ye bhi ke bechne par kitna milega aur beech ka farq (mumkin munafa) kitna hai."
            tips={['Ye teeno milakar: naye phone + used phone + accessories', 'Lagat chupi ho to 🔒 PIN se kholo']} />
          <GuideStep n={2} title="Maal Ki Umar"
            body="Phone jitna purana hoga, uski qeemat utni giregi. Chart par kisi bhi bucket par click karke sirf usi umar ka maal dekho."
            tips={['60 din se purana = dead stock, foran nikalo', 'Accessories ki umar track nahi hoti — unki ginti matter karti hai']} />
          <GuideStep n={3} title="Har item ki tafseel"
            body="Kisi bhi row par click karo — neeche poori tafseel khul jayegi: IMEI, PTA, color, khareed qeemat, sale price, mumkin munafa. Accessories ke liye stock, alert level, per-unit rate sab."
            tips={['Search se IMEI, model, brand ya SKU dhoondo', 'Sab / Naye / Used / Accessories tabs se list chhanto']} />
          <GuideStep n={4} title="Nikalo"
            body="CSV se poora stock Excel me le jao (khulasa + har item), ya Print se seedha chhaap lo — stock ginti (physical audit) ke liye."
            tips={['CSV me kul value aur mumkin munafa bhi aata hai']} />
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg shadow-amber-500/30">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuideStep({ n, title, body, tips }: any) {
  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{body}</div>
          {tips && (
            <ul className="mt-2 space-y-1">
              {tips.map((tp: string, i: number) => (
                <li key={i} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [['/', 'Search par jao'], ['G', 'Guide kholo'], ['R', 'Refresh'], ['?', 'Ye list'], ['Esc', 'Band karo']];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
