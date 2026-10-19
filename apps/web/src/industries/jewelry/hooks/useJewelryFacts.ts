/** Every piece's karat, weight and charges, with today's rates and each piece's price at them. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jewelryProductsApi, type JewelryFacts } from '../api/products.api';
import { metalRatesApi } from '../api/metal-rates.api';
import { KEYS, profilePrice, rateMap } from '../lib/meta';

export function useMetalRates() {
  const q = useQuery({ queryKey: [KEYS.rates, 'current'], queryFn: metalRatesApi.current, staleTime: 60_000 });
  const rates = useMemo(() => rateMap(q.data), [q.data]);
  return { ...q, rates };
}

export function useJewelryFacts() {
  const factsQ = useQuery({ queryKey: [KEYS.profiles, 'facts'], queryFn: jewelryProductsApi.facts, staleTime: 60_000 });
  const { rates, data: rateList } = useMetalRates();
  const byProduct = useMemo(() => {
    const m = new Map<string, JewelryFacts & { price: ReturnType<typeof profilePrice> }>();
    for (const f of factsQ.data ?? []) m.set(f.productId, { ...f, price: profilePrice(f, rates) });
    return m;
  }, [factsQ.data, rates]);
  return { byProduct, rates, rateList: rateList ?? [], loading: factsQ.isLoading };
}
