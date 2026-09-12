import { useQuery } from '@tanstack/react-query';
import {
  subscriptionsApi,
  type PendingUpgrade,
} from '@modules/billing/subscriptions/api/subscriptions.api';

export function useSubscriptionStatus() {
  const subQuery = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
    refetchInterval: 5 * 60 * 1000,
  });

  const pendingQuery = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: subscriptionsApi.pendingUpgrade,
    refetchInterval: 30 * 1000,
  });

  const sub = subQuery.data;
  const pending = (pendingQuery.data ?? null) as PendingUpgrade | null;

  const DAY = 24 * 60 * 60 * 1000;
  /** Matches SubscriptionGuard.GRACE_PERIOD_DAYS on the API. */
  const GRACE_DAYS = 3;

  let trialDaysLeft: number | null = null;
  if (sub?.status === 'TRIAL' && sub.trialEndsAt) {
    const diff = new Date(sub.trialEndsAt).getTime() - Date.now();
    trialDaysLeft = diff > 0 ? Math.ceil(diff / DAY) : 0;
  }

  // PAST_DUE still has API access for a 3-day grace, so the full-screen lock
  // must wait for the grace to run out — otherwise a customer who is one day
  // late gets locked out of an app the backend is happily still serving.
  let graceDaysLeft: number | null = null;
  if (sub?.status === 'PAST_DUE') {
    const overdue = Math.floor(
      (Date.now() - new Date(sub.currentPeriodEnd).getTime()) / DAY,
    );
    graceDaysLeft = Math.max(GRACE_DAYS - overdue, 0);
  }

  const isBlocked =
    sub?.status === 'EXPIRED' ||
    (sub?.status === 'TRIAL' && trialDaysLeft === 0) ||
    (sub?.status === 'PAST_DUE' && graceDaysLeft === 0);

  return {
    subscription: sub ?? null,
    pendingUpgrade: pending,
    isLoading: subQuery.isLoading,
    isTrial: sub?.status === 'TRIAL' && (trialDaysLeft ?? 0) > 0,
    isActive: sub?.status === 'ACTIVE',
    isExpired: sub?.status === 'EXPIRED' || (sub?.status === 'TRIAL' && trialDaysLeft === 0),
    isPastDue: sub?.status === 'PAST_DUE',
    trialDaysLeft,
    graceDaysLeft,
    isTrialExpiringSoon: sub?.status === 'TRIAL' && (trialDaysLeft ?? 999) <= 3,
    /** Show the upgrade CTA — true through the whole PAST_DUE window. */
    needsUpgrade: sub?.status === 'EXPIRED' || sub?.status === 'PAST_DUE',
    /** Hard block the UI — only once the API would actually refuse. */
    isBlocked,
    refetch: () => { subQuery.refetch(); pendingQuery.refetch(); },
  };
}
