// apps/web/src/industries/electronics/pages/ElectronicsStockReportPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Boxes, Cpu, Barcode, Search, RefreshCw, FileSpreadsheet, Printer,
  Hourglass, Flame, Wallet, TrendingUp, PackageSearch, Layers, ShieldCheck,
  ShieldAlert, GraduationCap, Keyboard, X, CheckCircle2, Sparkles,
  ChevronDown, ChevronRight, AlertTriangle, Hash, Tag, ArrowRight, CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import {
  electronicsAnalyticsApi, type StockSerialRow, type StockProductRow,
} from '../api/analytics.api';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — STOCK REPORT
   ─────────────────────────────────────────────────────────────
   📦 Kitna paisa stock me phansa hai
   ⏳ Maal ki umar + 🔥 dead stock
   🛡️ Warranty jo khatam hone wali hai (sirf electronics me matter karta hai)
   🔽 Har item ki poori tafseel dropdown me
   🎓 Guide • ⌨️ Shortcuts • 🖨️ Print + CSV
   ═════════════════════════════════════════════════════════════ */

const BUCKET_HEX: Record<string, string> = {
  '0-30': '#10b981', '31-60': '#f59e0b', '61-90': '#f97316', '90+': '#e11d48',
};

type Tab = 'all' | 'serial' | 'normal';

const ageTone = (d: number) =>
  d > 90 ? 'text-rose-600' : d > 60 ? 'text-orange-600' : d > 30 ? 'text-amber-600' : 'text-emerald-600';

export default function ElectronicsStockReportPage() {
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electronics-stock-report', currentShopId],
    queryFn: () => electronicsAnalyticsApi.stock(currentShopId || undefined),
  });

  /* ─── Shortcuts ─── */
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

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const serials = useMemo(() => {
    let list: StockSerialRow[] = data?.serials ?? [];
    if (bucket) list = list.filter((r) => r.bucket === bucket);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.serialNumber.toLowerCase().includes(q) ||
        (r.imei ?? '').includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, bucket, search]);

  const products = useMemo(() => {
    let list: StockProductRow[] = data?.products ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        (r.sku ?? '').toLowerCase().includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, search]);

  const chartData = useMemo(
    () => (data?.buckets ?? []).map((b) => ({ name: b.label, key: b.key, Units: b.units, Value: Math.round(b.value) })),
    [data],
  );

  const valueSplit = useMemo(() => {
    if (!t) return [];
    return [
      { name: 'Serial Wale', value: Math.round(t.serialValue), color: '#7c3aed' },
      { name: 'Normal Stock', value: Math.round(t.productValue), color: '#059669' },
    ].filter((x) => x.value > 0);
  }, [t]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Stock Report`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA', 'Ginti', 'Lagat', 'Bechne Par'],
      ['Serial wale units', String(t?.serialUnits ?? 0), String(Math.round(t?.serialValue ?? 0)), ''],
      ['Normal stock', `${t?.productLines ?? 0} lines / ${t?.productUnits ?? 0} pcs`, String(Math.round(t?.productValue ?? 0)), ''],
      ['KUL', '', String(Math.round(t?.totalValue ?? 0)), String(Math.round(t?.totalRetailValue ?? 0))],
      ['Mumkin munafa', '', '', String(Math.round(t?.potentialProfit ?? 0))],
      ['Dead stock (60+ din)', String(data?.deadStock.count ?? 0), String(Math.round(data?.deadStock.value ?? 0)), ''],
      ['Warranty 30 din me khatam', String(data?.expiringWarranty.count ?? 0), '', ''],
      [],
      ['SERIAL UNITS', 'Serial', 'IMEI', 'Brand', 'Category', 'Condition', 'Umar (din)', 'Warranty baqi (din)', 'Lagat', 'Sale'],
      ...serials.map((r) => [
        r.name, r.serialNumber, r.imei ?? '', r.brand ?? '',
        r.categoryType ? (CATEGORY_META[r.categoryType]?.label ?? r.categoryType) : '',
        r.conditionType ? (CONDITION_META[r.conditionType]?.label ?? r.conditionType) : '',
        String(r.ageDays),
        r.warrantyDaysLeft != null ? String(r.warrantyDaysLeft) : '',
        String(Math.round(r.cost)), String(Math.round(r.price)),
      ]),
      [],
      ['NORMAL STOCK', 'SKU', 'Brand', 'Category', 'Stock', 'Unit', 'Per unit lagat', 'Kul lagat', 'Bechne par'],
      ...products.map((r) => [
        r.name, r.sku ?? '', r.brand ?? '',
        r.categoryType ? (CATEGORY_META[r.categoryType]?.label ?? r.categoryType) : '',
        String(r.stock), r.unit,
        String(Math.round(r.unitCost)), String(Math.round(r.value)), String(Math.round(r.retailValue)),
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const counts = { all: serials.length + products.length, serial: serials.length, normal: products.length };
  const showSerials = tab === 'all' || tab === 'serial';
  const showProducts = tab === 'all' || tab === 'normal';

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Electronics Stock Report" subtitle="Serial units + normal stock" />
      {showTeacher && <StockTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Boxes className="h-3.5 w-3.5 text-amber-300" /> Stock Report
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Kitna paisa stock me phansa hai?</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Serial wale units + normal stock — sab khareed qeemat par
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          <div className="mt-5 grid lg:grid-cols-[1.1fr_2fr] gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/25 p-4">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider inline-flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Kul Stock Value
              </div>
              <div className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                {hideCost ? '••••••' : formatPKR(t?.totalValue ?? 0)}
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-white/80">
                Bechne par <strong className="text-emerald-300">{formatPKR(t?.totalRetailValue ?? 0)}</strong>
                {(t?.potentialProfit ?? 0) > 0 && (
                  <> · munafa <strong className="text-amber-300">{hideCost ? '•••' : formatPKR(t?.potentialProfit ?? 0)}</strong></>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroSplit label="Serial Wale" count={t?.serialUnits ?? 0} sub="units" value={hideCost ? '•••' : formatPKR(t?.serialValue ?? 0)} icon={Barcode} />
              <HeroSplit label="Normal Stock" count={t?.productUnits ?? 0} sub={`${t?.productLines ?? 0} items`} value={hideCost ? '•••' : formatPKR(t?.productValue ?? 0)} icon={Cpu} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ALERTS ═══ */}
      {((data?.deadStock.count ?? 0) > 0 || (data?.expiringWarranty.count ?? 0) > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 print:hidden">
          {(data?.deadStock.count ?? 0) > 0 && (
            <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shrink-0">
                <Flame className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-rose-900 min-w-0">
                <strong>{data?.deadStock.count} units 60+ din se pade hain</strong> —{' '}
                {hideCost ? '•••••' : formatPKR(data?.deadStock.value ?? 0)} phansa hai. Electronics ki qeemat tezi se girti hai.
              </div>
              <button onClick={() => { setBucket(null); setTab('serial'); setSearch(''); }}
                className="px-3 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 transition">
                Dekho
              </button>
            </div>
          )}
          {(data?.expiringWarranty.count ?? 0) > 0 && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-amber-900 min-w-0">
                <strong>{data?.expiringWarranty.count} units ki warranty 30 din me khatam</strong> —
                stock me hote hue warranty khatam ho jaye to nuqsan hota hai. Pehle inhe bechein.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CHARTS ═══ */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start print:hidden">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Hourglass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Maal Ki Umar</h3>
                <p className="text-[11px] font-bold text-slate-500">Sirf serial wale units — inki umar track hoti hai</p>
              </div>
            </div>
            {bucket && (
              <button onClick={() => setBucket(null)}
                className="h-8 px-2.5 rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600 hover:bg-slate-200 transition">
                Filter hatao
              </button>
            )}
          </div>

          {(t?.serialUnits ?? 0) === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-center">
              <Barcode className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Koi serial wala unit stock me nahi</p>
              <p className="text-xs font-semibold text-slate-500 max-w-xs">
                Product page se serial add karein — mehngi cheezon ki warranty tabhi track hoti hai
              </p>
            </div>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                    <Tooltip formatter={(v: any, n: any) => [n === 'Value' ? formatPKR(Number(v)) : v, n === 'Value' ? 'Stock Value' : 'Units']}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="Units" radius={[6, 6, 0, 0]} onClick={(d: any) => setBucket(d.key === bucket ? null : d.key)} className="cursor-pointer">
                      {chartData.map((d) => (
                        <Cell key={d.key} fill={BUCKET_HEX[d.key] ?? '#64748b'} opacity={bucket && bucket !== d.key ? 0.35 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(data?.buckets ?? []).map((b) => (
                  <button key={b.key} onClick={() => { setBucket(bucket === b.key ? null : b.key); setTab('serial'); }}
                    className={`rounded-xl border-2 p-2.5 text-left transition ${
                      bucket === b.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: BUCKET_HEX[b.key] }} />
                      <span className="text-[10px] uppercase font-extrabold text-slate-500 truncate">{b.label}</span>
                    </div>
                    <div className="mt-0.5 font-extrabold text-slate-900 tabular-nums">{b.units}</div>
                    <div className="text-[10px] font-bold text-slate-500 tabular-nums truncate">
                      {hideCost ? '•••' : formatPKR(b.value)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900">Paisa Kahan Phansa Hai</h3>
          </div>
          {valueSplit.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500 py-10 text-center">Stock khaali hai</p>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={valueSplit} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
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
      </div>

      {/* ═══ LIST ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900">
                Stock Me Mojood <span className="text-slate-500 font-bold tabular-nums">({counts.all})</span>
              </h3>
            </div>
            <div className="relative print:hidden">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Serial, IMEI, product, brand... (/)"
                className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition" />
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap print:hidden">
            {([
              { v: 'all', label: 'Sab', icon: Layers, n: counts.all },
              { v: 'serial', label: 'Serial Wale', icon: Barcode, n: counts.serial },
              { v: 'normal', label: 'Normal Stock', icon: Cpu, n: counts.normal },
            ] as { v: Tab; label: string; icon: any; n: number }[]).map((k) => (
              <button key={k.v} onClick={() => { setTab(k.v); if (k.v === 'normal') setBucket(null); }}
                className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                  tab === k.v ? 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white border-transparent shadow'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                }`}>
                <k.icon className="h-3.5 w-3.5" /> {k.label}
                <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
              </button>
            ))}
          </div>
        </div>

        {counts.all === 0 ? (
          <div className="p-12 text-center">
            <PackageSearch className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {search || bucket ? 'In filters se kuch nahi mila' : 'Stock bilkul khaali hai'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Serial units */}
            {showSerials && serials.slice(0, 200).map((r) => {
              const meta = r.categoryType ? CATEGORY_META[r.categoryType as CategoryType] : null;
              const id = `s-${r.id}`;
              const open = expanded.has(id);
              const warrantySoon = r.warrantyDaysLeft != null && r.warrantyDaysLeft >= 0 && r.warrantyDaysLeft <= 30;
              return (
                <div key={id}>
                  <button onClick={() => toggle(id)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 text-xl">
                      {meta?.emoji ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{r.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                          <Barcode className="h-2.5 w-2.5" /> Serial
                        </span>
                        <span className="font-mono">{r.serialNumber}</span>
                        {r.brand && <span>{r.brand}</span>}
                        {r.conditionType && r.conditionType !== 'BRAND_NEW' && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${CONDITION_META[r.conditionType as ConditionType]?.chip}`}>
                            {CONDITION_META[r.conditionType as ConditionType]?.label}
                          </span>
                        )}
                        {warrantySoon && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                            <ShieldAlert className="h-2.5 w-2.5" /> Warranty {r.warrantyDaysLeft}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className={`text-sm font-extrabold tabular-nums ${ageTone(r.ageDays)}`}>{r.ageDays}d</div>
                      <div className="text-[10px] font-bold text-slate-400">umar</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900 tabular-nums">
                        {hideCost ? '•••' : formatPKR(r.cost)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 tabular-nums">→ {formatPKR(r.price)}</div>
                    </div>
                    {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>

                  {open && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50">
                      <div className="rounded-xl border-2 border-slate-200 bg-white p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                        <Detail label="Serial" value={r.serialNumber} icon={Hash} mono />
                        <Detail label="IMEI" value={r.imei} icon={Hash} mono />
                        <Detail label="Brand" value={r.brand} icon={Tag} />
                        <Detail label="Category" value={meta?.label} icon={Layers} />
                        <Detail label="Condition" value={r.conditionType ? CONDITION_META[r.conditionType as ConditionType]?.label : null} icon={CheckCircle2} />
                        <Detail label="Halat" value={r.physicalCondition} icon={CheckCircle2} />
                        <Detail label="Stock me" value={`${r.ageDays} din se`} icon={Hourglass}
                          tone={r.ageDays > 60 ? 'rose' : r.ageDays > 30 ? 'amber' : 'emerald'} />
                        <Detail label="Umar bucket" value={r.bucket} icon={Hourglass} />
                        <Detail
                          label="Warranty"
                          value={r.warrantyDaysLeft == null ? 'Nahi hai'
                            : r.warrantyDaysLeft < 0 ? 'Khatam ho chuki'
                            : `${r.warrantyDaysLeft} din baqi`}
                          icon={ShieldCheck}
                          tone={r.warrantyDaysLeft != null && r.warrantyDaysLeft <= 30 ? 'amber' : 'emerald'}
                        />
                        <Detail label="Khareed qeemat" value={hideCost ? '•••' : formatPKR(r.cost)} icon={Wallet} strong />
                        <Detail label="Sale price" value={formatPKR(r.price)} icon={TrendingUp} strong tone="emerald" />
                        <Detail label="Mumkin munafa" value={hideCost ? '•••' : formatPKR(Math.max(r.price - r.cost, 0))} icon={Sparkles} strong tone="emerald" />
                      </div>

                      {r.ageDays > 60 && (
                        <div className="mt-2 rounded-xl bg-rose-50 border-2 border-rose-200 p-2.5 flex items-start gap-2">
                          <Flame className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-rose-900">
                            <strong>{r.ageDays} din</strong> se para hai. Electronics ka naya model aate hi
                            purane ka rate girta hai — discount ya bundle laga kar nikal do.
                          </p>
                        </div>
                      )}

                      <Link to={`/electronics-products/${r.productId}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:underline print:hidden">
                        Product page dekho <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Normal stock */}
            {showProducts && products.slice(0, 200).map((r) => {
              const meta = r.categoryType ? CATEGORY_META[r.categoryType as CategoryType] : null;
              const id = `p-${r.productId}`;
              const open = expanded.has(id);
              return (
                <div key={id}>
                  <button onClick={() => toggle(id)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-xl">
                      {meta?.emoji ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{r.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                        {meta && <span>{meta.label}</span>}
                        {r.brand && <span>{r.brand}</span>}
                        {r.sku && <span className="font-mono">{r.sku}</span>}
                        {r.conditionType && r.conditionType !== 'BRAND_NEW' && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${CONDITION_META[r.conditionType as ConditionType]?.chip}`}>
                            {CONDITION_META[r.conditionType as ConditionType]?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">{r.stock}</div>
                      <div className="text-[10px] font-bold text-slate-400">{r.unit}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900 tabular-nums">
                        {hideCost ? '•••' : formatPKR(r.value)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 tabular-nums">→ {formatPKR(r.retailValue)}</div>
                    </div>
                    {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>

                  {open && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50">
                      <div className="rounded-xl border-2 border-slate-200 bg-white p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                        <Detail label="Stock" value={`${r.stock} ${r.unit}`} icon={Boxes} />
                        <Detail label="SKU" value={r.sku} icon={Hash} mono />
                        <Detail label="Brand" value={r.brand} icon={Tag} />
                        <Detail label="Category" value={meta?.label} icon={Layers} />
                        <Detail label="Condition" value={r.conditionType ? CONDITION_META[r.conditionType as ConditionType]?.label : null} icon={CheckCircle2} />
                        <Detail label="Per unit lagat" value={hideCost ? '•••' : formatPKR(r.unitCost)} icon={Wallet} />
                        <Detail label="Per unit sale" value={formatPKR(r.price)} icon={TrendingUp} />
                        <Detail label="Kul lagat" value={hideCost ? '•••' : formatPKR(r.value)} icon={Wallet} strong />
                        <Detail label="Bechne par" value={formatPKR(r.retailValue)} icon={TrendingUp} strong tone="emerald" />
                        <Detail label="Mumkin munafa" value={hideCost ? '•••' : formatPKR(r.retailValue - r.value)} icon={Sparkles} strong tone="emerald" />
                      </div>
                      <Link to={`/electronics-products/${r.productId}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:underline print:hidden">
                        Product page dekho <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(serials.length > 200 || products.length > 200) && (
          <div className="p-3 text-center text-[11px] font-bold text-slate-500 border-t-2 border-slate-100">
            Pehle 200 dikhaye — poori list CSV me download karo
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
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{count}</div>
      <div className="text-[10px] font-bold text-white/70">{sub}</div>
      <div className="mt-1 text-[11px] font-extrabold text-emerald-300 tabular-nums truncate">{value}</div>
    </div>
  );
}

const DETAIL_TONES: Record<string, string> = {
  slate: 'text-slate-900',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-600',
};

function Detail({ label, value, icon: Icon, mono, strong, tone = 'slate' }: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-1.5 shrink-0">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </span>
      <span className={`text-[12px] tabular-nums truncate ${mono ? 'font-mono' : ''} ${strong ? 'font-extrabold' : 'font-bold'} ${DETAIL_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function StockTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Wallet, title: 'Kul Stock Value',
      body: 'Aap ka kitna paisa maal ki shakal me para hua hai — khareed qeemat par. Sath me bechne par kitna milega aur beech ka farq (mumkin munafa).',
      tips: ['Do hisse: serial wale units + normal stock', 'Lagat chupi ho to 🔒 PIN se kholo'],
    },
    {
      icon: Hourglass, title: 'Maal Ki Umar',
      body: 'Electronics me naya model aate hi purane ka rate girta hai. Chart par kisi bucket par click karke sirf usi umar ka maal dekho. 60 din se purana = dead stock.',
      tips: ['Sirf serial wale units ki umar track hoti hai', 'Normal stock (cable, cover) ki ginti matter karti hai'],
    },
    {
      icon: ShieldAlert, title: 'Khatam hoti Warranty',
      body: 'Ye sirf electronics me matter karta hai: agar unit stock me para hai aur uski warranty khatam ho gayi, to customer ko warranty nahi de payenge — aur wo unit bechna mushkil ho jayega.',
      tips: ['30 din me khatam hone wale units ka alert aata hai', 'Aise units pehle bech dein'],
    },
    {
      icon: ChevronDown, title: 'Har item ki tafseel',
      body: 'Kisi row par click karo — poori tafseel khul jayegi: serial, IMEI, condition, umar, warranty kitni baqi, lagat, sale price aur mumkin munafa.',
      tips: ['Search me serial, IMEI, product ya brand — kuch bhi', 'CSV me poora data, Print se stock ginti (audit) ke liye'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Stock Report Kaise Parhein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
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
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
