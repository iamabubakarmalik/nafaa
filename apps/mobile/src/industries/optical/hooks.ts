/** Shared data hooks for the optical screens. */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { opticalProductsApi, type OpticalFacts } from './api';
import { OPTICAL_KEYS } from './meta';

interface PageShape<T> { items: T[]; total: number; page: number; totalPages: number }

/** Server-paged list (30 per page) that keeps the previous page's rows while a filter changes. */
export function usePaged<T, P extends PageShape<T>>(key: unknown[], load: (page: number) => Promise<P>, enabled = true) {
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.totalPages ? l.page + 1 : undefined),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
    enabled,
  });
  return {
    q,
    rows: q.data?.pages.flatMap((p) => p.items) ?? [],
    first: q.data?.pages[0],
    more: () => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); },
  };
}

/* ───────────── product facts ───────────── */

/** Optical facts per product (brand, model, colour, lens, contact lens fit), loaded once and shared. */
export function useOpticalFacts() {
  const { data } = useQuery({ queryKey: [OPTICAL_KEYS.facts], queryFn: () => opticalProductsApi.facts().catch(() => [] as OpticalFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}
