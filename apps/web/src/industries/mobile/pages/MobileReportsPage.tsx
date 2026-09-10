// apps/web/src/industries/mobile/pages/MobileReportsPage.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line,
} from 'recharts';
import {
  BarChart3, Smartphone, ShieldCheck, CreditCard, Wrench, TrendingUp,
  Target, Package, Crown, Activity, DollarSign, Award, Clock, Star,
  ArrowRight, RefreshCw, PiggyBank, Boxes, RotateCcw, Cable, Hourglass,
  Flame, FileSpreadsheet, Printer, GraduationCap, X, CheckCircle2, Sparkles,
  Wallet, AlertTriangle, Percent, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { useReportsData } from '@modules/reports/reports/hooks/useReportsData';
import {
  ReportsHero, TabSwitcher, KpiCard, ChartCard, EmptyChart,
  PnLLine, MiniStat, dayLabel, PIE_COLORS,
} from '@modules/reports/reports/components/ReportsShared';
import { imeiApi } from '../api/imei.api';
import { PrintStyles } from '@core/components/print/PrintStyles';
import {
  mobileReportsApi, type ProfitSourceKey,
} from '../api/mobile-reports.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — SHOP REPORTS (single source of truth)
   ─────────────────────────────────────────────────────────────
   Pehle do alag reports pages thin (/reports aur /mobile-reports).
   Ab ek hi page — poori mobile shop ki analytics:
   Overview • Munafa • Stock • IMEI • Repairs • EMI • Used • Brands
   🎓 Guide • 🖨️ Print • 📊 CSV
   ═════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'profit', label: 'Munafa', icon: PiggyBank },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'imei', label: 'IMEI & PTA', icon: Smartphone },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'emi', label: 'EMI', icon: CreditCard },
  { id: 'used', label: 'Used Phones', icon: RotateCcw },
  { id: 'brands', label: 'Top Models', icon: Package },
];

const PTA_HEX: Record<string, string> = {
  APPROVED: '#10b981', NON_PTA: '#ef4444', PATCH: '#f59e0b',
  PENDING: '#3b82f6', EXEMPT: '#8b5cf6',
};

const PTA_LABELS: Record<string, string> = {
  APPROVED: 'PTA Approved', NON_PTA: 'Non-PTA', PATCH: 'Patched',
  PENDING: 'Pending', EXEMPT: 'Exempt',
};

const SOURCE_META: Record<ProfitSourceKey, { label: string; icon: any; hex: string; color: any }> = {
  NEW_PHONE: { label: 'Naye Phone', icon: Smartphone, hex: '#2563eb', color: 'blue' },
  USED_PHONE: { label: 'Used Phone', icon: RotateCcw, hex: '#7c3aed', color: 'violet' },
  ACCESSORY: { label: 'Accessories', icon: Cable, hex: '#059669', color: 'emerald' },
  REPAIR: { label: 'Repair', icon: Wrench, hex: '#d97706', color: 'amber' },
};
const SOURCE_ORDER: ProfitSourceKey[] = ['NEW_PHONE', 'USED_PHONE', 'ACCESSORY', 'REPAIR'];

const BUCKET_HEX: Record<string, string> = {
  '0-30': '#10b981', '31-60': '#f59e0b', '61-90': '#f97316', '90+': '#e11d48',
};

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));

export default function MobileReportsPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [showTeacher, setShowTeacher] = useState(false);

  const tenantName = useAuthStore((s: any) => s.tenant?.name);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const reports = useReportsData(days);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days]);

  /* ─── Mobile-specific data ─── */
  const { data: imeiStats } = useQuery({
    queryKey: ['imei-stats-reports'],
    queryFn: () => imeiApi.stats(),
  });
  const { data: profit } = useQuery({
    queryKey: ['mobile-profit-by-source', 'reports', days],
    queryFn: () => mobileReportsApi.profitBySource(range),
  });
  const { data: aging } = useQuery({
    queryKey: ['mobile-stock-aging', currentShopId],
    queryFn: () => mobileReportsApi.stockAging(currentShopId || undefined),
  });
  const { data: pta = [] } = useQuery({
    queryKey: ['mobile-reports-pta'],
    queryFn: () => mobileReportsApi.ptaBreakdown(),
  });
  const { data: brands = [] } = useQuery({
    queryKey: ['mobile-reports-brands', days],
    queryFn: () => mobileReportsApi.topBrands(days),
  });
  const { data: repairs } = useQuery({
    queryKey: ['mobile-reports-repairs', days],
    queryFn: () => mobileReportsApi.repairAnalytics(days),
  });
  const { data: emi } = useQuery({
    queryKey: ['mobile-reports-emi'],
    queryFn: () => mobileReportsApi.emiAnalytics(),
  });
  const { data: used } = useQuery({
    queryKey: ['mobile-reports-used', days],
    queryFn: () => mobileReportsApi.usedPhoneAnalytics(days),
  });

  const pl = reports.profitLoss;
  const t = profit?.totals;
  const stock = aging?.totals;

  const trend = useMemo(
    () => (profit?.daily ?? []).map((d) => ({
      date: shortDate(d.date),
      Revenue: Math.round(d.revenue),
      Profit: Math.round(d.profit),
    })),
    [profit],
  );

  const profitPie = useMemo(
    () => (profit?.sources ?? [])
      .filter((s) => s.profit > 0)
      .map((s) => ({ name: SOURCE_META[s.key].label, value: Math.round(s.profit), color: SOURCE_META[s.key].hex })),
    [profit],
  );

  const ptaChart = useMemo(
    () => pta.map((p) => ({
      name: PTA_LABELS[p.ptaStatus] ?? p.ptaStatus,
      status: p.ptaStatus,
      count: p.count,
      value: Math.round(p.stockValue),
    })),
    [pta],
  );

  const agingChart = useMemo(
    () => (aging?.buckets ?? []).map((b) => ({
      name: b.label, key: b.key,
      Devices: b.phones + b.usedPhones,
      Value: Math.round(b.phoneValue + b.usedValue),
    })),
    [aging],
  );

  const stockSplit = useMemo(() => {
    if (!stock) return [];
    return [
      { name: 'Naye Phone', value: Math.round(stock.phoneValue), color: '#2563eb' },
      { name: 'Used Phone', value: Math.round(stock.usedValue), color: '#7c3aed' },
      { name: 'Accessories', value: Math.round(stock.accessoryValue), color: '#059669' },
    ].filter((x) => x.value > 0);
  }, [stock]);

  /* ─── Export ─── */
  const exportCsv = () => {
    const rows: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Mobile Shop Reports`],
      [`Shop: ${shopName ?? 'All'}`, `Aakhri ${days} din`, new Date().toLocaleString('en-PK')],
      [],
      ['KAMAI KA RASTA', 'Bikri', 'Lagat', 'Munafa', 'Margin %', 'Units', 'Sales'],
      ...SOURCE_ORDER.map((k) => {
        const r = profit?.sources.find((x) => x.key === k);
        return [SOURCE_META[k].label,
          String(Math.round(r?.revenue ?? 0)), String(Math.round(r?.cost ?? 0)),
          String(Math.round(r?.profit ?? 0)), (r?.margin ?? 0).toFixed(1),
          String(r?.units ?? 0), String(r?.sales ?? 0)];
      }),
      ['KUL', String(Math.round(t?.revenue ?? 0)), String(Math.round(t?.cost ?? 0)),
       String(Math.round(t?.profit ?? 0)), (t?.margin ?? 0).toFixed(1),
       String(t?.units ?? 0), String(t?.salesCount ?? 0)],
      [],
      ['STOCK', 'Ginti', 'Value'],
      ['Naye Phone', String(stock?.phones ?? 0), String(Math.round(stock?.phoneValue ?? 0))],
      ['Used Phone', String(stock?.usedPhones ?? 0), String(Math.round(stock?.usedValue ?? 0))],
      ['Accessories', `${stock?.accessories ?? 0} items / ${stock?.accessoryUnits ?? 0} units`, String(Math.round(stock?.accessoryValue ?? 0))],
      ['KUL STOCK VALUE', '', String(Math.round(stock?.totalValue ?? 0))],
      ['Dead stock (60+ din)', String(aging?.deadStock.count ?? 0), String(Math.round(aging?.deadStock.value ?? 0))],
      [],
      ['PTA STATUS', 'Ginti', 'Stock Value', 'Tax Paid'],
      ...pta.map((p) => [PTA_LABELS[p.ptaStatus] ?? p.ptaStatus, String(p.count),
        String(Math.round(p.stockValue)), String(Math.round(p.taxPaid))]),
      [],
      ['REPAIRS', 'Value'],
      ['Delivered', String(repairs?.delivered ?? 0)],
      ['Revenue', String(Math.round(repairs?.totalRevenue ?? 0))],
      ['Parts cost', String(Math.round(repairs?.partsCost ?? 0))],
      ['Gross profit', String(Math.round(repairs?.grossProfit ?? 0))],
      [],
      ['EMI', 'Value'],
      ['Active financed', String(Math.round(emi?.activeFinanced ?? 0))],
      ['Baqi', String(Math.round(emi?.activeRemaining ?? 0))],
      ['Late qisten', String(emi?.overdueCount ?? 0)],
      ['Late raqam', String(Math.round(emi?.overdueAmount ?? 0))],
      [],
      ['TOP MODELS', 'Brand', 'Units', 'Bikri', 'Munafa', 'Margin %'],
      ...(profit?.topProducts ?? []).map((p) => [p.name, p.brand ?? '', String(p.units),
        String(Math.round(p.revenue)), String(Math.round(p.profit)), p.margin.toFixed(1)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-reports-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const heroActions = (
    <>
      <button onClick={() => setShowTeacher(true)}
        className="px-3 py-2 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-sm font-bold inline-flex items-center gap-1.5 shadow-lg transition">
        <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
      </button>
      <button onClick={exportCsv}
        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold inline-flex items-center gap-1.5 backdrop-blur transition">
        <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
      </button>
      <button onClick={() => window.print()}
        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold inline-flex items-center gap-1.5 backdrop-blur transition">
        <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
      </button>
    </>
  );

  return (
    <div className="space-y-6 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Mobile Shop Reports" subtitle="Poori dukan ki analytics" />

      {showTeacher && <ReportsTeacher onClose={() => setShowTeacher(false)} />}

      <ReportsHero
        gradient="from-slate-900 via-blue-800 to-indigo-700"
        emoji="📱"
        industryLabel="Mobile"
        title="Mobile Shop Reports"
        subtitle="Munafa, stock, IMEI/PTA, repairs, EMI aur used phones — sab ek jagah"
        days={days}
        setDays={setDays}
        extraActions={heroActions}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="blue" />

      {/* ══════════════ OVERVIEW ══════════════ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Kul Bikri" value={formatPKR(t?.revenue ?? 0)} icon={TrendingUp} color="emerald" />
            <KpiCard label="Kul Munafa" value={formatPKR(t?.profit ?? 0)} icon={Target} color="blue" isHighlight
              sub={`${(t?.margin ?? 0).toFixed(1)}% margin`} />
            <KpiCard label="Sales" value={t?.salesCount ?? 0} icon={Activity} color="violet"
              sub={`${t?.units ?? 0} units`} />
            <KpiCard label="Stock Value" value={formatPKR(stock?.totalValue ?? 0)} icon={Wallet} color="amber"
              sub={`${(stock?.phones ?? 0) + (stock?.usedPhones ?? 0)} device + ${stock?.accessoryUnits ?? 0} units`} />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <ChartCard title="Rozana Bikri aur Munafa" subtitle={`Aakhri ${days} din`} icon={BarChart3} color="blue">
              {trend.length === 0 ? <EmptyChart message="Is arse me koi sale nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Bar dataKey="Revenue" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Mobile Shop P&amp;L</h3>
                    <p className="text-xs text-slate-500">{days} din ka hisab</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
                  {(t?.margin ?? 0).toFixed(1)}% margin
                </span>
              </div>

              <div className="space-y-1">
                <PnLLine label="Bikri (net)" value={t?.revenue ?? 0} type="positive" />
                <PnLLine label="Maal ki lagat" value={-(t?.cost ?? 0)} type="negative" sub="COGS" />
                <PnLLine label="Gross Profit" value={t?.profit ?? 0} type="bold" />
                {pl && (
                  <PnLLine label="Kharche" value={-(Number((pl as any).expenses ?? 0))} type="negative" />
                )}
                <div className="pt-2">
                  <PnLLine
                    label="Net Profit"
                    value={(t?.profit ?? 0) - Number((pl as any)?.expenses ?? 0)}
                    type="highlight"
                    sub={`${t?.salesCount ?? 0} sales`}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat label="Sales" value={t?.salesCount ?? 0} color="blue" icon={Activity} />
                <MiniStat label="Units" value={t?.units ?? 0} color="violet" icon={Package} />
                <MiniStat label="Avg Sale" value={formatPKR((t?.salesCount ?? 0) > 0 ? (t!.revenue / t!.salesCount) : 0)} color="emerald" icon={TrendingUp} />
                <MiniStat label="Margin" value={`${(t?.margin ?? 0).toFixed(1)}%`} color="amber" icon={Percent} />
              </div>
            </div>
          </div>

          {/* Chaar raaste — chhota version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SOURCE_ORDER.map((k) => {
              const r = profit?.sources.find((x) => x.key === k);
              const meta = SOURCE_META[k];
              const share = (t?.profit ?? 0) > 0 && r ? (r.profit / t!.profit) * 100 : 0;
              return (
                <SourceCard key={k} meta={meta} row={r} share={share} />
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════ MUNAFA ══════════════ */}
      {tab === 'profit' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SOURCE_ORDER.map((k) => {
              const r = profit?.sources.find((x) => x.key === k);
              const meta = SOURCE_META[k];
              const share = (t?.profit ?? 0) > 0 && r ? (r.profit / t!.profit) * 100 : 0;
              return <SourceCard key={k} meta={meta} row={r} share={share} detailed />;
            })}
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <ChartCard title="Munafe ka Safar" subtitle="Rozana bikri vs munafa" icon={TrendingUp} color="emerald">
              {trend.length === 0 ? <EmptyChart message="Is arse me koi sale nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} fill="url(#gProfit)" />
                    <Area type="monotone" dataKey="Revenue" stroke="#94a3b8" strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Munafe ka Hissa" subtitle="Kaunsa rasta kitna deta hai" icon={PiggyBank} color="violet">
              {profitPie.length === 0 ? <EmptyChart message="Koi munafa record nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={profitPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {profitPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <TopModelsTable rows={profit?.topProducts ?? []} />
        </>
      )}

      {/* ══════════════ STOCK ══════════════ */}
      {tab === 'stock' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Kul Stock Value" value={formatPKR(stock?.totalValue ?? 0)} icon={Wallet} color="blue" isHighlight
              sub={`bechne par ${formatPKR(stock?.totalRetailValue ?? 0)}`} />
            <KpiCard label="Naye Phone" value={stock?.phones ?? 0} icon={Smartphone} color="cyan"
              sub={formatPKR(stock?.phoneValue ?? 0)} />
            <KpiCard label="Used Phone" value={stock?.usedPhones ?? 0} icon={RotateCcw} color="violet"
              sub={formatPKR(stock?.usedValue ?? 0)} />
            <KpiCard label="Accessories" value={stock?.accessoryUnits ?? 0} icon={Cable} color="emerald"
              sub={`${stock?.accessories ?? 0} items · ${formatPKR(stock?.accessoryValue ?? 0)}`} />
          </div>

          {(aging?.deadStock.count ?? 0) > 0 && (
            <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-center gap-3 flex-wrap">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shrink-0">
                <Flame className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-rose-900 min-w-0">
                <strong>{aging?.deadStock.count} device 60+ din se pade hain</strong> —{' '}
                {formatPKR(aging?.deadStock.value ?? 0)} phansa hua hai. Mobile ki qeemat har mahine girti hai.
              </div>
              <Link to="/stock-report"
                className="px-3.5 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow transition shrink-0">
                Stock Report <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <ChartCard title="Maal Ki Umar" subtitle="Phone jitna purana, qeemat utni kam" icon={Hourglass} color="orange">
              {(stock?.phones ?? 0) + (stock?.usedPhones ?? 0) === 0 ? (
                <EmptyChart message="Koi phone stock me nahi" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip formatter={(v: any, n: any) => [n === 'Value' ? formatPKR(Number(v)) : v, n === 'Value' ? 'Stock Value' : 'Devices']}
                      contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="Devices" radius={[8, 8, 0, 0]}>
                      {agingChart.map((d) => <Cell key={d.key} fill={BUCKET_HEX[d.key] ?? '#64748b'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Paisa Kahan Phansa Hai" subtitle="Stock value ka bantwara" icon={Boxes} color="blue">
              {stockSplit.length === 0 ? <EmptyChart message="Stock khaali hai" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {stockSplit.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Top accessories by value */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Cable className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Accessories Stock</h3>
                  <p className="text-xs text-slate-500">Sab se zyada paisa jin me phansa hai</p>
                </div>
              </div>
              <Link to="/stock-report" className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1">
                Poori list <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {(aging?.accessories ?? []).filter((a) => a.stock > 0).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Koi accessory stock me nahi</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-6 py-2.5 text-[10px] uppercase font-extrabold text-slate-500">Item</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Stock</th>
                      <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Lagat</th>
                      <th className="px-6 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Bechne par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(aging?.accessories ?? []).filter((a) => a.stock > 0).slice(0, 12).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-2.5">
                          <div className="font-bold text-slate-900">{a.name}</div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            {[a.brand, a.category, a.sku].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${a.isLow ? 'text-amber-700' : 'text-slate-700'}`}>
                          {a.stock} {a.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">{formatPKR(a.value)}</td>
                        <td className="px-6 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(a.retailValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ IMEI & PTA ══════════════ */}
      {tab === 'imei' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Kul IMEIs" value={imeiStats?.total ?? 0} icon={Smartphone} color="blue" />
            <KpiCard label="Stock Me" value={imeiStats?.inStock ?? 0} icon={ShieldCheck} color="emerald" isHighlight />
            <KpiCard label="Bik Chuke" value={imeiStats?.sold ?? 0} icon={TrendingUp} color="violet" />
            <KpiCard label="Stock Value" value={formatPKR(imeiStats?.stockValue ?? 0)} icon={Wallet} color="amber" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="PTA Status — Ginti" subtitle="Stock me mojood device" icon={ShieldCheck} color="emerald">
              {ptaChart.length === 0 ? <EmptyChart message="Koi IMEI stock me nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ptaChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {ptaChart.map((p) => <Cell key={p.status} fill={PTA_HEX[p.status] ?? '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="PTA Status — Value" subtitle="Kis halat me kitna paisa" icon={Wallet} color="blue">
              {ptaChart.length === 0 ? <EmptyChart message="Koi IMEI stock me nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ptaChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {ptaChart.map((p) => <Cell key={p.status} fill={PTA_HEX[p.status] ?? '#3b82f6'} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Damaged" value={imeiStats?.damaged ?? 0} color="rose" icon={AlertTriangle} />
            <MiniStat label="Lost" value={imeiStats?.lost ?? 0} color="amber" icon={AlertTriangle} />
            <MiniStat label="Returned" value={imeiStats?.returned ?? 0} color="blue" icon={RotateCcw} />
            <MiniStat label="Reserved" value={imeiStats?.reserved ?? 0} color="violet" icon={Clock} />
          </div>
        </>
      )}

      {/* ══════════════ REPAIRS ══════════════ */}
      {tab === 'repairs' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Deliver Ho Chuke" value={repairs?.delivered ?? 0} icon={CheckCircle2} color="emerald" />
            <KpiCard label="Repair Kamai" value={formatPKR(repairs?.totalRevenue ?? 0)} icon={Wallet} color="amber" isHighlight />
            <KpiCard label="Parts Cost" value={formatPKR(repairs?.partsCost ?? 0)} icon={Package} color="rose" />
            <KpiCard label="Gross Profit" value={formatPKR(repairs?.grossProfit ?? 0)} icon={Target} color="blue" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Tickets Ki Halat" subtitle={`Aakhri ${days} din`} icon={Wrench} color="orange">
              {(repairs?.byStatus ?? []).length === 0 ? <EmptyChart message="Koi repair ticket nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repairs?.byStatus ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="status" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Kaunsi Company Ke Phone" subtitle="Sab se zyada repair" icon={Crown} color="violet">
              {(repairs?.topBrands ?? []).length === 0 ? <EmptyChart message="Koi data nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repairs?.topBrands ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="brand" stroke="#64748b" fontSize={11} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Labor Kamai" value={formatPKR(repairs?.laborRevenue ?? 0)} color="emerald" icon={Wrench} />
            <MiniStat label="Wasool Hua" value={formatPKR(repairs?.collected ?? 0)} color="blue" icon={Wallet} />
            <MiniStat label="Baqi" value={formatPKR(Math.max((repairs?.totalRevenue ?? 0) - (repairs?.collected ?? 0), 0))} color="amber" icon={Clock} />
            <MiniStat label="Avg Job" value={formatPKR((repairs?.delivered ?? 0) > 0 ? (repairs!.totalRevenue / repairs!.delivered) : 0)} color="violet" icon={TrendingUp} />
          </div>
        </>
      )}

      {/* ══════════════ EMI ══════════════ */}
      {tab === 'emi' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Kul Financed" value={formatPKR(emi?.activeFinanced ?? 0)} icon={CreditCard} color="violet" />
            <KpiCard label="Baqi Lena Hai" value={formatPKR(emi?.activeRemaining ?? 0)} icon={Wallet} color="amber" isHighlight />
            <KpiCard label="Late Qisten" value={emi?.overdueCount ?? 0} icon={AlertTriangle} color="rose"
              sub={formatPKR(emi?.overdueAmount ?? 0)} />
            <KpiCard label="Is Mahine Mila" value={formatPKR(emi?.collectedThisMonth ?? 0)} icon={CheckCircle2} color="emerald"
              sub={`${emi?.collectedCountThisMonth ?? 0} qisten`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Plans Ki Halat" subtitle="Status ke hisab se" icon={CreditCard} color="violet">
              {(emi?.byStatus ?? []).length === 0 ? <EmptyChart message="Koi EMI plan nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={emi?.byStatus ?? []} dataKey="count" nameKey="status" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {(emi?.byStatus ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Aane Wali Qisten</h3>
                  <p className="text-xs text-slate-500">Jo abhi wasool karni hain</p>
                </div>
              </div>
              <div className="space-y-1">
                <PnLLine label="Kul financed" value={emi?.activeFinanced ?? 0} type="positive" />
                <PnLLine label="Ada ho chuka" value={emi?.activePaid ?? 0} type="positive" />
                <PnLLine label="Baqi" value={emi?.activeRemaining ?? 0} type="bold" />
                <div className="pt-2">
                  <PnLLine label="Late (foran wasool karo)" value={emi?.overdueAmount ?? 0} type="highlight"
                    sub={`${emi?.overdueCount ?? 0} qisten`} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat label="Is Mahine Mila" value={formatPKR(emi?.collectedThisMonth ?? 0)} color="emerald" icon={CheckCircle2} />
                <MiniStat label="Qisten Wasool" value={emi?.collectedCountThisMonth ?? 0} color="cyan" icon={Clock} />
              </div>
              <Link to="/khata" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-700 hover:underline">
                Khata me qisten wasool karo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ USED PHONES ══════════════ */}
      {tab === 'used' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Stock Me" value={used?.inStockCount ?? 0} icon={RotateCcw} color="violet"
              sub={formatPKR(used?.inStockCost ?? 0)} />
            <KpiCard label="Bik Chuke" value={used?.soldCount ?? 0} icon={TrendingUp} color="blue"
              sub={`Aakhri ${days} din`} />
            <KpiCard label="Used Ka Munafa" value={formatPKR(used?.soldProfit ?? 0)} icon={Target} color="emerald" isHighlight />
            <KpiCard label="Mumkin Munafa" value={formatPKR(used?.inStockPotentialProfit ?? 0)} icon={Sparkles} color="amber"
              sub="Jo stock me para hai" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Halat Ke Hisab Se" subtitle="Stock me kaunsi condition" icon={Star} color="violet">
              {(used?.byCondition ?? []).length === 0 ? <EmptyChart message="Koi used phone stock me nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={used?.byCondition ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="condition" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Trade-In ka Hisab</h3>
                  <p className="text-xs text-slate-500">{days} din</p>
                </div>
              </div>
              <div className="space-y-1">
                <PnLLine label="Bechne se mila" value={used?.soldRevenue ?? 0} type="positive" />
                <PnLLine label="Khareed + marammat" value={-(used?.soldCogs ?? 0)} type="negative" />
                <PnLLine label="Munafa" value={used?.soldProfit ?? 0} type="bold" />
                <div className="pt-2">
                  <PnLLine label="Stock me mumkin munafa" value={used?.inStockPotentialProfit ?? 0} type="highlight"
                    sub={`${used?.inStockCount ?? 0} phone`} />
                </div>
              </div>
              <Link to="/used-phones" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-700 hover:underline">
                Used phones dekho <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ TOP MODELS / BRANDS ══════════════ */}
      {tab === 'brands' && (
        <>
          <ChartCard title="Top Brands" subtitle={`Aakhri ${days} din — kitne device bike`} icon={Crown} color="blue">
            {brands.length === 0 ? <EmptyChart message="Is arse me koi phone nahi bika" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brands} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="brand" stroke="#64748b" fontSize={11} width={110} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12 }} />
                  <Bar dataKey="unitsSold" fill="#2563eb" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <TopModelsTable rows={profit?.topProducts ?? []} />
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function SourceCard({ meta, row, share, detailed }: any) {
  const Icon = meta.icon;
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-lg shrink-0"
            style={{ background: meta.hex }}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate">{meta.label}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {row?.units ?? 0} units · {row?.sales ?? 0} sales
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold tabular-nums shrink-0"
          style={{ background: `${meta.hex}18`, color: meta.hex }}>
          {(row?.margin ?? 0).toFixed(0)}%
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 font-semibold">Bikri</span>
          <span className="font-bold text-slate-900 tabular-nums">{formatPKR(row?.revenue ?? 0)}</span>
        </div>
        {detailed && (
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Lagat</span>
            <span className="font-bold text-slate-600 tabular-nums">{formatPKR(row?.cost ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 border-t border-slate-200">
          <span className="font-bold text-slate-900">Munafa</span>
          <span className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(row?.profit ?? 0)}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
          <span>Kul munafe ka hissa</span>
          <span className="tabular-nums">{share.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${Math.max(Math.min(share, 100), 0)}%`, background: meta.hex }} />
        </div>
      </div>
    </div>
  );
}

function TopModelsTable({ rows }: { rows: any[] }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 pb-4 flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Top Models</h3>
          <p className="text-xs text-slate-500">Sab se zyada munafa dene wale</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">Is arse me koi model nahi bika</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-6 py-2.5 text-[10px] uppercase font-extrabold text-slate-500">#</th>
                <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500">Model</th>
                <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Units</th>
                <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Bikri</th>
                <th className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Munafa</th>
                <th className="px-6 py-2.5 text-[10px] uppercase font-extrabold text-slate-500 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 15).map((p, i) => (
                <tr key={p.productId} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-2.5">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-extrabold tabular-nums ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>{i + 1}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    {p.brand && <div className="text-[11px] text-slate-500 font-semibold">{p.brand}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums">{p.units}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">{formatPKR(p.revenue)}</td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.profit)}</td>
                  <td className="px-6 py-2.5 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold tabular-nums ${
                      p.margin >= 15 ? 'bg-emerald-100 text-emerald-700'
                      : p.margin >= 5 ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                    }`}>{p.margin.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportsTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    { n: 1, title: 'Overview', body: 'Poori dukan ek nazar me — kitni bikri, kitna munafa, kitna maal stock me. P&L batata hai bikri se lagat aur kharche nikal kar kitna bacha.' },
    { n: 2, title: 'Munafa', body: 'Mobile shop ki kamai chaar raston se aati hai: naye phone, used phone, accessories aur repair. Ye tab batata hai asli paisa kahan se ban raha hai.' },
    { n: 3, title: 'Stock', body: 'Kitna paisa maal me phansa hai, kaunsa maal purana ho raha hai, aur accessories me kitna. 60 din se purana device dead stock hai — foran nikalo.' },
    { n: 4, title: 'IMEI & PTA', body: 'Har phone ka PTA status aur us me phansi hui raqam. Non-PTA zyada ho to khatra hai.' },
    { n: 5, title: 'Repairs / EMI / Used', body: 'Har kaam ka apna hisab — repair ki kamai aur parts cost, EMI ki late qisten, used phone ka margin.' },
    { n: 6, title: 'Upar ke buttons', body: '7/14/30/90 din se arsa badlo. CSV se poora data Excel me, Print se seedha kaghaz par.' },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
                {s.n}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{s.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{s.body}</div>
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
