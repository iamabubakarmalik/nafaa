import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export const furnitureDashboardApi = {
  overview: () => apiClient.get('/furniture/dashboard/overview').then(unwrap<unknown>),
};
