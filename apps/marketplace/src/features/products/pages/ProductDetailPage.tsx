import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  Star, Heart, Share2, ShoppingBag, MessageCircle, Store,
  Zap, Users, ChevronRight, ShieldCheck, Tag, Package, Info,
  ThumbsUp, TrendingUp,
} from 'lucide-react';
import { productsApi } from '../api/products.api';
import { ProductGallery } from '../components/ProductGallery';
import { ProductQA } from '../components/ProductQA';
import { PriceAlertButton } from '@/features/price-alerts/components/PriceAlertButton';
import { RestockAlertButton } from '@/features/restock-alerts/components/RestockAlertButton';
import { VariantPicker } from '../components/VariantPicker';
import { ProductCard, ProductCardSkeleton } from '@/features/home/components/ProductCard';
import { Button, Card, Badge, Avatar, EmptyState } from '@/ui';
import { useToggleWishlist } from '@/features/wishlist/hooks/useWishlist';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { formatPrice, timeAgo } from '@/lib/format';
import { toast } from 'sonner';
import { useRecentlyViewedStore } from '@/stores/recentlyViewed.store';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();

  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const addRecent = useRecentlyViewedStore((s) => s.add);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => productsApi.detail(productId!),
    enabled: !!productId,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => productsApi.reviews(productId!, { limit: 5 }),
    enabled: !!productId,
  });

  const { data: priceCompare } = useQuery({
    queryKey: ['price-compare', productId],
    queryFn: () => productsApi.priceCompare(productId!),
    enabled: !!productId,
  });

  useEffect(() => {
    if (product) {
      addRecent({
        productId: product.productId,
        name: product.publicName,
        price: Number(product.publicPrice),
        imageUrl: product.publicImages?.[0],
      });
    }
  }, [product?.productId]);

  if (isLoading) return <ProductDetailSkeleton />;
  if (error || !product) {
    return (
      <EmptyState icon={ShoppingBag} title="Product not found" description="This product is no longer available." />
    );
  }

  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.publicPrice);
  const discountPct = hasDiscount
    ? Math.round(((Number(product.compareAtPrice) - Number(product.publicPrice)) / Number(product.compareAtPrice)) * 100)
    : 0;
  const shopProfile = product.shop?.marketplaceProfile;
  const variants = product.product?.variants || [];

  const shareProduct = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.publicName, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  return (
    <>
      <Helmet>
        <title>{product.publicName} — Nafaa Bazaar</title>
        <meta name="description" content={product.publicDescription || `Buy ${product.publicName} at best price on Nafaa Bazaar`} />
        <meta property="og:title" content={product.publicName} />
        <meta property="og:image" content={product.publicImages?.[0]} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.publicName,
          image: product.publicImages,
          description: product.publicDescription,
          offers: {
            '@type': 'Offer',
            price: product.publicPrice,
            priceCurrency: 'PKR',
            availability: product.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          aggregateRating: product.ratingCount > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          } : undefined,
        })}</script>
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.1fr] gap-6 lg:gap-10">
        {/* Left: Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery
            images={product.publicImages || product.product?.images?.map((i: any) => i.url) || []}
            videos={product.publicVideos}
            productName={product.publicName}
          />
        </div>

        {/* Right: Info */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            {product.marketplaceCategory && (
              <Link
                to={`/search?category=${encodeURIComponent(product.marketplaceCategory)}`}
                className="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider hover:underline"
              >
                {product.marketplaceCategory}
              </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-black text-content mt-1 leading-tight">
              {product.publicName}
            </h1>

            {/* Rating summary */}
            <div className="flex items-center gap-3 mt-3 text-sm">
              {product.ratingCount > 0 ? (
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={s <= Math.round(product.ratingAverage) ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 text-content-subtle'}
                      />
                    ))}
                  </div>
                  <span className="font-black">{product.ratingAverage.toFixed(1)}</span>
                  <span className="text-content-muted">({product.ratingCount} reviews)</span>
                </div>
              ) : (
                <span className="text-content-subtle">No reviews yet</span>
              )}
              {product.totalSold > 0 && (
                <>
                  <span className="text-content-subtle">·</span>
                  <span className="text-content-muted font-semibold">{product.totalSold}+ sold</span>
                </>
              )}
            </div>
          </div>

          {/* Price block */}
          <Card className="p-5 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/40 dark:to-emerald-950/30 border-brand-200 dark:border-brand-800">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl md:text-5xl font-black gradient-text">
                {formatPrice(product.publicPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-content-subtle line-through font-semibold">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                  <Badge variant="danger" size="lg">
                    <Tag className="h-3.5 w-3.5" />
                    Save {discountPct}%
                  </Badge>
                </>
              )}
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {!product.isAvailable && (
              <RestockAlertButton
                productId={product.productId}
                productName={product.publicName}
              />
            )}

            {product.bargainEnabled && (
                <Badge variant="accent" size="md">💬 Make an offer</Badge>
              )}
              {product.groupBuyEnabled && (
                <Badge variant="info" size="md">👥 Group buy available</Badge>
              )}
              {product.auctionEnabled && (
                <Badge variant="warning" size="md">⚡ Auction</Badge>
              )}
              {product.isAvailable ? (
                <Badge variant="success" size="md">✅ In stock</Badge>
              ) : (
                <Badge variant="danger" size="md">❌ Out of stock</Badge>
              )}
            </div>
          </Card>

          {/* Variants */}
          {variants.length > 0 && (
            <VariantPicker
              variants={variants}
              selectedId={selectedVariant}
              onChange={setSelectedVariant}
            />
          )}

          {/* Quantity + Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-xs font-black text-content-muted uppercase tracking-wider">Quantity:</div>
              <div className="inline-flex items-center bg-surface rounded-2xl border border-border">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-11 w-11 flex items-center justify-center font-black text-lg hover:bg-surface-muted rounded-l-2xl"
                >
                  −
                </button>
                <span className="h-11 w-14 flex items-center justify-center font-black text-base border-x border-border tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-11 w-11 flex items-center justify-center font-black text-lg hover:bg-surface-muted rounded-r-2xl"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                leftIcon={<ShoppingBag className="h-5 w-5" />}
                disabled={!product.isAvailable}
                loading={addToCart.isPending}
                onClick={() =>
                  addToCart.mutate({
                    productId: product.productId,
                    variantId: selectedVariant,
                    quantity,
                  })
                }
              >
                Add to cart · {formatPrice(Number(product.publicPrice) * quantity)}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => toggleWishlist.mutate(product.productId)}
                leftIcon={<Heart className={cn('h-5 w-5', product.isInWishlist && 'fill-current')} />}
                className="sm:w-auto"
              >
                {product.isInWishlist ? 'In wishlist' : 'Save'}
              </Button>
              <Button variant="secondary" size="lg" onClick={shareProduct} leftIcon={<Share2 className="h-5 w-5" />} className="sm:w-auto">
                Share
              </Button>
              <PriceAlertButton
                productId={product.productId}
                currentPrice={Number(product.publicPrice)}
                productName={product.publicName}
              />
            </div>

            {!product.isAvailable && (
              <RestockAlertButton
                productId={product.productId}
                productName={product.publicName}
              />
            )}

            {product.bargainEnabled && (
              <Button
                variant="accent"
                size="lg"
                fullWidth
                leftIcon={<MessageCircle className="h-5 w-5" />}
                onClick={() => navigate(`/bargain/new?productId=${product.productId}`)}
              >
                Bargain · Make your offer
              </Button>
            )}
          </div>

          {/* Shop card */}
          {shopProfile && (
            <Card className="p-4">
              <Link to={`/shops/${shopProfile.slug || product.shopId}`} className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-brand overflow-hidden shrink-0">
                  {shopProfile.logoUrl && <img src={shopProfile.logoUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-black text-content">{shopProfile.publicName}</div>
                    {shopProfile.verificationLevel === 'GOLD' && (
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-content-muted mt-0.5">
                    {shopProfile.ratingCount > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {shopProfile.ratingAverage.toFixed(1)}
                      </span>
                    )}
                    <span>{shopProfile.city}</span>
                    {shopProfile.followerCount > 0 && <span>{shopProfile.followerCount} followers</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-content-subtle" />
              </Link>
            </Card>
          )}

          {/* Group buy / Auction cards */}
          {product.activeGroupBuy && (
            <Link to={`/group-buys/${product.activeGroupBuy.id}`}>
              <Card className="p-4 bg-gradient-to-r from-info/10 to-blue-100 dark:from-info/20 dark:to-blue-950/30 border-info/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-info flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-content">Join group buy</div>
                    <div className="text-xs text-content-muted">
                      Only {formatPrice(product.activeGroupBuy.groupPrice)} — {product.activeGroupBuy.currentCount}/{product.activeGroupBuy.minParticipants} joined
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </Card>
            </Link>
          )}

          {/* Description */}
          {product.publicDescription && (
            <Card className="p-5">
              <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-content leading-relaxed whitespace-pre-line">
                {product.publicDescription}
              </p>
            </Card>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    to={`/search?q=${encodeURIComponent(tag)}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-surface-muted hover:bg-surface hover:border-brand-400 border border-transparent transition font-bold"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Q&A Section */}
      <section className="mt-10">
        <ProductQA productId={product.productId} />
      </section>

      {/* Reviews section */}
      {reviewsData && reviewsData.total > 0 && (
        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-content flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
              Reviews ({reviewsData.total})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviewsData.items.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar src={r.customer.avatarUrl} name={r.customer.fullName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm">{r.customer.fullName}</span>
                      {r.isVerifiedPurchase && (
                        <Badge variant="brand" size="sm">Verified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={s <= r.rating ? 'h-3 w-3 fill-amber-400 text-amber-400' : 'h-3 w-3 text-content-subtle'} />
                        ))}
                      </div>
                      <span className="text-2xs text-content-subtle">{timeAgo(r.createdAt)}</span>
                    </div>
                    {r.title && <p className="font-bold text-sm mt-2">{r.title}</p>}
                    {r.comment && <p className="text-sm text-content-muted mt-1 line-clamp-3">{r.comment}</p>}
                    {r.imageUrls?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                        {r.imageUrls.slice(0, 4).map((url: string, i: number) => (
                          <img key={i} src={url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Price compare */}
      {priceCompare && priceCompare.alternatives.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-xl md:text-2xl font-black text-content flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-brand-600" />
            Compare prices at other shops
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {priceCompare.alternatives.slice(0, 10).map((alt) => (
              <ProductCard key={alt.productId} product={alt as any} />
            ))}
          </div>
        </section>
      )}

      {/* Related products */}
      {product.related?.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-xl md:text-2xl font-black text-content">You might also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {product.related.map((rp: any) => (
              <ProductCard key={rp.productId} product={rp} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="skeleton aspect-square rounded-3xl" />
      <div className="space-y-4">
        <div className="skeleton h-6 w-24" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-12 w-full rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    </div>
  );
}
