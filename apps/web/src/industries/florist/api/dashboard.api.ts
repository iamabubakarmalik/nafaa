import { apiClient } from '@core/api/client';
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const floristDashboardApi = {
  overview: () => apiClient.get('/florist/dashboard/overview').then(unwrap<any>),
  deliveryReport: (from: string, to: string) =>
    apiClient.get('/florist/dashboard/delivery-report', { params: { from, to } }).then(unwrap<any>),
};
