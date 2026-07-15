import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const salonDashboardApi = {
  overview: () => apiClient.get('/salon/dashboard/overview').then(unwrap<any>),
};
