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

export interface StartSubscriptionResult {
  subscription: Subscription;
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    amountDue: number;
    status: string;
  };
  reused: boolean;
  cancelledCount: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const subscriptionsApi = {
  current: () =>
    apiClient.get<{ data: Subscription | null }>('/subscriptions/current').then(unwrap),

  start: (planId: string, interval: BillingInterval) =>
    apiClient
      .post<{ data: StartSubscriptionResult }>('/subscriptions/start', { planId, interval })
      .then(unwrap),

  cancel: () =>
    apiClient.post<{ data: any }>('/subscriptions/cancel').then(unwrap),

  cleanupPending: () =>
    apiClient
      .post<{ data: { kept: number; cancelled: number; message: string } }>('/subscriptions/cleanup-pending')
      .then(unwrap),

  cancelPending: (id: string) =>
    apiClient.delete<{ data: any }>(`/subscriptions/pending/${id}`).then(unwrap),
};
