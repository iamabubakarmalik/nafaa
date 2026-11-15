/** Product page placeholder. */
import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div className="container-page grid gap-6 pt-4 md:grid-cols-2 md:gap-10 md:pt-8">
      <Skeleton className="aspect-square rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}
