import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, ShoppingBag } from 'lucide-react';
import { shopsApi } from '@/features/shops/api/shops.api';
import { ShopCard, ShopCardSkeleton } from '@/features/home/components/ShopCard';
import { useAuthStore } from '@/stores/auth.store';
import { EmptyState, Button, Badge } from '@/ui';

export default function FollowedShopsPage() {
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const { data, isLoading, error } = useQuery({
    queryKey: ['followed-shops'],
    queryFn: async () => {
      const api = shopsApi as any;
      if (typeof api.followed === 'function') {
        return api.followed(50, 0);
      }
      // Fallback if endpoint name is different
      if (typeof api.myFollowed === 'function') {
        return api.myFollowed();
      }
      return { items: [], total: 0 };
    },
    enabled: isAuth,
    retry: false,
  });

  if (!isAuth) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyState
          icon={Heart}
          title="Login required"
          description="Please login to see shops you follow"
          action={<Button variant="gradient" onClick={() => navigate('/login')}>Login</Button>}
        />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Followed Shops — Nafaa Bazaar</title></Helmet>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Heart className="h-7 w-7 text-danger fill-danger" />
              Followed Shops
              {data && (data as any).total > 0 && <Badge variant="danger" size="lg">{(data as any).total}</Badge>}
            </h1>
            <p className="text-sm text-content-muted mt-0.5">
              Shops you follow — get their latest updates
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <ShopCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={Heart}
            title="Couldn't load followed shops"
            description="Please try again later"
            action={<Button variant="gradient" onClick={() => navigate('/shops')}>Browse shops</Button>}
          />
        ) : !(data as any)?.items?.length ? (
          <EmptyState
            icon={Heart}
            title="No followed shops yet"
            description="Tap 'Follow' on any shop to see their updates here"
            action={
              <Button variant="gradient" onClick={() => navigate('/shops')} leftIcon={<ShoppingBag className="h-4 w-4" />}>
                Browse shops
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(data as any).items.map((shop: any) => (
              <ShopCard key={shop.shopId || shop.id} shop={{ ...shop, isFollowing: true }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
