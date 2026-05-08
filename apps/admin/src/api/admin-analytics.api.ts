import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

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
  topTenants: () =>
    apiClient.get<{ data: any[] }>('/admin/analytics/top-tenants').then(unwrap),
};
