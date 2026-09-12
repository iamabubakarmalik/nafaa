// apps/web/src/industries/electronics/pages/ElectronicsReportsPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  BarChart3, Coins, Boxes, Barcode, Shield, Tag, Users,
  TrendingUp, Wallet, Receipt, Percent, Package, Clock, CalendarDays,
  CreditCard, ShieldAlert, ShieldCheck, Flame, Hourglass, AlertTriangle,
  GraduationCap, Keyboard, X, CheckCircle2, Sparkles, Printer,
  FileSpreadsheet, ArrowRight, Trophy, Cpu, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, PIE_COLORS, dayLabel,
} from '@modules/reports/reports/components/ReportsShared';
import { electronicsAnalyticsApi } from '../api/analytics.api';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — POORI DUKAN KI REPORTS (ek hi jagah)
   ─────────────────────────────────────────────────────────────
   📊 Overview • 💰 Munafa • 📦 Stock • 🔖 Serial/IMEI
   🛡️ Warranty • 🏭 Brands • 👥 Customers
   ═════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'profit', label: 'Munafa', icon: Coins },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'serial', label: 'Serial/IMEI', icon: Barcode },
  { id: 'warranty', label: 'Warranty', icon: Shield },
  { id: 'brands', label: 'Brands', icon: Tag },
  { id: 'customers', label: 'Customers', icon: Users },
];

const isoDaysAgo = (d: number) => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - d + 1);
  return x.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);

const BUCKET_HEX: Record<string, string> = {
  '0-30': '#10b981', '31-60': '#f59e0b', '61-90': '#f97316', '90+': '#e11d48',
};

export default function ElectronicsReportsPage() {
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const reports = useReportsData(days);

  const range = useMemo(() => ({ from: isoDaysAgo(days), to: todayIso() }), [days]);

  const { data: profit, isLoading: profitLoading } = useQuery({
    queryKey: ['electronics-profit', currentShopId, range.from, range.to],
    queryFn: () => electronicsAnalyticsApi.profit({ ...range, shopId: currentShopId || undefined }),
  });
  const { data: stock } = useQuery({
    queryKey: ['electronics-stock-report', currentShopId],
    queryFn: () => electronicsAnalyticsApi.stock(currentShopId || undefined),
  });
  const { data: low } = useQuery({
    queryKey: ['electronics-low-stock', currentShopId],
    queryFn: () => electronicsAnalyticsApi.lowStock(currentShopId || undefined),
  });
  const { data: warranty } = useQuery({
    queryKey: ['electronics-warranty-summary'],
    queryFn: () => warrantyClaimsApi.summary(),
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
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (e.key === 'p') window.print();
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1].id);
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

  const pl = reports.profitLoss as any;
  const t = profit?.totals;

  const trendData = useMemo(
    () => (reports.trend ?? []).map((d: any) => ({
      date: dayLabel(d.date),
      Bikri: Math.round(Number(d.revenue ?? d.total ?? 0)),
      Sales: Number(d.count ?? d.orders ?? 0),
    })),
    [reports.trend],
  );

  const dailyProfit = useMemo(
    () => (profit?.daily ?? []).map((d) => ({
      date: dayLabel(d.date),
      Bikri: Math.round(d.revenue),
      Munafa: Math.round(d.profit),
    })),
    [profit],
  );

  const categoryRows = useMemo(
    () => (profit?.byCategory ?? [])
      .map((r) => {
        const m = CATEGORY_META[r.categoryType as CategoryType];
        return { ...r, label: m?.label ?? r.categoryType, emoji: m?.emoji ?? '📦' };
      })
      .sort((a, b) => b.profit - a.profit),
    [profit],
  );

  const conditionRows = useMemo(
    () => (profit?.byCondition ?? [])
      .map((r) => {
        const m = CONDITION_META[r.conditionType as ConditionType];
        return { ...r, label: m?.label ?? r.conditionType, emoji: m?.emoji ?? '✨', hint: m?.hint };
      })
      .sort((a, b) => b.profit - a.profit),
    [profit],
  );

  const serialShare = useMemo(() => {
    if (!t?.revenue || !profit?.serialTracked) return 0;
    return Math.round((profit.serialTracked.revenue / t.revenue) * 100);
  }, [t, profit]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Reports`],
      [`Shop: ${shopName ?? 'All'}`, `Pichle ${days} din`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Bikri', String(Math.round(t?.revenue ?? 0))],
      ['Lagat', String(Math.round(t?.cost ?? 0))],
      ['Munafa', String(Math.round(t?.profit ?? 0))],
      ['Margin %', String((t?.margin ?? 0).toFixed(1))],
      ['Sales', String(t?.salesCount ?? 0)],
      ['Units bikay', String(t?.units ?? 0)],
      ['Stock value', String(Math.round(stock?.totals.totalValue ?? 0))],
      ['Serial units stock me', String(stock?.totals.serialUnits ?? 0)],
      ['Dead stock units', String(stock?.deadStock.count ?? 0)],
      ['Warranty 30 din me khatam', String(stock?.expiringWarranty.count ?? 0)],
      ['Low stock items', String(low?.summary.totalLow ?? 0)],
      ['Khatam ho chuke', String(low?.summary.totalOut ?? 0)],
      ['Warranty claims (kul)', String(warranty?.total ?? 0)],
      [],
      ['CATEGORY', 'Units', 'Bikri', 'Lagat', 'Munafa', 'Margin %'],
      ...categoryRows.map((r) => [r.label, String(r.units), String(Math.round(r.revenue)),
        String(Math.round(r.cost)), String(Math.round(r.profit)), r.margin.toFixed(1)]),
      [],
      ['CONDITION', 'Units', 'Bikri', 'Munafa', 'Margin %'],
      ...conditionRows.map((r) => [r.label, String(r.units), String(Math.round(r.revenue)),
        String(Math.round(r.profit)), r.margin.toFixed(1)]),
      [],
      ['TOP BRANDS', 'Units', 'Bikri', 'Munafa', 'Margin %'],
      ...(profit?.topBrands ?? []).map((r) => [r.name, String(r.units), String(Math.round(r.revenue)),
        String(Math.round(r.profit)), r.margin.toFixed(1)]),
      [],
      ['TOP PRODUCTS', 'Units', 'Bikri', 'Munafa', 'Margin %'],
      ...(profit?.topProducts ?? []).map((r) => [r.name, String(r.units), String(Math.round(r.revenue)),
        String(Math.round(r.profit)), r.margin.toFixed(1)]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-reports-${days}d-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (reports.isLoading && profitLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
        <div className="h-80 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Electronics Shop Reports"
        subtitle={`Pichle ${days} din${shopName ? ` — ${shopName}` : ''}`} />
      {showTeacher && <ReportsTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <div className="print:hidden">
        <ReportsHero
          gradient="from-slate-950 via-blue-900 to-cyan-700"
          emoji="🔌"
          industryLabel="Electronics"
          title="Poori Dukan Ki Reports"
          subtitle="Bikri, munafa, stock, serial, warranty — sab ek hi jagah"
          days={days}
          setDays={setDays}
          extraActions={
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setShowTeacher(true)}
                className="h-10 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />
              <button onClick={exportCsv}
                className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          }
        />
      </div>

      {/* ═══ ALERT STRIP ═══ */}
      {((stock?.expiringWarranty.count ?? 0) > 0 || (low?.summary.totalOut ?? 0) > 0 || (stock?.deadStock.count ?? 0) > 0) && (
        <div className="grid sm:grid-cols-3 gap-3 print:hidden">
          {(low?.summary.totalOut ?? 0) > 0 && (
            <AlertPill icon={Package} tone="rose" text={`${low?.summary.totalOut} cheezein bilkul khatam`}
              to="/low-stock" cta="Order karo" />
          )}
          {(stock?.expiringWarranty.count ?? 0) > 0 && (
            <AlertPill icon={ShieldAlert} tone="amber"
              text={`${stock?.expiringWarranty.count} units ki warranty 30 din me khatam`}
              to="/stock-report" cta="Dekho" />
          )}
          {(stock?.deadStock.count ?? 0) > 0 && (
            <AlertPill icon={Flame} tone="orange"
              text={`${stock?.deadStock.count} units 60+ din se pade hain`}
              to="/stock-report" cta="Dekho" />
          )}
        </div>
      )}

      <div className="print:hidden">
        <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="blue" />
      </div>

      {/* ══════════════ OVERVIEW ══════════════ */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Bikri" value={formatPKR(t?.revenue ?? 0)} icon={Receipt} color="blue" sub={`${t?.salesCount ?? 0} sales`} />
            <KpiCard label="Munafa" value={hideCost ? '••••••' : formatPKR(t?.profit ?? 0)} icon={Coins} color="emerald" isHighlight sub={`${(t?.margin ?? 0).toFixed(1)}% margin`} />
            <KpiCard label="Units Bikay" value={t?.units ?? 0} icon={Package} color="violet" sub={`${profit?.serialTracked.units ?? 0} serial wale`} />
            <KpiCard label="Stock Value" value={hideCost ? '••••••' : formatPKR(stock?.totals.totalValue ?? 0)} icon={Boxes} color="amber" sub={`${stock?.totals.serialUnits ?? 0} serial + ${stock?.totals.productUnits ?? 0} normal`} />
          </div>

          <ChartCard title="Rozana Bikri aur Munafa" subtitle={`Pichle ${days} din`} icon={TrendingUp} color="blue">
            {dailyProfit.length === 0 ? <EmptyChart message="Is duration me koi sale nahi" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyProfit}>
                  <defs>
                    <linearGradient id="elecRepRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" minTickGap={18} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={54} tickLine={false} axisLine={false}
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                  <Area type="monotone" dataKey="Bikri" stroke="#0891b2" strokeWidth={2.5} fill="url(#elecRepRev)" />
                  <Line type="monotone" dataKey="Munafa" stroke="#059669" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Kis Waqt Sab Se Zyada Bikri" subtitle="Aaj ke ghanton ka hisab" icon={Clock} color="orange">
              {(reports.hourlyToday ?? []).length === 0 ? <EmptyChart message="Aaj abhi koi sale nahi hui" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(reports.hourlyToday as any[]).map((h) => ({
                    hour: `${h.hour}:00`, Bikri: Math.round(Number(h.revenue ?? h.total ?? 0)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={54} tickLine={false} axisLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="Bikri" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Kis Din Sab Se Zyada" subtitle="Hafte ke dinon ka pattern" icon={CalendarDays} color="violet">
              {(reports.weekdayPattern ?? []).length === 0 ? <EmptyChart message="Abhi data kam hai" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(reports.weekdayPattern as any[]).map((w) => ({
                    day: String(w.day ?? w.weekday ?? '').slice(0, 3),
                    Bikri: Math.round(Number(w.revenue ?? w.total ?? 0)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={54} tickLine={false} axisLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="Bikri" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Paisa Kaise Aaya" subtitle="Cash, card, udhaar" icon={CreditCard} color="emerald">
              {(reports.paymentMethods ?? []).length === 0 ? <EmptyChart message="Abhi koi payment record nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={(reports.paymentMethods as any[]).map((p) => ({
                      name: p.method ?? p.name, value: Math.round(Number(p.total ?? p.amount ?? 0)),
                    }))} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {(reports.paymentMethods as any[]).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Nafa Nuqsan (P&amp;L)</h3>
                  <p className="text-xs text-slate-500">Pichle {days} din ka poora hisab</p>
                </div>
              </div>
              <div className="space-y-1">
                <PnLLine label="Kul Bikri" value={Number(pl?.revenue ?? t?.revenue ?? 0)} type="positive" />
                <PnLLine label="Maal Ki Lagat" value={-Number(pl?.cogs ?? t?.cost ?? 0)} type="negative" sub="COGS" />
                <PnLLine label="Gross Munafa" value={Number(pl?.grossProfit ?? t?.profit ?? 0)} type="bold" />
                <PnLLine label="Kharche" value={-Number(pl?.expenses ?? 0)} type="negative" sub="expenses" />
                <div className="pt-2">
                  <PnLLine label="Net Munafa" value={Number(pl?.netProfit ?? (Number(t?.profit ?? 0) - Number(pl?.expenses ?? 0)))}
                    type="highlight" sub="sab kuch nikal kar" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat label="Margin" value={`${(t?.margin ?? 0).toFixed(1)}%`} color="emerald" icon={Percent} />
                <MiniStat label="Per Sale" value={formatPKR((t?.salesCount ?? 0) > 0 ? (t!.revenue / t!.salesCount) : 0)} color="blue" icon={Receipt} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ PROFIT ══════════════ */}
      {tab === 'profit' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Bikri" value={formatPKR(t?.revenue ?? 0)} icon={Receipt} color="blue" />
            <KpiCard label="Lagat" value={hideCost ? '••••••' : formatPKR(t?.cost ?? 0)} icon={Wallet} color="rose" />
            <KpiCard label="Munafa" value={hideCost ? '••••••' : formatPKR(t?.profit ?? 0)} icon={Coins} color="emerald" isHighlight />
            <KpiCard label="Margin" value={`${(t?.margin ?? 0).toFixed(1)}%`} icon={Percent} color="violet"
              sub={(t?.margin ?? 0) >= 20 ? 'sehatmand 👍' : (t?.margin ?? 0) >= 10 ? 'theek hai' : 'kam hai ⚠️'} />
          </div>

          <ChartCard title="Category Ke Hisab Se Munafa" subtitle="Kis cheez se asli kamai" icon={Boxes} color="violet">
            {categoryRows.length === 0 ? <EmptyChart message="Is duration me koi sale nahi" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRows.slice(0, 10).map((r) => ({
                  name: r.label.length > 12 ? r.label.slice(0, 11) + '…' : r.label,
                  Munafa: Math.round(r.profit), Bikri: Math.round(r.revenue),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" interval={0} angle={-15} height={54} textAnchor="end" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={54} tickLine={false} axisLine={false}
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                  <Bar dataKey="Bikri" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Munafa" radius={[6, 6, 0, 0]}>
                    {categoryRows.slice(0, 10).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Condition — electronics ki khaas cheez */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Condition Ke Hisab Se</h3>
                <p className="text-xs text-slate-500">Naya, open-box, refurbished ya used — kis par margin behtar hai</p>
              </div>
            </div>
            {conditionRows.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500 py-8 text-center">Is duration me data nahi</p>
            ) : (
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {conditionRows.map((r) => (
                  <div key={r.conditionType} className="rounded-2xl border-2 border-slate-200 p-4 hover:border-amber-300 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl">{r.emoji}</span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate">{r.label}</div>
                          <div className="text-[11px] font-bold text-slate-500 truncate">{r.hint}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-extrabold tabular-nums ${r.margin >= 20 ? 'text-emerald-700' : r.margin < 8 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {r.margin.toFixed(1)}%
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">margin</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[9px] uppercase font-extrabold text-slate-400">Units</div>
                        <div className="font-extrabold text-slate-900 tabular-nums text-sm">{r.units}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-extrabold text-slate-400">Bikri</div>
                        <div className="font-extrabold text-slate-900 tabular-nums text-sm">{formatPKR(r.revenue)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-extrabold text-slate-400">Munafa</div>
                        <div className="font-extrabold text-emerald-700 tabular-nums text-sm">
                          {hideCost ? '•••' : formatPKR(r.profit)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <RankList
            title="Sab Se Zyada Munafa Dene Wale Products"
            subtitle="Top 10 — row par click karke product page kholein"
            icon={Trophy}
            rows={(profit?.topProducts ?? []).map((r) => {
              const m = r.category ? CATEGORY_META[r.category as CategoryType] : null;
              return {
                id: r.id, label: r.name, emoji: m?.emoji ?? '📦', sub: m?.label,
                link: `/electronics-products/${r.id}`,
                units: r.units, revenue: r.revenue, profit: r.profit, margin: r.margin,
              };
            })}
            hideCost={hideCost}
            emptyText="Is duration me koi product nahi bika"
          />

          <Link to="/profit-report"
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-700 hover:underline print:hidden">
            Poori profit report kholein <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ══════════════ STOCK ══════════════ */}
      {tab === 'stock' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Stock Value" value={hideCost ? '••••••' : formatPKR(stock?.totals.totalValue ?? 0)} icon={Boxes} color="blue" isHighlight
              sub={`bechne par ${formatPKR(stock?.totals.totalRetailValue ?? 0)}`} />
            <KpiCard label="Mumkin Munafa" value={hideCost ? '••••••' : formatPKR(stock?.totals.potentialProfit ?? 0)} icon={Coins} color="emerald"
              sub="agar sab bik jaye" />
            <KpiCard label="Dead Stock" value={stock?.deadStock.count ?? 0} icon={Flame} color="rose"
              sub={hideCost ? '•••' : `${formatPKR(stock?.deadStock.value ?? 0)} phansa`} />
            <KpiCard label="Kam / Khatam" value={`${low?.summary.totalLow ?? 0} / ${low?.summary.totalOut ?? 0}`} icon={Package} color="amber"
              sub={`${low?.summary.serialTrackedLow ?? 0} serial wale`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Maal Ki Umar" subtitle="Serial wale units kitne din se pade hain" icon={Hourglass} color="orange">
              {(stock?.buckets ?? []).length === 0 || (stock?.totals.serialUnits ?? 0) === 0
                ? <EmptyChart message="Koi serial wala unit stock me nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stock?.buckets ?? []).map((b) => ({ name: b.label, key: b.key, Units: b.units }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={40} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="Units" radius={[6, 6, 0, 0]}>
                      {(stock?.buckets ?? []).map((b) => <Cell key={b.key} fill={BUCKET_HEX[b.key] ?? '#64748b'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Paisa Kahan Phansa Hai" subtitle="Serial wale vs normal stock" icon={Cpu} color="violet">
              {(stock?.totals.totalValue ?? 0) === 0 ? <EmptyChart message="Stock khaali hai" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}
                      data={[
                        { name: 'Serial Wale', value: Math.round(stock?.totals.serialValue ?? 0) },
                        { name: 'Normal Stock', value: Math.round(stock?.totals.productValue ?? 0) },
                      ].filter((x) => x.value > 0)}>
                      <Cell fill="#7c3aed" />
                      <Cell fill="#059669" />
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {(low?.items ?? []).length > 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b-2 border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Jo Cheezein Mangwani Hain</h3>
                    <p className="text-xs text-slate-500">Khatam ya khatam hone wali — pehle ye order karein</p>
                  </div>
                </div>
                <Link to="/low-stock" className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1 print:hidden">
                  Poori list <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {(low?.items ?? []).slice(0, 8).map((r) => {
                  const m = r.categoryType ? CATEGORY_META[r.categoryType as CategoryType] : null;
                  return (
                    <Link key={r.productId} to={`/electronics-products/${r.productId}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                        {m?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{r.name}</div>
                        <div className="text-[11px] font-bold text-slate-500 truncate">
                          {m?.label}{r.brand ? ` · ${r.brand}` : ''}{r.requiresSerial ? ' · serial wala' : ''}
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                        r.isOut ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.isOut ? 'Khatam' : `${r.stock} ${r.unit}`}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <Link to="/stock-report"
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-700 hover:underline print:hidden">
            Poori stock report kholein <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ══════════════ SERIAL / IMEI ══════════════ */}
      {tab === 'serial' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Stock Me Serial Units" value={stock?.totals.serialUnits ?? 0} icon={Barcode} color="violet"
              sub={hideCost ? '•••' : formatPKR(stock?.totals.serialValue ?? 0)} />
            <KpiCard label="Bikay (is duration)" value={profit?.serialTracked.units ?? 0} icon={Receipt} color="emerald" isHighlight
              sub={formatPKR(profit?.serialTracked.revenue ?? 0)} />
            <KpiCard label="Kul Bikri Ka Hissa" value={`${serialShare}%`} icon={Percent} color="blue"
              sub="mehngi cheezon ka share" />
            <KpiCard label="Serial Wale Kam Ho Rahe" value={low?.summary.serialTrackedLow ?? 0} icon={AlertTriangle} color="amber"
              sub="dobara mangwao" />
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-5">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-lg shrink-0">
                <Barcode className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-violet-950">Serial/IMEI kyun zaroori hai?</h3>
                <p className="text-sm font-semibold text-violet-900/80 mt-1 leading-relaxed">
                  Har mehngi cheez (laptop, camera, drone, monitor, router) ka apna serial hota hai.
                  Serial POS me scan karte hi wo exact unit SOLD ho jata hai — us par kis customer ko
                  kitni warranty di, kab bikti, kitne me — sab record ho jata hai. Customer wapas aaye
                  to serial daalte hi poora history nikal aata hai.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap print:hidden">
                  <Link to="/electronics/serials"
                    className="h-10 px-4 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow transition">
                    Serial Tracking kholein <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link to="/electronics-products/new"
                    className="h-10 px-4 rounded-xl bg-white border-2 border-violet-300 text-violet-800 text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-violet-50 transition">
                    Naya product + serial
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {(stock?.serials ?? []).length > 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b-2 border-slate-100 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Hourglass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sab Se Purane Serial Units</h3>
                  <p className="text-xs text-slate-500">Jo sab se lambe arse se pade hain — inhe pehle nikaalein</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {[...(stock?.serials ?? [])].sort((a, b) => b.ageDays - a.ageDays).slice(0, 10).map((r) => {
                  const m = r.categoryType ? CATEGORY_META[r.categoryType as CategoryType] : null;
                  return (
                    <Link key={r.id} to={`/electronics-products/${r.productId}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                        {m?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{r.name}</div>
                        <div className="text-[11px] font-bold text-slate-500 font-mono truncate">{r.serialNumber}</div>
                      </div>
                      <div className={`text-sm font-extrabold tabular-nums shrink-0 ${
                        r.ageDays > 90 ? 'text-rose-600' : r.ageDays > 60 ? 'text-orange-600' : r.ageDays > 30 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {r.ageDays}d
                      </div>
                      <div className="text-right shrink-0 w-24">
                        <div className="font-extrabold text-slate-900 tabular-nums text-sm">
                          {hideCost ? '•••' : formatPKR(r.cost)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ WARRANTY ══════════════ */}
      {tab === 'warranty' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Kul Claims" value={warranty?.total ?? 0} icon={Shield} color="blue" />
            <KpiCard label="Chal Rahe" value={warranty?.active ?? 0} icon={ShieldAlert} color="amber" isHighlight sub="abhi khule hain" />
            <KpiCard label="Repair Me" value={warranty?.inRepair ?? 0} icon={Wrench} color="violet" />
            <KpiCard label="Company Ko Bheje" value={warranty?.sentToBrand ?? 0} icon={ArrowRight} color="cyan"
              sub={`${warranty?.resolved ?? 0} hal ho chuke`} />
          </div>

          {(stock?.expiringWarranty.count ?? 0) > 0 && (
            <div className="rounded-3xl bg-white border-2 border-amber-300 shadow-sm overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-950">Warranty 30 Din Me Khatam</h3>
                  <p className="text-xs font-semibold text-amber-800">
                    Ye units abhi stock me hain — warranty khatam hote hi inki qeemat gir jayegi. Pehle bech dein.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {(stock?.expiringWarranty.items ?? []).slice(0, 12).map((r) => {
                  const m = r.categoryType ? CATEGORY_META[r.categoryType as CategoryType] : null;
                  return (
                    <Link key={r.id} to={`/electronics-products/${r.productId}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition">
                      <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">
                        {m?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{r.name}</div>
                        <div className="text-[11px] font-bold text-slate-500 font-mono truncate">{r.serialNumber}</div>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold shrink-0 tabular-nums">
                        {r.warrantyDaysLeft != null && r.warrantyDaysLeft >= 0 ? `${r.warrantyDaysLeft} din baqi` : 'Khatam'}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-5">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-emerald-950">Warranty se dukan ka bharosa banta hai</h3>
                <p className="text-sm font-semibold text-emerald-900/80 mt-1 leading-relaxed">
                  Customer serial le kar wapas aaye to Warranty Claims me serial daal kar foran pata chal
                  jata hai ke warranty chal rahi hai ya nahi, kab bikti thi, aur kis company ka maal hai.
                  Claim company ko bhej kar uska status bhi yahin track hota hai.
                </p>
                <Link to="/electronics/warranty-claims"
                  className="mt-3 h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow transition print:hidden">
                  Warranty Claims kholein <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ BRANDS ══════════════ */}
      {tab === 'brands' && (
        <div className="space-y-5">
          <ChartCard title="Brand Ke Hisab Se Munafa" subtitle="Kis company ka maal asal me kamata hai" icon={Tag} color="blue">
            {(profit?.topBrands ?? []).length === 0 ? <EmptyChart message="Is duration me brand ka data nahi" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={(profit?.topBrands ?? []).slice(0, 10).map((r) => ({
                  name: r.name.length > 16 ? r.name.slice(0, 15) + '…' : r.name,
                  Munafa: Math.round(r.profit),
                }))} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false}
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={110} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                  <Bar dataKey="Munafa" radius={[0, 6, 6, 0]}>
                    {(profit?.topBrands ?? []).slice(0, 10).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <RankList
            title="Brands Ki Poori List"
            subtitle="Munafe ke hisab se — supplier se rate baat karte waqt kaam aata hai"
            icon={Tag}
            rows={(profit?.topBrands ?? []).map((r) => ({
              id: r.id, label: r.name, emoji: '🏭',
              units: r.units, revenue: r.revenue, profit: r.profit, margin: r.margin,
            }))}
            hideCost={hideCost}
            emptyText="Is duration me kisi brand ka maal nahi bika"
          />
        </div>
      )}

      {/* ══════════════ CUSTOMERS ══════════════ */}
      {tab === 'customers' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Kul Sales" value={t?.salesCount ?? 0} icon={Receipt} color="blue" />
            <KpiCard label="Per Sale Average" value={formatPKR((t?.salesCount ?? 0) > 0 ? (t!.revenue / t!.salesCount) : 0)} icon={Coins} color="emerald" isHighlight />
            <KpiCard label="Top Customers" value={(reports.topCustomers ?? []).length} icon={Users} color="violet" />
            <KpiCard label="Naye Customers" value={(reports.customerAcquisition as any[])?.reduce((s, c) => s + Number(c.count ?? c.newCustomers ?? 0), 0) ?? 0}
              icon={Sparkles} color="amber" sub={`pichle ${days} din`} />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b-2 border-slate-100 flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sab Se Behtareen Customers</h3>
                <p className="text-xs text-slate-500">Jo sab se zyada kharidte hain — inhe khaas rate dein</p>
              </div>
            </div>
            {(reports.topCustomers ?? []).length === 0 ? (
              <div className="p-10 text-center">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Abhi customers ka record nahi</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  POS me sale ke waqt customer chunein — phir yahan unka poora hisab aayega
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(reports.topCustomers as any[]).map((c, i) => (
                  <div key={c.id ?? i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-6 text-center text-xs font-extrabold text-slate-400 tabular-nums shrink-0">{i + 1}</div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                      {String(c.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{c.name ?? 'Walk-in'}</div>
                      <div className="text-[11px] font-bold text-slate-500 truncate">
                        {c.phone ?? ''}{c.orders != null ? ` · ${c.orders} sales` : ''}
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900 tabular-nums shrink-0">
                      {formatPKR(Number(c.total ?? c.revenue ?? 0))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/khata"
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-700 hover:underline print:hidden">
            Udhaar khata kholein <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

const PILL_TONES: Record<string, string> = {
  rose: 'bg-rose-50 border-rose-300 text-rose-900',
  amber: 'bg-amber-50 border-amber-300 text-amber-900',
  orange: 'bg-orange-50 border-orange-300 text-orange-900',
};
const PILL_ICON: Record<string, string> = {
  rose: 'from-rose-500 to-red-600',
  amber: 'from-amber-500 to-orange-600',
  orange: 'from-orange-500 to-red-600',
};

function AlertPill({ icon: Icon, tone, text, to, cta }: any) {
  return (
    <div className={`rounded-2xl border-2 p-3.5 flex items-center gap-2.5 ${PILL_TONES[tone]}`}>
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${PILL_ICON[tone]} text-white flex items-center justify-center shadow shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 text-xs font-bold min-w-0">{text}</div>
      <Link to={to} className="px-2.5 h-8 rounded-lg bg-white/80 text-[11px] font-extrabold inline-flex items-center shrink-0 hover:bg-white transition">
        {cta}
      </Link>
    </div>
  );
}

interface RankRow {
  id: string; label: string; emoji: string; sub?: string; link?: string;
  units: number; revenue: number; profit: number; margin: number;
}

function RankList({ title, subtitle, icon: Icon, rows, hideCost, emptyText }: {
  title: string; subtitle: string; icon: any; rows: RankRow[]; hideCost: boolean; emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b-2 border-slate-100 flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((r, i) => {
            const inner = (
              <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                <div className="w-6 text-center text-xs font-extrabold text-slate-400 tabular-nums shrink-0">{i + 1}</div>
                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">{r.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm truncate">{r.label}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-slate-500 flex-wrap">
                    {r.sub && <span className="truncate">{r.sub}</span>}
                    <span className="tabular-nums">{r.units} units</span>
                    <span className="tabular-nums">Bikri {formatPKR(r.revenue)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden print:hidden">
                    <div className={`h-full rounded-full ${r.profit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.round((Math.abs(r.profit) / max) * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-extrabold tabular-nums ${r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {hideCost ? '•••••' : formatPKR(r.profit)}
                  </div>
                  <div className={`text-[10px] font-extrabold tabular-nums ${
                    r.margin >= 20 ? 'text-emerald-600' : r.margin < 8 ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {r.margin.toFixed(1)}% margin
                  </div>
                </div>
              </div>
            );
            return r.link ? <Link key={r.id} to={r.link} className="block">{inner}</Link> : <div key={r.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function ReportsTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: BarChart3, title: 'Overview — pehli nazar',
      body: 'Bikri, munafa, kitne units bikay aur stock me kitna paisa phansa hai. Neeche rozana ka chart, kis waqt aur kis din sab se zyada bikri hoti hai, aur poora nafa-nuqsan (P&L).',
      tips: ['Upar 7/14/30/90 din chunein', '1–7 dabakar tab badlein'],
    },
    {
      icon: Sparkles, title: 'Condition ka tab dekhna na bhoolein',
      body: 'Electronics ki asli baat yehi hai: ek hi cheez brand-new me kam margin deti hai aur open-box/refurbished me zyada. Munafa tab me condition ke hisab se poora hisab milta hai.',
      tips: ['Zyada margin wali condition ka stock barhao', 'Category + Brand se supplier rate baat karo'],
    },
    {
      icon: Barcode, title: 'Serial/IMEI ka tab',
      body: 'Mehngi cheezon (laptop, camera, drone, router) ka har unit alag track hota hai. Yahan pata chalta hai kitne stock me hain, kitne bikay, aur kul bikri ka kitna hissa serial wali cheezon ka hai.',
      tips: ['Purane serial units pehle nikaalein', 'Serial se customer ki poori history milti hai'],
    },
    {
      icon: Shield, title: 'Warranty ka tab',
      body: 'Claims ka status aur — sab se ahem — wo units jinki warranty 30 din me khatam ho rahi hai jab ke wo abhi stock me hain. Aise units pehle bech dein warna nuqsan hota hai.',
      tips: ['CSV me sab data Excel ke liye', 'P dabao to saaf report print ho jati hai'],
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
              <h3 className="font-extrabold text-slate-900">Reports Kaise Parhein?</h3>
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
  const sc = [
    ['1 – 7', 'Tab badlein'], ['G', 'Guide kholo'], ['P', 'Print'],
    ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
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
