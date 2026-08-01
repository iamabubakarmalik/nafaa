import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const opticalDashboardApi = {
  overview: () => apiClient.get('/optical/dashboard/overview').then(unwrap<any>),

  salesReport: (from: string, to: string) =>
    apiClient.get('/optical/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),

  optometristPerformance: (from: string, to: string) =>
    apiClient.get('/optical/dashboard/optometrist-performance', { params: { from, to } }).then(unwrap<any>),

  prescriptionAnalytics: () =>
    apiClient.get('/optical/dashboard/prescription-analytics').then(unwrap<any>),
};
