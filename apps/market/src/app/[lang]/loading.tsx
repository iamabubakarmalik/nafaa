/** Default page placeholder while server data loads. */
import { ShopCardSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div className="container-page pt-4 md:pt-8">
      <Skeleton className="h-36 rounded-3xl md:h-48" />
      <div className="mt-8 grid grid-cols-3 gap-2.5 md:grid-cols-6 md:gap-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <ShopCardSkeleton key={i} />)}</div>
    </div>
  );
}
