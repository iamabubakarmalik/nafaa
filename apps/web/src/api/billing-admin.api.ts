import { apiClient } from './client';
import type { Payment } from './billing.api';

export interface BillingAdminStats {
  pending: number;
  approved: number;
  rejected: number;
  totalApproved: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const billingAdminApi = {
  stats: () =>
    apiClient.get<{ data: BillingAdminStats }>('/billing-admin/stats').then(unwrap),
  pending: () =>
    apiClient.get<{ data: Payment[] }>('/billing-admin/pending').then(unwrap),
  all: () =>
    apiClient.get<{ data: Payment[] }>('/billing-admin/all').then(unwrap),
  approve: (id: string, notes?: string) =>
    apiClient
      .post<{ data: any }>(`/billing-admin/${id}/approve`, { notes })
      .then(unwrap),
  reject: (id: string, reason?: string) =>
    apiClient
      .post<{ data: any }>(`/billing-admin/${id}/reject`, { reason })
      .then(unwrap),
};
