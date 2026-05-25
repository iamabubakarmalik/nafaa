import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi, type Subscription } from '@/api/subscriptions.api';
import { apiClient } from '@/api/client';

interface PendingUpgrade {
  subscription: { id: string; plan: any; interval: string; amount: number; createdAt: string };
  invoice: { id: string; invoiceNumber: string; status: string; total: number; amountDue: number; dueDate: string };
}

export function useSubscriptionStatus() {
  const subQuery = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
    refetchInterval: 5 * 60 * 1000,
  });

  const pendingQuery = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subscriptions/pending-upgrade');
        return res.data?.data ?? res.data ?? null;
      } catch { return null; }
    },
    refetchInterval: 30 * 1000,
  });

  const sub = subQuery.data;
  const pending = pendingQuery.data as PendingUpgrade | null;

  let trialDaysLeft: number | null = null;
  if (sub?.status === 'TRIAL' && sub.trialEndsAt) {
    const diff = new Date(sub.trialEndsAt).getTime() - Date.now();
    trialDaysLeft = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }

  return {
    subscription: sub ?? null,
    pendingUpgrade: pending,
    isLoading: subQuery.isLoading,
    isTrial: sub?.status === 'TRIAL' && (trialDaysLeft ?? 0) > 0,
    isActive: sub?.status === 'ACTIVE',
    isExpired: sub?.status === 'EXPIRED' || (sub?.status === 'TRIAL' && trialDaysLeft === 0),
    isPastDue: sub?.status === 'PAST_DUE',
    trialDaysLeft,
    isTrialExpiringSoon: sub?.status === 'TRIAL' && (trialDaysLeft ?? 999) <= 3,
    needsUpgrade: sub?.status === 'EXPIRED' || sub?.status === 'PAST_DUE',
    refetch: () => { subQuery.refetch(); pendingQuery.refetch(); },
  };
}
