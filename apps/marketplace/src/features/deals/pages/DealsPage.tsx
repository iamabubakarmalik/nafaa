import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Zap, Tag, Clock, Gift, Flame, TrendingUp, ShoppingBag,
} from 'lucide-react';
import { dealsApi } from '../api/deals.api';
import { useLocationStore } from '@/stores/location.store';
import { Card, Badge, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/cn';

function FlashSaleCard({ sale }: { sale: any }) {
  const cd = useCountdown(sale.endsAt);
  const isEndingSoon = !cd.expired && cd.total < 3600000;

  return (
    <Link to={`/deals/${sale.slug}`}>
      <Card className="overflow-hidden hover:shadow-soft-lg transition group card-hover">
        <div className="relative aspect-video bg-gradient-to-br from-accent-500 via-orange-500 to-red-500 overflow-hidden">
          {sale.bannerUrl ? (
            <img src={sale.bannerUrl} alt={sale.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Zap className="h-16 w-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute top-3 left-3 flex gap-1">
            <Badge variant="danger" size="lg" className="shadow-lg">
              <Flame className="h-3.5 w-3.5" />
              FLASH SALE
            </Badge>
          </div>
          {sale.discountType === 'PERCENT' && (
            <div className="absolute top-3 right-3">
              <Badge variant="accent" size="lg" className="shadow-lg">
                Up to {sale.discountValue}% OFF
              </Badge>
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="text-lg font-black line-clamp-1">{sale.title}</div>
            {sale.description && (
              <div className="text-xs opacity-90 line-clamp-1">{sale.description}</div>
            )}
          </div>
        </div>

        {!cd.expired && (
          <div className={cn(
            'p-3 flex items-center justify-between',
            isEndingSoon ? 'bg-danger/10' : 'bg-accent-50 dark:bg-accent-950/30',
          )}>
            <div className="text-2xs font-black text-content-muted uppercase">
              Ends in
            </div>
            <div className={cn(
              'text-sm font-black tabular-nums',
              isEndingSoon ? 'text-danger animate-pulse' : 'text-accent-600 dark:text-accent-400',
            )}>
              {formatCountdown(cd)}
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}

function CouponCard({ promo }: { promo: any }) {
  const cd = useCountdown(promo.endsAt);
  return (
    <Card className="p-4 border-2 border-dashed border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 hover:shadow-soft-lg transition">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
          <Tag className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm line-clamp-1">{promo.title}</div>
          {promo.description && (
            <div className="text-2xs text-content-muted line-clamp-2 mt-1">{promo.description}</div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(promo.couponCode);
              }}
              className="px-3 py-1 rounded-lg bg-white dark:bg-surface font-mono text-xs font-black border-2 border-brand-500 border-dashed"
            >
              {promo.couponCode}
            </button>
            {!cd.expired && (
              <span className="text-2xs text-content-muted font-bold">
                <Clock className="h-3 w-3 inline mr-0.5" />
                {formatCountdown(cd)} left
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function DealsPage() {
  const { city } = useLocationStore();

  const { data: flashSales, isLoading: loadingFlash } = useQuery({
    queryKey: ['flash-sales'],
    queryFn: dealsApi.flashSales,
  });

  const { data: active, isLoading: loadingActive } = useQuery({
    queryKey: ['active-promos', city],
    queryFn: () => dealsApi.active(city ?? undefined),
  });

  const coupons = active?.filter((p) => p.type === 'COUPON') || [];
  const banners = active?.filter((p) => p.type === 'BANNER') || [];
  const bundles = active?.filter((p) => p.type === 'BUNDLE') || [];

  return (
    <>
      <Helmet><title>Deals & Offers — Nafaa Bazaar</title></Helmet>

      <div className="space-y-6">
        {/* Hero */}
        <Card className="p-5 md:p-6 bg-gradient-to-br from-accent-500 via-orange-500 to-red-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Flame className="h-3.5 w-3.5" />
              Best deals of the day
            </div>
            <h1 className="text-2xl md:text-4xl font-black leading-tight mb-2">
              Deals & Offers
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Flash sales, coupons, bundles — save on your favorite products
            </p>
          </div>
        </Card>

        {/* Flash Sales */}
        {flashSales && flashSales.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <Zap className="h-6 w-6 text-accent-500" />
              Flash Sales
              <Badge variant="danger" size="lg" className="animate-pulse-soft">
                {flashSales.length} live
              </Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashSales.map((s: any) => <FlashSaleCard key={s.id} sale={s} />)}
            </div>
          </section>
        )}

        {/* Coupons */}
        {coupons.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <Tag className="h-6 w-6 text-brand-600" />
              Available Coupons
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {coupons.map((p: any) => <CouponCard key={p.id} promo={p} />)}
            </div>
          </section>
        )}

        {/* Bundles */}
        {bundles.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <Gift className="h-6 w-6 text-purple-500" />
              Bundle Deals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundles.map((b: any) => (
                <Card key={b.id} className="p-4 hover:shadow-soft-lg transition">
                  <div className="font-black">{b.title}</div>
                  <div className="text-xs text-content-muted mt-1">{b.description}</div>
                  <div className="mt-3 text-xl font-black gradient-text">
                    Save {b.discountValue}{b.discountType === 'PERCENT' ? '%' : ' PKR'}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {(loadingFlash || loadingActive) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton aspect-video rounded-3xl" />
            ))}
          </div>
        )}

        {!loadingFlash && !loadingActive && !flashSales?.length && !active?.length && (
          <EmptyState
            icon={Tag}
            title="No active deals right now"
            description="Check back soon — new deals every day!"
          />
        )}
      </div>
    </>
  );
}
