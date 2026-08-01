import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PawPrint, TrendingUp, DollarSign, Package, Heart, Scissors,
  RefreshCw, ArrowRight, AlertTriangle, Plus, ShoppingCart,
  Users, Sparkles, Star, Calendar, Pill, Activity, BarChart3,
  Clock, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { petshopDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle, useCostHidden } from '@core/ui/HiddenValue';

export default function PetshopDashboardPage() {
  const hideCost = useCostHidden();

  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['petshop-dashboard-overview'],
    queryFn: () => petshopDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const totals = overview?.totals ?? { totalProducts: 0, totalGroomers: 0, activeGroomers: 0, animalsAvailable: 0, animalsReserved: 0, animalInventoryValue: 0 };
  const pending = overview?.pending ?? { todayAppointments: 0, pendingAppointments: 0, readyForPickup: 0, expiringMedicines: 0, expiredMedicines: 0, healthAlerts: 0 };
  const today = overview?.today ?? { groomingCount: 0, groomingRevenue: 0, animalSalesCount: 0, animalRevenue: 0, totalRevenue: 0 };
  const monthly = overview?.monthly ?? { grooming: { count: 0, billed: 0, collected: 0 }, liveAnimals: { count: 0, revenue: 0, cost: 0, profit: 0 }, totalRevenue: 0 };
  const todaySchedule = overview?.todaySchedule ?? [];
  const pickupList = overview?.pickupList ?? [];
  const healthAlerts = overview?.healthAlerts ?? [];
  const expiringList = overview?.expiringList ?? [];
  const featuredAnimals = overview?.featuredAnimals ?? [];
  const topProducts = overview?.topProducts ?? [];
  const topGroomers = overview?.topGroomers ?? [];
  const bySpecies = overview?.bySpecies ?? [];

  const revenueSplit = [
    { name: 'Grooming', value: monthly.grooming.collected },
    { name: 'Live Animals', value: monthly.liveAnimals.revenue },
  ].filter((x) => x.value > 0);

  const todayBars = [
    { label: 'Grooming', revenue: today.groomingRevenue },
    { label: 'Animals', revenue: today.animalRevenue },
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <PawPrint className="h-3.5 w-3.5 text-amber-300" /> Pet Shop & Vet Store
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🐾 Pet Shop Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Products, live animals, grooming appointments — one screen
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
                <ShoppingCart className="h-4 w-4" /> Open POS
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroTile icon={DollarSign} label="Today Revenue" value={formatPKR(today.totalRevenue)} sub={`${today.groomingCount + today.animalSalesCount} transactions`} tone="emerald" />
          <HeroTile icon={Heart} label="Live Animals" value={String(totals.animalsAvailable)} sub={`${totals.animalsReserved} reserved`} tone="rose" />
          <HeroTile icon={Scissors} label="Today Grooming" value={String(pending.todayAppointments)} sub={`${pending.pendingAppointments} pending`} tone="violet" />
          <HeroTile icon={Package} label="Products" value={String(totals.totalProducts)} sub="in catalogue" tone="amber" />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="amber" />
        <QuickAction to="/petshop-products/new" icon={Plus} label="Add Product" tone="emerald" />
        <QuickAction to="/petshop/live-animals/new" icon={Heart} label="Add Animal" tone="rose" />
        <QuickAction to="/petshop/grooming/new" icon={Scissors} label="Book Grooming" tone="violet" />
        <QuickAction to="/petshop/live-animals" icon={PawPrint} label="Animals" tone="orange" />
        <QuickAction to="/petshop/groomers" icon={Users} label="Groomers" tone="blue" />
      </section>

      {/* ALERTS */}
      {(pending.expiringMedicines > 0 || pending.expiredMedicines > 0 || pending.healthAlerts > 0 || pending.readyForPickup > 0) && (
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pending.expiredMedicines > 0 && (
              <AlertCard to="/petshop-products?filter=expired" icon={Pill}
                title={`${pending.expiredMedicines} expired medicines`} desc="Remove from shelf" tone="rose" />
            )}
            {pending.expiringMedicines > 0 && (
              <AlertCard to="/petshop-products?filter=expiring" icon={Clock}
                title={`${pending.expiringMedicines} expiring soon`} desc="Discount or return" tone="amber" />
            )}
            {pending.readyForPickup > 0 && (
              <AlertCard to="/petshop/grooming?status=READY_FOR_PICKUP" icon={CheckCircle2}
                title={`${pending.readyForPickup} ready for pickup`} desc="Call customers" tone="emerald" />
            )}
            {pending.healthAlerts > 0 && (
              <AlertCard to="/petshop/live-animals" icon={Activity}
                title={`${pending.healthAlerts} animals need vet care`} desc="Vaccine / deworm pending" tone="blue" />
            )}
          </div>
        </section>
      )}

      {/* CHARTS */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Today by Revenue Stream</h3>
              <p className="text-xs text-slate-500 font-bold">Grooming vs live animals</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
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
                      <Cell key={i} fill={['#f59e0b', '#f43f5e'][i]} />
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-700 text-white flex items-center justify-center shadow-md">
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
                      <Cell key={i} fill={['#f59e0b', '#f43f5e'][i % 2]} />
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

      {/* STREAM CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StreamCard label="Grooming" icon={Scissors} tone="violet"
          today={today.groomingRevenue} month={monthly.grooming.collected} extra={`${monthly.grooming.count} appointments this month`} />
        <StreamCard label="Live Animals" icon={Heart} tone="rose"
          today={today.animalRevenue} month={monthly.liveAnimals.revenue}
          extra={hideCost ? 'profit hidden' : `profit ${formatPKR(monthly.liveAnimals.profit)}`} />
      </section>

      {/* TODAY SCHEDULE + PICKUP */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Today's Grooming Schedule</h3>
                <p className="text-xs text-slate-500 font-bold">{todaySchedule.length} appointments</p>
              </div>
            </div>
            <Link to="/petshop/grooming" className="text-xs font-extrabold text-violet-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {todaySchedule.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No appointments today</div>
            ) : todaySchedule.slice(0, 8).map((a: any) => (
              <Link key={a.id} to="/petshop/grooming" className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40 transition">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                  a.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                  a.status === 'READY_FOR_PICKUP' ? 'bg-blue-100 text-blue-700' :
                  'bg-violet-100 text-violet-700'
                }`}>
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">
                    {a.petName} <span className="text-slate-500 font-bold">({a.petSpecies})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {a.customerName} • {a.scheduledSlot || new Date(a.scheduledDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(a.totalFee)}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">{a.status}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Ready for Pickup</h3>
                <p className="text-xs text-slate-500 font-bold">{pickupList.length} pets waiting</p>
              </div>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {pickupList.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No pickups pending</div>
            ) : pickupList.map((a: any) => (
              <Link key={a.id} to="/petshop/grooming" className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/40 transition">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{a.petName}</div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {a.customerName} • {a.customerPhone}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(a.totalFee)}</div>
                  {a.paidAmount < a.totalFee && (
                    <div className="text-[9px] font-bold text-rose-700">Balance {formatPKR(a.totalFee - a.paidAmount)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ANIMALS + TOP PRODUCTS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-700 text-white flex items-center justify-center shadow-md">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">⭐ Featured Animals</h3>
                <p className="text-xs text-slate-500 font-bold">Available for adoption/sale</p>
              </div>
            </div>
            <Link to="/petshop/live-animals" className="text-xs font-extrabold text-rose-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {featuredAnimals.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No featured animals</div>
            ) : featuredAnimals.map((a: any) => (
              <Link key={a.id} to={`/petshop/live-animals/${a.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-rose-50/40 transition">
                <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {a.imageUrls?.[0] ? (
                    <img src={a.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Heart className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">
                    {a.name || `${a.species} #${a.animalNumber}`}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold truncate">
                    {a.breed} • {a.gender} • {a.ageMonths ? `${a.ageMonths}mo` : 'age unknown'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-rose-700 text-sm tabular-nums">{formatPKR(a.askingPrice)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Selling Products</h3>
              <p className="text-xs text-slate-500 font-bold">All-time best sellers</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id ?? i} to={p.productId ? `/petshop-products/${p.productId}` : '/petshop-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-amber-700">
                    {p.brand ? `${p.brand} — ` : ''}{p.categoryType?.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">{p.totalSold ?? 0} units sold</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TOP GROOMERS + EXPIRING */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">👨‍🔧 Top Groomers</h3>
              <p className="text-xs text-slate-500 font-bold">By revenue</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100">
            {topGroomers.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">
                <p>No groomers yet</p>
                <Link to="/petshop/groomers" className="mt-2 inline-block text-blue-600 font-extrabold hover:underline">Add groomers →</Link>
              </div>
            ) : topGroomers.map((g: any, i: number) => (
              <Link key={g.id} to="/petshop/groomers" className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50/40 transition">
                <div className={`h-9 w-9 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-blue-500'
                }`}>{i + 1}</div>
                {g.photoUrl ? (
                  <img src={g.photoUrl} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {g.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{g.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {g.completedAppointments} completed
                    {g.avgRating && ` • ⭐ ${g.avgRating.toFixed(1)}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-blue-700 text-sm tabular-nums">{formatPKR(g.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-red-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-700 text-white flex items-center justify-center shadow-md">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">💊 Expiring Medicines</h3>
              <p className="text-xs text-slate-500 font-bold">Within 90 days</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[380px] overflow-y-auto">
            {expiringList.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">Nothing expiring soon</div>
            ) : expiringList.map((p: any) => {
              const days = p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40 transition">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    days !== null && days < 30 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900">{p.brand || 'Medicine'}</div>
                    <div className="text-[10px] text-slate-500 font-bold truncate">
                      Batch: {p.batchNumber || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[10px] font-extrabold uppercase ${days !== null && days < 30 ? 'text-rose-700' : 'text-amber-700'}`}>
                      {days !== null ? `${days} days` : 'Expiry set'}
                    </div>
                    {p.expiryDate && (
                      <div className="text-[9px] font-bold text-slate-500">
                        {new Date(p.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SPECIES BREAKDOWN */}
      {bySpecies.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-700 text-white flex items-center justify-center shadow-md">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Live Animals by Species</h3>
              <p className="text-xs text-slate-500 font-bold">Available inventory</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {bySpecies.map((s: any) => (
              <div key={s.species} className="rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 p-3 text-center">
                <div className="text-[9px] uppercase font-extrabold text-rose-700">{s.species.replace(/_/g, ' ')}</div>
                <div className="text-2xl font-extrabold text-rose-900 tabular-nums mt-1">{s.count}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40',
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
    amber: 'from-amber-500 to-orange-700',
    emerald: 'from-emerald-500 to-teal-700',
    rose: 'from-rose-500 to-pink-700',
    violet: 'from-violet-500 to-purple-700',
    orange: 'from-orange-500 to-red-700',
    blue: 'from-blue-500 to-cyan-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
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
    blue: 'from-blue-500 to-cyan-700|bg-blue-50 border-blue-200',
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

function StreamCard({ label, icon: Icon, tone, today, month, extra }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700 border-violet-300',
    rose: 'from-rose-500 to-pink-700 border-rose-300',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${parts[2]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${parts[0]} ${parts[1]}`}>
          <Icon className="h-3 w-3" /> {label}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Today</div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums leading-none mt-1">{formatPKR(today)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">This month</div>
          <div className="text-base font-extrabold text-emerald-700 tabular-nums leading-none mt-1">{formatPKR(month)}</div>
        </div>
      </div>
      <div className="mt-2 text-[10px] font-bold text-slate-500">{extra}</div>
    </div>
  );
}
