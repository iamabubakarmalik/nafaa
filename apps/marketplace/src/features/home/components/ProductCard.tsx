import { Link } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Tag } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Badge } from '@/ui';
import { cn } from '@/lib/cn';
import { useCompareStore } from '@/stores/compare.store';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'horizontal' | 'compact';
  className?: string;
  onQuickAdd?: (product: Product) => void;
  onWishlist?: (product: Product) => void;
}

export function ProductCard({ product, variant = 'default', className, onQuickAdd, onWishlist }: ProductCardProps) {
  const compare = useCompareStore();
  const isInCompare = compare.isInCompare(product.productId);
  const link = `/products/${product.productId}`;
  const image = product.publicImages?.[0];
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.publicPrice;
  const discountPct = hasDiscount
    ? Math.round(((Number(product.compareAtPrice) - Number(product.publicPrice)) / Number(product.compareAtPrice)) * 100)
    : 0;

  if (variant === 'horizontal') {
    return (
      <Link to={link} className={cn('group flex gap-3 bg-surface rounded-2xl border border-border p-3 card-hover', className)}>
        <div className="h-20 w-20 rounded-xl bg-surface-muted overflow-hidden shrink-0 relative">
          {image ? (
            <img src={image} alt={product.publicName} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-content-subtle" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-content text-sm line-clamp-2 mb-1">{product.publicName}</h4>
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-brand-600 dark:text-brand-400">{formatPrice(product.publicPrice)}</span>
            {hasDiscount && (
              <span className="text-2xs text-content-subtle line-through">{formatPrice(product.compareAtPrice!)}</span>
            )}
          </div>
          {product.ratingCount > 0 && (
            <div className="flex items-center gap-0.5 mt-1 text-2xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-bold">{product.ratingAverage.toFixed(1)}</span>
              <span className="text-content-subtle">({product.ratingCount})</span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={link} className={cn('group relative block bg-surface rounded-3xl border border-border overflow-hidden card-hover', className)}>
      {/* Image */}
      <div className="relative aspect-square bg-surface-muted overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.publicName}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-content-subtle" />
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <Badge variant="danger" size="md" className="absolute top-2 left-2 shadow-md">
            <Tag className="h-3 w-3" />
            -{discountPct}%
          </Badge>
        )}

        {/* Wishlist button */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onWishlist?.(product);
            }}
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center transition shadow-md',
              product.isInWishlist
                ? 'bg-danger text-white'
                : 'bg-white/90 dark:bg-surface/90 text-content-muted hover:text-danger backdrop-blur-sm',
            )}
            aria-label="Add to wishlist"
          >
            <Heart className={cn('h-4 w-4', product.isInWishlist && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (isInCompare) compare.remove(product.productId);
              else compare.add({
                productId: product.productId,
                name: product.publicName,
                price: Number(product.publicPrice),
                imageUrl: product.publicImages?.[0],
                shopName: product.shop?.publicName,
                rating: product.ratingAverage,
                ratingCount: product.ratingCount,
              });
            }}
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center transition shadow-md',
              isInCompare
                ? 'bg-info text-white'
                : 'bg-white/90 dark:bg-surface/90 text-content-muted hover:text-info backdrop-blur-sm',
            )}
            aria-label="Compare"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M10 3L4 21"/><path d="M20 3L14 21"/><path d="M4 8h16"/><path d="M4 16h16"/>
            </svg>
          </button>
        </div>

        {/* Feature badges */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {product.bargainEnabled && (
            <Badge variant="glass" size="sm" className="backdrop-blur-md">Bargain</Badge>
          )}
          {product.groupBuyEnabled && (
            <Badge variant="glass" size="sm" className="backdrop-blur-md">Group</Badge>
          )}
        </div>

        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="danger" size="lg">Out of stock</Badge>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-bold text-content text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.publicName}
        </h3>

        {product.ratingCount > 0 && (
          <div className="flex items-center gap-0.5 text-2xs">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-bold">{product.ratingAverage.toFixed(1)}</span>
            <span className="text-content-subtle">({product.ratingCount})</span>
            {product.totalSold > 10 && (
              <span className="ml-auto text-content-subtle font-medium">{product.totalSold}+ sold</span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-black text-brand-600 dark:text-brand-400 text-base">
            {formatPrice(product.publicPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-content-subtle line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>

        {onQuickAdd && product.isAvailable && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onQuickAdd(product);
            }}
            className="w-full mt-2 h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Add to cart
          </button>
        )}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-3xl border border-border overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-5 w-1/3 mt-2" />
      </div>
    </div>
  );
}
