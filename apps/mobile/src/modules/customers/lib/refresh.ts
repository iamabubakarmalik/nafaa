/** Refreshing server data after khata or customer changes, and when queued changes finally reach the server. */

import { useEffect, useRef } from 'react';
import { useSyncStatus } from '@/core/net';
import { queryClient } from '@/core/query/client';

const KEYS = ['customers-directory', 'customer', 'customer-ledger', 'customer-insights', 'khata-summary', 'sales-history', 'loyalty', 'bookings'];

export const refreshCustomers = () => KEYS.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));

/** Runs `fn` when the outbox empties (the server now has what was queued). */
export function useRefreshWhenSynced(fn: () => void) {
  const { pending } = useSyncStatus();
  const prev = useRef(pending);
  const run = useRef(fn);
  run.current = fn;
  useEffect(() => {
    if (prev.current > 0 && pending === 0) run.current();
    prev.current = pending;
  }, [pending]);
}
