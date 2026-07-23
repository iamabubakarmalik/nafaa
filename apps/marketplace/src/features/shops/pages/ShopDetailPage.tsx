import { useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Star, MapPin, Clock, Phone, Share2, Heart, ShoppingBag,
  ChevronLeft, Search, Filter, MessageCircle, Users, Radio,
  Store, CheckCircle2, X, Grid, List,
} from 'lucide-react';
import { shopsApi } from '../api/shops.api';
import { productsApi } from '@features/products/api/products.api';
import { cartApi } from '@features/cart/api/cart.api';
import { useCustomerAuthStore } from '@stores/customerAuth.store';
import { Button } from '@shared/ui/Button';
import { Badge } from '@shared/ui/Badge';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { EmptyState } from '@shared/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '@shared/ui/Tabs';
import { cn } from '@lib/cn';

const VERIFY_CONFIG: Record<string, { emoji: string; label: string; bg: string }> = {
  BRONZE:   { emoji: '🥉', label: 'Bronze',   bg: 'bg-amber-100 text-amber-800' },
  SILVER:   { emoji: '🥈', label: 'Silver',   bg: 'bg-slate-200 text-slate-700' },
  GOLD:     { emoji: '🥇', label: 'Gold',     bg: 'bg-yellow-100 text-yellow-800' },
  PLATINUM: { emoji: '💎', label: 'Platinum', bg: 'bg-cyan-100 text-cyan-800' },
};

export default function ShopDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuth = useCustomerAuthStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState<'products' | 'reviews' | 'about'>('products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ['market-shop', slug],
    queryFn: () => shopsApi.bySlug(slug!),
    enabled: !!slug,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', shop?.shopId, search],
    queryFn: () => productsApi.search({ shopId: shop!.shopId, q: search, limit: 50 }),
    enabled: !!shop?.shopId,
  });

  const { data: reviews } = useQuery({
    queryKey: ['shop-reviews', shop?.shopId],
    queryFn: () => shopsApi.reviews(shop!.shopId, { limit: 20 }),
    enabled: !!shop?.shopId && tab === 'reviews',
  });

  const followMutation = useMutation({
    mutationFn: () => shop?.isFollowing ? shopsApi.unfollow(shop.shopId) : shopsApi.follow(shop!.shopId),
    onSuccess: () => {
      toast.success(shop?.isFollowing ? 'Unfollowed' : 'Followed! 🎉');
      refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Error'),
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => cartApi.add({ productId, quantity: 1 }),
    onSuccess: () => {
      toast.success('Cart mein add ho gaya 🛒', {
        action: { label: 'View', onClick: () => navigate('/cart') },
      });
      queryClient.invalidateQueries({ queryKey: ['market-cart'] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        toast.error('Pehle login karein');
        navigate('/login');
      } else {
        toast.error(err?.response?.data?.message || 'Error');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-3xl skeleton" />
        <SkeletonCard />
      </div>
    );
  }

  if (!shop) {
    return (
      <EmptyState
        emoji="🏪"
        title="Shop nahi mila"
        description="Ye shop marketplace pe available nahi"
        action={<Button onClick={() => navigate('/shops')}>All Shops</Button>}
      />
    );
  }

  const verify = VERIFY_CONFIG[shop.verificationLevel];

  return (
    <div className="pb-24 space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* HERO — Cover + Logo */}
      <div className="relative rounded-3xl overflow-hidden shadow-soft-lg">
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700">
          {shop.coverUrl && (
            <img src={shop.coverUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top actions */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copy ho gaya');
              }}
              className="h-9 w-9 rounded-xl bg-white/95 backdrop-blur flex items-center justify-center shadow-md"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-slate-700" />
            </button>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {verify && (
              <span className={cn('px-2 py-1 rounded-lg text-[10px] font-extrabold shadow', verify.bg)}>
                {verify.emoji} {verify.label}
              </span>
            )}
            {shop.currentlyOpen === false && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500 text-white shadow">
                🔒 Closed
              </span>
            )}
          </div>
        </div>

        {/* Logo + Info floating */}
        <div className="bg-white dark:bg-neutral-900 p-4 border-t border-slate-100 dark:border-neutral-800">
          <div className="flex items-start gap-3 -mt-16 relative">
            <div className="h-24 w-24 rounded-2xl bg-white dark:bg-neutral-800 shadow-soft-lg border-4 border-white dark:border-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store className="h-12 w-12 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-14">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white truncate">
                  {shop.publicName}
                </h1>
                {verify && <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0" />}
              </div>
              {shop.tagline && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {shop.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatItem
              icon={<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
              label={shop.ratingAverage?.toFixed(1) || '—'}
              sub={`${shop.ratingCount || 0} reviews`}
            />
            <StatItem
              icon={<ShoppingBag className="h-4 w-4 text-brand-600" />}
              label={shop.totalOrders?.toString() || '0'}
              sub="orders"
            />
            <StatItem
              icon={<Users className="h-4 w-4 text-purple-600" />}
              label={shop.followerCount?.toString() || '0'}
              sub="followers"
            />
            <StatItem
              icon={<Clock className="h-4 w-4 text-blue-600" />}
              label={shop.estimatedDeliveryMinutes ? `${shop.estimatedDeliveryMinutes}m` : '—'}
              sub="delivery"
            />
          </div>

          {/* Meta info */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            {shop.area && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-600" />
                <span className="font-bold">{shop.area}, {shop.city}</span>
              </div>
            )}
            {shop.distanceKm != null && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold">{shop.distanceKm.toFixed(1)} km away</span>
              </div>
            )}
          </div>

          {/* Feature badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shop.offersDelivery && (
              <Badge variant="brand" size="sm">🚚 Delivery</Badge>
            )}
            {shop.offersPickup && (
              <Badge variant="info" size="sm">🏃 Pickup</Badge>
            )}
            {shop.bargainEnabled && (
              <Badge variant="accent" size="sm">💰 Bargain</Badge>
            )}
            {shop.groupBuyEnabled && (
              <Badge variant="warning" size="sm">👥 Group Buy</Badge>
            )}
            {shop.auctionEnabled && (
              <Badge variant="danger" size="sm">🔨 Auction</Badge>
            )}
            {shop.liveShopEnabled && (
              <Badge variant="danger" size="sm" dot pulse>Live</Badge>
            )}
          </div>

          {/* Delivery info */}
          {shop.offersDelivery && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border border-brand-200 dark:border-brand-800">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    Delivery Fee: {shop.deliveryFee > 0 ? `Rs ${shop.deliveryFee}` : 'FREE'}
                  </div>
                  {shop.freeDeliveryAbove && (
                    <div className="text-slate-500 mt-0.5">
                      FREE above Rs {shop.freeDeliveryAbove}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    Min Order: Rs {shop.minOrderAmount || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Follow button */}
          <div className="mt-4 flex gap-2">
            <Button
              variant={shop.isFollowing ? 'outline' : 'gradient'}
              size="md"
              fullWidth
              onClick={() => {
                if (!isAuth) return navigate('/login');
                followMutation.mutate();
              }}
              loading={followMutation.isPending}
              leftIcon={<Heart className={cn('h-4 w-4', shop.isFollowing && 'fill-current')} />}
            >
              {shop.isFollowing ? 'Following' : 'Follow Shop'}
            </Button>
            {shop.contactPhone && (
              <a
                href={`tel:${shop.contactPhone}`}
                className="h-11 w-11 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center hover:bg-brand-200 dark:hover:bg-brand-900/60 transition"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onChange={(v) => setTab(v as any)}>
        <TabsList variant="underline" className="overflow-x-auto no-scrollbar">
          <TabsTrigger value="products" variant="underline">
            📦 Products ({products?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="reviews" variant="underline">
            ⭐ Reviews ({shop.ratingCount || 0})
          </TabsTrigger>
          <TabsTrigger value="about" variant="underline">
            ℹ️ About
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* TAB CONTENT — PRODUCTS */}
      {tab === 'products' && (
        <>
          {/* Search + View toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Products search karein..."
                className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-11 w-11 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 flex items-center justify-center hover:border-brand-500"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </button>
          </div>

          {productsLoading ? (
            <div className={cn(
              'grid gap-3',
              viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1',
            )}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !products?.items?.length ? (
            <EmptyState
              emoji="📦"
              title="Koi product nahi"
              description={search ? 'Kuch aur search karein' : 'Shop khali hai abhi'}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.items.map((p: any) => (
                <ProductGridCard
                  key={p.productId}
                  product={p}
                  onAdd={() => addToCartMutation.mutate(p.productId)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {products.items.map((p: any) => (
                <ProductListCard
                  key={p.productId}
                  product={p}
                  onAdd={() => addToCartMutation.mutate(p.productId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT — REVIEWS */}
      {tab === 'reviews' && (
        <div className="space-y-3">
          {!reviews?.items?.length ? (
            <EmptyState emoji="⭐" title="Koi review nahi abhi" description="Pehla review dein!" />
          ) : (
            reviews.items.map((r: any) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center font-extrabold">
                    {r.customer?.fullName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {r.customer?.fullName || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3 w-3',
                            i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300',
                          )}
                        />
                      ))}
                      <span className="text-[10px] text-slate-500 ml-1">
                        {new Date(r.createdAt).toLocaleDateString('en-PK')}
                      </span>
                    </div>
                  </div>
                </div>
                {r.title && (
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{r.title}</div>
                )}
                {r.comment && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{r.comment}</p>
                )}
                {r.photos?.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {r.photos.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        className="h-16 w-16 rounded-lg object-cover"
                        alt=""
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT — ABOUT */}
      {tab === 'about' && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 shadow-soft space-y-4">
          {shop.description && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                About
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {shop.description}
              </p>
            </div>
          )}
          {(shop.contactPhone || shop.contactEmail) && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Contact
              </div>
              {shop.contactPhone && (
                <a
                  href={`tel:${shop.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400 font-bold"
                >
                  <Phone className="h-4 w-4" /> {shop.contactPhone}
                </a>
              )}
              {shop.contactEmail && (
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  📧 {shop.contactEmail}
                </div>
              )}
            </div>
          )}
          {shop.openingHours && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Opening Hours
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                {typeof shop.openingHours === 'string' ? shop.openingHours : JSON.stringify(shop.openingHours)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatItem({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800/50 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{label}</div>
      <div className="text-[9px] text-slate-500 font-bold uppercase">{sub}</div>
    </div>
  );
}

function ProductGridCard({ product, onAdd }: { product: any; onAdd: () => void }) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.publicPrice) / product.compareAtPrice) * 100)
    : 0;
  return (
    <NavLink
      to={`/products/${product.productId}`}
      className="group rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-neutral-800 overflow-hidden">
        {product.publicImages?.[0] ? (
          <img
            src={product.publicImages[0]}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            alt=""
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">📦</div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 leading-tight min-h-[2rem]">
          {product.publicName}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-extrabold text-brand-700 dark:text-brand-400 text-sm">
            Rs {Number(product.publicPrice).toFixed(0)}
          </span>
          {product.compareAtPrice && (
            <span className="text-[10px] text-slate-400 line-through">
              Rs {Number(product.compareAtPrice).toFixed(0)}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); onAdd(); }}
          className="mt-2 w-full h-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-xs font-extrabold hover:bg-brand-600 hover:text-white transition"
        >
          + Cart
        </button>
      </div>
    </NavLink>
  );
}

function ProductListCard({ product, onAdd }: { product: any; onAdd: () => void }) {
  return (
    <NavLink
      to={`/products/${product.productId}`}
      className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg transition-all"
    >
      <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden shrink-0">
        {product.publicImages?.[0] ? (
          <img src={product.publicImages[0]} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">📦</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight">
          {product.publicName}
        </h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-extrabold text-brand-700 dark:text-brand-400 text-base">
            Rs {Number(product.publicPrice).toFixed(0)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-slate-400 line-through">
              Rs {Number(product.compareAtPrice).toFixed(0)}
            </span>
          )}
        </div>
        {product.ratingCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[11px]">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {product.ratingAverage?.toFixed(1)} ({product.ratingCount})
            </span>
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.preventDefault(); onAdd(); }}
        className="self-center h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 text-white shadow-brand flex items-center justify-center hover:scale-105 transition shrink-0"
      >
        <ShoppingBag className="h-4 w-4" />
      </button>
    </NavLink>
  );
}
