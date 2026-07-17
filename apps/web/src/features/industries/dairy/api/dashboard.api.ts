import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dairyDashboardApi = {
  overview: () => apiClient.get('/dairy/dashboard/overview').then(unwrap<any>),
};
