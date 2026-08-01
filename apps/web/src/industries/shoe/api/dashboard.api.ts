import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const shoeDashboardApi = {
  overview: () => apiClient.get('/shoe/dashboard/overview').then(unwrap<any>),
  sizePopularity: () => apiClient.get('/shoe/dashboard/size-popularity').then(unwrap<any[]>),
};
