import { apiClient } from '@core/api/client';
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const toystoreDashboardApi = {
  overview: () => apiClient.get('/toystore/dashboard/overview').then(unwrap<any>),
  ageAnalytics: () => apiClient.get('/toystore/dashboard/age-analytics').then(unwrap<any>),
  salesReport: (from: string, to: string) =>
    apiClient.get('/toystore/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
};
