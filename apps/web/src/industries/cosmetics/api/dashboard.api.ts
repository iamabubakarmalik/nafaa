import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cosmeticsDashboardApi = {
  overview: () => apiClient.get('/cosmetics/dashboard/overview').then(unwrap<any>),
  categoryReport: () => apiClient.get('/cosmetics/dashboard/category-report').then(unwrap<any>),
};
