import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const meatDashboardApi = {
  overview: () => apiClient.get('/meat/dashboard/overview').then(unwrap<any>),
};
