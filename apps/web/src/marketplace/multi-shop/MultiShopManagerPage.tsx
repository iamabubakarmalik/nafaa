import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Store, Plus, Search, TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, Package, Star, MapPin, Sparkles, ArrowRight, AlertCircle,
  Award, BarChart3, Copy, Send, CheckCircle2, PauseCircle, XCircle,
} from 'lucide-react';
import { multiShopApi } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function MultiShopManagerPage() {
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [search, setSearch] = useState('');
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ['multi-shop-overview'],
    queryFn: multiShopApi.overview,
    refetchInterval: 60000,
  });

  const filteredShops = overview?.shops.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) ||
           s.city?.toLowerCase().includes(search.toLowerCase());
  }) || [];

  const toggleShop = (shopId: string) => {
    setSelectedShops((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) next.delete(shopId);
      else if (next.size < 5) next.add(shopId);
      return next;
    });
  };

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Building2 className="h-3.5 w-3.5" />
              Multi-Shop Manager
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Manage All Shops</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Multi-location dashboard — cross-shop insights, comparisons, aur unified control
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedShops.size >= 2 && (
              <Button size="lg" onClick={() => setShowCompare(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
                <BarChart3 className="h-4 w-4" />
                Compare {selectedShops.size} Shops
              </Button>
            )}
            <Link to="/shops/new">
              <Button size="lg" className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20">
                <Plus className="h-4 w-4" />
                Add Shop
              </Button>
            </Link>
          </div>
        </div>

        {overview && (
          <div className="relative grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
            <HeroKpi label="Total Shops" value={overview.totalShops} icon={Store} />
            <HeroKpi label="Active" value={overview.activeShops} icon={CheckCircle2} highlight />
            <HeroKpi label="Paused" value={overview.pausedShops} icon={PauseCircle} />
            <HeroKpi label="30-Day Orders" value={overview.totalOrders30d} icon={ShoppingCart} />
            <HeroKpi label="30-Day Revenue" value={`Rs ${formatPKR(overview.totalRevenue30d)}`} icon={DollarSign} isText />
          </div>
        )}
      </section>

      {/* Best Performer + Needs Attention */}
      {overview && (overview.bestPerformer || overview.needsAttention.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {overview.bestPerformer && (
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg text-white shrink-0">
                  <Award className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-emerald-700 uppercase">🏆 Best Performer</div>
                  <div className="mt-1 font-black text-lg text-slate-900 truncate">{overview.bestPerformer.shopName}</div>
                  <div className="text-2xl font-black text-emerald-700 tabular-nums mt-1">
                    Rs {formatPKR(overview.bestPerformer.revenue)}
                  </div>
                  <Link
                    to={`/shops/${overview.bestPerformer.shopId}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-800"
                  >
                    View Dashboard <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {overview.needsAttention.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h3 className="font-black text-slate-900">Needs Attention</h3>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {overview.needsAttention.slice(0, 4).map((item, i) => (
                  <Link
                    key={i}
                    to={`/shops/${item.shopId}`}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-amber-100 transition"
                  >
                    <span className={`h-2 w-2 rounded-full ${
                      item.severity === 'high' ? 'bg-rose-500' :
                      item.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">{item.shopName}</div>
                      <div className="text-[10px] text-slate-600 font-bold truncate">{item.reason}</div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-cyan-500"
            placeholder="Search shops by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {selectedShops.size > 0 && (
          <div className="text-xs font-black text-cyan-700 bg-cyan-50 border-2 border-cyan-200 rounded-xl px-3 py-2">
            {selectedShops.size} selected · Max 5 for comparison
          </div>
        )}
      </div>

      {/* Shops Grid */}
      {filteredShops.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Store className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No shops found</h3>
          <p className="text-sm text-slate-500 mt-1">Add your first shop to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              isSelected={selectedShops.has(shop.id)}
              onToggleSelect={() => toggleShop(shop.id)}
            />
          ))}
        </div>
      )}

      {showCompare && (
        <CompareModal
          shopIds={Array.from(selectedShops)}
          allShops={overview?.shops || []}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

function HeroKpi({ label, value, icon: Icon, highlight, isText }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className={`font-black leading-none tabular-nums ${isText ? 'text-sm' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function ShopCard({ shop, isSelected, onToggleSelect }: any) {
  const statusMeta = shop.isPaused
    ? { label: 'Paused', color: 'text-amber-800', bg: 'bg-amber-100', icon: PauseCircle }
    : shop.isListedOnMarketplace
      ? { label: 'Live', color: 'text-emerald-800', bg: 'bg-emerald-100', icon: CheckCircle2 }
      : { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100', icon: XCircle };
  const StatusIcon = statusMeta.icon;

  const verifyMeta: Record<string, { emoji: string; color: string }> = {
    UNVERIFIED: { emoji: '⚪', color: 'text-slate-500' },
    BRONZE:     { emoji: '🥉', color: 'text-amber-700' },
    SILVER:     { emoji: '🥈', color: 'text-slate-600' },
    GOLD:       { emoji: '🥇', color: 'text-yellow-600' },
    PLATINUM:   { emoji: '💎', color: 'text-cyan-700' },
  };
  const vm = verifyMeta[shop.verificationLevel] || verifyMeta.UNVERIFIED;

  return (
    <div className={`rounded-2xl bg-white border-2 overflow-hidden transition-all shadow-sm hover:shadow-lg ${
      isSelected ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Header with selection */}
      <div className="relative p-4 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleSelect}
            className={`h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition ${
              isSelected ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white border-slate-300 hover:border-cyan-400'
            }`}
          >
            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
          </button>

          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <Store className="h-6 w-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <h3 className="font-black text-slate-900 truncate">{shop.name}</h3>
              <span className={vm.color}>{vm.emoji}</span>
            </div>
            {shop.city && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {shop.city}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${statusMeta.bg} ${statusMeta.color} inline-flex items-center gap-0.5`}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusMeta.label}
              </span>
              {shop.ratingCount > 0 && (
                <span className="text-[9px] font-black text-amber-700 inline-flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {shop.ratingAverage.toFixed(1)} ({shop.ratingCount})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <MiniStat label="Today" value={shop.todayOrders} icon={ShoppingCart} color="emerald" />
        <MiniStat label="Pending" value={shop.pendingOrders} icon={AlertCircle} color="amber" highlight={shop.pendingOrders > 0} />
        <MiniStat label="Products" value={shop.activeProducts} icon={Package} color="blue" />
      </div>

      <div className="px-4 pb-2">
        <div className="text-[10px] font-black text-slate-500 uppercase mb-0.5">Today Revenue</div>
        <div className="text-lg font-black text-emerald-700 tabular-nums">Rs {formatPKR(shop.todayRevenue)}</div>
      </div>

      <div className="p-3 border-t border-slate-100 flex gap-2">
        <Link
          to={`/shops/${shop.id}`}
          className="flex-1 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black inline-flex items-center justify-center gap-1 transition"
        >
          <BarChart3 className="h-3 w-3" />
          Dashboard
        </Link>
        <Link
          to={`/marketplace/dashboard?shopId=${shop.id}`}
          className="flex-1 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black inline-flex items-center justify-center gap-1 shadow"
        >
          Manage
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color, highlight }: any) {
  const colors: any = {
    emerald: 'text-emerald-700 bg-emerald-50',
    amber:   'text-amber-700 bg-amber-50',
    blue:    'text-blue-700 bg-blue-50',
  };
  return (
    <div className={`rounded-lg p-2 border ${
      highlight ? 'ring-2 ring-current border-current animate-pulse' : 'border-slate-200'
    } ${colors[color]}`}>
      <div className="flex items-center gap-1 text-[9px] font-black uppercase">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="text-sm font-black tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function CompareModal({ shopIds, allShops, onClose }: any) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { data } = useQuery({
    queryKey: ['multi-shop-compare', shopIds, range],
    queryFn: () => multiShopApi.compareShops(shopIds, range),
  });

  const maxRevenue = data?.shops.reduce((max, s) => Math.max(max, s.revenue), 0) || 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <BarChart3 className="h-3 w-3" />
              Shop Comparison
            </div>
            <h2 className="mt-2 text-xl font-black">Compare {shopIds.length} Shops</h2>
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  range === r ? 'bg-white text-cyan-700' : 'bg-white/15 backdrop-blur text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
            <button onClick={onClose} className="ml-2 h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!data ? (
            <div className="py-12 text-center">
              <Sparkles className="h-10 w-10 text-cyan-500 animate-pulse mx-auto" />
              <p className="mt-3 text-sm font-black text-slate-600">Loading comparison...</p>
            </div>
          ) : (
            <>
              {/* Revenue bars */}
              <div>
                <h3 className="font-black text-slate-900 mb-3">Revenue Comparison</h3>
                <div className="space-y-2">
                  {data.shops.map((s) => {
                    const pct = (s.revenue / maxRevenue) * 100;
                    return (
                      <div key={s.shopId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-slate-900 text-sm truncate">{s.shopName}</span>
                          <span className="font-black text-emerald-700 tabular-nums text-sm">Rs {formatPKR(s.revenue)}</span>
                        </div>
                        <div className="h-7 rounded-lg bg-slate-100 overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg" style={{ width: `${pct}%` }} />
                          <div className="absolute inset-0 flex items-center px-3 text-[10px] font-black text-white">
                            {s.orders} orders · AOV Rs {formatPKR(s.avgOrderValue)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comparison table */}
              <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-black uppercase text-slate-600">Metric</th>
                      {data.shops.map((s) => (
                        <th key={s.shopId} className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600 truncate">
                          {s.shopName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { label: 'Orders', getter: (s: any) => s.orders },
                      { label: 'Revenue', getter: (s: any) => `Rs ${formatPKR(s.revenue)}` },
                      { label: 'Avg Order Value', getter: (s: any) => `Rs ${formatPKR(s.avgOrderValue)}` },
                      { label: 'Rating', getter: (s: any) => s.rating.toFixed(1) + ' ⭐' },
                      { label: 'Conversion', getter: (s: any) => s.conversionRate.toFixed(2) + '%' },
                      { label: 'Top Product', getter: (s: any) => s.topProduct || '—' },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 font-black text-slate-700 text-xs">{row.label}</td>
                        {data.shops.map((s) => (
                          <td key={s.shopId} className="text-right px-3 py-2 font-black text-slate-900 text-xs tabular-nums">
                            {row.getter(s)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
