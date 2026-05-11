import { apiClient } from './client';
import type { Plan } from './plans.api';

export type BillingInterval = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus =
  | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_PAYMENT';

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  amount: number;
  currency: string;
  trialEndsAt?: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  plan: Plan;
}

export const subscriptionsApi = {
  current: () =>
    apiClient.get<Subscription | null>('/subscriptions/current').then((r) => r.data),
  start: (planId: string, interval: BillingInterval) =>
    apiClient
      .post<{ subscription: Subscription; invoice: any }>('/subscriptions/start', {
        planId, interval,
      })
      .then((r) => r.data),
  cancel: () => apiClient.post('/subscriptions/cancel').then((r) => r.data),
};
