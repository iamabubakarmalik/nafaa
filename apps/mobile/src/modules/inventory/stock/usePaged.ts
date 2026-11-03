/** Paged server list ({ items, page, pages }) as one growing list with "load more" on scroll; last pages stay readable offline. */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCachedNotice } from '@/core/offline';

export function usePaged<P extends { items: unknown[]; page: number; pages: number }>(key: unknown[], fetchPage: (page: number) => Promise<P>, enabled = true) {
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
    enabled,
  });
  const items = useMemo(() => (q.data?.pages.flatMap((p) => p.items) ?? []) as Array<P['items'][number]>, [q.data]);
  const cached = useCachedNotice(q);
  return {
    first: q.data?.pages[0],
    items,
    loading: q.isLoading,
    error: q.data ? null : q.error,
    refetch: () => void q.refetch(),
    refreshing: q.isRefetching && !q.isFetchingNextPage,
    loadMore: () => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); },
    loadingMore: q.isFetchingNextPage,
    cached,
  };
}
