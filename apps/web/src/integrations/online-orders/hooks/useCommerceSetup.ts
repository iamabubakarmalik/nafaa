/**
 * The shop's online store setup (answers and the defaults they set):
 * dashboard tiles, hidden board tiles, hidden and pinned sidebar items.
 */

import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '../api/insights.api';

export const SETUP_KEY = ['commerce-setup'] as const;

export function useCommerceSetup(enabled = true) {
  return useQuery({ queryKey: SETUP_KEY, queryFn: insightsApi.setup, staleTime: 5 * 60_000, enabled, retry: false });
}
