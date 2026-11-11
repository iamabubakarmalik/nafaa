/** Loading skeleton and error box for a React Query result. */

import { RefreshCw, WifiOff } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/design-system/components';
import { errorText, isNetworkError } from '@/api/client';

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Load ho raha hai">
      <Skeleton className="h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      <Skeleton className="h-60 rounded-3xl" />
    </div>
  );
}

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = isNetworkError(error);
  return (
    <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
      <EmptyState
        icon={offline ? <WifiOff className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
        title={offline ? 'Internet nahi mil raha' : 'Data nahi aa saka'}
        description={offline ? 'Connection aate hi dobara koshish karein.' : errorText(error)}
        action={onRetry && <Button variant="secondary" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>Dobara koshish</Button>}
      />
    </div>
  );
}
