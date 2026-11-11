/**
 * The signed-in partner's profile from /partner/auth/me, mirrored into the
 * auth store. While the application is under review it is checked every
 * minute, so the dashboard opens as soon as Nafaa approves it.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { partnerApi } from '@/api/partner.api';
import { useAuthStore } from '@/store/auth.store';

export function useMe() {
  const token = useAuthStore((s) => s.accessToken);
  const stored = useAuthStore((s) => s.me);
  const setMe = useAuthStore((s) => s.setMe);
  const q = useQuery({
    queryKey: ['me'],
    queryFn: partnerApi.me,
    enabled: !!token,
    initialData: stored ?? undefined,
    initialDataUpdatedAt: 0,
    refetchInterval: (query) => (query.state.data?.status === 'ACTIVE' ? 5 * 60_000 : 60_000),
  });
  useEffect(() => { if (q.data) setMe(q.data); }, [q.data, setMe]);
  return q;
}
