/** Count of support chats that need a reply, for the "Support inbox" item in the sidebar. */

import { useQuery } from '@tanstack/react-query';
import { adminSupportApi } from '@/api/admin-support.api';
import { SUPPORT_KEYS } from './SupportLive';

export function SupportBadge() {
  const q = useQuery({ queryKey: SUPPORT_KEYS.counts, queryFn: adminSupportApi.counts, refetchInterval: 60_000, staleTime: 15_000, retry: false });
  const n = q.data?.needsReply ?? 0;
  if (!n) return null;
  return (
    <span className="ms-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[0.6875rem] font-bold tabular-nums text-white" aria-label={`${n} chats need a reply`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}
