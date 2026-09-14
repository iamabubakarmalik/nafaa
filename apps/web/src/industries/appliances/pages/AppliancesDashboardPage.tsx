import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, RefreshCw, Wrench, HardHat, Truck, ShieldCheck, Users, Boxes,
  PackageX, Wallet, TrendingUp, AlertTriangle, Clock, Star, ShoppingCart,
  BarChart3, ChevronRight, Zap, CalendarDays, Plus, Barcode, Receipt,
  CheckCircle2, Percent,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { appliancesAnalyticsApi } from '../api/analytics.api';
import { serviceRequestsApi } from '../api/service-requests.api';
import { installationsApi } from '../api/installations.api';
import { techniciansApi } from '../api/technicians.api';
import { amcContractsApi } from '../api/amc-contracts.api';
import { deliveriesApi } from '../api/deliveries.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, StatusBadge, useShortcuts,
  fmtDate, fmtDuration, guideAction, Kbd, toDateInput,
} from '../components/shared';
import { svcStatusMeta, instStatusMeta, catEmoji, catLabel, prioMeta } from '../constants';

/* ═════════════════════════════════════════════════════════════
   APPLIANCES DASHBOARD — dukaan ka command center
   ─────────────────────────────────────────────────────────────
   Subah kholte hi teen sawal ka jawab milna chahiye:
     1. Aaj karna kya hai?
     2. Kahan paisa atka hua hai?
     3. Kaam theek chal raha hai ya nahi?
   ═════════════════════════════════════════════════════════════ */

const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

export default function AppliancesDashboardPage() {
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const [showTeacher, setShowTeacher] = useState(false);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, []);

  const profitQ = useQuery({ queryKey: ['appliance-profit', range], queryFn: () => appliancesAnalyticsApi.profit(range) });
  const svcSumQ = useQuery({ queryKey: ['appliance-service-summary'], queryFn: serviceRequestsApi.summary });
  const instSumQ = useQuery({ queryKey: ['appliance-install-summary'], queryFn: installationsApi.summary });
  const techSumQ = useQuery({ queryKey: ['appliance-tech-summary'], queryFn: techniciansApi.summary });
  const amcSumQ = useQuery({ queryKey: ['appliance-amc-summary'], queryFn: amcContractsApi.summary });
  const delSumQ = useQuery({ queryKey: ['appliance-delivery-summary'], queryFn: deliveriesApi.summary });
  const serialSumQ = useQuery({ queryKey: ['appliance-serial-summary'], queryFn: applianceSerialApi.summary });
  const lowQ = useQuery({ queryKey: ['appliance-low-stock'], queryFn: appliancesAnalyticsApi.lowStock });
  const claimQ = useQuery({ queryKey: ['appliance-claim-summary'], queryFn: warrantyClaimsApi.summary });
  const svcQueueQ = useQuery({ queryKey: ['appliance-service-queue'], queryFn: serviceRequestsApi.queue });
  const instTodayQ = useQuery({ queryKey: ['appliance-install-today'], queryFn: installationsApi.today });

  const p = profitQ.data;
  const svc = svcSumQ.data;
  const inst = instSumQ.data;
  const tech = techSumQ.data;
  const amc = amcSumQ.data;
  const del = delSumQ.data;
  const serial = serialSumQ.data;
  const low = lowQ.data;
  const claims = claimQ.data;

  const anyFetching = profitQ.isFetching || svcSumQ.isFetching || instSumQ.isFetching;
  const refreshAll = () => {
    [profitQ, svcSumQ, instSumQ, techSumQ, amcSumQ, delSumQ, serialSumQ, lowQ, claimQ, svcQueueQ, instTodayQ]
      .forEach((q) => q.refetch());
  };

  /* Aaj ka kaam — repair queue + aaj ki installations, mila kar */
  const todayWork = useMemo(() => {
    const svcRows = (svcQueueQ.data ?? []).slice(0, 8).map((s) => ({
      id: s.id, kind: 'repair' as const, title: s.customerName, sub: `${s.productName} — ${s.reportedIssue}`,
      num: s.requestNumber, status: svcStatusMeta(s.status), tech: s.technicianName,
      time: s.scheduledTimeSlot, overdue: s.isOverdue, priority: s.priority,
      to: '/appliances/service-requests',
    }));
    const instRows = (instTodayQ.data ?? []).slice(0, 8).map((i) => ({
      id: i.id, kind: 'install' as const, title: i.customerName, sub: i.productName,
      num: i.installationNumber, status: instStatusMeta(i.status), tech: i.technicianName,
      time: i.scheduledTimeSlot, overdue: false, priority: 'NORMAL',
      to: '/appliances/installations',
    }));
    return [...instRows, ...svcRows].slice(0, 12);
  }, [svcQueueQ.data, instTodayQ.data]);

  /* Foran tawajjo */
  const alerts = useMemo(() => {
    const out: { icon: any; tone: 'rose' | 'amber' | 'violet'; label: string; value: string; to: string }[] = [];
    if ((svc?.overdue ?? 0) > 0) out.push({ icon: Clock, tone: 'rose', label: 'Repair late', value: `${svc!.overdue} kaam`, to: '/appliances/service-requests' });
    if ((inst?.overdue ?? 0) > 0) out.push({ icon: HardHat, tone: 'rose', label: 'Installation late', value: `${inst!.overdue} kaam`, to: '/appliances/installations' });
    if ((svc?.unassigned ?? 0) + (inst?.unassigned ?? 0) > 0) {
      out.push({ icon: Users, tone: 'amber', label: 'Bina banday ke kaam', value: `${(svc?.unassigned ?? 0) + (inst?.unassigned ?? 0)}`, to: '/appliances/service-requests' });
    }
    const due = (svc?.month.outstanding ?? 0) + (inst?.month.outstanding ?? 0);
    if (due > 0) out.push({ icon: Wallet, tone: 'amber', label: 'Service ka baqi paisa', value: formatPKR(due), to: '/appliances/service-requests' });
    if ((low?.summary.totalOut ?? 0) > 0) out.push({ icon: PackageX, tone: 'rose', label: 'Stock khatam', value: `${low!.summary.totalOut} cheezein`, to: '/appliances/low-stock' });
    if ((serial?.installation.pending ?? 0) > 0) out.push({ icon: HardHat, tone: 'amber', label: 'Bik gaya, laga nahi', value: `${serial!.installation.pending} units`, to: '/appliances/installations' });
    if ((serial?.warrantyExpiringSoon ?? 0) > 0) out.push({ icon: ShieldCheck, tone: 'violet', label: 'Warranty khatam ho rahi', value: `${serial!.warrantyExpiringSoon} units`, to: '/appliances/serials' });
    if ((amc?.expiringSoon ?? 0) > 0) out.push({ icon: ShieldCheck, tone: 'violet', label: 'AMC khatam ho rahe', value: `${amc!.expiringSoon}`, to: '/appliances/amc-contracts' });
    if ((del?.noVehicle ?? 0) > 0) out.push({ icon: Truck, tone: 'amber', label: 'Gaari nahi lagi', value: `${del!.noVehicle} trips`, to: '/appliances/deliveries' });
    if ((tech?.overloaded ?? 0) > 0) out.push({ icon: AlertTriangle, tone: 'amber', label: 'Bande par bojh ziyada', value: `${tech!.overloaded}`, to: '/appliances/technicians' });
    // Warranty ka kaam free kiya lekin brand se claim nahi kiya — chupka nuqsan
    if ((claims?.missing.count ?? 0) > 0) {
      out.push({ icon: ShieldCheck, tone: 'rose', label: 'Warranty claim banaya hi nahi',
        value: formatPKR(claims!.missing.recoverable), to: '/appliances/warranty-claims' });
    }
    if ((claims?.money.pending ?? 0) > 0) {
      out.push({ icon: Wallet, tone: 'violet', label: 'Brand ke paas atka paisa',
        value: formatPKR(claims!.money.pending), to: '/appliances/warranty-claims' });
    }
    return out;
  }, [svc, inst, low, serial, amc, del, tech, claims]);

  useShortcuts({
    t: () => setShowTeacher(true),
    r: () => refreshAll(),
    Escape: () => { if (showTeacher) setShowTeacher(false); },
  }, [showTeacher]);

  const servicesRevenue = (p?.streams ?? []).filter((s) => s.key !== 'GOODS').reduce((x, s) => x + s.revenue, 0);
  const servicesShare = p?.totals.revenue ? (servicesRevenue / p.totals.revenue) * 100 : 0;
  const loading = profitQ.isLoading;

  const QUICK = [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'bikri karein', tone: 'from-emerald-500 to-teal-600' },
    { to: '/appliances/service-requests', icon: Wrench, label: 'Nayi Repair', hint: 'kaam darj karein', tone: 'from-amber-500 to-orange-600' },
    { to: '/appliances/installations', icon: HardHat, label: 'Installation', hint: 'lagane ka kaam', tone: 'from-blue-500 to-indigo-600' },
    { to: '/appliance-products/new', icon: Plus, label: 'Naya Product', hint: 'maal add karein', tone: 'from-cyan-500 to-blue-600' },
    { to: '/appliances/serials', icon: Barcode, label: 'Serial Register', hint: 'unit ka safar', tone: 'from-violet-500 to-purple-600' },
    { to: '/appliances/reports', icon: BarChart3, label: 'Reports', hint: 'poora hisab', tone: 'from-slate-500 to-slate-700' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <DashTeacher onClose={() => setShowTeacher(false)} />}

      <ApplianceHero
        badge="Home Appliances"
        badgeIcon={<Home className="h-3.5 w-3.5 text-amber-300" />}
        title={`🏠 ${shopName}`}
        subtitle={
          p ? (
            <>
              30 din me <strong className="text-cyan-200">{formatPKR(p.totals.revenue)}</strong> kamai
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{formatPKR(p.totals.profit)}</strong> munafa
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{servicesShare.toFixed(0)}%</strong> services se
            </>
          ) : 'Maal, installation, repair, AMC aur delivery — sab ek jagah'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: refreshAll, spinning: anyFetching, shortcut: 'R', hideLabelOnMobile: true },
          { key: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, href: '/appliances/reports', hideLabelOnMobile: true },
          { key: 'pos', label: 'POS Kholein', icon: <ShoppingCart className="h-4 w-4" />, href: '/pos', variant: 'solid' },
        ]}
        shortcuts={[{ keys: 'R', label: 'Refresh' }, { keys: 'T', label: 'Guide' }]}
      />

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to}
            className="group flex flex-col items-center gap-1.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3 hover:border-cyan-400 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${q.tone} text-white flex items-center justify-center shadow group-hover:scale-110 transition`}>
              <q.icon className="h-4.5 w-4.5" />
            </div>
            <div className="text-center min-w-0">
              <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">{q.label}</div>
              <div className="text-[9px] font-bold text-slate-400 truncate hidden sm:block">{q.hint}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Money KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Kpi icon={Wallet} tone="cyan" label="30 Din Ki Kamai" value={formatPKR(p?.totals.revenue ?? 0)} sub={`${p?.totals.salesCount ?? 0} bikri`} />
          <Kpi icon={TrendingUp} tone="emerald" label="Munafa" value={formatPKR(p?.totals.profit ?? 0)} sub={`${(p?.totals.margin ?? 0).toFixed(1)}% margin`} />
          <Kpi icon={Percent} tone="violet" label="Services Ka Hissa" value={`${servicesShare.toFixed(0)}%`} sub={formatPKR(servicesRevenue)} />
          <Kpi icon={AlertTriangle} tone="rose" label="Baqi Paisa"
            value={formatPKR((svc?.month.outstanding ?? 0) + (inst?.month.outstanding ?? 0))}
            sub="service ka udhaar"
            alert={((svc?.month.outstanding ?? 0) + (inst?.month.outstanding ?? 0)) > 0} />
        </section>
      )}

      {/* Work KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wrench} tone="amber" label="Repair Khula" value={svc?.open ?? 0}
          sub={`${svc?.completedToday ?? 0} aaj mukammal`} onClick={() => {}} />
        <Kpi icon={HardHat} tone="blue" label="Installation Baqi" value={inst?.open ?? 0} sub={`${inst?.todayJobs ?? 0} aaj`} />
        <Kpi icon={Users} tone="teal" label="Khali Bande" value={tech?.free ?? 0} sub={`${tech?.active ?? 0} active technician`} />
        <Kpi icon={Star} tone="orange" label="Rating" value={tech?.avgTeamRating ? tech.avgTeamRating.toFixed(1) : '—'}
          sub={svc?.month.avgResolutionHours ? `ausat ${fmtDuration(svc.month.avgResolutionHours)}` : 'customer ki raye'} />
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Panel icon={AlertTriangle} title="Foran Tawajjo Chahiye" hint="Har box par click karein — seedha wahin pohanch jayenge" tone="rose">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alerts.map((al, i) => {
              const tones = {
                rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
                amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
                violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300',
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

      {/* Aaj ka kaam */}
      <Panel icon={CalendarDays} title="Aaj Ka Kaam" hint="Installation aur repair — dono mila kar, zaroori pehle" tone="cyan"
        right={
          <Link to="/appliances/service-requests" className="text-[11px] font-extrabold text-cyan-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1">
            Sab dekhein <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }>
        {todayWork.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400" />
            <p className="mt-2 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Koi kaam baqi nahi 🎉</p>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Sab kuch mukammal hai — naya kaam aane par yahan nazar aayega</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {todayWork.map((w) => (
              <Link key={`${w.kind}-${w.id}`} to={w.to}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 hover:shadow-md transition group ${
                  w.overdue ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  w.kind === 'install' ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {w.kind === 'install' ? <HardHat className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-extrabold text-slate-900 dark:text-white truncate">{w.title}</span>
                    {w.overdue && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white">LATE</span>}
                    {w.priority === 'URGENT' && <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${prioMeta('URGENT').cls}`}>FORAN</span>}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {w.num} • {w.sub}
                  </div>
                </div>
                <div className="hidden sm:block text-[10px] font-bold text-slate-400 shrink-0 text-right">
                  {w.tech || <span className="text-amber-600 dark:text-amber-400">banda nahi laga</span>}
                  {w.time && <div>{w.time}</div>}
                </div>
                <StatusBadge meta={w.status} size="xs" />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Revenue chart */}
      {p && p.daily.length > 0 && (
        <Panel icon={BarChart3} title="30 Din Ki Kamai" hint="Neela = kul, hara = services, peela = munafa" tone="blue">
          <ResponsiveContainer width="100%" height={260}>
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

      {/* Module cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <ModuleCard
          to="/appliances/service-requests" icon={Wrench} title="Repair / Service" tone="from-amber-500 to-orange-600"
          rows={[
            ['Khula kaam', String(svc?.open ?? 0)],
            ['Late', String(svc?.overdue ?? 0)],
            ['Is mahine kamai', formatPKR(svc?.month.revenue ?? 0)],
            ['Baqi paisa', formatPKR(svc?.month.outstanding ?? 0)],
          ]}
        />
        <ModuleCard
          to="/appliances/installations" icon={HardHat} title="Installations" tone="from-blue-500 to-indigo-600"
          rows={[
            ['Lagana baqi', String(inst?.open ?? 0)],
            ['Aaj', String(inst?.todayJobs ?? 0)],
            ['Is mahine kamai', formatPKR(inst?.month.revenue ?? 0)],
            ['Demo diye', String(inst?.month.demosGiven ?? 0)],
          ]}
        />
        <ModuleCard
          to="/appliances/technicians" icon={Users} title="Technicians" tone="from-violet-500 to-purple-600"
          rows={[
            ['Active', String(tech?.active ?? 0)],
            ['Khali', String(tech?.free ?? 0)],
            ['Is mahine commission', formatPKR(tech?.month.commission ?? 0)],
            ['Team rating', tech?.avgTeamRating ? tech.avgTeamRating.toFixed(1) : '—'],
          ]}
        />
        <ModuleCard
          to="/appliances/amc-contracts" icon={ShieldCheck} title="AMC Contracts" tone="from-purple-500 to-fuchsia-600"
          rows={[
            ['Chal rahe', String(amc?.active ?? 0)],
            ['Khatam ho rahe', String(amc?.expiringSoon ?? 0)],
            ['Wusool hua', formatPKR(amc?.totalCollected ?? 0)],
            ['Baqi', formatPKR(amc?.pendingAmount ?? 0)],
          ]}
        />
        <ModuleCard
          to="/appliances/deliveries" icon={Truck} title="Deliveries" tone="from-teal-500 to-emerald-600"
          rows={[
            ['Baqi', String(del?.open ?? 0)],
            ['Aaj', String(del?.todayScheduled ?? 0)],
            ['Gaari nahi lagi', String(del?.noVehicle ?? 0)],
            ['Is mahine kamai', formatPKR(del?.month.revenue ?? 0)],
          ]}
        />
        <ModuleCard
          to="/appliances/warranty-claims" icon={ShieldCheck} title="Warranty Claims" tone="from-rose-500 to-pink-600"
          rows={[
            ['Khule claims', String(claims?.open ?? 0)],
            ['Brand ke paas', formatPKR(claims?.money.pending ?? 0)],
            ['Wapas mil chuka', formatPKR(claims?.money.received ?? 0)],
            ['Banaya hi nahi', String(claims?.missing.count ?? 0)],
          ]}
        />
        <ModuleCard
          to="/appliances/serials" icon={Barcode} title="Serial Register" tone="from-slate-500 to-slate-700"
          rows={[
            ['Stock me', String(serial?.inStock.units ?? 0)],
            ['Bik chuke', String(serial?.sold.units ?? 0)],
            ['Stock ki lagat', formatPKR(serial?.inStock.value ?? 0)],
            ['Warranty khatam ho rahi', String(serial?.warrantyExpiringSoon ?? 0)],
          ]}
        />
      </div>

      {/* Stock snapshot */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={PackageX} title="Kya Khatam Ho Raha Hai" hint="Order dene se pehle yahan dekh lein" tone="amber"
          right={
            <Link to="/appliances/low-stock" className="text-[11px] font-extrabold text-cyan-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1">
              Sab dekhein <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }>
          {(low?.items ?? []).length === 0 ? (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">✅ Sab stock theek hai</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Mini label="Kam ho gayin" value={String(low!.summary.totalLow)} tone="amber" />
                <Mini label="Bilkul khatam" value={String(low!.summary.totalOut)} tone="rose" />
                <Mini label="Order ka kharcha" value={formatPKR(low!.summary.reorderCost)} tone="cyan" />
              </div>
              <div className="space-y-1.5">
                {low!.items.slice(0, 6).map((r) => (
                  <Link key={r.productId} to={`/appliance-products/${r.productId}`}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-2 transition">
                    <span className="text-base shrink-0">{catEmoji(r.categoryType)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{r.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 truncate">{catLabel(r.categoryType)}{r.brand ? ` • ${r.brand}` : ''}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums shrink-0 ${
                      r.isOut ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>{r.isOut ? 'Khatam' : `${r.stock} bachay`}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel icon={Zap} title="Kamai Kahan Se Aa Rahi" hint="Paanch raste — kis ka kitna hissa" tone="emerald">
          {!p || p.streams.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi koi bikri nahi</p>
          ) : (
            <div className="space-y-2">
              {p.streams.filter((s) => s.revenue > 0).map((s) => {
                const share = p.totals.revenue ? (s.revenue / p.totals.revenue) * 100 : 0;
                const colors: Record<string, string> = {
                  GOODS: '#06b6d4', INSTALLATION: '#3b82f6', SERVICE: '#f59e0b',
                  AMC: '#a855f7', DELIVERY: '#10b981', POS_SERVICES: '#64748b',
                };
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
                      <span className="text-slate-700 dark:text-slate-200">{s.label}</span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {formatPKR(s.revenue)} <span className="opacity-60">({share.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(share, 100)}%`, background: colors[s.key] }} />
                    </div>
                  </div>
                );
              })}
              <Link to="/appliances/profit-report"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-cyan-700 dark:text-cyan-400 hover:underline">
                <TrendingUp className="h-3.5 w-3.5" /> Poori munafa report
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ModuleCard({ to, icon: Icon, title, tone, rows }: {
  to: string; icon: any; title: string; tone: string; rows: [string, string][];
}) {
  return (
    <Link to={to}
      className="group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 hover:shadow-xl hover:-translate-y-0.5 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow group-hover:scale-110 transition`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition flex-1">{title}</h3>
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-cyan-500 transition" />
      </div>
      <div className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-500 dark:text-slate-400">{k}</span>
            <span className="font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{v}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'rose' | 'cyan' }) {
  const tones = {
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
  };
  return (
    <div className={`rounded-xl border px-2 py-1.5 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

function DashTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Dashboard Kaise Istemal Karein?"
      intro={
        <>
          Ye safha roz subah kholein. Teen sawal ka jawab yahin milta hai:
          <strong> aaj karna kya hai</strong>, <strong>paisa kahan atka hai</strong>,
          aur <strong>kaam theek chal raha hai ya nahi</strong>.
        </>
      }
      blocks={[
        {
          title: '🚨 "Foran tawajjo chahiye"',
          tone: 'rose',
          tips: [
            <>Sab se pehle yahi box dekhein — isme sirf wo cheezein aati hain jo <strong>aap ka paisa ya naam kha rahi hain</strong></>,
            <><strong>Late kaam</strong> — customer intezar kar raha hai</>,
            <><strong>Bina banday ke kaam</strong> — ye subah hi kisi ko de dein, warna sara din latak jayega</>,
            <><strong>Baqi paisa</strong> — kaam ho gaya lekin wusooli nahi hui. Ye aap ka apna paisa hai</>,
            <>Har box par click — seedha usi page par</>,
          ],
        },
        {
          title: '📅 "Aaj ka kaam"',
          tone: 'cyan',
          tips: [
            <>Installation aur repair <strong>dono mila kar</strong> — jo zaroori hai wo upar</>,
            <><span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">LATE</span> aur <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">FORAN</span> wale pehle</>,
            <>Jis kaam par <strong>"banda nahi laga"</strong> likha ho, usay foran technician dein</>,
          ],
        },
        {
          title: '💰 "Kamai kahan se aa rahi"',
          tone: 'emerald',
          tips: [
            <>Ye batata hai ke aap ki kamai me <strong>maal ka hissa kitna hai aur services ka kitna</strong></>,
            <>Agar <strong>services ka hissa 25% se kam</strong> hai to installation aur AMC par tawajjo dein — wahan margin sab se ziyada hai</>,
            <>Har module card par mahine ki kamai likhi hai — ek nazar me pata chal jata hai kaunsa hissa chal raha hai</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'R', label: 'Sab refresh' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Subah 10 minute ye safha dekhein — laal box khatam karein, bina banday ke
          kaam baant dein. Bas itna karne se <strong>aadhi shikayat khud khatam</strong> ho jati hai.
        </>
      }
      onClose={onClose}
    />
  );
}
