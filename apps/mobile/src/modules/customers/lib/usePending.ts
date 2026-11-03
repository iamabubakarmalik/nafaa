/** Customers made on this phone that the server does not have yet (from the outbox). */

import { useQuery } from '@tanstack/react-query';
import { offline, useOutbox, type CustomerRow } from '@/core/offline';

export function usePendingCustomers(): CustomerRow[] {
  const { items } = useOutbox();
  const ids = items.filter((o) => o.kind === 'customer.create' && o.status !== 'done' && o.tempId).map((o) => o.tempId as string);
  const q = useQuery({
    queryKey: ['offline', 'customers', 'pending', ids.join(',')],
    queryFn: async () => (await Promise.all(ids.map((id) => offline.customers.get(id)))).filter((c): c is CustomerRow => !!c),
    enabled: ids.length > 0,
    networkMode: 'always',
    staleTime: Infinity,
  });
  return ids.length ? q.data ?? [] : [];
}
