import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, Store, TrendingUp, Bell } from 'lucide-react';
import { shopsApi } from '@/features/shops/api/shops.api';
import { ShopCard, ShopCardSkeleton } from '@/features/home/components/ShopCard';
import { Card, EmptyState, Button, Badge } from '@/ui';

export default function FollowedShopsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['followed-shops'],
    queryFn: () => shopsApi.followed(50, 0),
  });

  return (
    <>
      <Helmet><title>Followed Shops — Nafaa Bazaar</title></Helmet>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Heart className="h-7 w-7 text-danger fill-danger" />
              Followed Shops
              {data && <Badge variant="danger" size="lg">{data.total}</Badge>}
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
        ) : !data?.items.length ? (
          <EmptyState
            icon={Heart}
            title="No followed shops yet"
            description="Tap 'Follow' on any shop to see their updates here"
            action={<Button variant="gradient" onClick={() => navigate('/shops')}>Browse shops</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((shop: any) => (
              <ShopCard key={shop.shopId} shop={{ ...shop, isFollowing: true }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
