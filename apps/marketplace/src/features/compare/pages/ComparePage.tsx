import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, X, ShoppingBag, Star, GitCompare, Trash2, Store,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { useCompareStore } from '@/stores/compare.store';
import { productsApi } from '@/features/products/api/products.api';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { Button, Card, Badge, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function ComparePage() {
  const navigate = useNavigate();
  const compare = useCompareStore();
  const addToCart = useAddToCart();

  const queries = useQueries({
    queries: compare.items.map((item) => ({
      queryKey: ['product-detail', item.productId],
      queryFn: () => productsApi.detail(item.productId),
    })),
  });

  const products = queries.map((q) => q.data).filter(Boolean);
  const isLoading = queries.some((q) => q.isLoading);

  if (compare.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={GitCompare}
          title="Nothing to compare yet"
          description="Tap 'Compare' on products to add them here"
          action={<Button variant="gradient" onClick={() => navigate('/')}>Browse products</Button>}
        />
      </div>
    );
  }

  // Find best deals for each attribute
  const cheapestId = products.reduce((min, p) =>
    !min || Number(p.publicPrice) < Number(min.publicPrice) ? p : min,
    null as any,
  )?.productId;

  const bestRatedId = products.reduce((max, p) =>
    !max || (p.ratingAverage > max.ratingAverage) ? p : max,
    null as any,
  )?.productId;

  return (
    <>
      <Helmet><title>Compare Products — Nafaa Bazaar</title></Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <GitCompare className="h-7 w-7 text-brand-600" />
              Compare products
              <Badge variant="brand" size="lg">{compare.items.length}/4</Badge>
            </h1>
            <p className="text-sm text-content-muted mt-0.5">
              Side-by-side product comparison
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={compare.clear}
            leftIcon={<Trash2 className="h-4 w-4" />}
            className="text-danger hover:bg-danger/10"
          >
            Clear all
          </Button>
        </div>

        {/* Compare table */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {compare.items.map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-3xl" />)}
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
            <div className={cn(
              'grid gap-3 min-w-fit',
              compare.items.length === 2 && 'grid-cols-2',
              compare.items.length === 3 && 'grid-cols-3',
              compare.items.length === 4 && 'grid-cols-4',
            )} style={{ minWidth: `${compare.items.length * 240}px` }}>
              {products.map((p) => {
                const isCheapest = cheapestId === p.productId;
                const isBestRated = bestRatedId === p.productId;
                const shop = p.shop?.marketplaceProfile;

                return (
                  <Card key={p.productId} className="overflow-hidden relative group">
                    <button
                      onClick={() => compare.remove(p.productId)}
                      className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/50 backdrop-blur text-white hover:bg-danger flex items-center justify-center transition"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {isCheapest && (
                      <Badge variant="brand" size="md" className="absolute top-2 left-2 z-10 shadow-md">
                        💰 Best price
                      </Badge>
                    )}
                    {isBestRated && !isCheapest && (
                      <Badge variant="accent" size="md" className="absolute top-2 left-2 z-10 shadow-md">
                        ⭐ Top rated
                      </Badge>
                    )}

                    <Link to={`/products/${p.productId}`}>
                      <div className="aspect-square bg-surface-muted overflow-hidden">
                        {p.publicImages?.[0] ? (
                          <img src={p.publicImages[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-content-subtle" />
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-3 space-y-3">
                      {/* Name */}
                      <Link
                        to={`/products/${p.productId}`}
                        className="block font-black text-sm line-clamp-2 hover:text-brand-600 transition min-h-[2.5rem]"
                      >
                        {p.publicName}
                      </Link>

                      {/* Price */}
                      <div className={cn(
                        'text-lg font-black',
                        isCheapest ? 'text-brand-600 dark:text-brand-400' : 'text-content',
                      )}>
                        {formatPrice(p.publicPrice)}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 text-xs">
                        {p.ratingCount > 0 ? (
                          <>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-black">{p.ratingAverage.toFixed(1)}</span>
                            <span className="text-content-subtle">({p.ratingCount})</span>
                          </>
                        ) : (
                          <span className="text-content-subtle">No reviews</span>
                        )}
                      </div>

                      {/* Shop */}
                      {shop && (
                        <div className="flex items-center gap-1 text-2xs text-content-muted">
                          <Store className="h-3 w-3" />
                          <span className="truncate">{shop.publicName}</span>
                        </div>
                      )}

                      {/* Feature attributes */}
                      <div className="space-y-1 pt-2 border-t border-border">
                        {[
                          { label: 'In stock', value: p.isAvailable },
                          { label: 'Bargain', value: p.bargainEnabled },
                          { label: 'Group buy', value: p.groupBuyEnabled },
                          { label: 'Discount', value: p.compareAtPrice > p.publicPrice },
                        ].map((f) => (
                          <div key={f.label} className="flex items-center justify-between text-2xs">
                            <span className="text-content-muted font-bold">{f.label}</span>
                            {f.value ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-content-subtle" />
                            )}
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="gradient"
                        size="sm"
                        fullWidth
                        onClick={() => addToCart.mutate({ productId: p.productId, quantity: 1 })}
                        leftIcon={<ShoppingBag className="h-3.5 w-3.5" />}
                      >
                        Add to cart
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {/* Add more slot */}
              {compare.items.length < 4 && (
                <button
                  onClick={() => navigate('/')}
                  className="rounded-3xl border-2 border-dashed border-border hover:border-brand-400 text-content-muted hover:text-brand-600 flex flex-col items-center justify-center gap-2 transition min-h-[300px]"
                >
                  <div className="h-12 w-12 rounded-2xl bg-surface-muted flex items-center justify-center">
                    <GitCompare className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-black">Add another</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Summary card */}
        {products.length >= 2 && (
          <Card className="p-5 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/40 dark:to-emerald-950/30 border-brand-200 dark:border-brand-800">
            <h3 className="font-black text-lg mb-3">📊 Quick summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  label: 'Cheapest',
                  value: products.find((p) => p.productId === cheapestId)?.publicName,
                  price: formatPrice(Math.min(...products.map((p) => Number(p.publicPrice)))),
                  color: 'text-brand-600',
                },
                {
                  label: 'Most expensive',
                  value: products.reduce((max, p) => !max || Number(p.publicPrice) > Number(max.publicPrice) ? p : max, null as any)?.publicName,
                  price: formatPrice(Math.max(...products.map((p) => Number(p.publicPrice)))),
                  color: 'text-danger',
                },
                {
                  label: 'Price difference',
                  value: 'You save',
                  price: formatPrice(
                    Math.max(...products.map((p) => Number(p.publicPrice))) -
                    Math.min(...products.map((p) => Number(p.publicPrice))),
                  ),
                  color: 'text-accent-600',
                },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-2xl bg-surface">
                  <div className="text-2xs font-black text-content-muted uppercase">{s.label}</div>
                  <div className="text-xs text-content mt-1 line-clamp-1 font-bold">{s.value}</div>
                  <div className={`text-lg font-black mt-1 ${s.color}`}>{s.price}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
