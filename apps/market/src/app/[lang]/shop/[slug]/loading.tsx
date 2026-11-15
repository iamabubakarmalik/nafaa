/** Shop page placeholder. */
import { ProductCardSkeleton, Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div className="container-page pt-4 md:pt-6">
      <div className="card overflow-hidden">
        <Skeleton className="aspect-[16/7] rounded-none md:aspect-[16/5]" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
      <Skeleton className="mt-6 h-11 rounded-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
    </div>
  );
}
