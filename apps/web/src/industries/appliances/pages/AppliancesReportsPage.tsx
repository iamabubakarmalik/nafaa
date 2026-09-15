import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, Boxes, PackageX, Wrench, HardHat, Truck,
  ShieldCheck, Users, RefreshCw, ChevronRight, Wallet, AlertTriangle,
  Clock, Star, Percent, ShoppingCart, Receipt, FileDown,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { appliancesAnalyticsApi } from '../api/analytics.api';
import { serviceRequestsApi } from '../api/service-requests.api';
import { installationsApi } from '../api/installations.api';
import { amcContractsApi } from '../api/amc-contracts.api';
import { deliveriesApi } from '../api/deliveries.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, useShortcuts, printHtml,
  downloadCsv, a4Shell, escapeHtml, toDateInput, fmtDate, fmtDuration,
  guideAction, printAction, Kbd,
} from '../components/shared';

/* ═════════════════════════════════════════════════════════════
   REPORTS — appliance dukaan ka ek safhe ka jaiza
   ─────────────────────────────────────────────────────────────
   Yahan se har report tak jaya ja sakta hai, aur sab se upar wo
   chaar-paanch number hain jo dukaan-daar roz dekhna chahta hai.
   ═════════════════════════════════════════════════════════════ */

const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

export default function AppliancesReportsPage() {
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const [days, setDays] = useState(30);
  const [showTeacher, setShowTeacher] = useState(false);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, [days]);

  const profitQ = useQuery({ queryKey: ['appliance-profit', range], queryFn: () => appliancesAnalyticsApi.profit(range) });
  const serviceQ = useQuery({ queryKey: ['appliance-service-analytics', range], queryFn: () => appliancesAnalyticsApi.serviceDesk(range) });
  const stockQ = useQuery({ queryKey: ['appliance-stock-report'], queryFn: appliancesAnalyticsApi.stock });
  const lowQ = useQuery({ queryKey: ['appliance-low-stock'], queryFn: appliancesAnalyticsApi.lowStock });
  const svcSumQ = useQuery({ queryKey: ['appliance-service-summary'], queryFn: serviceRequestsApi.summary });
  const instSumQ = useQuery({ queryKey: ['appliance-install-summary'], queryFn: installationsApi.summary });
  const amcSumQ = useQuery({ queryKey: ['appliance-amc-summary'], queryFn: amcContractsApi.summary });
  const delSumQ = useQuery({ queryKey: ['appliance-delivery-summary'], queryFn: deliveriesApi.summary });
  const serialSumQ = useQuery({ queryKey: ['appliance-serial-summary'], queryFn: applianceSerialApi.summary });
  const claimSumQ = useQuery({ queryKey: ['appliance-claim-summary'], queryFn: warrantyClaimsApi.summary });

  const p = profitQ.data;
  const sv = serviceQ.data;
  const st = stockQ.data;
  const low = lowQ.data;

  const anyFetching = profitQ.isFetching || serviceQ.isFetching || stockQ.isFetching || lowQ.isFetching;
  const refreshAll = () => {
    profitQ.refetch(); serviceQ.refetch(); stockQ.refetch(); lowQ.refetch(); claimSumQ.refetch();
    svcSumQ.refetch(); instSumQ.refetch(); amcSumQ.refetch(); delSumQ.refetch(); serialSumQ.refetch();
  };

  /* Jin cheezon par foran tawajjo chahiye */
  const alerts = useMemo(() => {
    const out: { icon: any; tone: string; label: string; value: string; to: string }[] = [];
    if ((svcSumQ.data?.overdue ?? 0) > 0) out.push({ icon: Clock, tone: 'rose', label: 'Repair late ho gaye', value: `${svcSumQ.data!.overdue} kaam`, to: '/appliances/service-requests' });
    if ((instSumQ.data?.overdue ?? 0) > 0) out.push({ icon: HardHat, tone: 'rose', label: 'Installation late', value: `${instSumQ.data!.overdue} kaam`, to: '/appliances/installations' });
    if ((svcSumQ.data?.unassigned ?? 0) > 0) out.push({ icon: Users, tone: 'amber', label: 'Bina banday ke repair', value: `${svcSumQ.data!.unassigned} kaam`, to: '/appliances/service-requests' });
    const due = (svcSumQ.data?.month?.outstanding ?? 0) + (instSumQ.data?.month?.outstanding ?? 0);
    if (due > 0) out.push({ icon: Wallet, tone: 'amber', label: 'Service ka baqi paisa', value: formatPKR(due), to: '/appliances/service-requests' });
    if ((low?.summary?.totalOut ?? 0) > 0) out.push({ icon: PackageX, tone: 'rose', label: 'Stock bilkul khatam', value: `${low!.summary.totalOut} cheezein`, to: '/appliances/low-stock' });
    if ((st?.expiringWarranty?.count ?? 0) > 0) out.push({ icon: ShieldCheck, tone: 'violet', label: 'Warranty khatam ho rahi', value: `${st!.expiringWarranty.count} units`, to: '/appliances/stock-report' });
    if ((amcSumQ.data?.expiringSoon ?? 0) > 0) out.push({ icon: ShieldCheck, tone: 'violet', label: 'AMC khatam ho rahe', value: `${amcSumQ.data!.expiringSoon} contracts`, to: '/appliances/amc-contracts' });
    if ((st?.pendingInstall?.count ?? 0) > 0) out.push({ icon: HardHat, tone: 'amber', label: 'Bik gaya, laga nahi', value: `${st!.pendingInstall.count} units`, to: '/appliances/installations' });
    if ((st?.deadStock?.count ?? 0) > 0) out.push({ icon: Boxes, tone: 'slate', label: 'Dead stock (60+ din)', value: formatPKR(st!.deadStock.value), to: '/appliances/stock-report' });
    if ((delSumQ.data?.noVehicle ?? 0) > 0) out.push({ icon: Truck, tone: 'amber', label: 'Delivery — gaari nahi lagi', value: `${delSumQ.data!.noVehicle} trips`, to: '/appliances/deliveries' });
    if ((claimSumQ.data?.missing?.count ?? 0) > 0) {
      out.push({ icon: ShieldCheck, tone: 'rose', label: 'Warranty claim banaya hi nahi',
        value: formatPKR(claimSumQ.data!.missing.recoverable), to: '/appliances/warranty-claims' });
    }
    if ((claimSumQ.data?.money?.pending ?? 0) > 0) {
      out.push({ icon: Wallet, tone: 'violet', label: 'Brand ke paas atka paisa',
        value: formatPKR(claimSumQ.data!.money.pending), to: '/appliances/warranty-claims' });
    }
    return out;
  }, [svcSumQ.data, instSumQ.data, amcSumQ.data, delSumQ.data, claimSumQ.data, low, st]);

  const exportAll = () => {
    if (!p) return toast.error('Data abhi load nahi hua');
    downloadCsv(`appliances-report-${range.from}-to-${range.to}.csv`, [
      [`Appliances Report — ${shopName}`],
      [`${fmtDate(range.from)} se ${fmtDate(range.to)} tak`],
      [],
      ['— KAMAI —'],
      ['Raasta', 'Kamai', 'Lagat', 'Munafa', 'Ginti'],
      ...p.streams.map((s) => [s.label, s.revenue, s.cost, s.profit, s.count]),
      ['KUL', p.totals.revenue, p.totals.cost, p.totals.profit, ''],
      [],
      ['— SERVICE DESK —'],
      ['Metric', 'Value'],
      ['Repair kaam', sv?.totals?.serviceJobs ?? 0],
      ['Installation kaam', sv?.totals?.installJobs ?? 0],
      ['Mukammal', sv?.totals?.completed ?? 0],
      ['Khula', sv?.totals?.open ?? 0],
      ['Late', sv?.totals?.overdue ?? 0],
      ['Baqi paisa', sv?.totals?.outstanding ?? 0],
      ['Ausat waqt (ghantay)', (sv?.quality?.avgResolutionHours ?? 0).toFixed(1)],
      ['Usi din theek %', (sv?.quality?.sameDayRate ?? 0).toFixed(1)],
      ['Rating', sv?.quality?.avgRating?.toFixed(1) ?? '—'],
      [],
      ['— STOCK —'],
      ['Metric', 'Value'],
      ['Stock ki lagat', st?.totals?.totalValue ?? 0],
      ['Bechne par', st?.totals?.totalRetailValue ?? 0],
      ['Mumkina munafa', st?.totals?.potentialProfit ?? 0],
      ['Dead stock', st?.deadStock?.value ?? 0],
      ['Low stock cheezein', low?.summary?.totalLow ?? 0],
      ['Order ka kharcha', low?.summary?.reorderCost ?? 0],
      [],
      ['— TECHNICIANS —'],
      ['Naam', 'Kaam', 'Mukammal', 'Khula', 'Kamai', 'Commission', 'Rating'],
      ...(sv?.technicians ?? []).map((t) => [
        t.name, t.totalJobs, t.completed, t.open, t.revenue, t.commission, t.avgRating?.toFixed(1) ?? '',
      ]),
    ]);
    toast.success('Poori report export ho gayi');
  };

  const printA4 = () => {
    if (!p) return toast.error('Data abhi load nahi hua');
    const body = `
      <h2 class="sec">💰 Kamai Ke Raste</h2>
      <table>
        <thead><tr><th>Raasta</th><th class="c">Ginti</th><th class="r">Kamai</th><th class="r">Munafa</th><th class="r">Hissa</th></tr></thead>
        <tbody>
          ${p.streams.map((s) => `
            <tr>
              <td class="main">${escapeHtml(s.label)}</td>
              <td class="c">${s.count || '—'}</td>
              <td class="r">${formatPKR(s.revenue)}</td>
              <td class="r" style="color:${s.profit >= 0 ? '#065f46' : '#b91c1c'}">${formatPKR(s.profit)}</td>
              <td class="r">${p.totals.revenue ? ((s.revenue / p.totals.revenue) * 100).toFixed(1) : '0'}%</td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="2" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(p.totals.revenue)}</td>
            <td class="r" style="color:#86efac !important;">${formatPKR(p.totals.profit)}</td>
            <td class="r">${p.totals.margin.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>

      <h2 class="sec">🔧 Service Desk</h2>
      <table>
        <thead><tr><th>Cheez</th><th class="r">Number</th><th>Cheez</th><th class="r">Number</th></tr></thead>
        <tbody>
          <tr><td class="main">Repair kaam</td><td class="r">${sv?.totals?.serviceJobs ?? 0}</td><td class="main">Installation kaam</td><td class="r">${sv?.totals?.installJobs ?? 0}</td></tr>
          <tr><td class="main">Mukammal</td><td class="r">${sv?.totals?.completed ?? 0}</td><td class="main">Khula</td><td class="r">${sv?.totals?.open ?? 0}</td></tr>
          <tr><td class="main">Late</td><td class="r" style="color:#b91c1c">${sv?.totals?.overdue ?? 0}</td><td class="main">Baqi paisa</td><td class="r" style="color:#b91c1c">${formatPKR(sv?.totals?.outstanding ?? 0)}</td></tr>
          <tr><td class="main">Ausat waqt</td><td class="r">${fmtDuration(sv?.quality?.avgResolutionHours ?? 0)}</td><td class="main">Usi din theek</td><td class="r">${(sv?.quality?.sameDayRate ?? 0).toFixed(0)}%</td></tr>
          <tr><td class="main">Rating</td><td class="r">${sv?.quality?.avgRating?.toFixed(1) ?? '—'}</td><td class="main">Pehli visit me hal</td><td class="r">${(sv?.quality?.firstVisitFixRate ?? 0).toFixed(0)}%</td></tr>
        </tbody>
      </table>

      <h2 class="sec">📦 Stock</h2>
      <table>
        <thead><tr><th>Cheez</th><th class="r">Value</th><th>Cheez</th><th class="r">Value</th></tr></thead>
        <tbody>
          <tr><td class="main">Stock ki lagat</td><td class="r">${formatPKR(st?.totals?.totalValue ?? 0)}</td><td class="main">Bechne par</td><td class="r">${formatPKR(st?.totals?.totalRetailValue ?? 0)}</td></tr>
          <tr><td class="main">Mumkina munafa</td><td class="r" style="color:#065f46">${formatPKR(st?.totals?.potentialProfit ?? 0)}</td><td class="main">Dead stock</td><td class="r" style="color:#b91c1c">${formatPKR(st?.deadStock?.value ?? 0)}</td></tr>
          <tr><td class="main">Low stock cheezein</td><td class="r">${low?.summary?.totalLow ?? 0}</td><td class="main">Order ka kharcha</td><td class="r">${formatPKR(low?.summary?.reorderCost ?? 0)}</td></tr>
        </tbody>
      </table>

      ${(sv?.technicians ?? []).length ? `
      <h2 class="sec">👷 Technicians</h2>
      <table>
        <thead><tr><th>#</th><th>Naam</th><th class="c">Kaam</th><th class="c">Mukammal</th><th class="c">Rating</th><th class="r">Kamai</th><th class="r">Commission</th></tr></thead>
        <tbody>
          ${sv!.technicians.map((t, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td class="main">${escapeHtml(t.name)}</td>
              <td class="c">${t.totalJobs}</td>
              <td class="c">${t.completed}</td>
              <td class="c">${t.avgRating ? t.avgRating.toFixed(1) : '—'}</td>
              <td class="r">${formatPKR(t.revenue)}</td>
              <td class="r">${formatPKR(t.commission)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}`;

    const ok = printHtml(a4Shell({
      title: `Appliances Report — ${shopName}`,
      heading: '📊 Poori Report',
      shopName, shopPhone,
      badge: `${fmtDate(range.from)} — ${fmtDate(range.to)}`,
      kpis: [
        { label: '💵 Kamai', value: formatPKR(p.totals.revenue), tone: 'blue' },
        { label: '📈 Munafa', value: formatPKR(p.totals.profit), sub: `${p.totals.margin.toFixed(1)}%`, tone: 'green' },
        { label: '📦 Stock Value', value: formatPKR(st?.totals?.totalValue ?? 0), tone: 'amber' },
        { label: '⏳ Baqi Paisa', value: formatPKR(sv?.totals?.outstanding ?? 0), tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    t: () => setShowTeacher(true),
    p: () => printA4(),
    r: () => refreshAll(),
    Escape: () => { if (showTeacher) setShowTeacher(false); },
  }, [showTeacher, p, sv, st, low]);

  const REPORTS = [
    { to: '/appliances/profit-report', icon: TrendingUp, emoji: '💰', title: 'Munafa Report', hint: 'Paanch kamai ke raste, qism aur brand ka margin', tone: 'from-emerald-500 to-teal-600' },
    { to: '/appliances/stock-report', icon: Boxes, emoji: '📦', title: 'Stock Report', hint: 'Paisa kahan phansa, dead stock, warranty', tone: 'from-cyan-500 to-blue-600' },
    { to: '/appliances/low-stock', icon: PackageX, emoji: '📉', title: 'Kya Khatam Ho Raha', hint: 'Order list, WhatsApp aur purchase order', tone: 'from-amber-500 to-orange-600' },
    { to: '/appliances/service-requests', icon: Wrench, emoji: '🔧', title: 'Service Desk', hint: 'Repair record + technician performance', tone: 'from-orange-500 to-red-600' },
    { to: '/appliances/installations', icon: HardHat, emoji: '🏠', title: 'Installations', hint: 'Lagane ka kaam, certificate, demo', tone: 'from-blue-500 to-indigo-600' },
    { to: '/appliances/technicians', icon: Users, emoji: '👷', title: 'Technicians', hint: 'Bojh, commission aur rating', tone: 'from-violet-500 to-purple-600' },
    { to: '/appliances/amc-contracts', icon: ShieldCheck, emoji: '📋', title: 'AMC Contracts', hint: 'Chal rahe, khatam hote, renewal', tone: 'from-purple-500 to-fuchsia-600' },
    { to: '/appliances/deliveries', icon: Truck, emoji: '🚚', title: 'Deliveries', hint: 'Gaari, kiraya aur floor charge', tone: 'from-teal-500 to-emerald-600' },
    { to: '/appliances/warranty-claims', icon: ShieldCheck, emoji: '🛡️', title: 'Warranty Claims', hint: 'Brand se paisa wapas — kitna atka hua hai', tone: 'from-rose-500 to-pink-600' },
    { to: '/appliances/serials', icon: Receipt, emoji: '🔖', title: 'Serial Register', hint: 'Har unit ka safar aur warranty', tone: 'from-slate-500 to-slate-700' },
  ];

  const loading = profitQ.isLoading || serviceQ.isLoading;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ReportsTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Reports"
        badgeIcon={<BarChart3 className="h-3.5 w-3.5 text-amber-300" />}
        title="📊 Poori Report"
        subtitle={
          p ? (
            <>
              <strong className="text-cyan-200">{formatPKR(p.totals.revenue)}</strong> kamai
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{formatPKR(p.totals.profit)}</strong> munafa
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{sv?.totals?.completed ?? 0}</strong> kaam mukammal
            </>
          ) : 'Dukaan ka poora hisab ek jagah'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: refreshAll, spinning: anyFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportAll, hideLabelOnMobile: true },
          printAction(printA4),
        ]}
        shortcuts={[{ keys: 'R', label: 'Refresh' }, { keys: 'P', label: 'Print' }, { keys: 'T', label: 'Guide' }]}
      />

      {/* Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Arsa</span>
        {[7, 30, 90, 365].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
              days === d ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>
            {d === 7 ? '7 din' : d === 30 ? '1 mahina' : d === 90 ? '3 mahine' : '1 saal'}
          </button>
        ))}
      </div>

      {/* Top KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Kpi icon={Wallet} tone="cyan" label="Kul Kamai" value={formatPKR(p?.totals?.revenue ?? 0)} sub={`${p?.totals?.salesCount ?? 0} bikri`} />
            <Kpi icon={TrendingUp} tone="emerald" label="Kul Munafa" value={formatPKR(p?.totals?.profit ?? 0)} sub={`${(p?.totals?.margin ?? 0).toFixed(1)}% margin`} />
            <Kpi icon={Boxes} tone="blue" label="Stock Ki Lagat" value={formatPKR(st?.totals?.totalValue ?? 0)} sub={`munafa ${formatPKR(st?.totals?.potentialProfit ?? 0)}`} />
            <Kpi icon={AlertTriangle} tone="rose" label="Baqi Paisa" value={formatPKR(sv?.totals?.outstanding ?? 0)}
              sub="service ka udhaar" alert={(sv?.totals?.outstanding ?? 0) > 0} />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Kpi icon={Wrench} tone="amber" label="Kaam Mukammal" value={sv?.totals?.completed ?? 0} sub={`${sv?.totals?.open ?? 0} khula`} />
            <Kpi icon={Clock} tone="violet" label="Ausat Waqt" value={fmtDuration(sv?.quality?.avgResolutionHours ?? 0)} sub={`${(sv?.quality?.sameDayRate ?? 0).toFixed(0)}% usi din`} />
            <Kpi icon={Star} tone="teal" label="Rating" value={sv?.quality?.avgRating ? sv.quality.avgRating.toFixed(1) : '—'} sub={`${sv?.quality?.ratingCount ?? 0} logon ne di`} />
            <Kpi icon={Percent} tone="orange" label="Services Ka Hissa"
              value={`${p?.totals?.revenue ? ((p.streams.filter((s) => s.key !== 'GOODS').reduce((x, s) => x + s.revenue, 0) / p.totals.revenue) * 100).toFixed(0) : 0}%`}
              sub="kul kamai me" />
          </section>
        </>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Panel icon={AlertTriangle} title="Foran Tawajjo Chahiye" hint="Ye cheezein aap ka paisa aur naam dono kha rahi hain" tone="rose">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alerts.map((al, i) => {
              const tones: Record<string, string> = {
                rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
                amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
                violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300',
                slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
              };
              return (
                <Link key={i} to={al.to}
                  className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 hover:shadow-md transition group ${tones[al.tone]}`}>
                  <al.icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold truncate">{al.label}</div>
                    <div className="text-sm font-extrabold tabular-nums">{al.value}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50 group-hover:translate-x-0.5 transition" />
                </Link>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Rozana chart */}
      {p && p.daily.length > 0 && (
        <Panel icon={BarChart3} title="Rozana Kamai" hint="Neela = kul kamai, hara = services, peela = munafa" tone="cyan">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={p.daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
      )}

      {/* Report cards */}
      <Panel icon={BarChart3} title="Saari Reports" hint="Jis ki tafseel chahiye us par click karein" tone="violet">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTS.map((r) => (
            <Link key={r.to} to={r.to}
              className="group rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 hover:shadow-xl hover:-translate-y-0.5 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all">
              <div className="flex items-start gap-3">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${r.tone} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition`}>
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
                    {r.emoji} {r.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{r.hint}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0 self-center group-hover:translate-x-1 group-hover:text-cyan-500 transition" />
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      {/* Quick links */}
      <Panel icon={ShoppingCart} title="Aam Kaam" tone="teal">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { to: '/pos', icon: ShoppingCart, label: 'POS — bikri' },
            { to: '/appliance-products', icon: Boxes, label: 'Products' },
            { to: '/purchases', icon: Truck, label: 'Kharidari' },
            { to: '/khata', icon: Wallet, label: 'Khata / Udhaar' },
          ].map((l) => (
            <Link key={l.to} to={l.to}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 hover:border-cyan-400 hover:shadow transition">
              <l.icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 text-center">{l.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ReportsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Reports Se Kya Faida?"
      intro={
        <>
          Ye safha aap ki dukaan ka <strong>ek nazar wala jaiza</strong> hai. Roz subah ye kholein —
          jo cheez laal nazar aaye us par pehle kaam karein, phir baqi din chalayein.
        </>
      }
      blocks={[
        {
          title: '🚨 "Foran tawajjo chahiye"',
          tone: 'rose',
          tips: [
            <>Ye box sab se aham hai — isme <strong>sirf wo cheezein</strong> aati hain jo aap ka paisa ya naam kha rahi hain</>,
            <><strong>Late kaam</strong> — customer intezar kar raha hai aur gussa ho raha hai</>,
            <><strong>Baqi paisa</strong> — kaam ho gaya lekin paisa nahi mila. Ye aap ka apna paisa hai</>,
            <><strong>Stock khatam</strong> — customer aayega to khali haath jayega</>,
            <>Har box par click karein to seedha usi page par pohanch jayenge</>,
          ],
        },
        {
          title: '📊 Report kaunsi kab dekhein',
          tone: 'cyan',
          tips: [
            <><strong>💰 Munafa Report</strong> — mahine ke aakhir me. Batati hai ke kamai kahan se aa rahi hai</>,
            <><strong>📦 Stock Report</strong> — hafte me ek bar. Batati hai paisa kis maal me phansa hai</>,
            <><strong>📉 Kya Khatam Ho Raha</strong> — order dene se pehle</>,
            <><strong>🔧 Service Desk</strong> — roz subah. Aaj ka kaam aur technician ka bojh</>,
            <><strong>👷 Technicians</strong> — tankhwah/commission dete waqt</>,
          ],
        },
        {
          title: '📈 Rozana chart',
          tone: 'blue',
          tips: [
            <><strong>Neela bar</strong> — us din ki kul kamai</>,
            <><strong>Hara area</strong> — sirf services (installation, repair, AMC, delivery) ki kamai</>,
            <><strong>Peeli line</strong> — munafa. Agar neela upar ho aur peela neeche, matlab kamai to hai <strong>munafa nahi</strong></>,
            <>Arsa badal kar (7 din / 1 mahina / 1 saal) rujhan dekh sakte hain</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'R', label: 'Sab refresh' },
        { keys: 'P', label: 'Poori report print' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Har mahine ki 1 tareekh ko <Kbd dark>P</Kbd> daba kar poori report
          print karein aur file me rakhein. Saal ke aakhir me pata chal jata hai ke dukaan kis tarah barhi.
        </>
      }
      onClose={onClose}
    />
  );
}
