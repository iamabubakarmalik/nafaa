import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const autoPartsDashboardApi = {
  overview: () => apiClient.get('/autoparts/dashboard/overview').then(unwrap<any>),
};
