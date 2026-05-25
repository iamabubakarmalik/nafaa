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

export interface PendingUpgrade {
  subscription: {
    id: string;
    plan: Plan;
    interval: BillingInterval;
    amount: number;
    createdAt: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    amountDue: number;
    dueDate: string;
  };
}

function unwrap<T>(res: any): T {
  const body = res?.data;
  return body?.data !== undefined ? body.data : body;
}

export const subscriptionsApi = {
  current: () =>
    apiClient.get('/subscriptions/current').then((r) => unwrap<Subscription | null>(r)),

  pendingUpgrade: () =>
    apiClient.get('/subscriptions/pending-upgrade').then((r) => unwrap<PendingUpgrade | null>(r)),

  start: (planId: string, interval: BillingInterval) =>
    apiClient
      .post('/subscriptions/start', { planId, interval })
      .then((r) => unwrap<{ subscription: Subscription; invoice: any; reused: boolean }>(r)),

  cancelPending: (subscriptionId: string) =>
    apiClient.delete(`/subscriptions/pending/${subscriptionId}`).then((r) => unwrap<any>(r)),

  cancel: () =>
    apiClient.post('/subscriptions/cancel').then((r) => unwrap<any>(r)),

  reactivate: () =>
    apiClient.post('/subscriptions/reactivate').then((r) => unwrap<any>(r)),
};
