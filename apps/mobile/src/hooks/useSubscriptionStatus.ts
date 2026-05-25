import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi, type Subscription, type PendingUpgrade } from '@/api/subscriptions.api';

export interface SubscriptionStatus {
  subscription: Subscription | null;
  pendingUpgrade: PendingUpgrade | null;
  isLoading: boolean;
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  isPastDue: boolean;
  isPendingPayment: boolean;
  trialDaysLeft: number | null;
  trialHoursLeft: number | null;
  isTrialExpiringSoon: boolean;
  needsUpgrade: boolean;
  refetch: () => void;
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const subQuery = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const pendingQuery = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: subscriptionsApi.pendingUpgrade,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const sub = subQuery.data;
  const pending = pendingQuery.data;

  let trialDaysLeft: number | null = null;
  let trialHoursLeft: number | null = null;

  if (sub?.status === 'TRIAL' && sub.trialEndsAt) {
    const now = Date.now();
    const ends = new Date(sub.trialEndsAt).getTime();
    const diffMs = ends - now;
    if (diffMs > 0) {
      trialHoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
      trialDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } else {
      trialDaysLeft = 0;
      trialHoursLeft = 0;
    }
  }

  const isTrial = sub?.status === 'TRIAL' && (trialDaysLeft ?? 0) > 0;
  const isActive = sub?.status === 'ACTIVE';
  const isExpired = sub?.status === 'EXPIRED' || (sub?.status === 'TRIAL' && trialDaysLeft === 0);
  const isPastDue = sub?.status === 'PAST_DUE';
  const isPendingPayment = !!pending;

  return {
    subscription: sub ?? null,
    pendingUpgrade: pending ?? null,
    isLoading: subQuery.isLoading,
    isTrial,
    isActive,
    isExpired,
    isPastDue,
    isPendingPayment,
    trialDaysLeft,
    trialHoursLeft,
    isTrialExpiringSoon: isTrial && (trialDaysLeft ?? 999) <= 3,
    needsUpgrade: isExpired || isPastDue,
    refetch: () => {
      subQuery.refetch();
      pendingQuery.refetch();
    },
  };
}
