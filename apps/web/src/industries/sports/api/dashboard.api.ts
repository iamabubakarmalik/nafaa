import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const sportsDashboardApi = {
  overview: () => apiClient.get('/sports/dashboard/overview').then(unwrap<any>),
  salesReport: (from: string, to: string) =>
    apiClient.get('/sports/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
  categoryPerformance: () =>
    apiClient.get('/sports/dashboard/category-performance').then(unwrap<any[]>),
};
