/** Unread comments count for the "Comments" item in the sidebar (Nafaa Social). */

import { useQuery } from '@tanstack/react-query';
import { brandSocialApi } from '@/api/admin-brand-social.api';

export const INBOX_UNREAD_KEY = ['brand-social', 'inbox-unread'] as const;

export function InboxBadge() {
  const q = useQuery({ queryKey: INBOX_UNREAD_KEY, queryFn: brandSocialApi.commentsUnread, refetchInterval: 2 * 60_000, staleTime: 60_000, retry: false });
  const n = q.data?.unread ?? 0;
  if (!n) return null;
  return (
    <span className="ms-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.6875rem] font-bold tabular-nums text-white" aria-label={`${n} new comments`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}
