/** React Query keys and hooks for Nafaa Social. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { brandSocialApi, type PostFilters, type SocialPost } from '@/api/admin-brand-social.api';
import { apiError } from '@/lib/errors';

export const KEYS = {
  all: ['brand-social'] as const,
  accounts: ['brand-social', 'accounts'] as const,
  settings: ['brand-social', 'settings'] as const,
  posts: (f: PostFilters) => ['brand-social', 'posts', f] as const,
  post: (id: string) => ['brand-social', 'post', id] as const,
  assets: (f: object) => ['brand-social', 'assets', f] as const,
  analytics: (from: string, to: string) => ['brand-social', 'analytics', from, to] as const,
  ads: (from: string, to: string) => ['brand-social', 'ads', from, to] as const,
};

export const useAccounts = () => useQuery({ queryKey: KEYS.accounts, queryFn: brandSocialApi.accounts, staleTime: 60_000 });
export const useSettings = () => useQuery({ queryKey: KEYS.settings, queryFn: brandSocialApi.settings, staleTime: 60_000 });
export const usePosts = (f: PostFilters, opts: { enabled?: boolean; refetchInterval?: number } = {}) =>
  useQuery({ queryKey: KEYS.posts(f), queryFn: () => brandSocialApi.posts(f), placeholderData: (prev) => prev, ...opts });

/** Refreshes every Nafaa Social list after a change. */
export function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEYS.all });
}

/**
 * Runs a post action (approve, submit, publish now…) with a toast and a
 * refresh of every list.
 */
export function usePostAction<V>(fn: (v: V) => Promise<SocialPost | unknown>, success: string | ((v: V) => string)) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_r, v) => { toast.success(typeof success === 'function' ? success(v) : success); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
}
