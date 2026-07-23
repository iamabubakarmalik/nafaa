import { useQuery } from '@tanstack/react-query';
import { shopsApi } from '../api/shops.api';
import { useLocationStore } from '@/stores/location.store';
import { ShopCard } from '../../home/components/ShopCard';
import { SkeletonCard } from '@shared/ui/Skeleton';

export default function ShopsListPage() {
  const { lat, lng, city } = useLocationStore();
  const { data, isLoading } = useQuery({
    queryKey: ['market-shops', lat, lng, city],
    queryFn: () => shopsApi.list({
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      city: city ?? undefined,
      radiusKm: 10,
      sortBy: 'popular',
    }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">
        🏪 All Shops
      </h1>
      <p className="text-sm text-slate-500">{data?.total || 0} shops available</p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {data?.items?.map((shop: any) => (
            <div key={shop.shopId} className="w-full">
              <ShopCard shop={shop} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
