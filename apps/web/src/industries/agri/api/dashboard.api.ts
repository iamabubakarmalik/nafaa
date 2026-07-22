import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const agriDashboardApi = {
  overview: () => apiClient.get('/agri/dashboard/overview').then(unwrap<any>),
};
