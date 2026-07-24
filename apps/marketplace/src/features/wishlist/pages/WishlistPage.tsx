import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, TrendingDown } from 'lucide-react';
import { useWishlist, useMoveWishlistToCart } from '../hooks/useWishlist';
import { wishlistApi } from '../api/wishlist.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductCard, ProductCardSkeleton } from '@/features/home/components/ProductCard';
import { Button, EmptyState, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function WishlistPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useWishlist({ sortBy: 'recent', limit: 50 });
  const moveToCart = useMoveWishlistToCart();

  const clearAll = useMutation({
    mutationFn: wishlistApi.clear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Wishlist cleared');
    },
  });

  return (
    <>
      <Helmet><title>My Wishlist — Nafaa Bazaar</title></Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
              <Heart className="h-7 w-7 text-danger fill-danger" />
              Wishlist
              {data && <Badge variant="danger" size="lg">{data.total}</Badge>}
            </h1>
            <p className="text-sm text-content-muted mt-0.5">
              Products you've saved for later
            </p>
          </div>
          {data && data.total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAll.mutate()}
              leftIcon={<Trash2 className="h-4 w-4" />}
              className="text-danger hover:bg-danger/10"
            >
              Clear all
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on products you love to save them here"
            action={<Button variant="gradient" onClick={() => navigate('/')}>Browse products</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {data.items.map((item) => {
              const p = item.product;
              return (
                <div key={item.wishlistId} className="relative group">
                  {p.priceDropped && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge variant="danger" size="md" className="shadow-md">
                        <TrendingDown className="h-3 w-3" />
                        Price drop!
                      </Badge>
                    </div>
                  )}
                  <ProductCard
                    product={{ ...p, isInWishlist: true }}
                    onQuickAdd={() => moveToCart.mutate({ productId: p.productId })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
