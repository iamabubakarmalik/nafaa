import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Pill, FileText, ShieldAlert, Snowflake, AlertTriangle,
  TrendingUp, Target, Sparkles, Users, Package,
  Award, ArrowRight, Clock, DollarSign, Activity,
  Stethoscope, Beaker, Calendar, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { medicinesApi } from '../api/medicines.api';
import { batchesApi } from '../api/batches.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

export default function PharmacyDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ['pharmacy-medicines'],
    queryFn: () => medicinesApi.list({}),
  });

  const { data: expiringBatches = [] } = useQuery({
    queryKey: ['pharmacy-batches-expiring'],
    queryFn: async () => {
      try { return await batchesApi.expiringSoon(90); } catch { return []; }
    },
    refetchInterval: 5 * 60_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const rxMedicines = medicines.filter((m: any) => m.requiresPrescription);
  const otcMedicines = medicines.filter((m: any) => !m.requiresPrescription);
  const narcoticMedicines = medicines.filter((m: any) => m.isNarcotic);
  const coldChainMedicines = medicines.filter((m: any) => m.requiresColdChain);

  const now = Date.now();
  const expired = expiringBatches.filter((b: any) => b.expiryDate && new Date(b.expiryDate).getTime() < now);
  const expiringSoon = expiringBatches.filter((b: any) => {
    if (!b.expiryDate) return false;
    const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 90;
  });

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const hourlyData = (data?.hourlySalesToday ?? [])
    .filter((h) => h.sales > 0 || (h.hour >= 8 && h.hour <= 22))
    .map((h) => ({
      ...h,
      label: h.hour === 0 ? '12 AM' : h.hour < 12 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
    }));

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  const medicineTypeBreakdown = [
    { name: 'OTC', value: otcMedicines.length, color: '#10b981' },
    { name: 'Prescription', value: rxMedicines.length, color: '#f59e0b' },
    { name: 'Narcotic', value: narcoticMedicines.length, color: '#ef4444' },
    { name: 'Cold Chain', value: coldChainMedicines.length, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-teal-900 to-cyan-700"
        emoji="💊"
        industryLabel="Pharmacy"
        industryBadgeColor="bg-teal-500/30 border border-teal-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="Open Pharmacy POS"
        posLink="/pos"
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Medicines"
          value={medicines.length}
          subtitle={`${rxMedicines.length} Rx • ${otcMedicines.length} OTC`}
          icon={Pill}
          color="from-teal-500 to-cyan-600"
          isHighlight
        />
        <HeroKpiCard
          title="Expiring Soon"
          value={expiringSoon.length}
          subtitle={`${expired.length} already expired`}
          icon={Calendar}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="Cold Chain Items"
          value={coldChainMedicines.length}
          subtitle="Refrigerated storage"
          icon={Snowflake}
          color="from-blue-500 to-cyan-600"
        />
        <HeroKpiCard
          title="Aaj ka Profit"
          value={formatPKR(stats?.netProfitToday ?? 0)}
          subtitle={`${stats?.ordersToday ?? 0} orders • AOV ${formatPKR(stats?.aovToday ?? 0)}`}
          icon={Target}
          color="from-violet-500 to-purple-600"
          trend={growthVsYesterday}
        />
      </section>

      {/* EXPIRY ALERT */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <section className="rounded-3xl bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-amber-300 p-5 flex items-center gap-4 flex-wrap">
          <AlertTriangle className="h-10 w-10 text-amber-600 shrink-0" />
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-900 text-lg">⚠️ Expiry Alert</h3>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              {expiringSoon.length > 0 && (
                <span className="font-extrabold text-amber-700">
                  {expiringSoon.length} batch(es) expiring within 90 days
                </span>
              )}
              {expired.length > 0 && (
                <span className="font-extrabold text-rose-700">
                  {expired.length} batch(es) already expired
                </span>
              )}
            </div>
          </div>
          <Link to="/pharmacy/expiring">
            <Button className="bg-amber-600 hover:bg-amber-700">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      )}

      {/* PHARMACY OPERATIONS */}
      <section className="rounded-3xl bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-2 border-teal-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-teal-900">Pharmacy Operations</h3>
              <p className="text-xs text-teal-700">Prescriptions, medicines, doctors</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/pharmacy/prescriptions/new">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                <FileText className="h-3.5 w-3.5" /> New Rx
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/pharmacy/prescriptions" className="rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
              <FileText className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Prescriptions</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Manage Rx</div>
          </Link>
          <Link to="/pharmacy/doctors" className="rounded-2xl bg-white border-2 border-emerald-200 hover:border-emerald-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Doctors</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Directory</div>
          </Link>
          <Link to="/pharmacy/salts" className="rounded-2xl bg-white border-2 border-violet-200 hover:border-violet-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center mb-1">
              <Beaker className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-violet-700">Salts</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Composition</div>
          </Link>
          <Link to="/pharmacy/temperature" className="rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-400 p-3 transition">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
              <Snowflake className="h-4 w-4" />
            </div>
            <div className="text-[10px] uppercase font-extrabold text-blue-700">Cold Chain</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">Temp log</div>
          </Link>
        </div>
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Pharmacy Sales</h3>
              <p className="text-sm text-slate-500">Revenue & profit trend</p>
            </div>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="phSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="phProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#0d9488" fill="url(#phSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#phProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Medicine Types</h3>
              <p className="text-sm text-slate-500">Inventory breakdown</p>
            </div>
            <Pill className="h-5 w-5 text-teal-500" />
          </div>
          {medicineTypeBreakdown.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={medicineTypeBreakdown}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="value"
                    label={(entry: any) => entry.value}
                    labelLine={false}
                  >
                    {medicineTypeBreakdown.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No medicines yet</div>
          )}
        </div>
      </section>

      {/* P&L */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Pharmacy monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {formatPercent(growthVsLastMonth)}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${stats?.ordersMonth ?? 0} sales`} color="emerald" />
          <PnLCard label="Medicine Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Purchase cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff, utilities" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="blue" isHighlight />
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Medicines" value={medicines.length} icon={Pill} tone="cyan" link="/pharmacy/medicines" />
        <QuickStat title="Prescriptions" value={0} icon={FileText} tone="amber" link="/pharmacy/prescriptions" />
        <QuickStat title="Doctors" value={0} icon={Stethoscope} tone="emerald" link="/pharmacy/doctors" />
        <QuickStat title="Salts" value={0} icon={Beaker} tone="violet" link="/pharmacy/salts" />
        <QuickStat title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/customers" />
        <QuickStat title="Expiring" value={expiringSoon.length} icon={AlertTriangle} tone="rose" link="/pharmacy/expiring" alert />
      </section>
    </div>
  );
}
