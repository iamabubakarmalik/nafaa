import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const hardwareDashboardApi = {
  overview: () => apiClient.get('/hardware/dashboard/overview').then(unwrap<any>),
  salesReport: (from: string, to: string) => apiClient.get('/hardware/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
};
