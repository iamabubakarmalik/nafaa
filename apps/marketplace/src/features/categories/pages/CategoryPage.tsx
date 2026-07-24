import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Tag, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { productsApi } from '@/features/products/api/products.api';
import { ProductCard, ProductCardSkeleton } from '@/features/home/components/ProductCard';
import { useLocationStore } from '@/stores/location.store';
import { Card, Badge, EmptyState } from '@/ui';

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { lat, lng, city } = useLocationStore();
  const decoded = decodeURIComponent(category || '');

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', decoded, lat, lng],
    queryFn: () => productsApi.search({
      category: decoded,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      city: city ?? undefined,
      limit: 40,
    }),
    enabled: !!decoded,
  });

  const { data: subCats } = useQuery({
    queryKey: ['sub-categories', decoded],
    queryFn: () => productsApi.subCategories(decoded),
    enabled: !!decoded,
  });

  return (
    <>
      <Helmet>
        <title>{decoded} — Nafaa Bazaar</title>
        <meta name="description" content={`Shop the best ${decoded} products in Pakistan. Fast delivery, best prices.`} />
      </Helmet>

      <div className="space-y-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        {/* Hero */}
        <Card className="p-6 md:p-8 bg-gradient-to-br from-brand-500 via-emerald-500 to-teal-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Tag className="h-3.5 w-3.5" />
              Category
            </div>
            <h1 className="text-3xl md:text-5xl font-black capitalize">{decoded}</h1>
            {data && (
              <p className="text-white/90 text-sm md:text-base mt-2">
                {data.total.toLocaleString()} products from top shops
              </p>
            )}
          </div>
        </Card>

        {/* Sub-categories */}
        {subCats && subCats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {subCats.map((sub) => (
              <Link
                key={sub.name}
                to={`/search?category=${encodeURIComponent(decoded)}&subCategory=${encodeURIComponent(sub.name)}`}
                className="shrink-0 h-10 px-4 rounded-full bg-surface hover:bg-brand-50 dark:hover:bg-brand-950/30 border border-border hover:border-brand-400 flex items-center gap-1.5 text-sm font-bold transition"
              >
                {sub.name}
                <span className="text-2xs text-content-subtle">({sub.productCount})</span>
              </Link>
            ))}
          </div>
        )}

        {/* Products */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Tag}
            title={`No ${decoded} products yet`}
            description="Check back soon — new products added daily"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {data.items.map((p) => <ProductCard key={p.productId} product={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
