import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { partProfilesApi, type PartFacts } from '../api/part-profiles.api';

export const PART_FACTS_KEY = 'autoparts-part-facts';

/** Part numbers, brand, condition and fitment per product id, for the counter, products list and job card. */
export function usePartFacts() {
  const { data = [] } = useQuery({
    queryKey: [PART_FACTS_KEY],
    queryFn: () => partProfilesApi.facts().catch(() => [] as PartFacts[]),
    staleTime: 5 * 60_000,
  });
  return useMemo(() => new Map(data.map((f) => [f.productId, f])), [data]);
}

/** Words a part is found by: its numbers, brand and the vehicles it fits. */
export const partSearchText = (f?: PartFacts) =>
  (f ? [f.partNumber, f.oemNumber, ...f.alternateNumbers, f.brand, f.fitment, f.universal ? 'universal' : ''].filter(Boolean).join(' ') : '');
