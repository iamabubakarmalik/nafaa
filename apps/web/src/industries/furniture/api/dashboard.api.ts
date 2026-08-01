import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const furnitureDashboardApi = {
  overview: () => apiClient.get('/furniture/dashboard/overview').then(unwrap<any>),
  salesReport: (from: string, to: string) =>
    apiClient.get('/furniture/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
  carpenterPerformance: (from: string, to: string) =>
    apiClient.get('/furniture/dashboard/carpenter-performance', { params: { from, to } }).then(unwrap<any>),
};
