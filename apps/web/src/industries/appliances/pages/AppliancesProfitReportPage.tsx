import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, RefreshCw, Wallet, Package, Wrench, HardHat, Truck,
  FileDown, ShieldCheck, AlertTriangle, Zap, Percent, Award, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { appliancesAnalyticsApi } from '../api/analytics.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, useShortcuts, printHtml,
  downloadCsv, a4Shell, escapeHtml, toDateInput, fmtDate,
  guideAction, printAction, Kbd,
} from '../components/shared';
import { catLabel, catEmoji, energyMeta, svcTypeMeta } from '../constants';

/* ═════════════════════════════════════════════════════════════
   PROFIT REPORT — appliance dukaan ki paanch kamaiyaan
   ─────────────────────────────────────────────────────────────
   Aam POS sirf "maal ka munafa" dikhata hai. Appliance wale ki
   aadhi kamai installation, repair, AMC aur delivery se aati hai.
   Agar wo nazar na aaye to dukaan-daar ko lagta hai ke kaam
   ghata de raha hai — jabke asal me munafa kahin aur chhupa hai.
   ═════════════════════════════════════════════════════════════ */

const STREAM_COLORS: Record<string, string> = {
  GOODS: '#06b6d4',
  INSTALLATION: '#3b82f6',
  SERVICE: '#f59e0b',
  AMC: '#a855f7',
  DELIVERY: '#10b981',
  POS_SERVICES: '#64748b',
};
const STREAM_ICONS: Record<string, string> = {
  GOODS: '📦', INSTALLATION: '🔧', SERVICE: '🛠️', AMC: '📋', DELIVERY: '🚚', POS_SERVICES: '🧾',
};
const PIE_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#64748b'];
const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

const RANGES = [
  { days: 7, label: '7 din' },
  { days: 30, label: '1 mahina' },
  { days: 90, label: '3 mahine' },
  { days: 365, label: '1 saal' },
];

export default function AppliancesProfitReportPage() {
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');

  const [days, setDays] = useState(30);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);

  const range = useMemo(() => {
    if (custom?.from && custom?.to) return custom;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, [days, custom]);

  const { data: a, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-profit', range],
    queryFn: () => appliancesAnalyticsApi.profit(range),
  });

  const streams = a?.streams ?? [];
  const t = a?.totals;

  const streamPie = useMemo(
    () => streams.filter((s) => s.revenue > 0).map((s) => ({
      name: `${STREAM_ICONS[s.key] ?? ''} ${s.label}`,
      key: s.key,
      value: s.revenue,
      profit: s.profit,
    })),
    [streams],
  );

  const catChart = useMemo(
    () => (a?.byCategory ?? []).slice(0, 10).map((c) => ({
      name: `${catEmoji(c.categoryType)} ${catLabel(c.categoryType)}`,
      revenue: c.revenue,
      profit: c.profit,
      margin: c.margin,
    })),
    [a],
  );

  const exportCsv = () => {
    if (!a) return;
    downloadCsv(`profit-${range.from}-to-${range.to}.csv`, [
      [`Munafa Report — ${shopName}`],
      [`${fmtDate(range.from)} se ${fmtDate(range.to)} tak`],
      [],
      ['— KAMAI KE RASTE —'],
      ['Raasta', 'Kamai', 'Lagat', 'Munafa', 'Ginti'],
      ...streams.map((s) => [s.label, s.revenue, s.cost, s.profit, s.count]),
      ['KUL', t?.revenue ?? 0, t?.cost ?? 0, t?.profit ?? 0, ''],
      [],
      ['— QISM KE HISAB SE (sirf maal) —'],
      ['Qism', 'Units', 'Kamai', 'Lagat', 'Munafa', 'Margin %'],
      ...(a.byCategory ?? []).map((c) => [
        catLabel(c.categoryType), c.units, c.revenue, c.cost, c.profit, c.margin.toFixed(1),
      ]),
      [],
      ['— TOP PRODUCTS —'],
      ['Cheez', 'Qism', 'Units', 'Kamai', 'Munafa', 'Margin %'],
      ...(a.topProducts ?? []).map((p) => [
        p.name, p.category ? catLabel(p.category) : '', p.units, p.revenue, p.profit, p.margin.toFixed(1),
      ]),
      [],
      ['— SERVICE KI QISM —'],
      ['Qism', 'Kaam', 'Kamai', 'Lagat', 'Munafa'],
      ...(a.byServiceType ?? []).map((s) => [svcTypeMeta(s.type).label, s.jobs, s.revenue, s.cost, s.profit]),
      [],
      ['— ROZANA —'],
      ['Tareekh', 'Kamai', 'Munafa', 'Service ki kamai'],
      ...(a.daily ?? []).map((d) => [d.date, d.revenue, d.profit, d.services]),
    ]);
    toast.success('Munafa report export ho gayi');
  };

  const printA4 = () => {
    if (!a) return;
    const body = `
      <h2 class="sec">💰 Kamai Ke Paanch Raste</h2>
      <table>
        <thead><tr><th>Raasta</th><th class="c">Ginti</th><th class="r">Kamai</th><th class="r">Lagat</th><th class="r">Munafa</th><th class="r">Hissa</th></tr></thead>
        <tbody>
          ${streams.map((s) => `
            <tr>
              <td class="main">${STREAM_ICONS[s.key] ?? ''} ${escapeHtml(s.label)}</td>
              <td class="c">${s.count || '—'}</td>
              <td class="r">${formatPKR(s.revenue)}</td>
              <td class="r">${formatPKR(s.cost)}</td>
              <td class="r" style="color:${s.profit >= 0 ? '#065f46' : '#b91c1c'}">${formatPKR(s.profit)}</td>
              <td class="r">${t?.revenue ? ((s.revenue / t.revenue) * 100).toFixed(1) : '0'}%</td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="2" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(t?.revenue ?? 0)}</td>
            <td class="r" style="color:#fca5a5 !important;">${formatPKR(t?.cost ?? 0)}</td>
            <td class="r" style="color:#86efac !important;">${formatPKR(t?.profit ?? 0)}</td>
            <td class="r">${(t?.margin ?? 0).toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>

      <h2 class="sec">📦 Qism Ke Hisab Se (sirf maal)</h2>
      <table>
        <thead><tr><th>#</th><th>Qism</th><th class="c">Units</th><th class="r">Kamai</th><th class="r">Munafa</th><th class="r">Margin</th></tr></thead>
        <tbody>
          ${(a.byCategory ?? []).slice(0, 15).map((c, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td class="main">${catEmoji(c.categoryType)} ${escapeHtml(catLabel(c.categoryType))}</td>
              <td class="c">${c.units}</td>
              <td class="r">${formatPKR(c.revenue)}</td>
              <td class="r" style="color:${c.profit >= 0 ? '#065f46' : '#b91c1c'}">${formatPKR(c.profit)}</td>
              <td class="r">${c.margin.toFixed(1)}%</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <h2 class="sec">🏆 Top 15 Products</h2>
      <table>
        <thead><tr><th>#</th><th>Cheez</th><th class="c">Units</th><th class="r">Kamai</th><th class="r">Munafa</th><th class="r">Margin</th></tr></thead>
        <tbody>
          ${(a.topProducts ?? []).slice(0, 15).map((p, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(p.name)}</div>${p.category ? `<div class="sub">${escapeHtml(catLabel(p.category))}</div>` : ''}</td>
              <td class="c">${p.units}</td>
              <td class="r">${formatPKR(p.revenue)}</td>
              <td class="r" style="color:${p.profit >= 0 ? '#065f46' : '#b91c1c'}">${formatPKR(p.profit)}</td>
              <td class="r">${p.margin.toFixed(1)}%</td>
            </tr>`).join('')}
        </tbody>
      </table>

      ${(a.byServiceType ?? []).length ? `
      <h2 class="sec">🔧 Service Ki Qism</h2>
      <table>
        <thead><tr><th>Qism</th><th class="c">Kaam</th><th class="r">Kamai</th><th class="r">Lagat</th><th class="r">Munafa</th></tr></thead>
        <tbody>
          ${a.byServiceType.map((s) => `
            <tr>
              <td class="main">${svcTypeMeta(s.type).emoji} ${escapeHtml(svcTypeMeta(s.type).label)}</td>
              <td class="c">${s.jobs}</td>
              <td class="r">${formatPKR(s.revenue)}</td>
              <td class="r">${formatPKR(s.cost)}</td>
              <td class="r" style="color:#065f46">${formatPKR(s.profit)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}`;

    const ok = printHtml(a4Shell({
      title: `Munafa Report — ${shopName}`,
      heading: '💰 Munafa Report',
      shopName, shopPhone,
      badge: `${fmtDate(range.from)} — ${fmtDate(range.to)}`,
      kpis: [
        { label: '💵 Kul Kamai', value: formatPKR(t?.revenue ?? 0), tone: 'blue' },
        { label: '📈 Kul Munafa', value: formatPKR(t?.profit ?? 0), sub: `${(t?.margin ?? 0).toFixed(1)}% margin`, tone: 'green' },
        { label: '🔧 Services Se', value: formatPKR(streams.filter((s) => s.key !== 'GOODS').reduce((x, s) => x + s.revenue, 0)), sub: 'maal ke ilawa', tone: 'amber' },
        { label: '⏳ Baqi Paisa', value: formatPKR(a.services.unpaid), sub: 'repair ka udhaar', tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    t: () => setShowTeacher(true),
    p: () => printA4(),
    Escape: () => { if (showTeacher) setShowTeacher(false); },
  }, [showTeacher, a]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const servicesRevenue = streams.filter((s) => s.key !== 'GOODS').reduce((x, s) => x + s.revenue, 0);
  const servicesShare = t?.revenue ? (servicesRevenue / t.revenue) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ProfitTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Munafa Report"
        badgeIcon={<TrendingUp className="h-3.5 w-3.5 text-amber-300" />}
        title="💰 Kamai aur Munafa"
        subtitle={
          t ? (
            <>
              <strong className="text-cyan-200">{formatPKR(t.revenue)}</strong> kamai
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{formatPKR(t.profit)}</strong> munafa
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{t.margin.toFixed(1)}%</strong> margin
            </>
          ) : 'Maal, installation, repair, AMC aur delivery — sab mila kar'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, hideLabelOnMobile: true },
          printAction(printA4),
        ]}
        shortcuts={[{ keys: 'P', label: 'Print' }, { keys: 'T', label: 'Guide' }]}
      />

      {/* Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Arsa</span>
        {RANGES.map((r) => (
          <button key={r.days} onClick={() => { setDays(r.days); setCustom(null); }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
              !custom && days === r.days ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>{r.label}</button>
        ))}
        <div className="flex items-center gap-1.5 ml-1">
          <input type="date" value={custom?.from ?? ''} onChange={(e) => setCustom({ from: e.target.value, to: custom?.to ?? toDateInput(new Date()) })}
            className="h-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-bold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
          <span className="text-[11px] font-bold text-slate-400">se</span>
          <input type="date" value={custom?.to ?? ''} onChange={(e) => setCustom({ from: custom?.from ?? toDateInput(new Date()), to: e.target.value })}
            className="h-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-bold text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wallet} tone="cyan" label="Kul Kamai" value={formatPKR(t?.revenue ?? 0)} sub={`${t?.salesCount ?? 0} bikri`} />
        <Kpi icon={TrendingUp} tone="emerald" label="Kul Munafa" value={formatPKR(t?.profit ?? 0)} sub={`lagat ${formatPKR(t?.cost ?? 0)}`} />
        <Kpi icon={Percent} tone="amber" label="Margin" value={`${(t?.margin ?? 0).toFixed(1)}%`} sub="har 100 rupay me munafa" />
        <Kpi icon={Wrench} tone="violet" label="Services Se" value={formatPKR(servicesRevenue)}
          sub={`kul kamai ka ${servicesShare.toFixed(0)}%`} />
      </section>

      {/* Streams */}
      <Panel icon={Zap} title="Kamai Ke Paanch Raste" hint="Sirf maal bechna aadha karobaar hai — asal munafa yahan nazar aata hai" tone="cyan">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {streams.map((s) => {
            const share = t?.revenue ? (s.revenue / t.revenue) * 100 : 0;
            return (
              <div key={s.key} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                    {STREAM_ICONS[s.key]} {s.label}
                  </span>
                  <span className="text-[10px] font-extrabold tabular-nums shrink-0" style={{ color: STREAM_COLORS[s.key] }}>
                    {share.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(s.revenue)}</div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">munafa {formatPKR(s.profit)}</span>
                  {s.count > 0 && <span className="text-slate-400">{s.count} bar</span>}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(share, 100)}%`, background: STREAM_COLORS[s.key] }} />
                </div>
              </div>
            );
          })}
        </div>

        {streamPie.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={streamPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={90} paddingAngle={2}>
                  {streamPie.map((d) => <Cell key={d.key} fill={STREAM_COLORS[d.key] ?? '#94a3b8'} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={streams} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94a3b8" interval={0} angle={-18} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="revenue" name="Kamai" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="Munafa" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Daily trend */}
      <Panel icon={BarChart3} title="Rozana Kamai" hint="Neeli line kul kamai, hara area services ki kamai" tone="blue">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={a?.daily ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
              tickFormatter={(d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} />
            <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
            <Tooltip contentStyle={TOOLTIP}
              labelFormatter={(d) => new Date(d as string).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
              formatter={(v: any) => formatPKR(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            <Area type="monotone" dataKey="services" name="Services" fill="#10b98133" stroke="#10b981" strokeWidth={2} />
            <Bar dataKey="revenue" name="Kul kamai" fill="#06b6d4" radius={[5, 5, 0, 0]} />
            <Line type="monotone" dataKey="profit" name="Munafa" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* Service detail */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Wrench} title="Repair / Service Ka Hisab" tone="amber">
          <div className="grid grid-cols-2 gap-2">
            <Box label="Kaam" value={String(a?.services?.jobs ?? 0)} />
            <Box label="Ausat Bill" value={formatPKR(a?.services?.avgTicket ?? 0)} />
            <Box label="Kamai" value={formatPKR(a?.services?.revenue ?? 0)} tone="emerald" />
            <Box label="Parts Ka Kharcha" value={formatPKR(a?.services?.partsCost ?? 0)} tone="rose" />
            <Box label="Warranty Wale" value={String(a?.services?.warrantyJobs ?? 0)} />
            <Box label="AMC Wale" value={String(a?.services?.amcJobs ?? 0)} />
          </div>
          {(a?.services?.unpaid ?? 0) > 0 && (
            <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px] font-bold text-rose-800 dark:text-rose-200">
                <strong className="text-sm">{formatPKR(a?.services?.unpaid ?? 0)}</strong> ka repair ka paisa abhi baqi hai —
                <Link to="/appliances/service-requests" className="underline ml-1 font-extrabold">wusool karein</Link>
              </div>
            </div>
          )}
        </Panel>

        <Panel icon={HardHat} title="Installation Ka Hisab" tone="blue">
          <div className="grid grid-cols-2 gap-2">
            <Box label="Kaam" value={String(a?.installations?.jobs ?? 0)} />
            <Box label="Ausat Bill" value={formatPKR(a?.installations?.avgTicket ?? 0)} />
            <Box label="Kamai" value={formatPKR(a?.installations?.revenue ?? 0)} tone="emerald" />
            <Box label="Material Ka Kharcha" value={formatPKR(a?.installations?.materialCost ?? 0)} tone="rose" />
            <Box label="Munafa" value={formatPKR(a?.installations?.profit ?? 0)} tone="cyan" />
            <Box label="Free Kiye" value={String(a?.installations?.freeJobs ?? 0)} />
          </div>
        </Panel>
      </div>

      {/* AMC + Delivery */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={ShieldCheck} title="AMC Contracts" hint="Pakka paisa — har saal repeat hota hai" tone="violet">
          <div className="grid grid-cols-2 gap-2">
            <Box label="Naye Contracts" value={String(a?.amc?.contracts ?? 0)} />
            <Box label="Bill Kiya" value={formatPKR(a?.amc?.billed ?? 0)} />
            <Box label="Wusool Hua" value={formatPKR(a?.amc?.collected ?? 0)} tone="emerald" />
            <Box label="Baqi" value={formatPKR(a?.amc?.pending ?? 0)} tone={(a?.amc?.pending ?? 0) > 0 ? 'rose' : 'emerald'} />
          </div>
          {(a?.amc?.byType ?? []).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {(a?.amc?.byType ?? []).map((tp) => (
                <div key={tp.type} className="flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 px-2.5 py-2">
                  <span className="text-[11px] font-extrabold text-violet-800 dark:text-violet-200 flex-1">{tp.type}</span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tp.count} contracts</span>
                  <span className="text-xs font-extrabold tabular-nums text-violet-700 dark:text-violet-300">{formatPKR(tp.value)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={Truck} title="Delivery" hint="Bhari saman ka kiraya bhi kamai hai" tone="emerald">
          <div className="grid grid-cols-2 gap-2">
            <Box label="Trips" value={String(a?.delivery?.trips ?? 0)} />
            <Box label="Ausat Trip" value={formatPKR(a?.delivery?.avgTrip ?? 0)} />
            <Box label="Kul Kamai" value={formatPKR(a?.delivery?.revenue ?? 0)} tone="emerald" />
            <Box label="Kul Kamai Ka" value={`${t?.revenue ? (((a?.delivery?.revenue ?? 0) / t.revenue) * 100).toFixed(1) : '0'}%`} />
          </div>
        </Panel>
      </div>

      {/* Category + energy */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Package} title="Kis Qism Se Kitna Munafa" hint="Sirf maal ka munafa — services alag" tone="cyan">
          {catChart.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Is arse me koi bikri nahi</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, catChart.length * 34)}>
              <BarChart data={catChart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="revenue" name="Kamai" fill="#06b6d4" radius={[0, 5, 5, 0]} />
                <Bar dataKey="profit" name="Munafa" fill="#10b981" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel icon={Award} title="Top 10 Products" hint="Jo sab se ziyada munafa de rahe hain" tone="amber">
          {(a?.topProducts ?? []).length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Is arse me koi bikri nahi</p>
          ) : (
            <div className="space-y-1">
              {(a?.topProducts ?? []).slice(0, 10).map((p, i) => (
                <Link key={p.id} to={`/appliance-products/${p.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
                  <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
                      {p.category ? catEmoji(p.category) : '📦'} {p.name}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {p.units} units • {p.margin.toFixed(0)}% margin
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{formatPKR(p.profit)}</div>
                    <div className="text-[10px] font-bold text-slate-400 tabular-nums">{formatPKR(p.revenue)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Energy rating + brands */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Zap} title="Energy Rating Ke Hisab Se" hint="Inverter/5-star ka margin aksar behtar hota hai" tone="teal">
          {(a?.byEnergyRating ?? []).length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi data nahi</p>
          ) : (
            <div className="space-y-1.5">
              {(a?.byEnergyRating ?? []).map((e) => {
                const em = energyMeta(e.energyRating);
                return (
                  <div key={e.energyRating} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 flex-1 truncate">
                      {em.emoji} {em.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{e.units} units</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      e.margin >= 20 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>{e.margin.toFixed(0)}%</span>
                    <span className="text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100 w-20 text-right">{formatPKR(e.profit)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel icon={Award} title="Top Brands" hint="Kaunsa brand sab se ziyada munafa de raha hai" tone="violet">
          {(a?.topBrands ?? []).length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi data nahi</p>
          ) : (
            <div className="space-y-1.5">
              {(a?.topBrands ?? []).map((b, i) => (
                <div key={b.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{b.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">{b.units} units • {b.margin.toFixed(0)}% margin</div>
                  </div>
                  <div className="text-xs font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">{formatPKR(b.profit)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Box({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

function ProfitTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Munafa Report Kaise Parhein?"
      intro={
        <>
          Aam POS sirf <strong>"maal ka munafa"</strong> dikhata hai. Lekin appliance wale ki
          <strong> aadhi kamai</strong> installation, repair, AMC aur delivery se aati hai. Agar wo nazar na aaye
          to lagta hai kaam ghata de raha hai — jabke munafa kahin aur chhupa hota hai.
        </>
      }
      blocks={[
        {
          title: '💰 Paanch raste — sab se aham cheez',
          tone: 'cyan',
          tips: [
            <><strong>📦 Maal ki bikri</strong> — fridge, AC, washing machine ka munafa</>,
            <><strong>🔧 Installation</strong> — labor khaalis kamai hai, material lagat. Aksar 15–20% munafa yahin se aata hai</>,
            <><strong>🛠️ Repair</strong> — visit aur labor khaalis kamai, parts lagat</>,
            <><strong>📋 AMC</strong> — <strong>sab se pakka paisa</strong>. Ek bar bech dein, saal bhar kaam aata hai aur agle saal renew hota hai</>,
            <><strong>🚚 Delivery</strong> — bhari saman ka kiraya, loading/unloading aur floor charge</>,
            <>Agar <strong>"Services se"</strong> wala hissa 25% se kam hai to services par tawajjo dein — wahan margin sab se ziyada hai</>,
          ],
        },
        {
          title: '📊 Charts se kya samjhein',
          tone: 'blue',
          tips: [
            <><strong>Donut</strong> — kul kamai me har raste ka hissa. Agar sirf maal ka hissa 90% hai to services zaya ho rahi hain</>,
            <><strong>Rozana chart</strong> — hara area services ki kamai hai. Jin dinon wo upar jata hai, unhein dekh kar staff lagayein</>,
            <><strong>Qism ke hisab se</strong> — kaunsi cheez ka margin acha hai. Kabhi sasti cheez ka margin mehngi se behtar hota hai</>,
            <><strong>Energy rating</strong> — inverter aur 5-star ka margin aam tor par behtar hota hai. Customer ko wohi dikhayein</>,
          ],
        },
        {
          title: '⚠️ Jin numbers par foran kaam karein',
          tone: 'rose',
          tips: [
            <><strong>"Repair ka baqi paisa"</strong> — ye aap ka paisa hai jo logon ke paas para hai. Service Requests page se wusool karein</>,
            <><strong>"AMC baqi"</strong> — contract bik gaya lekin poora paisa nahi aaya</>,
            <><strong>Free kiye installation</strong> — agar bohat ziyada hain to warranty policy dobara dekhein, material ka kharcha aap ka hai</>,
            <><strong>Margin 15% se neeche</strong> jaye to purchase rate ya bechne ka rate dobara dekhein</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'P', label: 'A4 report print' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Maal bechne par 8–12% milta hai, lekin <strong>service par 40–60%</strong>.
          Jo dukaan sirf maal bechti hai wo mushkil se chalti hai — jo service bhi karti hai wo barhti hai.
        </>
      }
      onClose={onClose}
    />
  );
}
