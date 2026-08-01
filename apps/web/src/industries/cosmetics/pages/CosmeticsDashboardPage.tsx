import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles, TrendingUp, DollarSign, Package, Gift, Users,
  RefreshCw, ArrowRight, AlertTriangle, Plus, ShoppingCart,
  Award, Calendar, Heart, BarChart3, Star, Cake, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { cosmeticsDashboardApi } from '../api/dashboard.api';
import { cosmeticsBatchesApi } from '../api/batches.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { PrivacyToggle } from '@core/ui/HiddenValue';

export default function CosmeticsDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cosmetics-dashboard-overview'],
    queryFn: () => cosmeticsDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const { data: expiryAlerts } = useQuery({
    queryKey: ['cosmetics-expiry-alerts'],
    queryFn: () => cosmeticsBatchesApi.expiryAlerts(),
    refetchInterval: 5 * 60_000,
  });

  const totals = overview?.totals ?? { totalBrands: 0, totalProducts: 0, totalBatches: 0, activeBundles: 0, totalLoyaltyMembers: 0, expiredBatches: 0, expiringSoonBatches: 0 };
  const certifications = overview?.certifications ?? { halal: 0, crueltyFree: 0, vegan: 0, organic: 0 };
  const topProducts = overview?.topProducts ?? [];
  const topBrands = overview?.topBrands ?? [];
  const tierBreakdown = overview?.tierBreakdown ?? [];
  const byCategory = overview?.byCategory ?? [];
  const expiringBatches = overview?.expiringBatches ?? [];
  const birthdayMembers = overview?.birthdayMembers ?? [];

  const tierData = tierBreakdown.map((t: any) => ({ name: t.tier, value: t._count._all }));
  const TIER_COLORS: Record<string, string> = {
    BRONZE: '#a97142', SILVER: '#94a3b8', GOLD: '#f59e0b',
    PLATINUM: '#8b5cf6', DIAMOND: '#3b82f6',
  };

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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Cosmetics & Beauty
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💄 Beauty Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Products, batches, loyalty & bundles — one beautiful view
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
          <HeroTile icon={Package} label="Products" value={totals.totalProducts} sub={`${totals.totalBrands} brands`} tone="pink" />
          <HeroTile icon={Users} label="Loyalty Members" value={totals.totalLoyaltyMembers} sub="active" tone="violet" />
          <HeroTile icon={Gift} label="Gift Bundles" value={totals.activeBundles} sub="live" tone="rose" />
          <HeroTile icon={Calendar} label="Batches" value={totals.totalBatches} sub={`${totals.expiringSoonBatches} expiring`} tone={totals.expiringSoonBatches > 0 ? 'amber' : 'emerald'} />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <QuickAction to="/pos" icon={ShoppingCart} label="POS" tone="pink" />
        <QuickAction to="/cosmetics-products/new" icon={Plus} label="Add Product" tone="rose" />
        <QuickAction to="/cosmetics/brands" icon={Award} label="Brands" tone="violet" />
        <QuickAction to="/cosmetics/batches" icon={Package} label="Batches" tone="amber" />
        <QuickAction to="/cosmetics/bundles" icon={Gift} label="Bundles" tone="fuchsia" />
        <QuickAction to="/cosmetics/loyalty" icon={Users} label="Loyalty" tone="emerald" />
      </section>

      {/* ALERTS */}
      {(totals.expiredBatches > 0 || totals.expiringSoonBatches > 0 || birthdayMembers.length > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Needs attention</h3>
              <p className="text-xs text-amber-800 font-bold">Action items</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {totals.expiredBatches > 0 && (
              <AlertCard to="/cosmetics/batches?expired=true" icon={Clock}
                title={`${totals.expiredBatches} expired batches`} desc="Remove from shelves" tone="rose" />
            )}
            {totals.expiringSoonBatches > 0 && (
              <AlertCard to="/cosmetics/batches?expiringInDays=30" icon={Calendar}
                title={`${totals.expiringSoonBatches} expiring in 30 days`} desc="Discount or clearance" tone="amber" />
            )}
            {birthdayMembers.length > 0 && (
              <AlertCard to="/cosmetics/loyalty" icon={Cake}
                title={`${birthdayMembers.length} birthdays this month`} desc="Send birthday offer" tone="pink" />
            )}
          </div>
        </section>
      )}

      {/* CERTIFICATIONS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CertStat icon="🕌" label="Halal Certified" value={certifications.halal} tone="emerald" />
        <CertStat icon="🐰" label="Cruelty-Free" value={certifications.crueltyFree} tone="pink" />
        <CertStat icon="🌱" label="Vegan" value={certifications.vegan} tone="green" />
        <CertStat icon="🌿" label="Organic" value={certifications.organic} tone="teal" />
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Loyalty Tiers</h3>
              <p className="text-xs text-slate-500 font-bold">{totals.totalLoyaltyMembers} total members</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Users className="h-5 w-5" />
            </div>
          </div>
          {tierData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="45%" outerRadius={88} innerRadius={50}
                    dataKey="value" nameKey="name"
                    label={(e: any) => {
                      const t = tierData.reduce((s: number, x: any) => s + x.value, 0);
                      return t > 0 ? `${((e.value / t) * 100).toFixed(0)}%` : '';
                    }}
                    labelLine={false}>
                    {tierData.map((entry: any, i: number) => (
                      <Cell key={i} fill={TIER_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No loyalty members yet</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Category Breakdown</h3>
              <p className="text-xs text-slate-500 font-bold">Products by type</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          {byCategory.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory.slice(0, 10).map((c: any) => ({ name: (c.categoryType || 'OTHER').replace(/_/g, ' '), count: c._count._all }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} angle={-30} textAnchor="end" height={70} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-extrabold text-slate-500">No category data</p>
            </div>
          )}
        </div>
      </section>

      {/* EXPIRING BATCHES */}
      {expiringBatches.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Batches Expiring in 30 Days</h3>
                <p className="text-xs text-slate-500 font-bold">Consider clearance or discount</p>
              </div>
            </div>
            <Link to="/cosmetics/batches?expiringInDays=30" className="text-xs font-extrabold text-amber-700 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {expiringBatches.slice(0, 8).map((b: any) => {
              const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40 transition">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-extrabold text-slate-900 text-sm truncate">{b.batchNumber}</div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {b.currentStock} units in stock
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-extrabold tabular-nums ${days <= 7 ? 'text-rose-700' : days <= 15 ? 'text-orange-700' : 'text-amber-700'}`}>
                      {days} days
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {new Date(b.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TOP PRODUCTS + BIRTHDAYS */}
      <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">🏆 Top Sellers</h3>
              <p className="text-xs text-slate-500 font-bold">By units sold</p>
            </div>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-semibold">No sales recorded yet</div>
            ) : topProducts.slice(0, 8).map((p: any, i: number) => (
              <Link key={p.id ?? i} to={p.productId ? `/cosmetics-products/${p.productId}` : '/cosmetics-products'}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
                <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {p.shadeHex ? (
                    <div className="w-full h-full" style={{ backgroundColor: p.shadeHex }} />
                  ) : (
                    <Sparkles className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 group-hover:text-pink-700">
                    {p.shadeName || p.categoryType?.replace(/_/g, ' ') || 'Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {p.totalSold ?? 0} sold
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(p.totalRevenue || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border-2 border-pink-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-pink-100 bg-gradient-to-r from-pink-50 to-fuchsia-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
                <Cake className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">🎂 Birthdays This Month</h3>
                <p className="text-xs text-slate-500 font-bold">{birthdayMembers.length} loyalty members</p>
              </div>
            </div>
            <Link to="/cosmetics/loyalty" className="text-xs font-extrabold text-pink-700 hover:underline inline-flex items-center gap-1">
              Send offer <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y-2 divide-slate-100 max-h-[400px] overflow-y-auto">
            {birthdayMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Cake className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-extrabold text-slate-700">No birthdays this month</div>
              </div>
            ) : birthdayMembers.slice(0, 8).map((m: any) => (
              <Link key={m.id} to="/cosmetics/loyalty" className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/40 transition">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center shrink-0 font-extrabold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900">{m.name}</div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {m.phone} • {m.tier}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-extrabold text-pink-600">Birthday</div>
                  <div className="font-extrabold text-pink-700 text-sm">
                    {m.dateOfBirth && new Date(m.dateOfBirth).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroTile({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-400/30 to-pink-600/20 border-pink-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    rose: 'from-rose-400/30 to-rose-600/20 border-rose-300/40',
    amber: 'from-amber-400/40 to-amber-600/25 border-amber-300/50',
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
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
    pink: 'from-pink-500 to-rose-700',
    rose: 'from-rose-500 to-red-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    fuchsia: 'from-fuchsia-500 to-pink-700',
    emerald: 'from-emerald-500 to-teal-700',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-300 hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 text-center">
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
    pink: 'from-pink-500 to-rose-700|bg-pink-50 border-pink-200',
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

function CertStat({ icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-100 to-emerald-50 border-emerald-300 text-emerald-800',
    pink: 'from-pink-100 to-pink-50 border-pink-300 text-pink-800',
    green: 'from-green-100 to-green-50 border-green-300 text-green-800',
    teal: 'from-teal-100 to-teal-50 border-teal-300 text-teal-800',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} border-2 p-4 flex items-center gap-3`}>
      <div className="text-4xl shrink-0">{icon}</div>
      <div>
        <div className="text-[10px] uppercase font-extrabold opacity-75">{label}</div>
        <div className="text-2xl font-extrabold tabular-nums">{value}</div>
        <div className="text-[10px] font-bold opacity-75">products</div>
      </div>
    </div>
  );
}
