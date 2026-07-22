import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bakeryDashboardApi = {
  overview: () => apiClient.get('/bakery/dashboard/overview').then(unwrap<any>),
};
