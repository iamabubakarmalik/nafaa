import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Store, Package, ShoppingCart, MessageCircle, Star, Users, Bike,
  Gavel, Radio, MessageSquare, TrendingUp, Sparkles, Rocket,
  AlertCircle, CheckCircle2, Clock, ChefHat, Eye, EyeOff, ArrowRight,
  Megaphone, Percent, BarChart3,
} from 'lucide-react';
import { dashboardApi } from '../shared/marketplace.api';
import { VERIFICATION_META, ORDER_STATUS_META, relativeTime } from '../shared/status-utils';
import { formatPKR } from '@core/lib/format';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getIndustryTheme } from '../shared/industry-themes';

export default function MarketplaceDashboardPage() {
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 30_000, // auto refresh every 30s
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  const isListed = data.shop.isListed;
  const verify = VERIFICATION_META[data.shop.verificationLevel as keyof typeof VERIFICATION_META] || VERIFICATION_META.UNVERIFIED;

  return (
    <div className="space-y-6 pb-10">
      {/* ═══ HERO ═══ */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Store className="h-3.5 w-3.5" />
              <span>{theme.emoji}</span>
              Nafaa Bazaar
              {isListed && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px]">LIVE</span>
              )}
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-black leading-tight">Marketplace Dashboard</h1>
            <p className="mt-1 text-sm text-white/85 font-medium">
              {isListed ? 'Aap ki shop marketplace pe live hai — customers order kar rahe hain!' : 'Publish karke customers reach karein'}
            </p>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${verify.bg} ${verify.color}`}>
                <span className="text-base">{verify.emoji}</span> {verify.label}
              </div>
              {data.shop.ratingCount > 0 && (
                <div className="inline-flex items-center gap-1.5 text-sm font-black">
                  <Star className="h-4 w-4 text-amber-300 fill-amber-300" />
                  {data.shop.ratingAverage.toFixed(1)} <span className="text-white/70 font-medium">({data.shop.ratingCount})</span>
                </div>
              )}
              {data.shop.followerCount > 0 && (
                <div className="inline-flex items-center gap-1.5 text-sm font-black">
                  <Users className="h-4 w-4" /> {data.shop.followerCount} <span className="text-white/70 font-medium">followers</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!isListed && (
              <Link
                to="/marketplace/shop-profile"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg text-sm"
              >
                <Rocket className="h-4 w-4" /> Publish Now
              </Link>
            )}
            <Link
              to="/marketplace/shop-profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black shadow-lg text-sm"
            >
              <Store className="h-4 w-4" /> Shop Profile
            </Link>
          </div>
        </div>

        {/* KPIs Row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <HeroKpi
            label="Today Orders"
            value={data.orders.todayCount}
            sub={`Rs ${formatPKR(data.orders.todayRevenue)}`}
            icon={ShoppingCart}
          />
          <HeroKpi
            label="Pending"
            value={data.orders.pendingCount}
            sub="need action"
            icon={Clock}
            highlight={data.orders.pendingCount > 0}
          />
          <HeroKpi
            label="Preparing"
            value={data.orders.preparingCount}
            sub="in kitchen"
            icon={ChefHat}
          />
          <HeroKpi
            label="On the Way"
            value={data.orders.outForDeliveryCount}
            sub="with rider"
            icon={Bike}
          />
        </div>
      </section>

      {/* ═══ NOT PUBLISHED BANNER ═══ */}
      {!isListed && (
        <section className="rounded-2xl p-5 border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-md shrink-0">
              <Rocket className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="font-black text-lg text-slate-900">🚀 Publish karne ke liye tayyar?</div>
              <p className="text-sm text-slate-700 font-medium mt-1">
                Shop profile complete karke publish karein — 12,000+ Nafaa Bazaar customers aapki dukan tak pahunchenge.
              </p>
            </div>
            <Link
              to="/marketplace/shop-profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow"
            >
              Setup Profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ QUICK ACTIONS GRID ═══ */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickActionCard
            to="/marketplace/orders"
            icon={ShoppingCart}
            label="Orders"
            value={data.orders.pendingCount}
            sub="pending"
            color="orange"
            urgent={data.orders.pendingCount > 0}
          />
          <QuickActionCard
            to="/marketplace/products"
            icon={Package}
            label="Products"
            value={data.products.listed}
            sub={`of ${data.products.total} listed`}
            color="emerald"
          />
          <QuickActionCard
            to="/marketplace/reviews"
            icon={Star}
            label="Reviews"
            value={data.activity.unrespondedReviews}
            sub="unresponded"
            color="amber"
            urgent={data.activity.unrespondedReviews > 0}
          />
          <QuickActionCard
            to="/marketplace/messages"
            icon={MessageCircle}
            label="Messages"
            value={data.activity.unreadMessages}
            sub="unread"
            color="blue"
            urgent={data.activity.unreadMessages > 0}
          />
          <QuickActionCard
            to="/marketplace/bargains"
            icon={MessageSquare}
            label="Bargains"
            value={data.activity.activeBargains}
            sub="active"
            color="purple"
          />
          <QuickActionCard
            to="/marketplace/group-buys"
            icon={Users}
            label="Group Buys"
            value={data.activity.activeGroupBuys}
            sub="running"
            color="pink"
          />
          <QuickActionCard
            to="/marketplace/auctions"
            icon={Gavel}
            label="Auctions"
            value={data.activity.liveAuctions}
            sub="live now"
            color="red"
          />
          <QuickActionCard
            to="/marketplace/live-shop"
            icon={Radio}
            label="Live Shop"
            value={data.activity.upcomingLiveShows}
            sub="scheduled"
            color="rose"
          />
        </div>
      </section>

      {/* ═══ RECENT ORDERS + ACTIVITY ═══ */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Recent orders */}
        <section className="rounded-3xl bg-white border-2 border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-black text-lg">Recent Orders</h2>
              <p className="text-xs text-slate-500 font-medium">Latest customer orders</p>
            </div>
            <Link
              to="/marketplace/orders"
              className="text-xs font-black text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {data.recent.orders.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">Abhi tak koi order nahi</p>
                <p className="text-xs text-slate-400 mt-1">Customers order karenge to yahan dikhega</p>
              </div>
            ) : (
              data.recent.orders.map((order) => {
                const meta = ORDER_STATUS_META[order.status];
                const StatusIcon = meta.icon;
                return (
                  <Link
                    key={order.id}
                    to={`/marketplace/orders/${order.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 transition"
                  >
                    <div className={`h-10 w-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900">#{order.orderNumber}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium truncate">
                        {order.customer?.fullName || 'Customer'} · {order.itemCount || order.items?.length || 0} items
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {relativeTime(order.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-emerald-700">Rs {formatPKR(order.total)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">{order.paymentMethod}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Activity feed */}
        <section className="space-y-4">
          {/* Growth Card */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 shadow-md">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <h3 className="font-black">This Month</h3>
            </div>
            <div className="text-3xl font-black mt-2">{data.orders.monthCount}</div>
            <div className="text-xs text-white/80 font-medium">orders received</div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-xl font-black">Rs {formatPKR(data.orders.monthRevenue)}</div>
              <div className="text-xs text-white/80 font-medium">total revenue</div>
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="rounded-3xl bg-white border-2 border-slate-100 p-5 shadow-sm">
            <h3 className="font-black flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Suggested for you
            </h3>
            <div className="space-y-2">
              <SuggestionRow
                to="/marketplace/promotions"
                icon={Percent}
                title="Create your first coupon"
                desc="Bring more customers with a discount"
                color="pink"
              />
              <SuggestionRow
                to="/marketplace/live-shop"
                icon={Radio}
                title="Schedule a live show"
                desc="Reach 10x customers with live streaming"
                color="rose"
              />
              <SuggestionRow
                to="/marketplace/products"
                icon={Package}
                title={`Publish ${data.products.unlisted} more products`}
                desc="Get more visibility"
                color="emerald"
              />
              <SuggestionRow
                to="/marketplace/analytics"
                icon={BarChart3}
                title="Check your analytics"
                desc="See what's selling best"
                color="blue"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroKpi({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`relative rounded-2xl backdrop-blur border p-3 ${
      highlight
        ? 'bg-amber-500/25 border-amber-300/50 ring-2 ring-amber-300/40'
        : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90">{label}</div>
        {highlight && (
          <span className="ml-auto flex h-2 w-2">
            <span className="animate-ping absolute h-2 w-2 rounded-full bg-amber-300 opacity-75"></span>
            <span className="relative rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
        )}
      </div>
      <div className="text-xl font-black leading-none tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold opacity-80 mt-0.5">{sub}</div>}
    </div>
  );
}

const COLOR_MAP: Record<string, { bg: string; text: string; light: string; hover: string }> = {
  orange:  { bg: 'bg-orange-600',  text: 'text-orange-700',  light: 'bg-orange-50',  hover: 'hover:bg-orange-100' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50',   hover: 'hover:bg-amber-100' },
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-700',    light: 'bg-blue-50',    hover: 'hover:bg-blue-100' },
  purple:  { bg: 'bg-purple-600',  text: 'text-purple-700',  light: 'bg-purple-50',  hover: 'hover:bg-purple-100' },
  pink:    { bg: 'bg-pink-600',    text: 'text-pink-700',    light: 'bg-pink-50',    hover: 'hover:bg-pink-100' },
  red:     { bg: 'bg-red-600',     text: 'text-red-700',     light: 'bg-red-50',     hover: 'hover:bg-red-100' },
  rose:    { bg: 'bg-rose-600',    text: 'text-rose-700',    light: 'bg-rose-50',    hover: 'hover:bg-rose-100' },
};

function QuickActionCard({ to, icon: Icon, label, value, sub, color, urgent }: any) {
  const c = COLOR_MAP[color];
  return (
    <Link
      to={to}
      className={`group relative rounded-2xl border-2 p-4 transition-all overflow-hidden ${
        urgent
          ? `bg-white ${c.text} border-current shadow-md ring-2 ring-current/20 hover:shadow-lg`
          : `bg-white border-slate-100 hover:border-slate-200 hover:shadow-md`
      }`}
    >
      {urgent && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute h-2 w-2 rounded-full bg-current opacity-75"></span>
          <span className="relative rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      <div className={`h-10 w-10 rounded-xl ${c.bg} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-2xl font-black tabular-nums">{value}</div>
      <div className={`text-xs font-black ${c.text}`}>{label}</div>
      {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
    </Link>
  );
}

function SuggestionRow({ to, icon: Icon, title, desc, color }: any) {
  const c = COLOR_MAP[color];
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-xl ${c.light} ${c.hover} transition group`}
    >
      <div className={`h-8 w-8 rounded-lg ${c.bg} text-white flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-slate-900 truncate">{title}</div>
        <div className="text-[11px] text-slate-500 font-medium truncate">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
    </Link>
  );
}
