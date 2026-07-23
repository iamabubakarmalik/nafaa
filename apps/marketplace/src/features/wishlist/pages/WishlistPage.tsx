import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Heart, ShoppingBag, Trash2, Share2, Star } from 'lucide-react';
import { wishlistApi } from '../api/wishlist.api';
import { cartApi } from '@features/cart/api/cart.api';
import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';

export default function WishlistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['market-wishlist'],
    queryFn: () => wishlistApi.list({ limit: 50 }),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onSuccess: () => {
      toast.success('Wishlist se hata diya');
      queryClient.invalidateQueries({ queryKey: ['market-wishlist'] });
    },
  });

  const moveToCartMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.moveToCart(productId),
    onSuccess: () => {
      toast.success('Cart mein add ho gaya 🛒');
      queryClient.invalidateQueries({ queryKey: ['market-wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['market-cart'] });
    },
  });

  const addAllMutation = useMutation({
    mutationFn: async () => {
      const items = data?.items || [];
      for (const item of items) {
        try {
          await cartApi.add({ productId: item.productId, quantity: 1 });
        } catch {}
      }
    },
    onSuccess: () => {
      toast.success(`${data?.items?.length || 0} items cart mein add ho gaye`);
      queryClient.invalidateQueries({ queryKey: ['market-cart'] });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <EmptyState
        emoji="❤️"
        title="Wishlist khaali hai"
        description="Products pe heart icon click karke save karein"
        size="lg"
        action={
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            Shopping Start Karein
          </Button>
        }
      />
    );
  }

  return (
    <div className="pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            My Wishlist
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.items.length} products saved
          </p>
        </div>
        {data.items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={addAllMutation.isPending}
            onClick={() => addAllMutation.mutate()}
            leftIcon={<ShoppingBag className="h-3.5 w-3.5" />}
          >
            All to Cart
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.items.map((item: any) => {
          const product = item.product?.marketplaceProfile || item.product;
          const discount = product?.compareAtPrice
            ? Math.round(((product.compareAtPrice - product.publicPrice) / product.compareAtPrice) * 100)
            : 0;

          return (
            <div
              key={item.id}
              className="group rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg transition-all overflow-hidden"
            >
              <NavLink to={`/products/${item.productId}`} className="block">
                <div className="relative aspect-square bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                  {product?.publicImages?.[0] || item.imageUrl ? (
                    <img
                      src={product?.publicImages?.[0] || item.imageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                      📦
                    </div>
                  )}
                  {discount > 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow">
                      -{discount}%
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeMutation.mutate(item.productId);
                    }}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 leading-tight min-h-[2rem]">
                    {product?.publicName || item.productName}
                  </h3>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-extrabold text-brand-700 dark:text-brand-400 text-sm">
                      Rs {Number(product?.publicPrice || item.priceSnapshot || 0).toFixed(0)}
                    </span>
                    {product?.compareAtPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        Rs {Number(product.compareAtPrice).toFixed(0)}
                      </span>
                    )}
                  </div>
                  {product?.ratingCount > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {product.ratingAverage?.toFixed(1)} ({product.ratingCount})
                      </span>
                    </div>
                  )}
                </div>
              </NavLink>
              <div className="px-3 pb-3">
                <button
                  onClick={() => moveToCartMutation.mutate(item.productId)}
                  disabled={moveToCartMutation.isPending}
                  className="w-full h-8 rounded-lg bg-gradient-to-r from-brand-600 to-emerald-700 text-white text-xs font-extrabold shadow-brand hover:shadow-brand-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="h-3 w-3" />
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
