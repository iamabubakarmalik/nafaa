import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Package, Star, Store, Info, Users } from 'lucide-react';
import { shopsApi } from '../api/shops.api';
import { useLocationStore } from '@/stores/location.store';
import { ShopHeader } from '../components/ShopHeader';
import { ShopReviewsSection } from '../components/ShopReviews';
import { DeliveryRadiusMap } from '../components/DeliveryRadiusMap';
import { ProductCard, ProductCardSkeleton } from '@/features/home/components/ProductCard';
import { ShopCard, ShopCardSkeleton } from '@/features/home/components/ShopCard';
import { Card, EmptyState } from '@/ui';
import { cn } from '@/lib/cn';

type Tab = 'products' | 'reviews' | 'info' | 'similar';

export default function ShopDetailPage() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { lat, lng } = useLocationStore();
  const [tab, setTab] = useState<Tab>('products');

  const isId = slugOrId?.startsWith('c') || slugOrId?.startsWith('ck');
  const fetcher = isId
    ? () => shopsApi.byId(slugOrId!, lat ?? undefined, lng ?? undefined)
    : () => shopsApi.bySlug(slugOrId!, lat ?? undefined, lng ?? undefined);

  const { data: shop, isLoading, error } = useQuery({
    queryKey: ['shop', slugOrId, lat, lng],
    queryFn: fetcher,
    enabled: !!slugOrId,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['shop-products', shop?.shopId],
    queryFn: () => shopsApi.products(shop!.shopId, { limit: 24 }),
    enabled: !!shop && tab === 'products',
  });

  const { data: reviewsData, isLoading: loadingReviews } = useQuery({
    queryKey: ['shop-reviews', shop?.shopId],
    queryFn: () => shopsApi.reviews(shop!.shopId, { limit: 20 }),
    enabled: !!shop && tab === 'reviews',
  });

  const { data: similarShops, isLoading: loadingSimilar } = useQuery({
    queryKey: ['similar-shops', shop?.shopId],
    queryFn: () => shopsApi.similar(shop!.shopId, 6),
    enabled: !!shop && tab === 'similar',
  });

  if (isLoading) return <ShopDetailSkeleton />;
  if (error || !shop) {
    return (
      <EmptyState
        icon={Store}
        title="Shop not found"
        description="This shop doesn't exist or is no longer available."
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{shop.publicName} — Nafaa Bazaar</title>
        <meta name="description" content={shop.description || shop.tagline || `Shop from ${shop.publicName}`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: shop.publicName,
          image: shop.logoUrl,
          address: { '@type': 'PostalAddress', streetAddress: shop.addressLine1, addressLocality: shop.city },
          aggregateRating: shop.ratingCount > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: shop.ratingAverage,
            reviewCount: shop.ratingCount,
          } : undefined,
        })}</script>
      </Helmet>

      <div className="space-y-6">
        <ShopHeader shop={shop} />

        {/* Tabs */}
        <div className="border-b border-border sticky top-16 md:top-20 bg-surface-muted/95 backdrop-blur-md z-20">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {[
              { key: 'products', label: 'Products', icon: Package, count: shop.productCount },
              { key: 'reviews', label: 'Reviews', icon: Star, count: shop.ratingCount },
              { key: 'info', label: 'Info', icon: Info },
              { key: 'similar', label: 'Similar', icon: Users },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as Tab)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-black border-b-2 transition',
                    tab === t.key
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-content-muted hover:text-content',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className="text-2xs bg-surface-muted px-2 py-0.5 rounded-full">{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {tab === 'products' && (
          <div>
            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : !productsData?.items.length ? (
              <EmptyState icon={Package} title="No products yet" description="This shop hasn't listed products." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {productsData.items.map((p) => <ProductCard key={p.productId} product={p} />)}
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            {loadingReviews ? (
              <Card className="p-8 text-center text-content-muted">Loading reviews…</Card>
            ) : (
              <ShopReviewsSection
                reviews={reviewsData?.items || []}
                ratingAverage={shop.ratingAverage}
                ratingCount={shop.ratingCount}
                distribution={reviewsData?.distribution}
              />
            )}
          </div>
        )}

        {tab === 'info' && shop.lat && shop.lng && (
          <div className="mb-4">
            <DeliveryRadiusMap
              lat={shop.lat}
              lng={shop.lng}
              radiusKm={shop.deliveryRadiusKm || 10}
              shopName={shop.publicName}
              yourDistanceKm={shop.distanceKm ?? undefined}
            />
          </div>
        )}

        {tab === 'info' && (
          <Card className="p-6 space-y-5">
            {shop.description && (
              <div>
                <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">About</h3>
                <p className="text-sm text-content leading-relaxed">{shop.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {shop.addressLine1 && (
                <div>
                  <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-1">Address</h3>
                  <p className="text-sm text-content">
                    {[shop.addressLine1, shop.addressLine2, shop.area, shop.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {shop.publicPhone && (
                <div>
                  <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-1">Phone</h3>
                  <a href={`tel:${shop.publicPhone}`} className="text-sm text-brand-600 font-bold">{shop.publicPhone}</a>
                </div>
              )}
              <div>
                <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-1">Delivery</h3>
                <p className="text-sm text-content">
                  Fee: PKR {shop.deliveryFee}
                  {shop.freeDeliveryAbove && ` · Free above PKR ${shop.freeDeliveryAbove}`}
                </p>
                <p className="text-xs text-content-muted">Min order: PKR {shop.minOrderAmount}</p>
              </div>
              <div>
                <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-1">Payments</h3>
                <div className="flex flex-wrap gap-1 text-2xs">
                  {shop.acceptsCod && <span className="px-2 py-1 rounded bg-surface-muted font-bold">COD</span>}
                  {shop.acceptsCard && <span className="px-2 py-1 rounded bg-surface-muted font-bold">Card</span>}
                  {shop.acceptsJazzcash && <span className="px-2 py-1 rounded bg-surface-muted font-bold">JazzCash</span>}
                  {shop.acceptsEasypaisa && <span className="px-2 py-1 rounded bg-surface-muted font-bold">EasyPaisa</span>}
                  {shop.acceptsRaast && <span className="px-2 py-1 rounded bg-surface-muted font-bold">Raast</span>}
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === 'similar' && (
          <div>
            {loadingSimilar ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <ShopCardSkeleton key={i} />)}
              </div>
            ) : !similarShops?.length ? (
              <EmptyState icon={Users} title="No similar shops found" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {similarShops.map((s) => <ShopCard key={s.shopId} shop={s} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ShopDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-48 md:h-64 rounded-3xl" />
      <div className="skeleton h-40 rounded-3xl -mt-16 mx-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
