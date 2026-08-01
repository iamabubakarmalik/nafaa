import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Leaf, RefreshCw, AlertTriangle, Clock, Flower2, Search, X,
  TrendingDown, Package, Calendar, Sparkles,
} from 'lucide-react';
import { floristProductsApi } from '../api/products.api';
import { formatPKR } from '@core/lib/format';

export default function FloristFreshnessPage() {
  const [search, setSearch] = useState('');

  const { data: alerts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['florist-freshness-alerts'],
    queryFn: () => floristProductsApi.freshnessAlerts(),
    refetchInterval: 5 * 60_000,
  });

  const witheringToday = alerts?.witheringToday ?? [];
  const witheringSoon = alerts?.witheringSoon ?? [];
  const witheringLater = alerts?.witheringLater ?? [];

  const filterList = (list: any[]) => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((p) =>
      (p.flowerType || '').toLowerCase().includes(q) ||
      (p.color || '').toLowerCase().includes(q) ||
      (p.categoryType || '').toLowerCase().includes(q)
    );
  };

  const totalWithering = witheringToday.length + witheringSoon.length + witheringLater.length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Leaf className="h-3.5 w-3.5 text-emerald-300" /> Freshness Tracking
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🥀 Freshness</h1>
            <p className="mt-2 text-sm text-white/80">
              {totalWithering} products need attention • {witheringToday.length} withered
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <FreshnessCard label="Withered" value={witheringToday.length} icon={AlertTriangle} tone="rose" desc="Remove now" />
        <FreshnessCard label="Withering Soon" value={witheringSoon.length} icon={Clock} tone="amber" desc="1-2 days" />
        <FreshnessCard label="Getting Old" value={witheringLater.length} icon={TrendingDown} tone="blue" desc="3-5 days" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by flower, color, category..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          {witheringToday.length > 0 && (
            <FreshnessSection
              title="🥀 Withered — Remove From Display"
              desc="These products have passed their freshness date"
              tone="rose"
              products={filterList(witheringToday)}
              action="Discount 70% or dispose"
            />
          )}

          {witheringSoon.length > 0 && (
            <FreshnessSection
              title="⚠️ Withering Soon (1-2 days)"
              desc="Consider clearance pricing to move stock"
              tone="amber"
              products={filterList(witheringSoon)}
              action="Apply 30-50% discount"
            />
          )}

          {witheringLater.length > 0 && (
            <FreshnessSection
              title="⏰ Getting Old (3-5 days)"
              desc="Feature these in POS to sell first"
              tone="blue"
              products={filterList(witheringLater)}
              action="Promote / feature"
            />
          )}

          {totalWithering === 0 && (
            <div className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-16 text-center">
              <Sparkles className="h-16 w-16 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-xl font-extrabold text-emerald-900">All stock is fresh! ✨</h3>
              <p className="text-sm text-emerald-700 font-semibold mt-1">No withering alerts right now</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FreshnessCard({ label, value, icon: Icon, tone, desc }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700 border-rose-300 bg-rose-50',
    amber: 'from-amber-500 to-orange-600 border-amber-300 bg-amber-50',
    blue: 'from-blue-500 to-cyan-700 border-blue-300 bg-blue-50',
  };
  const parts = tones[tone].split(' ');
  return (
    <div className={`rounded-2xl border-2 ${parts[2]} ${parts[3]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-600">{label}</div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
          <div className="text-[10px] font-bold text-slate-500 mt-0.5">{desc}</div>
        </div>
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${parts[0]} ${parts[1]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FreshnessSection({ title, desc, tone, products, action }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700 border-rose-300',
    amber: 'from-amber-500 to-orange-600 border-amber-300',
    blue: 'from-blue-500 to-cyan-700 border-blue-300',
  };
  const parts = tones[tone].split(' ');

  return (
    <section className={`rounded-3xl bg-white border-2 ${parts[2]} shadow-sm overflow-hidden`}>
      <div className={`px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r ${parts[0]} ${parts[1]} text-white`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-extrabold text-lg">{title} ({products.length})</h3>
            <p className="text-xs font-bold text-white/85 mt-0.5">{desc}</p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur text-xs font-extrabold">
            💡 {action}
          </div>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 font-semibold">No matching products</div>
      ) : (
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {products.map((p: any) => {
            const days = p.freshUntil ? Math.ceil((new Date(p.freshUntil).getTime() - Date.now()) / 86400000) : null;
            return (
              <Link key={p.id} to={`/florist-products/${p.productId}`}
                className="rounded-2xl border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-3 transition group">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.product?.images?.[0]?.url ? (
                      <img src={p.product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Flower2 className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">
                      {p.flowerType || p.categoryType?.replace(/_/g, ' ') || 'Product'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {p.color && (
                        <span className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: p.colorHex || '#ec4899' }} />
                      )}
                      <span className="text-[10px] font-bold text-slate-500">{p.color || ''}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-600 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {days === null ? '—' : days <= 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
                  </div>
                  {p.retailPrice && (
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.retailPrice)}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
