/**
 * Cosmetics numbers for the dashboard: batch expiry from the shared product
 * batches and this month's customer birthdays from the customer directory.
 * `available` is false when the requests fail, so widgets can say the data
 * is missing instead of showing an "all clear".
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productBatchesApi } from '@modules/inventory/products/api/product-batches.api';
import { directoryApi } from '@modules/customers/directory/api';
import { COSMETICS_KEYS, daysFrom } from '../lib/meta';

const MINUTE = 60_000;

export function useCosmeticsOps() {
  const soon = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'soon', 30], queryFn: () => productBatchesApi.expiringSoon(30), refetchInterval: 5 * MINUTE });
  const expired = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'expired'], queryFn: productBatchesApi.expired, refetchInterval: 5 * MINUTE });
  const birthdays = useQuery({
    queryKey: ['cosmetics-birthdays'],
    queryFn: () => directoryApi.list({ status: 'active', type: 'all', activity: 'all', sort: 'name', birthday: 'month', scope: 'all' }, 1, 1),
    staleTime: 30 * MINUTE,
  });

  return useMemo(() => {
    const live = <T extends { isActive: boolean; quantity: number }>(rows?: T[]) => (rows ?? []).filter((b) => b.isActive && b.quantity > 0);
    const list = live(soon.data).map((b) => ({ ...b, days: daysFrom(b.expiryDate) ?? 999 })).sort((a, b) => a.days - b.days);
    const today = new Date().getDate();
    const people = [...(birthdays.data?.stats.birthdays ?? [])].sort((a, b) => a.day - b.day);
    return {
      available: !soon.isError && !expired.isError,
      expiry: { expired: live(expired.data).length, soon: list.length, week: list.filter((b) => b.days <= 7).length, list },
      birthdays: { all: people, upcoming: people.filter((p) => p.day >= today) },
      loading: soon.isLoading || expired.isLoading,
    };
  }, [soon.data, soon.isError, soon.isLoading, expired.data, expired.isError, expired.isLoading, birthdays.data]);
}
