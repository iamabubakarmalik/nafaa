import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const electronicsDashboardApi = {
  overview: () =>
    apiClient.get('/electronics/dashboard/overview').then(unwrap<any>),

  salesReport: (from: string, to: string) =>
    apiClient.get('/electronics/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
};
