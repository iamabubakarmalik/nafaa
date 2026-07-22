import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const servicesDashboardApi = {
  overview: () => apiClient.get('/services-biz/dashboard/overview').then(unwrap<any>),
};
