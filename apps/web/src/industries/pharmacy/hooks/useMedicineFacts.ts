import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { medicinesApi, type MedicineFacts } from '../api/medicines.api';

export const MEDICINE_FACTS_KEY = 'pharmacy-medicine-facts';

/** Medicine facts per product id, for the counter, products list and sales history. */
export function useMedicineFacts() {
  const { data = [] } = useQuery({
    queryKey: [MEDICINE_FACTS_KEY],
    queryFn: () => medicinesApi.lookup().catch(() => [] as MedicineFacts[]),
    staleTime: 5 * 60_000,
  });
  return useMemo(() => new Map(data.map((m) => [m.productId, m])), [data]);
}
