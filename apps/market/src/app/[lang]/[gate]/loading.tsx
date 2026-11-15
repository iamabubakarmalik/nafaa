/** Gate page placeholder with the final layout's shape. */
import { ShopCardSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div className="container-page pt-4 md:pt-8">
      <Skeleton className="h-28 rounded-3xl" />
      <div className="mt-5 flex gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-20 rounded-full" />)}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <ShopCardSkeleton key={i} />)}</div>
    </div>
  );
}
