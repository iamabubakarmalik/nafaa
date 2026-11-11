/**
 * React Query setup. Mutations show a friendly error toast unless they set
 * `meta: { silentError: true }` (screens that show the error themselves).
 * Queries never toast; screens use <ErrorState>.
 */

import { MutationCache, QueryClient } from '@tanstack/react-query';
import { apiErrorMessage, codeOf, statusOf } from '../api/errors';
import { showToast } from '../toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (count, err) => {
        const status = statusOf(err);
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => {
      if (mutation.meta?.silentError) return;
      // Plan ended: the subscription gate explains it. A full plan limit is shown here.
      if (statusOf(err) === 402 && codeOf(err) !== 'PLAN_LIMIT') return;
      showToast({ tone: 'danger', title: apiErrorMessage(err) });
    },
  }),
});

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { silentError?: boolean };
  }
}
