import { apiClient } from '@core/api/client';
import type { Plan } from '@modules/billing/plans/api/plans.api';

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
  /** The tenant's open invoice was handed back instead of a new one. */
  reused: boolean;
  /** That open invoice was re-priced in place (plan or interval changed). */
  repriced: boolean;
  /** A receipt is already under review, so the invoice could not be changed. */
  locked: boolean;
  cancelledCount: number;
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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const subscriptionsApi = {
  current: () =>
    apiClient.get<{ data: Subscription | null }>('/subscriptions/current').then(unwrap),

  pendingUpgrade: async (): Promise<PendingUpgrade | null> => {
    try {
      const res = await apiClient.get<{ data: PendingUpgrade | null }>(
        '/subscriptions/pending-upgrade',
      );
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  start: (planId: string, interval: BillingInterval) =>
    apiClient
      .post<{ data: StartSubscriptionResult }>('/subscriptions/start', { planId, interval })
      .then(unwrap),

  cancel: () =>
    apiClient.post<{ data: Subscription }>('/subscriptions/cancel').then(unwrap),

  reactivate: () =>
    apiClient.post<{ data: Subscription }>('/subscriptions/reactivate').then(unwrap),

  cleanupPending: () =>
    apiClient
      .post<{ data: { kept: number; cancelled: number; message: string } }>('/subscriptions/cleanup-pending')
      .then(unwrap),

  cancelPending: (id: string) =>
    apiClient.delete<{ data: any }>(`/subscriptions/pending/${id}`).then(unwrap),
};
