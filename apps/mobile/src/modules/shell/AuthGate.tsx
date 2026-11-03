/**
 * Decides where a person may be:
 *  - signed out              → sign-in screens only ((auth) group)
 *  - signed in, owner whose  → onboarding until the first step is done
 *    setup is not finished
 *  - signed in               → the app; sign-in screens bounce to Home
 *
 * The onboarding answer is remembered per tenant, so returning users never
 * wait for it.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { kv } from '@/core/storage/kv';

const doneKey = (tenantId: string) => `nafaa.onboarded.${tenantId}`;

export function markOnboarded(tenantId: string | undefined) {
  if (tenantId) kv.set(doneKey(tenantId), true);
}

/** Paths a signed-in person may open while setup is not finished. */
const SETUP_OK = new Set(['onboarding', 'verify-email', 'plan', 'billing', 'legal', 'help']);

export function AuthGate({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tenantId = useAuthStore((s) => s.tenant?.id);
  const role = useAuthStore((s) => s.user?.role);
  const isOwner = role === 'OWNER';
  const known = !!tenantId && kv.get<boolean>(doneKey(tenantId), false);

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => apiClient.get<{ isCompleted: boolean }>('/onboarding').then((r) => r.data),
    enabled: isAuthenticated && isOwner && !known,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (progress?.isCompleted) markOnboarded(tenantId);
  }, [progress?.isCompleted, tenantId]);

  const first = segments[0] as string | undefined;
  const inAuth = first === '(auth)';

  useEffect(() => {
    if (!isAuthenticated) {
      if (!inAuth) router.replace('/login');
      return;
    }
    const needsSetup = isOwner && !known && progress && !progress.isCompleted;
    if (needsSetup) {
      if (!SETUP_OK.has(first ?? '')) router.replace('/onboarding');
      return;
    }
    if (inAuth && !(isOwner && !known && isLoading)) router.replace('/');
  }, [isAuthenticated, inAuth, first, isOwner, known, progress, isLoading]);

  return <>{children}</>;
}
