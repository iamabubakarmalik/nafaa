import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Heart, Star, Share2, MessageCircle, Users, ShoppingBag, Plus, Minus, ArrowLeft } from 'lucide-react';
import { productsApi } from '../api/products.api';
import { cartApi } from '../../cart/api/cart.api';
import { wishlistApi } from '../../wishlist/api/wishlist.api';
import { Button } from '@shared/ui/Button';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Badge } from '@shared/ui/Badge';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.detail(id!),
    enabled: !!id,
  });

  const addToCartMutation = useMutation({
    mutationFn: () => cartApi.add({ productId: id!, quantity: qty }),
    onSuccess: () => toast.success('Cart mein add ho gaya! 🛒', {
      action: { label: 'View Cart', onClick: () => navigate('/cart') },
    }),
  });

  const wishlistMutation = useMutation({
    mutationFn: () => wishlistApi.toggle(id!),
    onSuccess: () => { refetch(); toast.success(product?.isInWishlist ? 'Wishlist se hata diya' : 'Wishlist mein add ❤️'); },
  });

  if (isLoading || !product) return <SkeletonCard />;

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.publicPrice) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="pb-32">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold mb-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Image Carousel */}
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-neutral-800 mb-4">
        {product.publicImages?.length ? (
          <img src={product.publicImages[imgIdx]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">📦</div>
        )}
        {discount > 0 && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-rose-500 text-white text-sm font-black shadow-lg">
            -{discount}% OFF
          </div>
        )}
        <button
          onClick={() => wishlistMutation.mutate()}
          className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-lg"
        >
          <Heart className={`h-5 w-5 ${product.isInWishlist ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
        </button>
        {product.publicImages?.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {product.publicImages.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`h-2 rounded-full transition-all ${i === imgIdx ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-3">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
          {product.publicName}
        </h1>

        {product.ratingCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-extrabold">{product.ratingAverage.toFixed(1)}</span>
            </div>
            <span className="text-slate-500 text-sm">({product.ratingCount} reviews)</span>
            <span className="text-slate-300">·</span>
            <span className="text-brand-700 font-bold text-sm">{product.totalSold} sold</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black bg-gradient-to-r from-brand-600 to-emerald-700 bg-clip-text text-transparent">
            Rs {Number(product.publicPrice).toFixed(0)}
          </span>
          {product.compareAtPrice && (
            <span className="text-lg text-slate-400 line-through font-bold">
              Rs {Number(product.compareAtPrice).toFixed(0)}
            </span>
          )}
        </div>

        {/* Special features */}
        <div className="flex flex-wrap gap-2">
          {product.bargainEnabled && (
            <Badge variant="brand" size="md">
              <MessageCircle className="h-3 w-3" />
              Bargain Available
            </Badge>
          )}
          {product.groupBuyEnabled && (
            <Badge variant="warning" size="md">
              <Users className="h-3 w-3" />
              Group Buy
            </Badge>
          )}
        </div>

        {product.publicDescription && (
          <div className="rounded-2xl bg-slate-50 dark:bg-neutral-900 p-4">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Description</div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {product.publicDescription}
            </p>
          </div>
        )}

        {/* Shop */}
        {product.shop?.marketplaceProfile && (
          <div
            onClick={() => navigate(`/market/shops/${product.shop.marketplaceProfile.slug}`)}
            className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-3 cursor-pointer hover:shadow-soft transition"
          >
            {product.shop.marketplaceProfile.logoUrl && (
              <img src={product.shop.marketplaceProfile.logoUrl} className="h-12 w-12 rounded-xl object-cover" alt="" />
            )}
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Sold by</div>
              <div className="font-extrabold text-slate-900 dark:text-white">
                {product.shop.marketplaceProfile.publicName}
              </div>
            </div>
            <ArrowLeft className="h-4 w-4 rotate-180 text-slate-400" />
          </div>
        )}
      </div>

      {/* Sticky Actions */}
      <div className="fixed bottom-20 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-t-2 border-slate-100 dark:border-neutral-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex items-center border-2 border-slate-200 dark:border-neutral-700 rounded-full">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 flex items-center justify-center">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-black tabular-nums">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="h-10 w-10 flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            loading={addToCartMutation.isPending}
            onClick={() => addToCartMutation.mutate()}
            leftIcon={<ShoppingBag className="h-4 w-4" />}
          >
            Add to Cart · Rs {(product.publicPrice * qty).toFixed(0)}
          </Button>
        </div>
      </div>
    </div>
  );
}
