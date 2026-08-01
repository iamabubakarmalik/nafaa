import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Glasses, TrendingUp, DollarSign, Package, Eye, FileText,
  UserCog, FlaskConical, RefreshCw, ArrowRight, AlertTriangle,
  Plus, ShoppingCart, Calendar, Clock, BarChart3, Sparkles,
  CheckCircle2, Award,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { opticalDashboardApi } from '../api/dashboard.api';
import { prescriptionsApi } from '../api/prescriptions.api';
import { eyeTestsApi } from '../api/eye-tests.api';
import { lensOrdersApi } from '../api/lens-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function OpticalDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['optical-dashboard-overview'],
    queryFn: () => opticalDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: prescriptionSummary } = useQuery({
    queryKey: ['optical-rx-summary'],
    queryFn: () => prescriptionsApi.summary(),
    refetchInterval: 5 * 60_000,
  });

  const { data: eyeTestSummary } = useQuery({
    queryKey: ['optical-eye-test-summary'],
    queryFn: () => eyeTestsApi.summary(),
    refetchInterval: 60_000,
  });

  const { data: lensOrderSummary } = useQuery({
    queryKey: ['optical-lens-order-summary'],
    queryFn: () => lensOrdersApi.summary(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalProducts: 0, totalOptometrists: 0, activeOptometrists: 0, totalPrescriptions: 0, activePrescriptions: 0 };
  const pending = overview?.pending ?? { todayAppointments: 0, pendingTests: 0, lensOrdersAtLab: 0, lensOrdersReady: 0, overdueLensOrders: 0, expiringPrescriptions: 0 };
  const today = overview?.today ?? { testCount: 0, testRevenue: 0, lensOrderCount: 0, lensRevenue: 0, totalRevenue: 0 };
  const monthly = overview?.monthly ?? { eyeTests: { count: 0, revenue: 0 }, lensOrders: { count: 0, revenue: 0, frameRevenue: 0, lensOnlyRevenue: 0 }, totalRevenue: 0, totalReceivable: 0 };
  const todaySchedule = overview?.todaySchedule ?? [];
  const readyForPickup = overview?.readyForPickup ?? [];
  const overdueList = overview?.overdueList ?? [];
  const expiringList = overview?.expiringList ?? [];
  const topProducts = overview?.topProducts ?? [];
  const topOptometrists = overview?.topOptometrists ?? [];

  const revenueSplit = [
    { name: 'Eye Tests', value: monthly.eyeTests.revenue },
    { name: 'Frames', value: monthly.lensOrders.frameRevenue },
    { name: 'Lenses', value: monthly.lensOrders.lensOnlyRevenue },
  ].filter((x) => x.value > 0);

  const todayBars = [
    { label: 'Eye Tests', revenue: today.testRevenue },
    { label: 'Lens Orders', revenue: today.lensRevenue },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-sky-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Glasses className="h-3.5 w-3.5 text-amber-300" /> Optical & Eyewear
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👓 Optical Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Prescriptions, eye tests, frames, lenses, lab orders — one screen
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Link to="/pos">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <ShoppingCart className="h-4 w-4" /> POS
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={DollarSign} label="Today Revenue" value={formatPKR(today.totalRevenue)} sub={`${today.testCount + today.lensOrderCount} txns`} tone="emerald" />
          <HeroTile icon={Eye} label="Today Appointments" value={String(pending.todayAppointments)} sub="scheduled" tone="cyan" />
          <HeroTile icon={FlaskConical} label="At Lab" value={String(pending.lensOrdersAtLab)} sub={`${pending.lensOrdersReady} ready`} tone="violet" />
          <HeroTile icon={FileText} label="Active Rx" value={String(totals.activePrescriptions)} sub={`${pending.expiringPrescriptions} expiring`} tone="amber" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="cyan" />
        <QuickAction to="/optical/eye-tests" icon={Eye} label="Eye Tests" tone="emerald" />
        <QuickAction to="/optical/prescriptions/new" icon={FileText} label="New Rx" tone="blue" />
        <QuickAction to="/optical/lens-orders/new" icon={FlaskConical} label="Lens Order" tone="violet" />
        <QuickAction to="/optical/optometrists" icon={UserCog} label="Doctors" tone="pink" />
        <QuickAction to="/optical-products/new" icon={Plus} label="Add Product" tone="amber" />
      </section>

      {/* ALERTS */}
      {(pending.overdueLensOrders > 0 || pending.expiringPrescriptions > 0 || pending.lensOrdersReady > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Needs attention</h3>
              <p className="text-xs text-amber-800 font-bold">Act on these now</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {pending.lensOrdersReady > 0 && (
              <AlertCard to="/optical/lens-orders?status=READY" icon={CheckCircle2}
                title={`${pending.lensOrdersReady} Ready for Pickup`} desc="Call customers now" tone="emerald" />
            )}
            {pending.overdueLensOrders > 0 && (
              <AlertCard to="/optical/lens-orders?overdue=true" icon={Clock}
                title={`${pending.overdueLensOrders} Overdue Lab Orders`} desc="Chase lab for updates" tone="rose" />
            )}
            {pending.expiringPrescriptions > 0 && (
              <AlertCard to="/optical/prescriptions?expiringSoon=true" icon={FileText}
                title={`${pending.expiringPrescriptions} Rx Expiring Soon`} desc="Send renewal reminder" tone="amber" />
            )}
          </div>
        </section>
      )}

      {/* TODAY'S SCHEDULE */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                Today's Schedule
                {todaySchedule.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold uppercase">
                    {todaySchedule.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-bold">Eye test appointments</p>
            </div>
          </div>
          <Link to="/optical/eye-tests?today=true" className="text-xs font-extrabold text-emerald-700 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">No appointments today</div>
            <Link to="/optical/eye-tests">
              <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700">
                <Plus className="h-4 w-4" /> Book Appointment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {todaySchedule.slice(0, 10).map((a: any) => {
              const statusColors: Record<string, string> = {
                SCHEDULED: 'bg-amber-100 text-amber-700',
                CONFIRMED: 'bg-blue-100 text-blue-700',
                IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
                COMPLETED: 'bg-slate-100 text-slate-700',
                CANCELLED: 'bg-rose-100 text-rose-700',
              };
              return (
                <Link key={a.id} to={`/optical/eye-tests/${a.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 transition">
                  <div className="w-16 shrink-0 text-center">
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">Slot</div>
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {a.scheduledSlot || new Date(a.appointmentDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm truncate">{a.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {a.customerPhone} {a.optometristName && `• ${a.optometristName}`}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${statusColors[a.status] || 'bg-slate-100'}`}>
                    {a.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Today by Revenue Stream</h3>
              <p className="text-xs text-slate-500 font-bold">Eye tests vs lens orders</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {today.totalRevenue > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
                    {todayBars.map((_, i) => (
                      <Cell key={i} fill={['#06b6d4', '#8b5cf6'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No sales yet today</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">This Month Mix</h3>
              <p className="text-xs text-slate-500 font-bold">Total {formatPKR(monthly.totalRevenue)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {revenueSplit.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueSplit} cx="50%" cy="45%" outerRadius={88} innerRadius={50}
                    dataKey="value" nameKey="name"
                    label={(e: any) => {
                      const t = revenueSplit.reduce((s, x) => s + x.value, 0);
                      return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}>
                    {revenueSplit.map((_, i) => (
                      <Cell key={i} fill={['#06b6d4', '#8b5cf6', '#f59e0b'][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <TrendingUp className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No monthly data yet</p>
            </div>
          )}
        </div>
      </section>

      {/* READY FOR PICKUP + OVERDUE */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">📞 Ready for Pickup</h3>
              <p className="text-xs text-slate-500 font-bold">Call these customers</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {readyForPickup.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 font-semibold">Nothing ready for pickup</div>
            ) : readyForPickup.map((o: any) => (
              <Link key={o.id} to={`/optical/lens-orders/${o.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 transition">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Glasses className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 truncate">{o.customerName}</div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {o.frameName} • {o.customerPhone}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(o.totalPrice)}</div>
                  {o.remainingAmount > 0 && (
                    <div className="text-[9px] font-bold text-rose-700">Due {formatPKR(o.remainingAmount)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">⏰ Overdue Lab Orders</h3>
              <p className="text-xs text-slate-500 font-bold">Chase these labs</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {overdueList.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 font-semibold">✅ All on schedule</div>
            ) : overdueList.map((o: any) => {
              const daysLate = Math.ceil((Date.now() - new Date(o.expectedDate).getTime()) / 86400000);
              return (
                <Link key={o.id} to={`/optical/lens-orders/${o.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-rose-50/40 transition">
                  <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <FlaskConical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{o.orderNumber}</div>
                    <div className="text-[10px] text-slate-500 font-bold truncate">
                      {o.customerName} • {o.labName || 'No lab'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase">
                      {daysLate} days late
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* TOP PRODUCTS + OPTOMETRISTS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-cyan-50 to-sky-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-700 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Sellers</h3>
              <p className="text-xs text-slate-500 font-bold">By units sold</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id} to={p.productId ? `/optical-products/${p.productId}` : '/optical-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-cyan-50/40 transition">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">
                    {p.brand} {p.modelNumber}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">{p.totalSold ?? 0} sold</div>
                </div>
                <div className="font-extrabold text-emerald-700 text-sm tabular-nums shrink-0">
                  {formatPKR(p.totalRevenue || 0)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">👨‍⚕️ Top Optometrists</h3>
              <p className="text-xs text-slate-500 font-bold">By revenue</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topOptometrists.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">
                <p>No optometrists yet</p>
                <Link to="/optical/optometrists" className="mt-2 inline-block text-pink-600 font-extrabold hover:underline">Add doctors →</Link>
              </div>
            ) : topOptometrists.map((o: any, i: number) => (
              <Link key={o.id} to="/optical/optometrists" className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/40 transition">
                <div className={`h-9 w-9 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-pink-500'
                }`}>{i + 1}</div>
                {o.photoUrl ? (
                  <img src={o.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {o.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{o.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {o.totalTests} tests • {o.qualification || 'Optometrist'}
                  </div>
                </div>
                <div className="font-extrabold text-pink-700 text-sm tabular-nums shrink-0">
                  {formatPKR(o.totalRevenue || 0)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* EXPIRING PRESCRIPTIONS */}
      {expiringList.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Prescriptions Expiring Soon</h3>
                <p className="text-xs text-slate-500 font-bold">Renewal recall opportunity</p>
              </div>
            </div>
            <Link to="/optical/prescriptions?expiringSoon=true" className="text-xs font-extrabold text-amber-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
            {expiringList.slice(0, 10).map((rx: any) => {
              const daysLeft = Math.ceil((new Date(rx.expiryDate).getTime() - Date.now()) / 86400000);
              return (
                <Link key={rx.id} to={`/optical/prescriptions/${rx.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40 transition">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-extrabold text-sm text-slate-900 truncate">{rx.prescriptionNumber}</div>
                    <div className="text-[10px] text-slate-500 font-bold truncate">
                      {rx.customerName} • {rx.customerPhone}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                    daysLeft <= 7 ? 'bg-rose-500 text-white' :
                    daysLeft <= 30 ? 'bg-amber-500 text-white' :
                    'bg-slate-200 text-slate-700'}`}>
                    {daysLeft} days left
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    cyan: 'from-cyan-400/30 to-cyan-600/20 border-cyan-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3 sm:p-4`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-lg sm:text-xl font-extrabold text-white tabular-nums leading-none truncate">{value}</div>
      <div className="text-[10px] font-bold text-white/70 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    cyan: 'from-cyan-500 to-sky-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    pink: 'from-pink-500 to-rose-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-cyan-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-xs sm:text-sm font-extrabold text-slate-900">{label}</div>
    </Link>
  );
}

function AlertCard({ to, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700|bg-rose-50 border-rose-200',
    amber: 'from-amber-500 to-orange-700|bg-amber-50 border-amber-200',
    emerald: 'from-emerald-500 to-teal-700|bg-emerald-50 border-emerald-200',
  };
  const [grad, box] = tones[tone].split('|');
  return (
    <Link to={to} className={`rounded-2xl bg-white border-2 ${box} p-4 flex items-center gap-3 hover:shadow-md transition group`}>
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-xs text-slate-600 font-bold truncate">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:translate-x-1 transition" />
    </Link>
  );
}
