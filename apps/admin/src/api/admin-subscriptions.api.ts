import { apiClient } from './client';

export type SubscriptionStatus =
  | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_PAYMENT';
export type BillingInterval = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface AdminSubscription {
  id: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  trialEndsAt?: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string; status: string };
  plan: { id: string; name: string; slug: string };
}

export interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  pastDue: number;
  cancelled: number;
  expired: number;
  mrrEstimate: number;
}

export interface AssignPlanPayload {
  tenantId: string;
  planId: string;
  interval: BillingInterval;
  customDays?: number;
  markAsPaid?: boolean;
  notes?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminSubscriptionsApi = {
  stats: () =>
    apiClient.get<{ data: SubscriptionStats }>('/admin/subscriptions/stats').then(unwrap),
  list: (params?: { status?: SubscriptionStatus; search?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminSubscription[]; meta: any } }>('/admin/subscriptions', { params })
      .then(unwrap),
  assign: (payload: AssignPlanPayload) =>
    apiClient.post<{ data: any }>('/admin/subscriptions/assign', payload).then(unwrap),
  extend: (id: string, days: number, reason?: string) =>
    apiClient
      .post<{ data: any }>(`/admin/subscriptions/${id}/extend`, { days, reason })
      .then(unwrap),
  cancel: (id: string, reason?: string) =>
    apiClient
      .post<{ data: any }>(`/admin/subscriptions/${id}/cancel`, { reason })
      .then(unwrap),
  activate: (id: string) =>
    apiClient.post<{ data: any }>(`/admin/subscriptions/${id}/activate`).then(unwrap),
};
