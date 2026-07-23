import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronRight, TrendingUp, Sparkles, Users, Radio, Gavel,
  MessageCircle, Truck, Shield, Zap, Gift, Store, Star,
  ShoppingBag, Clock, MapPin, Search,
} from 'lucide-react';
import { homeApi } from '../api/home.api';
import { useLocationStore } from '@stores/location.store';
import { ShopCard } from '../components/ShopCard';
import { ProductCard } from '../components/ProductCard';
import { CategoryPill } from '../components/CategoryPill';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Button } from '@shared/ui/Button';

// Default categories to show even when DB is empty
const DEFAULT_CATEGORIES = [
  { name: 'Kiryana',     productCount: 0, emoji: '🛒' },
  { name: 'Food',        productCount: 0, emoji: '🍔' },
  { name: 'Fashion',     productCount: 0, emoji: '👕' },
  { name: 'Mobile',      productCount: 0, emoji: '📱' },
  { name: 'Electronics', productCount: 0, emoji: '💻' },
  { name: 'Bakery',      productCount: 0, emoji: '🍰' },
  { name: 'Pharmacy',    productCount: 0, emoji: '💊' },
  { name: 'Jewelry',     productCount: 0, emoji: '💎' },
  { name: 'Meat',        productCount: 0, emoji: '🥩' },
  { name: 'Dairy',       productCount: 0, emoji: '🥛' },
  { name: 'Hardware',    productCount: 0, emoji: '🔧' },
  { name: 'Books',       productCount: 0, emoji: '📚' },
];

const QUICK_ACTIONS = [
  { to: '/bargains',   icon: MessageCircle, label: 'Bargain',    desc: 'Mol-bhaav karein',  gradient: 'from-purple-500 to-pink-600' },
  { to: '/group-buys', icon: Users,         label: 'Group Buy',  desc: 'Milkar sasta',      gradient: 'from-orange-500 to-red-600' },
  { to: '/auctions',   icon: Gavel,         label: 'Auction',    desc: 'Live bidding',      gradient: 'from-rose-500 to-red-600' },
  { to: '/live',       icon: Radio,         label: 'Live Shop',  desc: 'Video shopping',    gradient: 'from-red-500 to-pink-500' },
];

const TRUST_STATS = [
  { icon: Store,    value: '10,000+', label: 'Verified Shops' },
  { icon: Truck,    value: '30 min',  label: 'Fast Delivery' },
  { icon: Shield,   value: '100%',    label: 'Safe Payment' },
  { icon: Users,    value: '500K+',   label: 'Happy Customers' },
];

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

export default function HomePage() {
  const navigate = useNavigate();
  const { lat, lng, city, requestGeolocation, setLocation } = useLocationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['market-home', lat, lng, city],
    queryFn: () => homeApi.discover({
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      city: city ?? undefined,
      radiusKm: 10,
    }),
    retry: 1,
  });

  const categories = data?.categories?.length ? data.categories : DEFAULT_CATEGORIES;
  const hasShops = (data?.nearbyShops?.length ?? 0) > 0 || (data?.featuredShops?.length ?? 0) > 0;
  const hasProducts = (data?.trendingProducts?.length ?? 0) > 0;

  return (
    <div className="space-y-6 -mt-4">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-emerald-700 to-teal-800 text-white shadow-brand-lg">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />

        <div className="relative px-5 py-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] font-extrabold mb-4">
            <Sparkles className="h-3 w-3 text-amber-300" />
            Pakistan's #1 Marketplace
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-[1.1] tracking-tight">
            Sab kuch <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">ek hi jaga</span> milega
          </h1>
          <p className="text-emerald-100 text-sm mt-2 max-w-md">
            Nazdeek dukanein, tez delivery, mol-bhaav ki suvidha — sab digital! 🇵🇰
          </p>

          {/* Search CTA */}
          <button
            onClick={() => navigate('/search')}
            className="mt-4 w-full sm:max-w-md flex items-center gap-3 h-12 px-4 rounded-2xl bg-white/95 backdrop-blur text-slate-500 shadow-lg hover:bg-white transition"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm font-semibold">Kya dhoond rahe hain?</span>
            <span className="ml-auto text-[10px] font-extrabold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
              🎤 Voice
            </span>
          </button>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {TRUST_STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center rounded-xl bg-white/10 backdrop-blur p-2">
                  <Icon className="h-4 w-4 text-amber-300 mx-auto mb-1" />
                  <div className="text-xs font-black">{s.value}</div>
                  <div className="text-[9px] text-emerald-100 leading-tight">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ QUICK ACTIONS — UNIQUE FEATURES ═══ */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((qa) => {
            const Icon = qa.icon;
            return (
              <NavLink
                key={qa.to}
                to={qa.to}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all p-3"
              >
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${qa.gradient} flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white">{qa.label}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">{qa.desc}</div>
              </NavLink>
            );
          })}
        </div>
      </section>

      {/* ═══ LOCATION PROMPT (if not set) ═══ */}
      {!lat && !city && (
        <section className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/20 border-2 border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                Apni location select karein
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Nazdeek dukanein aur tez delivery ke liye
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="gradient"
                  leftIcon={<MapPin className="h-3.5 w-3.5" />}
                  onClick={async () => {
                    const ok = await requestGeolocation();
                    if (ok) location.reload();
                  }}
                >
                  Auto Detect
                </Button>
                <span className="text-xs font-bold text-slate-500">ya city choose karein:</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setLocation({ city: c }); location.reload(); }}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-800 text-[11px] font-extrabold text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ CATEGORIES — Always show ═══ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            🏷️ Categories
          </h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {categories.slice(0, 12).map((c: any) => (
            <NavLink
              key={c.name}
              to={`/search?category=${encodeURIComponent(c.name)}`}
              className="group flex flex-col items-center gap-2 transition"
            >
              <div className="h-16 w-16 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft flex items-center justify-center text-3xl group-hover:scale-110 group-hover:shadow-brand transition-all group-hover:border-brand-300">
                {c.emoji || '🏷️'}
              </div>
              <div className="text-center">
                <div className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-1">
                  {c.name}
                </div>
                {c.productCount > 0 && (
                  <div className="text-[9px] text-slate-500 font-bold">
                    {c.productCount} items
                  </div>
                )}
              </div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* ═══ LIVE SHOPS NOW ═══ */}
      {(data?.liveShops?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="h-5 w-5 text-rose-500 animate-pulse-soft" />
              Live Abhi
            </h2>
            <NavLink to="/live" className="text-xs font-extrabold text-brand-700 dark:text-brand-400 flex items-center gap-0.5">
              Sab dekhein <ChevronRight className="h-3 w-3" />
            </NavLink>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            {data.liveShops.map((ls: any) => (
              <NavLink
                key={ls.id}
                to={`/live/${ls.id}`}
                className="flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-slate-900 relative shadow-soft-lg"
              >
                <div className="aspect-[9/16] bg-gradient-to-b from-rose-600 via-pink-600 to-purple-700 relative">
                  {ls.thumbnailUrl && (
                    <img src={ls.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black animate-pulse-soft">
                    🔴 LIVE
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <div className="text-xs font-extrabold line-clamp-2 leading-tight">{ls.title}</div>
                    <div className="text-[10px] text-white/80 mt-0.5">👁 {ls.peakViewerCount || 0}</div>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* ═══ GROUP BUYS ═══ */}
      {(data?.activeGroupBuys?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Group Buy — Milkar Save Karein
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.activeGroupBuys.slice(0, 4).map((gb: any) => {
              const progress = Math.min(100, (gb.currentCount / gb.minParticipants) * 100);
              return (
                <NavLink
                  key={gb.id}
                  to={`/group-buys/${gb.id}`}
                  className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800/50 p-3 shadow-soft hover:shadow-soft-lg transition"
                >
                  <div className="text-xs font-extrabold line-clamp-1 text-slate-900 dark:text-white">
                    {gb.productName}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-black text-orange-700 dark:text-orange-400">
                      Rs {Number(gb.groupPrice).toFixed(0)}
                    </span>
                    <span className="text-[10px] line-through text-slate-400">
                      Rs {Number(gb.regularPrice).toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-orange-200 dark:bg-orange-900/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {gb.currentCount}/{gb.minParticipants} joined
                  </div>
                </NavLink>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ NEARBY SHOPS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            📍 Nearby Shops
          </h2>
          <NavLink to="/shops" className="text-xs font-extrabold text-brand-700 dark:text-brand-400 flex items-center gap-0.5">
            Sab dekhein <ChevronRight className="h-3 w-3" />
          </NavLink>
        </div>
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64"><SkeletonCard /></div>
            ))}
          </div>
        ) : hasShops ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            {(data?.nearbyShops || data?.featuredShops || []).map((shop: any) => (
              <ShopCard key={shop.shopId} shop={shop} />
            ))}
          </div>
        ) : (
          <EmptyShopsBanner />
        )}
      </section>

      {/* ═══ TRENDING PRODUCTS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Trending Products
          </h2>
        </div>
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-40"><SkeletonCard /></div>
            ))}
          </div>
        ) : hasProducts ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            {data.trendingProducts.map((p: any) => <ProductCard key={p.productId} product={p} />)}
          </div>
        ) : (
          <EmptyProductsBanner />
        )}
      </section>

      {/* ═══ REFERRAL BANNER ═══ */}
      <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 p-5 text-white shadow-soft-lg relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Gift className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-90">
              Refer & Earn
            </div>
            <div className="font-black text-lg leading-tight">
              Har friend pe Rs 100! 🎁
            </div>
            <div className="text-xs text-white/90 mt-0.5">
              Friend register kare → aap ko + usko dono ko bonus
            </div>
          </div>
          <NavLink
            to="/profile/referrals"
            className="shrink-0 h-10 px-4 rounded-xl bg-white text-purple-700 font-extrabold text-xs shadow-lg hover:scale-105 transition"
          >
            Share
          </NavLink>
        </div>
      </section>

      {/* ═══ WHY NAFAA BAZAAR ═══ */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 shadow-soft">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 text-center">
          Nafaa Bazaar hi <span className="text-brand-600">kyun?</span> 🤔
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <FeatureBox icon={Zap} title="Tez Delivery" desc="30 min mein ghar tak" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" />
          <FeatureBox icon={Shield} title="100% Safe" desc="JazzCash + Easypaisa verified" color="text-brand-600" bg="bg-brand-50 dark:bg-brand-950/30" />
          <FeatureBox icon={MessageCircle} title="Bargain" desc="Chhote-mote sauda karein" color="text-purple-600" bg="bg-purple-50 dark:bg-purple-950/30" />
          <FeatureBox icon={Star} title="Loyalty Points" desc="Har khareed pe points" color="text-rose-500" bg="bg-rose-50 dark:bg-rose-950/30" />
        </div>
      </section>

      {/* ═══ FOOTER SPACE ═══ */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
          <Sparkles className="h-3 w-3 text-brand-500" />
          Made with ❤️ in Pakistan 🇵🇰
        </div>
      </div>
    </div>
  );
}

function EmptyShopsBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-800 border-2 border-dashed border-slate-300 dark:border-neutral-700 p-6 text-center">
      <div className="text-4xl mb-2">🏪</div>
      <div className="font-extrabold text-slate-900 dark:text-white">Aap ke aas paas koi shop nahi</div>
      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
        Location update karein ya alag city choose karein — hum zaroor koi dukan dhoondhenge!
      </p>
    </div>
  );
}

function EmptyProductsBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border border-brand-200 dark:border-brand-800 p-6 text-center">
      <div className="text-4xl mb-2">🚀</div>
      <div className="font-extrabold text-slate-900 dark:text-white">Products jaldi aa rahe hain!</div>
      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
        Shop owners apne products list kar rahe hain — thora intezaar karein
      </p>
    </div>
  );
}

function FeatureBox({ icon: Icon, title, desc, color, bg }: any) {
  return (
    <div className={`p-3 rounded-2xl ${bg}`}>
      <Icon className={`h-5 w-5 ${color} mb-2`} />
      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{title}</div>
      <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-bold">{desc}</div>
    </div>
  );
}
