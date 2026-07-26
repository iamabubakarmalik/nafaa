import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Sparkles, TrendingUp, MapPin, Zap, Users, Video, ShieldCheck,
  Search, ArrowRight, Star, Gift, Bike,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { homeApi } from '../api/home.api';
import { useLocationStore } from '@/stores/location.store';
import { Section } from '../components/Section';
import { HorizontalScroll } from '../components/HorizontalScroll';
import { ShopCard, ShopCardSkeleton } from '../components/ShopCard';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { CategoryChip } from '../components/CategoryChip';
import { Card, Button, EmptyState } from '@/ui';
import { formatPrice, formatDistance, formatDuration } from '@/lib/format';
import { StoriesBar } from '@/features/shop-stories/components/StoriesBar';
import { FlashSaleBanner } from '@/components/FlashSaleBanner';
import { DailyStreak } from '@/features/streaks/components/DailyStreak';
import { FollowSuggestions } from '@/features/follow-suggestions/components/FollowSuggestions';

export default function HomePage() {
  const { t } = useTranslation();
  const { lat, lng, city } = useLocationStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['discover', lat, lng, city],
    queryFn: () => homeApi.discover({ lat: lat ?? undefined, lng: lng ?? undefined, city: city ?? undefined, radiusKm: 50 }),
    staleTime: 60_000,
  });

  return (
    <>
      <Helmet>
        <title>Nafaa Bazaar — Pakistan's #1 Marketplace | Fast Delivery</title>
        <meta name="description" content="Shop from thousands of nearby verified shops. Fast delivery, bargain feature, best prices." />
      </Helmet>

      <div className="space-y-8">
        {/* ═══ HERO ═══ */}
        <Card className="relative overflow-hidden border-0 shadow-soft-lg">
          <div className="absolute inset-0 bg-gradient-brand" />
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl translate-y-1/4 -translate-x-1/4" />

          <div className="relative z-10 p-6 md:p-10 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-4">
              <Sparkles className="h-3.5 w-3.5 text-accent-300" />
              #1 in Pakistan 🇵🇰
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-[1.05] mb-3">
              {t('home.hero')}
            </h1>
            <p className="text-brand-50 text-base md:text-lg max-w-2xl">
              {t('home.subhero')}
            </p>

            <Link
              to="/search"
              className="mt-6 inline-flex items-center gap-3 h-12 md:h-14 pl-5 pr-3 rounded-2xl bg-white text-content shadow-xl hover:shadow-2xl transition group max-w-lg w-full"
            >
              <Search className="h-4 w-4 text-content-subtle" />
              <span className="flex-1 text-left text-sm md:text-base text-content-muted">
                {t('home.searchPlaceholder')}
              </span>
              <span className="h-9 md:h-10 px-4 rounded-xl bg-brand-600 group-hover:bg-brand-700 text-white text-sm font-black flex items-center gap-1.5 transition">
                Search
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm">
              <div className="inline-flex items-center gap-1.5 text-brand-50">
                <ShieldCheck className="h-4 w-4 text-accent-300" />
                <span className="font-bold">10,000+ verified shops</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-brand-50">
                <Bike className="h-4 w-4 text-accent-300" />
                <span className="font-bold">30-min delivery</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-brand-50">
                <Star className="h-4 w-4 fill-accent-300 text-accent-300" />
                <span className="font-bold">Trusted by 500k+</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Shop stories */}
        <StoriesBar />

        {/* Flash sale banner */}
        <FlashSaleBanner />

        {/* Daily streak */}
        <DailyStreak />

        {/* ═══ Loading / Error ═══ */}
        {isLoading && <HomeSkeleton />}
        {error && (
          <EmptyState
            icon={Sparkles}
            title="Couldn't load home"
            description="Check your connection and try again"
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        )}

        {data && (
          <>
            {/* ═══ Categories ═══ */}
            {data.categories.length > 0 && (
              <Section title={t('home.categories')} icon={<Sparkles className="h-5 w-5 text-brand-600" />}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
                  {data.categories.slice(0, 12).map((cat) => (
                    <CategoryChip key={cat.name} name={cat.name} count={cat.productCount} />
                  ))}
                </div>
              </Section>
            )}

            {/* ═══ Featured Shops ═══ */}
            {data.featuredShops.length > 0 && (
              <Section
                title={t('home.featuredShops')}
                subtitle="Verified Gold & Platinum partners"
                icon={<ShieldCheck className="h-5 w-5 text-accent-500" />}
                seeAllLink="/shops?minVerification=GOLD"
              >
                <HorizontalScroll>
                  {data.featuredShops.map((shop) => (
                    <div key={shop.shopId} className="min-w-[260px] max-w-[260px] snap-start">
                      <ShopCard shop={shop} variant="featured" />
                    </div>
                  ))}
                </HorizontalScroll>
              </Section>
            )}

            {/* ═══ Nearby Shops ═══ */}
            {data.nearbyShops.length > 0 && (
              <Section
                title={t('home.nearbyShops')}
                subtitle={city ? `In ${city}` : 'Around you'}
                icon={<MapPin className="h-5 w-5 text-brand-600" />}
                seeAllLink="/shops"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {data.nearbyShops.slice(0, 8).map((shop) => (
                    <ShopCard key={shop.shopId} shop={shop} />
                  ))}
                </div>
              </Section>
            )}

            {/* Follow suggestions */}
            <FollowSuggestions />

                        {/* ═══ Live Now ═══ */}
            {data.liveShops.length > 0 && (
              <Section
                title={t('home.liveShops')}
                subtitle="Live shopping shows happening now"
                icon={
                  <span className="inline-flex items-center gap-1.5">
                    <Video className="h-5 w-5 text-danger" />
                    <span className="h-2 w-2 rounded-full bg-danger animate-pulse-soft" />
                  </span>
                }
                seeAllLink="/live"
              >
                <HorizontalScroll>
                  {data.liveShops.map((live: any) => (
                    <Link
                      key={live.id}
                      to={`/live/${live.id}`}
                      className="min-w-[220px] max-w-[220px] snap-start relative rounded-3xl overflow-hidden group border border-border shadow-soft"
                    >
                      <div className="aspect-[4/5] relative bg-gradient-to-br from-rose-500 to-danger">
                        {live.coverImageUrl && (
                          <img src={live.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-danger text-white text-2xs font-black">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />
                          LIVE
                        </div>
                        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-2xs font-bold backdrop-blur-sm">
                          <Users className="h-3 w-3" />
                          {live.peakViewerCount}
                        </div>
                        <div className="absolute bottom-3 inset-x-3 text-white">
                          <div className="text-sm font-black line-clamp-2">{live.title}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </HorizontalScroll>
              </Section>
            )}

            {/* ═══ Flash Sales ═══ */}
            {data.flashSales.length > 0 && (
              <Section
                title={t('home.flashSales')}
                icon={<Zap className="h-5 w-5 text-accent-500" />}
                seeAllLink="/deals"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {data.flashSales.slice(0, 4).map((sale: any) => (
                    <Link key={sale.id} to={`/deals/${sale.id}`}>
                      <Card className="p-4 bg-gradient-to-br from-accent-50 to-amber-100 dark:from-accent-900/20 dark:to-amber-950/30 border-accent-200 dark:border-accent-800">
                        <Zap className="h-5 w-5 text-accent-600 dark:text-accent-400 mb-2" />
                        <div className="text-sm font-black text-content line-clamp-1">{sale.title}</div>
                        <div className="text-2xs text-content-muted mt-1">Limited time</div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* ═══ Group Buys ═══ */}
            {data.activeGroupBuys.length > 0 && (
              <Section
                title={t('home.groupBuys')}
                subtitle="Join a group to unlock discounts"
                icon={<Users className="h-5 w-5 text-info" />}
                seeAllLink="/group-buys"
              >
                <HorizontalScroll>
                  {data.activeGroupBuys.map((gb: any) => (
                    <Link
                      key={gb.id}
                      to={`/group-buys/${gb.id}`}
                      className="min-w-[220px] max-w-[220px] snap-start"
                    >
                      <Card className="overflow-hidden h-full card-hover">
                        <div className="aspect-square bg-surface-muted relative">
                          {gb.imageUrl && (
                            <img src={gb.imageUrl} alt={gb.productName} className="h-full w-full object-cover" />
                          )}
                          <div className="absolute top-2 left-2">
                            <div className="px-2 py-1 rounded-full bg-info text-white text-2xs font-black">
                              GROUP DEAL
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm line-clamp-1">{gb.productName}</h4>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-black text-brand-600">{formatPrice(gb.groupPrice)}</span>
                            <span className="text-2xs text-content-subtle line-through">{formatPrice(gb.regularPrice)}</span>
                          </div>
                          <div className="mt-2">
                            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full bg-gradient-brand transition-all"
                                style={{ width: `${Math.min(100, (gb.currentCount / gb.minParticipants) * 100)}%` }}
                              />
                            </div>
                            <div className="text-2xs text-content-muted mt-1 font-bold">
                              {gb.currentCount}/{gb.minParticipants} joined
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </HorizontalScroll>
              </Section>
            )}

            {/* ═══ Trending Products ═══ */}
            {data.trendingProducts.length > 0 && (
              <Section
                title={t('home.trending')}
                icon={<TrendingUp className="h-5 w-5 text-brand-600" />}
                seeAllLink="/search?sortBy=bestsellers"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {data.trendingProducts.slice(0, 12).map((product) => (
                    <ProductCard key={product.productId} product={product} />
                  ))}
                </div>
              </Section>
            )}

            {/* ═══ Recommended ═══ */}
            {data.recommendedForYou.length > 0 && (
              <Section
                title={t('home.recommended')}
                subtitle="Based on your activity"
                icon={<Gift className="h-5 w-5 text-accent-500" />}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {data.recommendedForYou.slice(0, 12).map((product) => (
                    <ProductCard key={product.productId} product={product} />
                  ))}
                </div>
              </Section>
            )}

            {/* ═══ Empty state fallback ═══ */}
            {!data.nearbyShops.length && !data.featuredShops.length && !data.trendingProducts.length && (
              <EmptyState
                icon={Sparkles}
                title="No shops in your area yet"
                description="We're expanding to your city soon. Try a different location or check back later."
                action={<Button onClick={() => useLocationStore.getState().requestGeolocation()}>Detect location</Button>}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="skeleton h-6 w-40 mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <div className="skeleton h-6 w-48 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ShopCardSkeleton key={i} />)}
        </div>
      </div>
      <div>
        <div className="skeleton h-6 w-48 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
