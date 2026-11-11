import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface TopTenant {
  tenantId: string;
  tenant?: { id: string; name: string; status: string };
  totalPaid: number;
  paymentsCount: number;
}

export interface PlanMixRow { planId: string; name: string; subscriptions: number; mrr: number }

export const adminAnalyticsApi = {
  mrrArr: () =>
    apiClient.get<{ data: { mrr: number; arr: number; activeSubscriptions: number } }>(
      '/admin/analytics/mrr-arr',
    ).then(unwrap),
  monthlyRevenue: (months = 12) =>
    apiClient
      .get<{ data: Array<{ month: string; revenue: number }> }>(
        '/admin/analytics/monthly-revenue',
        { params: { months } },
      )
      .then(unwrap),
  churn: (months = 6) =>
    apiClient
      .get<{ data: Array<{ month: string; churned: number }> }>(
        '/admin/analytics/churn',
        { params: { months } },
      )
      .then(unwrap),
  topTenants: (limit = 10) =>
    apiClient
      .get<{ data: TopTenant[] }>('/admin/analytics/top-tenants', { params: { limit } })
      .then(unwrap),
  planMix: () =>
    apiClient.get<{ data: PlanMixRow[] }>('/admin/analytics/plan-mix').then(unwrap),
};
