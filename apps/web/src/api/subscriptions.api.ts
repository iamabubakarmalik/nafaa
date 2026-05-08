import { apiClient } from './client';
import type { Plan } from './plans.api';

export type BillingInterval = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubscriptionStatus =
  | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
  | 'EXPIRED' | 'PENDING_PAYMENT';

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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const subscriptionsApi = {
  current: () =>
    apiClient.get<{ data: Subscription | null }>('/subscriptions/current').then(unwrap),
  start: (planId: string, interval: BillingInterval) =>
    apiClient
      .post<{ data: { subscription: Subscription; invoice: any } }>(
        '/subscriptions/start',
        { planId, interval },
      )
      .then(unwrap),
  cancel: () =>
    apiClient.post<{ data: any }>('/subscriptions/cancel').then(unwrap),
};
