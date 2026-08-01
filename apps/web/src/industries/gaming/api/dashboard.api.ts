import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingDashboardApi = {
  overview: () => apiClient.get('/gaming/dashboard/overview').then(unwrap<any>),
};
